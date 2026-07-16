import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Download,
  XCircle,
  Clock,
  Lock,
  Edit3
} from 'lucide-react';
import { OfferAcceptanceForm } from './OfferAcceptanceForm';
import { ContractForm } from './ContractForm';

      import contractSchema from '../../docs/contract.schema.json';

const API_BASE = 'http://localhost:5001';
const OFFER_STORAGE_KEY = 'offerAcceptanceData';
const CONTRACT_STORAGE_KEY = 'contractData';

// helper to ensure id exists
function ensureProfileHasId(p: any) {
  if (!p) return null;
  if (!p.id) {
    const id = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    p.id = id;
    p.createdAt = p.createdAt || new Date().toISOString();
  }
  return p;
}

type StoredOnboardingProfile = {
  fullName?: string;
  email?: string;
  role?: string;
  department?: string;
  startDate?: string;
  nationality?: 'Malaysian' | 'Non-Malaysian';
  salary?: string;
  nric?: string;
  status?: string;
  createdAt?: string;
  aiPlan?: string;
  [k: string]: any;
};

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

// ── Default form data builders ───────────────────────────────────────────────

function getDefaultOfferData(profile: StoredOnboardingProfile | null) {
  return {
    fullName: profile?.fullName || '',
    nricPassport: profile?.nric || '',
    email: profile?.email || '',
    mobile: '',
    company: 'Deriv Solutions Sdn Bhd',
    position: profile?.role || '',
    department: profile?.department || '',
    reportingTo: '',
    startDate: profile?.startDate || '',
    employmentType: 'Permanent',
    probationPeriod: '3 months',
    monthlySalary: profile?.salary || '',
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

function getDefaultContractData(profile: StoredOnboardingProfile | null) {
  return {
    fullName: profile?.fullName || '',
    nric: profile?.nric || '',
    passportNo: '',
    nationality: profile?.nationality || 'Malaysian',
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
    workEmail: profile?.email || '',
    mobile: '',
    altNumber: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyMobile: '',
    emergencyAltNumber: '',
    jobTitle: profile?.role || '',
    department: profile?.department || '',
    reportingTo: '',
    startDate: profile?.startDate || '',
    employmentType: 'Full-Time Permanent',
    workLocation: '',
    workModel: 'Hybrid',
    probationPeriod: '3 months',
    bankName: '',
    accountHolder: profile?.fullName || '',
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

// ── Helper: load JSON from localStorage ──────────────────────────────────────

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
  const [profile, setProfile] = useState<StoredOnboardingProfile | null>(null);
  const [offerData, setOfferData] = useState<Record<string, any> | null>(null);
  const [contractData, setContractData] = useState<Record<string, any> | null>(null);

  // Form visibility
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);

  // PDF loading state: null | 'application' | 'offer' | 'contract'
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  // ── Load data from localStorage on mount ─────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('onboardingProfile');
      if (!raw) { setProfile(null); return; }
      const parsed = JSON.parse(raw) as StoredOnboardingProfile;
      const withId = ensureProfileHasId(parsed);
      if (withId) localStorage.setItem('onboardingProfile', JSON.stringify(withId));
      setProfile(withId);
    } catch (e) {
      console.warn('Failed to parse onboardingProfile from localStorage', e);
      setProfile(null);
    }

    setOfferData(loadJson(OFFER_STORAGE_KEY));
    setContractData(loadJson(CONTRACT_STORAGE_KEY));
  }, []);

  // ── Status helpers ───────────────────────────────────────────────────────
  const isApplicationDone = profile?.status === 'in_progress';
  console.log("Profile is:", profile);
  const isOfferDone = !!(offerData && offerData.completedAt);
  const isContractDone = !!(contractData && contractData.completedAt);

  const isOfferActive = isApplicationDone; // can fill offer only after application
  const isContractActive = isOfferDone;    // can fill contract only after offer

  const getTaskStatus = (key: TaskKey): 'done' | 'active' | 'locked' => {
    if (key === 'application') return isApplicationDone ? 'done' : 'active';
    if (key === 'offer') return isOfferDone ? 'done' : isOfferActive ? 'active' : 'locked';
    return isContractDone ? 'done' : isContractActive ? 'active' : 'locked';
  };

  // ── Application PDF download (existing) ──────────────────────────────────
  const downloadApplicationPdf = async () => {
    if (!profile) { alert('No onboarding profile found.'); return; }
    const prof = ensureProfileHasId({ ...profile });
    
    // Auto-save any profile updates
    localStorage.setItem('onboardingProfile', JSON.stringify(prof));
    setProfile(prof);

    try {
      setPdfLoading('application');
      
      // Save comprehensive data payload
      const payload = { ...prof, id: prof.id }; // ensure ID is top-level
      const saveRes = await fetch(`${API_BASE}/api/save-application-comprehensive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!saveRes.ok) throw new Error(`Save failed: ${saveRes.status}`);
      
      // Open generation link
      window.open(`${API_BASE}/api/generate-app-comprehensive-pdf/${encodeURIComponent(prof.id)}`, '_blank');
    } catch (err: any) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF: ' + (err?.message || err));
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Offer Acceptance PDF download ────────────────────────────────────────
  const downloadOfferPdf = async () => {
    if (!offerData || !profile) return;
    try {
      setPdfLoading('offer');
      const payload = { ...offerData, id: profile.id };
      const saveRes = await fetch(`${API_BASE}/api/save-offer-acceptance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!saveRes.ok) throw new Error(`Save failed: ${saveRes.status}`);
      window.open(`${API_BASE}/api/generate-offer-pdf/${encodeURIComponent(profile.id!)}`, '_blank');
    } catch (err: any) {
      console.error('Failed to generate offer PDF', err);
      alert('Failed to generate PDF: ' + (err?.message || err));
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Contract PDF download ────────────────────────────────────────────────
  const downloadContractPdf = async () => {
    if (!contractData || !profile) return;
    try {
      setPdfLoading('contract');
      const payload = { ...contractData, id: profile.id };
      const saveRes = await fetch(`${API_BASE}/api/save-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!saveRes.ok) throw new Error(`Save failed: ${saveRes.status}`);
      window.open(`${API_BASE}/api/generate-contract-pdf/${encodeURIComponent(profile.id!)}`, '_blank');
    } catch (err: any) {
      console.error('Failed to generate contract PDF', err);
      alert('Failed to generate PDF: ' + (err?.message || err));
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Form submission handlers ─────────────────────────────────────────────
  const handleOfferSubmit = (data: Record<string, any>) => {
    localStorage.setItem(OFFER_STORAGE_KEY, JSON.stringify(data));
    setOfferData(data);
    setShowOfferForm(false);
  };

  const handleContractSubmit = (data: Record<string, any>) => {
    localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(data));
    setContractData(data);
    setShowContractForm(false);
  };


  // ── Status badge component ───────────────────────────────────────────────
  const StatusBadge: React.FC<{ status: 'done' | 'active' | 'locked' }> = ({ status }) => {
    if (status === 'done') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-jade-100 text-jade-700 font-semibold text-xs">
          <CheckCircle2 size={14} /> <span>Done</span>
        </span>
      );
    }
    if (status === 'locked') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-slate-100 text-slate-400 font-medium text-xs">
          <Lock size={14} /> <span>Locked</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium text-xs">
        <Clock size={14} /> <span>Pending</span>
      </span>
    );
  };

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
        <div className="text-right">
          <div className="text-xs text-slate-400">Profile loaded from</div>
          <div className="mt-1 font-medium text-sm">
            {profile ? 'localStorage (onboardingProfile)' : 'No onboardingProfile found'}
          </div>
        </div>
      </header>

      {/* ── Progress indicator ───────────────────────────────────────────── */}
      <div className="flex items-center space-x-2">
        {TASKS.map((task, i) => {
          const status = getTaskStatus(task.key);
          return (
            <React.Fragment key={task.key}>
              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                ${status === 'done' ? 'bg-jade-100 text-jade-700' : status === 'active' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                <span>{i + 1}.</span>
                <span>{task.title}</span>
                {status === 'done' && <CheckCircle2 size={12} />}
              </div>
              {i < TASKS.length - 1 && (
                <div className={`w-8 h-0.5 ${status === 'done' ? 'bg-jade-300' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Task cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TASKS.map(task => {
          const status = getTaskStatus(task.key);
          const done = status === 'done';
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

                  {/* ── APPLICATION card content ─────────────────────────── */}
                  {task.key === 'application' && profile && (
                    <div className="mt-4 bg-slate-50 rounded-lg border p-3">
                      <div className="text-xs text-slate-400 uppercase font-bold mb-2">Applicant snapshot</div>
                      <div className="text-sm font-semibold text-slate-900 truncate">{profile.fullName || '—'}</div>
                      <div className="text-xs text-slate-500">{profile.email || '—'}</div>
                      <div className="text-xs text-slate-500 mt-2">
                        <strong className="font-medium">Role:</strong> {profile.role || '—'} &bull; <strong className="font-medium">Dept:</strong> {profile.department || '—'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        <strong>Nationality:</strong> {profile.nationality || '—'} {profile.nric ? ` • NRIC: ${profile.nric}` : ''}
                      </div>
                      <div className="mt-3 flex items-center flex-wrap gap-2">
                        <button
                          onClick={downloadApplicationPdf}
                          disabled={pdfLoading === 'application' || !profile}
                          className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold ${pdfLoading === 'application' ? 'bg-gray-200 text-gray-600' : 'bg-blue-50 text-blue-600'}`}
                        >
                          <Download size={14} />
                          <span className="ml-1.5">{pdfLoading === 'application' ? 'Preparing…' : 'Download PDF'}</span>
                        </button>
                        <button
                          onClick={() => {
                            try {
                              localStorage.removeItem('onboardingProfile');
                              localStorage.removeItem(OFFER_STORAGE_KEY);
                              localStorage.removeItem(CONTRACT_STORAGE_KEY);
                              setProfile(null);
                              setOfferData(null);
                              setContractData(null);
                            } catch (e) {
                              console.warn('Failed to clear data', e);
                            }
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold"
                        >
                          <XCircle size={14} />
                          <span>Clear Profile</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── OFFER ACCEPTANCE card content ────────────────────── */}
                  {task.key === 'offer' && !locked && (
                    <div className="mt-4">
                      {isOfferDone && offerData ? (
                        <div className="bg-slate-50 rounded-lg border p-3">
                          <div className="text-xs text-slate-400 uppercase font-bold mb-2">Offer accepted</div>
                          <div className="text-sm font-semibold text-slate-900 truncate">{offerData.fullName || '—'}</div>
                          <div className="text-xs text-slate-500">{offerData.position || '—'} &bull; {offerData.department || '—'}</div>
                          <div className="text-xs text-slate-500 mt-1">Salary: MYR {offerData.monthlySalary || '—'}</div>
                          <div className="text-xs text-slate-400 mt-1">Accepted: {offerData.acceptanceDate || '—'}</div>
                          <div className="mt-3 flex items-center flex-wrap gap-2">
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
                        className="
                          inline-flex items-center gap-2
                          px-5 py-3
                          rounded-xl
                          bg-gradient-to-r from-blue-600 to-indigo-600
                          text-white text-sm font-bold
                          shadow-lg shadow-blue-500/30
                          hover:from-blue-700 hover:to-indigo-700
                          hover:shadow-xl hover:scale-[1.02]
                          focus:outline-none focus:ring-2 focus:ring-blue-400
                          transition-all
                        "
                      >
                        <Edit3 size={16} />
                        <span>Fill Offer Form</span>
                      </button>

                      )}
                    </div>
                  )}

                  {/* ── CONTRACT card content ────────────────────────────── */}
                  {task.key === 'contract' && !locked && (
                    <div className="mt-4">
                      {isContractDone && contractData ? (
                        <div className="bg-slate-50 rounded-lg border p-3">
                          <div className="text-xs text-slate-400 uppercase font-bold mb-2">Contract completed</div>
                          <div className="text-sm font-semibold text-slate-900 truncate">{contractData.fullName || '—'}</div>
                          <div className="text-xs text-slate-500">{contractData.jobTitle || '—'} &bull; {contractData.department || '—'}</div>
                          <div className="text-xs text-slate-500 mt-1">Bank: {contractData.bankName || '—'} &bull; Acc: {contractData.accountNumber || '—'}</div>
                          <div className="text-xs text-slate-400 mt-1">Signed: {contractData.signatureDate || '—'}</div>
                          <div className="mt-3 flex items-center flex-wrap gap-2">
                            <button
                              onClick={downloadContractPdf}
                              disabled={pdfLoading === 'contract'}
                              className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold ${pdfLoading === 'contract' ? 'bg-gray-200 text-gray-600' : 'bg-blue-50 text-blue-600'}`}
                            >
                              <Download size={14} />
                              <span className="ml-1.5">{pdfLoading === 'contract' ? 'Preparing…' : 'Download PDF'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                        onClick={() => setShowContractForm(true)}
                        className="
                          inline-flex items-center gap-2
                          px-5 py-3
                          rounded-xl
                          bg-gradient-to-r from-blue-600 to-indigo-600
                          text-white text-sm font-bold
                          shadow-lg shadow-blue-500/30
                          hover:from-blue-700 hover:to-indigo-700
                          hover:shadow-xl hover:scale-[1.02]
                          focus:outline-none focus:ring-2 focus:ring-blue-400
                          transition-all
                        "
                      >
                        <Edit3 size={16} />
                        <span>Fill Contract Form</span>
                      </button>

                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer hint for locked tasks */}
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

      {/* ── No profile warning ───────────────────────────────────────────── */}
      {!profile && (
        <div className="mt-6 bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-yellow-800">
          No onboarding profile found in localStorage under <code>onboardingProfile</code>. Fill out the onboarding form to populate the application.
        </div>
      )}

      {/* ── Form modals ──────────────────────────────────────────────────── */}
      {showOfferForm && (
        <OfferAcceptanceForm
          defaultData={offerData || getDefaultOfferData(profile)}
          onSubmit={handleOfferSubmit}
          onClose={() => setShowOfferForm(false)}
        />
      )}

      {/* {showContractForm && (
        <ContractForm
          defaultData={contractData || getDefaultContractData(profile)}
          onSubmit={handleContractSubmit}
          onClose={() => setShowContractForm(false)}
        />
      )} */}

        {showContractForm && (
          <ContractForm
            schema={contractSchema}
            defaultData={contractData || getDefaultContractData(profile)}
            onSubmit={handleContractSubmit}
            onClose={() => setShowContractForm(false)}
          />
        )}

    </div>
  );
};

export default MyDocuments;
