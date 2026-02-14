import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckCircle2,
  Circle,
  FileSignature,
  Clock,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { SignaturePad } from '../design-system/SignaturePad';

/* === Replace these with your real values / imports if they are stored elsewhere === */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''; // e.g. https://api.example.com
const OFFER_STORAGE_KEY = 'offer_form_data';
const CONTRACT_STORAGE_KEY = 'contract_form_data';
/* ================================================================================ */

type TaskKey = 'application' | 'offer' | 'contract';

const TASKS: { key: TaskKey; title: string; description: string }[] = [
  {
    key: 'application',
    title: 'Offer Letter',
    description: 'Offer Letter document built from your onboarding profile.'
  },
  // Commented out - Offer Acceptance step
  // {
  //   key: 'offer',
  //   title: 'Offer Acceptance',
  //   description: 'Sign / accept your offer letter to confirm employment.'
  // },
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

type DocsState = {
  application: { exists: boolean; signed_at?: string | null; status?: string };
  offer: { exists: boolean; signed_at?: string | null; status?: string };
  contract: { exists: boolean; signed_at?: string | null; status?: string };
};

export const MyOnboarding: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.id;

  const [docsState, setDocsState] = useState<DocsState>({
    application: { exists: false },
    offer: { exists: false },
    contract: { exists: false }
  });

  const [offerData, setOfferData] = useState<Record<string, any> | null>(() => loadJson(OFFER_STORAGE_KEY));
  const [contractData, setContractData] = useState<Record<string, any> | null>(() => loadJson(CONTRACT_STORAGE_KEY));
  const [contractPreview, setContractPreview] = useState<any>(null);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [canSignContract, setCanSignContract] = useState(false);

  // seed defaults if missing
  useEffect(() => {
    if (!offerData) setOfferData(getDefaultOfferData(user));
    if (!contractData) setContractData(getDefaultContractData(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pdfLoading, setPdfLoading] = useState<null | TaskKey>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});

  // initialize signature slots for offer/contract
  useEffect(() => {
    setSignatures({
      offer: offerData?.signature || null,
      contract: contractData?.signature || null
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerData, contractData]);

  // ── Fetch doc status from backend (temp_data directory) ────────────────────
  const fetchDocStatus = async () => {
    if (!employeeId) return;
    try {
      setStatusLoading(true);
      const res = await fetch(`${API_BASE}/api/employee-docs-status/${encodeURIComponent(employeeId)}`);
      console.log('[MyOnboarding] Doc status response:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('[MyOnboarding] Doc status data:', data);
        setDocsState({
          application: data.application || { exists: false },
          offer: data.offer || { exists: false },
          contract: data.contract || { exists: false }
        });
      } else {
        console.warn('Failed to fetch doc status:', res.status);
      }
    } catch (e) {
      console.warn('Could not fetch doc status:', e);
    } finally {
      setStatusLoading(false);
    }
  };
  
  // ── Fetch contract preview from schema + Supabase ───────────────────────────
  const fetchContractPreview = async () => {
    if (!employeeId) return;
    try {
      const res = await fetch(`${API_BASE}/api/get-contract-preview/${encodeURIComponent(employeeId)}`);
      if (!res.ok) throw new Error(`Preview fetch failed: ${res.status}`);
      const data = await res.json();
      console.log('[MyOnboarding] Contract preview:', data);
      if (data.status === 'ok') {
        setContractPreview(data.contractData);
        setCanSignContract(data.canSign);
      } else {
        throw new Error(data.message || 'Failed to load preview');
      }
    } catch (err: any) {
      console.error('fetchContractPreview error:', err);
      alert('Failed to load contract preview: ' + (err.message || err));
    }
  };

  useEffect(() => {
    fetchDocStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  // ── Status helpers ────────────────────────────────────────────────────────
  // Application is always considered done (completed during registration)
  const isApplicationDone = true;
  // Offer step is commented out, so skip directly to contract
  // const isOfferDone = docsState.offer.exists || !!(offerData?.completedAt);
  const isContractDone = docsState.contract.exists || !!(contractData?.completedAt);

  // Contract is active immediately (no offer step)
  const isContractActive = isApplicationDone;

  const getTaskStatus = (key: TaskKey): 'done' | 'active' | 'locked' => {
    if (key === 'application') return 'done';  // Always done
    // if (key === 'offer') return isOfferDone ? 'done' : isOfferActive ? 'active' : 'locked';
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
      window.open(`${API_BASE}/api/generate-offer-pdf/${encodeURIComponent(employeeId)}`, '_blank');
      await fetchDocStatus();
    } catch (err: any) {
      alert('Failed to generate PDF: ' + (err?.message || err));
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Offer PDF download / accept ───────────────────────────────────────────
  const downloadOfferPdf = async (markAccepted = false) => {
    if (!offerData || !employeeId) {
      alert('No offer data present.');
      return;
    }
    try {
      setPdfLoading('offer');

      const payload = { ...offerData, id: employeeId };
      // if (markAccepted) {
      //   payload.accepted = true;
      //   payload.completedAt = new Date().toISOString();
      // }

      const saveRes = await fetch(`${API_BASE}/api/save-offer-acceptance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!saveRes.ok) throw new Error(`Save failed: ${saveRes.status}`);

      // open the generated PDF
      window.open(`${API_BASE}/api/generate-offer-pdf/${encodeURIComponent(employeeId)}`, '_blank');

      // persist locally as well
      localStorage.setItem(OFFER_STORAGE_KEY, JSON.stringify(payload));
      setOfferData(payload);

      // refresh status from server to pick up exists:true if backend recorded it
      await fetchDocStatus();
    } catch (err: any) {
      alert('Failed to generate offer PDF: ' + (err?.message || err));
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Contract Preview & Download ─────────────────────────────────────────────────
  const previewContract = async () => {
    await fetchContractPreview();
    setShowContractPreview(true);
  };
  
  const downloadContractPdf = async () => {
    // If contract already exists in temp_data, download PDF
    if (docsState.contract.exists) {
      // Generate PDF from existing JSON in temp_data
      window.open(`${API_BASE}/api/generate-contract-pdf/${encodeURIComponent(employeeId)}`, '_blank');
      return;
    }
    
    // Must preview before signing
    if (!contractPreview) {
      alert('Please preview the contract first before signing.');
      return;
    }
    
    if (!canSignContract) {
      alert('Some required information is missing. Please complete your profile first.');
      return;
    }
    
    try {
      setPdfLoading('contract');
      
      // Save contract data to temp_data/{employee_id}_contract.json
      const payload = { 
        ...contractPreview, 
        id: employeeId,
        signature: signatures.contract || '',
        completedAt: new Date().toISOString()
      };
      
      const saveRes = await fetch(`${API_BASE}/api/save-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!saveRes.ok) {
        const errText = await saveRes.text();
        throw new Error(`Save failed: ${saveRes.status} - ${errText}`);
      }
      
      console.log('[MyOnboarding] Contract saved to temp_data, generating PDF...');
      
      // Generate PDF from saved JSON (backend reads {employee_id}_contract.json from temp_data)
      window.open(`${API_BASE}/api/generate-contract-pdf/${encodeURIComponent(employeeId)}`, '_blank');
      
      // Refresh status to show contract as completed
      await fetchDocStatus();
      
      // Update local state
      localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(payload));
      setContractData(payload);
      
    } catch (err: any) {
      alert('Failed to generate contract: ' + (err?.message || err));
      console.error('Contract generation error:', err);
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Signature save handlers (with preview check for contract) ──────────────
  const handleSaveSignature = (taskKey: TaskKey, dataUrl: string) => {
    // For contract, must preview first
    if (taskKey === 'contract' && !contractPreview && !docsState.contract.exists) {
      alert('Please preview the contract before signing. Click "Preview Contract" button first.');
      return;
    }
    
    setSignatures(prev => ({ ...prev, [taskKey]: dataUrl }));
    if (taskKey === 'offer') {
      const updated = { ...(offerData || getDefaultOfferData(user)), signature: dataUrl, accepted: true, completedAt: new Date().toISOString() };
      localStorage.setItem(OFFER_STORAGE_KEY, JSON.stringify(updated));
      setOfferData(updated);
    } else if (taskKey === 'contract') {
      // Use preview data if available, otherwise use local data
      const baseData = contractPreview || contractData || getDefaultContractData(user);
      const updated = { ...baseData, signature: dataUrl, completedAt: new Date().toISOString() };
      localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(updated));
      setContractData(updated);
    }
  };

  const handleClearSignature = (taskKey: TaskKey) => {
    setSignatures(prev => ({ ...prev, [taskKey]: null }));
    if (taskKey === 'offer') {
      const updated = { ...(offerData || getDefaultOfferData(user)), signature: null, accepted: false, completedAt: '' };
      localStorage.setItem(OFFER_STORAGE_KEY, JSON.stringify(updated));
      setOfferData(updated);
    } else if (taskKey === 'contract') {
      const updated = { ...(contractData || getDefaultContractData(user)), signature: null, completedAt: '' };
      localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(updated));
      setContractData(updated);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Onboarding</h1>
          <p className="text-sm text-slate-500">Status is fetched from the backend — offer status will show as done if it exists in the database.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDocStatus}
            title="Refresh status"
            className="flex items-center space-x-2 px-3 py-2 border rounded-lg text-sm bg-white hover:bg-slate-50"
            disabled={statusLoading}
          >
            {statusLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            <span>{statusLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      <ul className="space-y-4">
        {TASKS.map((t) => {
          const status = getTaskStatus(t.key);
          const isDone = status === 'done';
          const isLocked = status === 'locked';
          const isActive = status === 'active';

          return (
            <li key={t.key} className="bg-white border border-slate-100 rounded-xl p-4 flex items-start space-x-4">
              <div className="mt-1">
                {isDone ? <CheckCircle2 className="text-jade-500" size={22} /> : <Circle className={`text-slate-300 ${isLocked ? 'opacity-40' : ''}`} size={22} />}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-bold ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{t.title}</p>
                    <p className="text-xs text-slate-400">{t.description}</p>
                  </div>

                  <div className="text-right">
                    {/* Per-item actions */}
                    {t.key === 'application' && (
                      <>
                        <div className="text-xs text-slate-400 mb-2">Status: Completed ✓</div>
                        <button
                          onClick={downloadApplicationPdf}
                          disabled={pdfLoading === 'application'}
                          className="text-sm font-bold py-1 px-3 rounded-xl bg-jade-500 text-white hover:bg-jade-600 disabled:opacity-50"
                        >
                          {pdfLoading === 'application' ? 'Generating...' : 'Download Offer Letter'}
                        </button>
                      </>
                    )}

                    {/* OFFER ACCEPTANCE STEP - COMMENTED OUT */}
                    {/* {t.key === 'offer' && (
                      <>
                        <div className="text-xs text-slate-400 mb-2">Status: {isDone ? 'Accepted' : isLocked ? 'Locked' : 'Pending'}</div>

                        {isActive && !isDone && (
                          <div className="space-y-2">
                            <div className="text-xs text-slate-500 mb-1 flex items-center space-x-2">
                              <FileSignature size={14} className="text-jade-500" />
                              <span>Digital signature</span>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <SignaturePad
                                onSave={(dataUrl: string) => handleSaveSignature('offer', dataUrl)}
                                onClear={() => handleClearSignature('offer')}
                              />

                              <div className="mt-3 flex justify-end space-x-2">
                                <button
                                  onClick={() => handleClearSignature('offer')}
                                  className="py-1 px-3 rounded-lg border text-sm"
                                >
                                  Clear
                                </button>
                                <button
                                  onClick={() => {
                                    if (!signatures.offer) {
                                      alert('Please sign before accepting the offer.');
                                      return;
                                    }
                                    downloadOfferPdf(true);
                                  }}
                                  disabled={pdfLoading === 'offer'}
                                  className={`py-1 px-3 rounded-lg text-sm font-bold ${signatures.offer ? 'bg-jade-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                                >
                                  {pdfLoading === 'offer' ? 'Processing...' : 'Accept & Generate'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isDone && (
                          <button
                            onClick={() => window.open(`${API_BASE}/api/generate-offer-pdf/${encodeURIComponent(employeeId)}`, '_blank')}
                            className="text-sm font-bold py-1 px-3 rounded-xl bg-jade-500 text-white hover:bg-jade-600"
                          >
                            View Offer PDF
                          </button>
                        )}
                      </>
                    )} */}

                    {t.key === 'contract' && (
                      <>
                        <div className="text-xs text-slate-400 mb-2">
                          Status: {isDone ? 'Completed' : isLocked ? 'Locked' : 'Pending'}
                        </div>

                        {isActive && !isDone && (
                          <div className="space-y-3">
                            {/* Preview Contract Button (MUST preview before signing) */}
                            <button
                              onClick={previewContract}
                              className="w-full py-2 px-4 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium text-sm transition-colors"
                            >
                              📄 Preview Contract Before Signing
                            </button>
                            
                            {/* Signing Section - Only show after preview */}
                            {contractPreview && (
                              <div className="space-y-2">
                                <div className="text-xs text-slate-500 mb-1 flex items-center space-x-2">
                                  <FileSignature size={14} className="text-jade-500" />
                                  <span>Sign & submit (Preview completed ✓)</span>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <SignaturePad
                                    onSave={(dataUrl: string) => handleSaveSignature('contract', dataUrl)}
                                    onClear={() => handleClearSignature('contract')}
                                  />
 
                                 <div className="mt-3 flex justify-end space-x-2">
                                    <button
                                      onClick={() => handleClearSignature('contract')}
                                      className="py-1 px-3 rounded-lg border text-sm"
                                    >
                                      Clear
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (!signatures.contract) {
                                          alert('Please sign the contract before submitting.');
                                          return;
                                        }
                                        if (!canSignContract) {
                                          alert('Some required information is missing. Please complete your profile first.');
                                          return;
                                        }
                                        downloadContractPdf();
                                      }}
                                      disabled={pdfLoading === 'contract' || !canSignContract}
                                      className={`py-1 px-3 rounded-lg text-sm font-bold ${
                                        signatures.contract && canSignContract
                                          ? 'bg-jade-500 text-white'
                                          : 'bg-slate-200 text-slate-500'
                                      }`}
                                    >
                                      {pdfLoading === 'contract' ? 'Processing...' : 'Submit & Generate'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Show message if preview not done yet */}
                            {!contractPreview && (
                              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                ⚠️ You must preview the contract before signing. Click the button above to preview.
                              </p>
                            )}
                          </div>
                        )}

                        {isDone && (
                          <button
                            onClick={() => window.open(`${API_BASE}/api/download-contract-pdf/${encodeURIComponent(employeeId)}`, '_blank')}
                            className="text-sm font-bold py-1 px-3 rounded-xl bg-jade-500 text-white hover:bg-jade-600"
                          >
                            📥 Download Contract
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="text-sm text-slate-500 text-center">
        Last checked: {statusLoading ? 'checking…' : (new Date()).toLocaleString()}
      </footer>
      
      {/* Contract Preview Modal */}
      {showContractPreview && contractPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowContractPreview(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-800">📄 Contract Preview</h2>
              <button onClick={() => setShowContractPreview(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">{contractPreview.company}</h3>
                <p className="text-slate-600">{contractPreview.companyAddress}</p>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Employee Details</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="py-2 font-semibold w-1/3">Name</td><td className="py-2">{contractPreview.fullName || 'N/A'}</td></tr>
                    <tr className="border-b"><td className="py-2 font-semibold">Position</td><td className="py-2">{contractPreview.position || 'N/A'}</td></tr>
                    <tr className="border-b"><td className="py-2 font-semibold">Department</td><td className="py-2">{contractPreview.department || 'N/A'}</td></tr>
                    <tr className="border-b"><td className="py-2 font-semibold">Start Date</td><td className="py-2">{contractPreview.startDate || 'N/A'}</td></tr>
                  </tbody>
                </table>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Terms</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="py-2 font-semibold w-1/3">Probation</td><td className="py-2">{contractPreview.probationMonths} months</td></tr>
                    <tr className="border-b"><td className="py-2 font-semibold">Working Hours</td><td className="py-2">{contractPreview.workHours}</td></tr>
                    <tr className="border-b"><td className="py-2 font-semibold">Annual Leave</td><td className="py-2">{contractPreview.leaveAnnual}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowContractPreview(false)} className="px-4 py-2 rounded-lg border hover:bg-slate-50">Close</button>
              <button onClick={() => setShowContractPreview(false)} className="px-4 py-2 rounded-lg bg-jade-500 text-white hover:bg-jade-600">✓ Proceed to Sign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOnboarding;
