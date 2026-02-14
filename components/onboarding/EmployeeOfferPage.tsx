import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  DollarSign,
  MapPin,
  Shield,
} from 'lucide-react';
import { SignaturePad } from '../design-system/SignaturePad';

const API_BASE = 'http://localhost:5001';

interface OfferDetails {
  offer_id: string;
  employee_id: string;
  employee_name: string;
  email: string;
  position: string;
  department: string;
  salary: number;
  jurisdiction: string;
  start_date: string;
  probation_months: number;
  expires_at: string;
  status: string;
  company_info: {
    name: string;
    address: string;
    website: string;
    registration: string;
  };
  benefits: {
    annual_leave: string;
    medical_coverage: string;
    statutory: string;
    probation: string;
  };
}

interface EmployeePortal {
  employee_id: string;
  employee_name: string;
  email: string;
  position: string;
  department: string;
  status: string;
  jurisdiction: string;
  start_date: string;
  onboarding_progress: {
    total: number;
    completed: number;
    percentage: number;
  };
  documents: Array<{
    id: string;
    document_name: string;
    document_type: string;
    required: boolean;
    submitted: boolean;
    submitted_at?: string;
  }>;
  forms: Array<{
    id: string;
    form_name: string;
    form_type: string;
    required: boolean;
    completed: boolean;
  }>;
}

export const EmployeeOfferPage: React.FC<{ offerId: string }> = ({ offerId }) => {
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [response, setResponse] = useState<'accepted' | 'rejected' | null>(null);
  const [portal, setPortal] = useState<EmployeePortal | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOffer();
  }, [offerId]);

  const fetchOffer = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/multiagent/onboarding/offer/${offerId}`);
      if (response.ok) {
        const data = await response.json();
        setOffer(data);
      } else {
        setError('Offer not found or expired');
      }
    } catch (err) {
      setError('Failed to load offer');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (responseType: 'accepted' | 'rejected') => {
    if (responseType === 'rejected' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setResponding(true);
    try {
      const response = await fetch(`${API_BASE}/api/multiagent/onboarding/offer/${offerId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: responseType,
          reason: rejectionReason,
          signature: signature,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResponse(responseType);
        if (responseType === 'accepted' && data.portal_url) {
          fetchPortal(data.employee_id);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit response');
      }
    } catch (err) {
      alert('Failed to submit response');
    } finally {
      setResponding(false);
    }
  };

  const fetchPortal = async (employeeId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/multiagent/onboarding/employee/${employeeId}/portal`);
      if (response.ok) {
        setPortal(await response.json());
      }
    } catch (err) {
      console.error('Failed to fetch portal:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-derivhr-500 mx-auto mb-4" size={40} />
          <p className="text-slate-500 font-medium">Loading your offer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">{error}</h1>
          <p className="text-slate-500">Please contact HR if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  if (!offer) return null;

  if (response === 'accepted' && portal) {
    return <EmployeeOnboardingPortal portal={portal} />;
  }

  if (response === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-slate-500" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">Response Recorded</h1>
          <p className="text-slate-500 mb-4">HR has been notified of your decision. Thank you for your interest in {offer.company_info.name}.</p>
        </div>
      </div>
    );
  }

  const isExpired = offer.status === 'expired' || (offer.expires_at && new Date(offer.expires_at) < new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-derivhr-500 to-derivhr-400"></div>
          
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-derivhr-500 to-derivhr-600 rounded-xl flex items-center justify-center text-white">
                  <Building2 size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{offer.company_info.name}</h1>
                  <p className="text-sm text-slate-500">{offer.company_info.address}</p>
                </div>
              </div>
              <span className="text-2xl">{offer.jurisdiction === 'MY' ? '🇲🇾' : '🇸🇬'}</span>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-slate-900 mb-2">Employment Offer</h2>
              <p className="text-slate-500">Dear {offer.employee_name},</p>
              <p className="text-slate-600 mt-2">We are pleased to offer you the position of <strong>{offer.position}</strong> at {offer.company_info.name}. Please review the details below.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Briefcase size={14} />
                  <span className="text-xs font-bold uppercase">Position</span>
                </div>
                <p className="font-bold text-slate-800">{offer.position}</p>
                <p className="text-sm text-slate-500">{offer.department || 'Department'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <DollarSign size={14} />
                  <span className="text-xs font-bold uppercase">Monthly Salary</span>
                </div>
                <p className="font-bold text-slate-800">
                  {offer.jurisdiction === 'MY' ? 'RM' : 'SGD'} {offer.salary?.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Calendar size={14} />
                  <span className="text-xs font-bold uppercase">Start Date</span>
                </div>
                <p className="font-bold text-slate-800">{offer.start_date || 'To be confirmed'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Clock size={14} />
                  <span className="text-xs font-bold uppercase">Probation</span>
                </div>
                <p className="font-bold text-slate-800">{offer.probation_months} months</p>
              </div>
            </div>

            <div className="bg-derivhr-50 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-derivhr-800 mb-3 flex items-center gap-2">
                <Sparkles size={16} />
                Benefits Package
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-derivhr-500" />
                  <span className="text-derivhr-700">Annual Leave: {offer.benefits.annual_leave}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-derivhr-500" />
                  <span className="text-derivhr-700">{offer.benefits.medical_coverage}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-derivhr-500" />
                  <span className="text-derivhr-700">Statutory: {offer.benefits.statutory}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-derivhr-500" />
                  <span className="text-derivhr-700">Probation: {offer.benefits.probation}</span>
                </div>
              </div>
            </div>

            {isExpired ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
                <h3 className="font-bold text-red-800">Offer Expired</h3>
                <p className="text-red-600 text-sm">This offer has expired. Please contact HR for assistance.</p>
              </div>
            ) : offer.status === 'offer_accepted' ? (
              <div className="bg-jade-50 border border-jade-200 rounded-xl p-6 text-center">
                <CheckCircle2 size={32} className="text-jade-500 mx-auto mb-3" />
                <h3 className="font-bold text-jade-800">Offer Already Accepted</h3>
                <p className="text-jade-600 text-sm">You have already accepted this offer.</p>
              </div>
            ) : offer.status === 'offer_rejected' ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <XCircle size={32} className="text-slate-400 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800">Offer Declined</h3>
                <p className="text-slate-600 text-sm">You have declined this offer.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-bold text-blue-800 mb-2">Digital Signature</h4>
                  <p className="text-sm text-blue-600 mb-3">Please sign below to accept the offer:</p>
                  <SignaturePad onSave={setSignature} onClear={() => setSignature(null)} />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleResponse('accepted')}
                    disabled={responding || !signature}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-jade-500 to-jade-600 text-white rounded-xl font-bold hover:from-jade-600 hover:to-jade-700 transition-all shadow-lg shadow-jade-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {responding ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        Accept Offer
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Please provide a reason for declining:');
                      if (reason) {
                        setRejectionReason(reason);
                        handleResponse('rejected');
                      }
                    }}
                    disabled={responding}
                    className="py-4 px-6 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Offer ID: {offer.offer_id?.slice(0, 8)}...</span>
              {offer.expires_at && (
                <span>Expires: {new Date(offer.expires_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmployeeOnboardingPortal: React.FC<{ portal: EmployeePortal }> = ({ portal }) => {
  const [activeForm, setActiveForm] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-jade-500 to-jade-400"></div>
          
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Welcome, {portal.employee_name}!</h1>
                <p className="text-slate-500">{portal.position} • {portal.department}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-jade-600">{portal.onboarding_progress.percentage}%</div>
                <div className="text-xs text-slate-400 font-bold uppercase">Complete</div>
              </div>
            </div>
            <div className="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-jade-500 to-jade-400 rounded-full transition-all duration-500"
                style={{ width: `${portal.onboarding_progress.percentage}%` }}
              />
            </div>
          </div>

          <div className="p-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={18} />
              Required Documents
            </h2>
            <div className="space-y-2 mb-6">
              {portal.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    {doc.submitted ? (
                      <CheckCircle2 size={18} className="text-jade-500" />
                    ) : (
                      <Clock size={18} className="text-slate-400" />
                    )}
                    <span className={doc.submitted ? 'text-slate-500 line-through' : 'text-slate-800 font-medium'}>
                      {doc.document_name}
                    </span>
                  </div>
                  {doc.required && !doc.submitted && (
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                  )}
                </div>
              ))}
            </div>

            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Shield size={18} />
              Onboarding Forms
            </h2>
            <div className="space-y-2">
              {portal.forms.map((form) => (
                <button
                  key={form.id}
                  onClick={() => !form.completed && setActiveForm(form.form_type)}
                  disabled={form.completed}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    form.completed
                      ? 'bg-jade-50 cursor-default'
                      : 'bg-slate-50 hover:bg-slate-100 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {form.completed ? (
                      <CheckCircle2 size={18} className="text-jade-500" />
                    ) : (
                      <ChevronRight size={18} className="text-slate-400" />
                    )}
                    <span className={form.completed ? 'text-slate-500 line-through' : 'text-slate-800 font-medium'}>
                      {form.form_name}
                    </span>
                  </div>
                  {form.required && !form.completed && (
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeOfferPage;
