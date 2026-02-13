import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Download,
  Clock,
  Lock,
  Edit3,
  User as UserIcon
} from 'lucide-react';
import { OfferAcceptanceForm } from './OfferAcceptanceForm';
import { ContractForm, FormSchema } from './ContractForm';
import { useAuth } from '../../contexts/AuthContext';
import contractSchemaJson from '../../docs/contract.schema.json';

const contractSchema = contractSchemaJson as unknown as FormSchema;

const API_BASE = 'http://localhost:5001';
const OFFER_STORAGE_KEY = 'offerAcceptanceData';
const CONTRACT_STORAGE_KEY = 'contractData';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocStatus {
  exists: boolean;
  signed_at?: string | null;
}

interface DocsState {
  application: DocStatus;
  offer: DocStatus;
  contract: DocStatus;
}

type TaskKey = 'application' | 'offer' | 'contract';

const TASKS: { key: TaskKey; title: string; description: string }[] = [
  {
    key: 'application',
    title: 'Onboarding Application',
    description: 'Application document built from your onboarding profile.'
  },
  {
    key: 'offer',
    title: 'Offer Acceptance',
    description: 'Sign / accept your offer letter to confirm employment.'
  },
  {
    key: 'contract',
    title: 'Contract Document',
    description: 'Complete your employment contract with personal and statutory details.'
  }
];

// ── Default form data builders ────────────────────────────────────────────────

function getDefaultOfferData(user: any) {
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  return {
    fullName,
    nricPassport: user?.nric || '',
    email: user?.email || '',
    mobile: '',
    company: 'Deriv Solutions Sdn Bhd',
    position: '',
    department: user?.department || '',
    reportingTo: '',
    startDate: user?.startDate || '',
    employmentType: 'Permanent',
    probationPeriod: '3 months',
    monthlySalary: '',
    benefits: '',
    acceptanceDate: new Date().toISOString().split('T')[0],
    emergencyName: '',
    emergencyRelationship: '',
    emergencyMobile: '',
    emergencyAltNumber: '',
    noConflicts: true,
    conflictDetails: '',
    accepted: false,
    completedAt: '',
  };
}

function getDefaultContractData(user: any) {
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  return {
    fullName,
    nric: user?.nric || '',
    passportNo: '',
    nationality: user?.nationality || 'Malaysian',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    race: '',
    religion: '',
    address1: '',
    address2: '',
    postcode: '',
    city: '',
    state: '',
    country: 'Malaysia',
    personalEmail: '',
    workEmail: user?.email || '',
    mobile: '',
    altNumber: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyMobile: '',
    emergencyAltNumber: '',
    jobTitle: '',
    department: user?.department || '',
    reportingTo: '',
    startDate: user?.startDate || '',
    employmentType: 'Full-Time Permanent',
    workLocation: '',
    workModel: 'Hybrid',
    probationPeriod: '3 months',
    bankName: '',
    accountHolder: fullName,
    accountNumber: '',
    bankBranch: '',
    epfNumber: '',
    socsoNumber: '',
    eisNumber: '',
    taxNumber: '',
    taxResident: true,
    acknowledgeHandbook: false,
    acknowledgeIT: false,
    acknowledgePrivacy: false,
    acknowledgeConfidentiality: false,
    finalDeclaration: false,
    signatureDate: new Date().toISOString().split('T')[0],
    completedAt: '',
  };
}

function loadJson(key: string): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════════════════════

export const MyDocuments: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.id;

  const [docsState, setDocsState] = useState<DocsState>({
    application: { exists: false },
    offer:       { exists: false },
    contract:    { exists: false },
  });

  // Form data kept in state (seeded from localStorage if present)
  const [offerData, setOfferData]       = useState<Record<string, any> | null>(() => loadJson(OFFER_STORAGE_KEY));
  const [contractData, setContractData] = useState<Record<string, any> | null>(() => loadJson(CONTRACT_STORAGE_KEY));

  const [showOfferForm, setShowOfferForm]       = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [pdfLoading, setPdfLoading]             = useState<string | null>(null);
  const [statusLoading, setStatusLoading]       = useState(false);

  // ── Fetch doc status from backend ─────────────────────────────────────────
  const fetchDocStatus = async () => {
    if (!employeeId) return;
    try {
      setStatusLoading(true);
      const res = await fetch(`${API_BASE}/api/employee-docs-status/${encodeURIComponent(employeeId)}`);
      if (res.ok) {
        const data = await res.json();
        setDocsState(data);
      }
    } catch (e) {
      console.warn('Could not fetch doc status:', e);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchDocStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  // ── Status helpers ────────────────────────────────────────────────────────
  const isApplicationDone = docsState.application.exists;
  const isOfferDone       = docsState.offer.exists || !!(offerData?.completedAt);
  const isContractDone    = docsState.contract.exists || !!(contractData?.completedAt);

  const isOfferActive    = isApplicationDone;
  const isContractActive = isOfferDone;

  const getTaskStatus = (key: TaskKey): 'done' | 'active' | 'locked' => {
    if (key === 'application') return isApplicationDone ? 'done' : 'active';
    if (key === 'offer')       return isOfferDone ? 'done' : isOfferActive ? 'active' : 'locked';
    return isContractDone ? 'done' : isContractActive ? 'active' : 'locked';
  };

  // ── Application PDF download ──────────────────────────────────────────────
  const downloadApplicationPdf = async () => {
    if (!user || !employeeId) { alert('Not authenticated.'); return; }
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const payload = {
      id: employeeId,
      fullName,
      email: user.email,
      role: '',
      department: user.department,
      startDate: user.startDate || '',
      nationality: user.nationality || 'Malaysian',
      nric: user.nric || '',
    };
    try {
      setPdfLoading('application');
      const saveRes = await fetch(`${API_BASE}/api/save-application-comprehensive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!saveRes.ok) throw new Error(`Save failed: ${saveRes.status}`);
      window.open(`${API_BASE}/api/generate-app-comprehensive-pdf/${encodeURIComponent(employeeId)}`, '_blank');
      await fetchDocStatus();
    } catch (err: any) {
      alert('Failed to generate PDF: ' + (err?.message || err));
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Offer PDF download ────────────────────────────────────────────────────
  const downloadOfferPdf = async () => {
    if (!offerData || !employeeId) return;
    try {
      setPdfLoading('offer');
      const saveRes = await fetch(`${API_BASE}/api/save-offer-acceptance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...offerData, id: employeeId }),
      });
      if (!saveRes.ok) throw new Error(`Save failed: ${saveRes.status}`);
      window.open(`${API_BASE}/api/generate-offer-pdf/${encodeURIComponent(employeeId)}`, '_blank');
      await fetchDocStatus();
    } catch (err: any) {
      alert('Failed to generate offer PDF: ' + (err?.message || err));
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Contract PDF download ─────────────────────────────────────────────────
  const downloadContractPdf = async () => {
    if (!contractData || !employeeId) return;
    try {
      setPdfLoading('contract');
      const saveRes = await fetch(`${API_BASE}/api/save-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contractData, id: employeeId }),
      });
      if (!saveRes.ok) throw new Error(`Save failed: ${saveRes.status}`);
      window.open(`${API_BASE}/api/generate-contract-pdf/${encodeURIComponent(employeeId)}`, '_blank');
      await fetchDocStatus();
    } catch (err: any) {
      alert('Failed to generate contract PDF: ' + (err?.message || err));
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Signed contract JSON download ─────────────────────────────────────────
  const downloadSignedContractJson = () => {
    if (!employeeId) return;
    window.open(`${API_BASE}/api/download-contract-json/${encodeURIComponent(employeeId)}`, '_blank');
  };

  // ── Form submission handlers ──────────────────────────────────────────────
  const handleOfferSubmit = async (data: Record<string, any>) => {
    localStorage.setItem(OFFER_STORAGE_KEY, JSON.stringify(data));
    setOfferData(data);
    setShowOfferForm(false);
    // Persist to TEMP_DIR via backend
    if (employeeId) {
      try {
        await fetch(`${API_BASE}/api/save-offer-acceptance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, id: employeeId }),
        });
        await fetchDocStatus();
      } catch (e) {
        console.warn('Could not persist offer to backend:', e);
      }
    }
  };

  const handleContractSubmit = async (data: Record<string, any>) => {
    localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(data));
    setContractData(data);
    setShowContractForm(false);
    if (employeeId) {
      try {
        await fetch(`${API_BASE}/api/save-contract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, id: employeeId }),
        });
        await fetchDocStatus();
      } catch (e) {
        console.warn('Could not persist contract to backend:', e);
      }
    }
  };

  // ── Status badge ─────────────────────────────────────────────────────────
  const StatusBadge: React.FC<{ status: 'done' | 'active' | 'locked' }> = ({ status }) => {
    if (status === 'done') return (
      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-jade-100 text-jade-700 font-semibold text-xs">
        <CheckCircle2 size={14} /><span>Done</span>
      </span>
    );
    if (status === 'locked') return (
      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-slate-100 text-slate-400 font-medium text-xs">
        <Lock size={14} /><span>Locked</span>
      </span>
    );
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium text-xs">
        <Clock size={14} /><span>Pending</span>
      </span>
    );
  };

  // ── No auth guard ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
          You must be logged in to view your documents.
        </div>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">My Documents & Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete each step in order. The next task unlocks once the previous one is finished.
          </p>
        </div>
        <div className="flex items-center space-x-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          <UserIcon size={14} className="text-slate-400" />
          <span className="font-medium">{fullName}</span>
          <span className="text-slate-400">·</span>
          <span className="font-mono text-slate-400">{user.email}</span>
          {statusLoading && <span className="ml-1 animate-pulse text-slate-400">Refreshing…</span>}
        </div>
      </header>

      {/* ── Progress indicator ──────────────────────────────────────────────── */}
      <div className="flex items-center space-x-2">
        {TASKS.map((task, i) => {
          const status = getTaskStatus(task.key);
          return (
            <React.Fragment key={task.key}>
              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                ${status === 'done' ? 'bg-jade-100 text-jade-700' : status === 'active' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                <span>{i + 1}.</span><span>{task.title}</span>
                {status === 'done' && <CheckCircle2 size={12} />}
              </div>
              {i < TASKS.length - 1 && (
                <div className={`w-8 h-0.5 ${status === 'done' ? 'bg-jade-300' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Task cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TASKS.map(task => {
          const status = getTaskStatus(task.key);
          const done   = status === 'done';
          const locked = status === 'locked';

          return (
            <div
              key={task.key}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all
                ${done ? 'bg-white border-jade-200 shadow-md' : locked ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-3 rounded-lg ${done ? 'bg-jade-50' : locked ? 'bg-slate-50' : 'bg-amber-50'}`}>
                  {done
                    ? <CheckCircle2 className="text-jade-600" size={20} />
                    : locked
                      ? <Lock className="text-slate-400" size={20} />
                      : <FileText className="text-amber-600" size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-bold text-sm ${done ? 'text-slate-900' : 'text-slate-700'}`}>{task.title}</h3>
                    <StatusBadge status={status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{task.description}</p>

                  {/* ── APPLICATION card ──────────────────────────────────── */}
                  {task.key === 'application' && (
                    <div className="mt-4 bg-slate-50 rounded-lg border p-3">
                      <div className="text-xs text-slate-400 uppercase font-bold mb-2">Applicant snapshot</div>
                      <div className="text-sm font-semibold text-slate-900 truncate">{fullName || '—'}</div>
                      <div className="text-xs text-slate-500">{user.email || '—'}</div>
                      <div className="text-xs text-slate-500 mt-2">
                        <strong className="font-medium">Dept:</strong> {user.department || '—'} &bull;{' '}
                        <strong className="font-medium">Start:</strong> {user.startDate || '—'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        <strong>Nationality:</strong> {user.nationality || '—'}{user.nric ? ` • NRIC: ${user.nric}` : ''}
                      </div>
                      {docsState.application.signed_at && (
                        <div className="text-xs text-jade-600 mt-1">Submitted: {new Date(docsState.application.signed_at).toLocaleDateString()}</div>
                      )}
                      <div className="mt-3">
                        <button
                          onClick={downloadApplicationPdf}
                          disabled={pdfLoading === 'application'}
                          className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold ${pdfLoading === 'application' ? 'bg-gray-200 text-gray-600' : 'bg-blue-50 text-blue-600'}`}
                        >
                          <Download size={14} />
                          <span className="ml-1.5">{pdfLoading === 'application' ? 'Preparing…' : 'Download PDF'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── OFFER ACCEPTANCE card ─────────────────────────────── */}
                  {task.key === 'offer' && !locked && (
                    <div className="mt-4">
                      {isOfferDone && offerData ? (
                        <div className="bg-slate-50 rounded-lg border p-3">
                          <div className="text-xs text-slate-400 uppercase font-bold mb-2">Offer accepted</div>
                          <div className="text-sm font-semibold text-slate-900 truncate">{offerData.fullName || '—'}</div>
                          <div className="text-xs text-slate-500">{offerData.position || '—'} &bull; {offerData.department || '—'}</div>
                          <div className="text-xs text-slate-500 mt-1">Salary: MYR {offerData.monthlySalary || '—'}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Accepted: {offerData.acceptanceDate || '—'}
                            {docsState.offer.signed_at && ` · Saved: ${new Date(docsState.offer.signed_at).toLocaleDateString()}`}
                          </div>
                          <div className="mt-3">
                            <button
                              onClick={downloadOfferPdf}
                              disabled={pdfLoading === 'offer'}
                              className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold ${pdfLoading === 'offer' ? 'bg-gray-200 text-gray-600' : 'bg-blue-50 text-blue-600'}`}
                            >
                              <Download size={14} />
                              <span className="ml-1.5">{pdfLoading === 'offer' ? 'Preparing…' : 'Download PDF'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowOfferForm(true)}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                        >
                          <Edit3 size={16} /><span>Fill Offer Form</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── CONTRACT card ─────────────────────────────────────── */}
                  {task.key === 'contract' && !locked && (
                    <div className="mt-4">
                      {isContractDone && (contractData || docsState.contract.exists) ? (
                        <div className="bg-slate-50 rounded-lg border p-3">
                          <div className="text-xs text-slate-400 uppercase font-bold mb-2">Contract completed</div>
                          {contractData && (
                            <>
                              <div className="text-sm font-semibold text-slate-900 truncate">{contractData.fullName || '—'}</div>
                              <div className="text-xs text-slate-500">{contractData.jobTitle || '—'} &bull; {contractData.department || '—'}</div>
                              <div className="text-xs text-slate-500 mt-1">Signed: {contractData.signatureDate || '—'}</div>
                            </>
                          )}
                          {docsState.contract.signed_at && (
                            <div className="text-xs text-jade-600 mt-1">
                              Consent confirmed: {new Date(docsState.contract.signed_at).toLocaleDateString()}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {contractData && (
                              <button
                                onClick={downloadContractPdf}
                                disabled={pdfLoading === 'contract'}
                                className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold ${pdfLoading === 'contract' ? 'bg-gray-200 text-gray-600' : 'bg-blue-50 text-blue-600'}`}
                              >
                                <Download size={14} />
                                <span className="ml-1.5">{pdfLoading === 'contract' ? 'Preparing…' : 'Download PDF'}</span>
                              </button>
                            )}
                            {docsState.contract.exists && (
                              <button
                                onClick={downloadSignedContractJson}
                                className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                <Download size={14} />
                                <span className="ml-1.5">Download Signed Contract</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowContractForm(true)}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                        >
                          <Edit3 size={16} /><span>Fill Contract Form</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {locked && (
                <div className="mt-4 text-xs text-slate-400 italic">
                  {task.key === 'offer'
                    ? 'Complete your application first to unlock this step.'
                    : 'Complete the offer acceptance first to unlock this step.'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Form modals ──────────────────────────────────────────────────────── */}
      {showOfferForm && (
        <OfferAcceptanceForm
          defaultData={offerData || getDefaultOfferData(user)}
          onSubmit={handleOfferSubmit}
          onClose={() => setShowOfferForm(false)}
        />
      )}

      {showContractForm && (
        <ContractForm
          schema={contractSchema}
          defaultData={contractData || getDefaultContractData(user)}
          onSubmit={handleContractSubmit}
          onClose={() => setShowContractForm(false)}
        />
      )}
    </div>
  );
};

export default MyDocuments;
