import React, { useState, useEffect } from 'react';
import { generateContractAPI, downloadDocument } from '../services/api';
import { ContractParams } from '../types';
import { Bot, FileDown, Loader2, Scale, ThumbsUp, ThumbsDown, MessageSquare, Handshake, TrendingUp, Download, CheckCircle2, User, Upload, ChevronDown } from 'lucide-react';

const API_BASE = 'http://localhost:5001';

const SUPPORTED_JURISDICTIONS = [
  'Malaysia (Employment Act 1955)',
  'Singapore (Employment Act)',
];

const DEFAULT_PARAMS: ContractParams = {
  employeeName: '',
  role: '',
  jurisdiction: 'Malaysia (Employment Act 1955)',
  salary: '',
  startDate: '',
  specialClauses: ''
};

interface EmployeeUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department?: string;
  start_date?: string;
  nationality?: string;
  nric?: string;
  position_title?: string;
}

function loadJson(key: string): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function nationalityToJurisdiction(nationality?: string): string {
  if (!nationality) return 'Malaysia (Employment Act 1955)';
  return nationality.toLowerCase().includes('singapore') || nationality.toLowerCase() === 'singaporean'
    ? 'Singapore (Employment Act)'
    : 'Malaysia (Employment Act 1955)';
}

export const DocumentGen: React.FC = () => {
  const [params, setParams] = useState<ContractParams>(DEFAULT_PARAMS);

  // Employees fetched from Supabase via backend
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('custom');
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Onboarding data from localStorage (for "Download Full Report" section)
  const [onboardingProfile, setOnboardingProfile] = useState<Record<string, any> | null>(null);
  const [offerData, setOfferData] = useState<Record<string, any> | null>(null);
  const [contractData, setContractData] = useState<Record<string, any> | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [generatedDoc, setGeneratedDoc] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<'idle' | 'local' | 'premium'>('idle');
  const [negotiationMode, setNegotiationMode] = useState(false);
  const [negotiationSuggestion, setNegotiationSuggestion] = useState('');

  // Feedback States
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Load employees on mount
  useEffect(() => {
    setOnboardingProfile(loadJson('onboardingProfile'));
    setOfferData(loadJson('offerAcceptanceData'));
    setContractData(loadJson('contractData'));

    setEmployeesLoading(true);
    fetch(`${API_BASE}/api/auth/users?role=employee`)
      .then(r => r.json())
      .then(data => setEmployees(data.users || []))
      .catch(() => setEmployees([]))
      .finally(() => setEmployeesLoading(false));
  }, []);

  const hasOnboardingData = !!onboardingProfile;
  const isAppDone = onboardingProfile?.status === 'in_progress';
  const isOfferDone = !!(offerData && offerData.completedAt);
  const isContractDone = !!(contractData && contractData.completedAt);

  // When an employee is selected, auto-fill params from their profile (with defaults for missing fields)
  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (employeeId === 'custom') {
      setParams(DEFAULT_PARAMS);
      return;
    }
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    setParams({
      employeeName: [emp.first_name, emp.last_name].filter(Boolean).join(' ') || 'Employee',
      role: emp.position_title || emp.role || 'Employee',
      jurisdiction: nationalityToJurisdiction(emp.nationality),
      salary: '',
      startDate: emp.start_date || '',
      specialClauses: ''
    });
  };

  const loadFromOnboarding = () => {
    if (!onboardingProfile) return;
    setSelectedEmployeeId('custom');
    setParams(prev => ({
      ...prev,
      employeeName: onboardingProfile.fullName || prev.employeeName,
      role: onboardingProfile.role || prev.role,
      salary: onboardingProfile.salary ? `MYR ${onboardingProfile.salary}` : prev.salary,
      startDate: onboardingProfile.startDate || prev.startDate,
    }));
  };

  const downloadFullReport = async () => {
    if (!onboardingProfile) return;
    try {
      setReportLoading(true);
      const employeeId = onboardingProfile.id || onboardingProfile.email || 'unknown';
      const payload = {
        id: employeeId,
        profile: onboardingProfile,
        offer: offerData || {},
        contract: contractData || {},
      };
      const saveRes = await fetch(`${API_BASE}/api/save-full-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!saveRes.ok) throw new Error(`Save failed: ${saveRes.status}`);
      window.open(`${API_BASE}/api/generate-full-report-pdf/${encodeURIComponent(employeeId)}`, '_blank');
    } catch (err: any) {
      console.error('Failed to generate full report', err);
      alert('Failed to generate report: ' + (err?.message || err));
    } finally {
      setReportLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setParams(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedDoc('');
    setFeedbackSubmitted(false);
    setNegotiationMode(false);

    setModelStatus('local');
    await new Promise(r => setTimeout(r, 400));
    setModelStatus('premium');

    const jurisdiction: 'MY' | 'SG' = params.jurisdiction.includes('Singapore') ? 'SG' : 'MY';

    // Resolve employee_id: from selected employee or from onboarding profile
    const selectedEmp = selectedEmployeeId !== 'custom'
      ? employees.find(e => e.id === selectedEmployeeId)
      : null;
    const employeeId = selectedEmp?.id || onboardingProfile?.id || onboardingProfile?.email || undefined;

    const request = {
      employee_name: params.employeeName || 'Employee',
      position: params.role || 'Employee',
      department: selectedEmp?.department || onboardingProfile?.department || 'General',
      jurisdiction,
      start_date: params.startDate || new Date().toISOString().split('T')[0],
      salary: parseFloat(params.salary.replace(/[^0-9.]/g, '')) || 0,
      nric: selectedEmp?.nric || onboardingProfile?.nric || '',
      employee_id: employeeId,
    };

    try {
      const result = await generateContractAPI(request);
      setGeneratedDoc(
        `Contract generated for ${result.employee_name} (${result.jurisdiction}).\n\n` +
        `Document ID: ${result.id}\n` +
        `Type: ${result.document_type}\n` +
        (result.employee_id ? `Employee ID: ${result.employee_id}\n` : '') +
        `\nThe contract has been saved. Click below to download.`
      );
      // Download via the contract JSON endpoint
      const downloadUrl = `${API_BASE}${result.download_url}`;
      downloadDocument(downloadUrl, `contract_${result.jurisdiction.toLowerCase()}_${result.employee_name.replace(/ /g, '_')}.json`);
    } catch (err: any) {
      setGeneratedDoc(`Error: ${err.message}\n\nPlease ensure the backend server is running on port 5001.`);
    } finally {
      setLoading(false);
      setModelStatus('idle');
    }
  };

  const triggerNegotiation = () => {
    setNegotiationMode(true);
    setTimeout(() => {
      setNegotiationSuggestion(
        "**Smart Negotiation Insight:**\n\n" +
        "The candidate's requested salary is **15% above market median** for this role in the selected jurisdiction.\n\n" +
        "**Recommended Counter-Offer:**\n" +
        "1. Maintain Base Salary.\n" +
        "2. Add **Performance Bonus** tied to quarterly KPIs.\n" +
        "3. Offer **Hybrid Work Flexibility** (Highly valued benefit globally).\n" +
        "\n_Probability of acceptance: 85%_"
      );
    }, 1500);
  };

  const handleSubmitFeedback = () => {
    setFeedbackSubmitted(true);
    setShowFeedback(false);
  };

  const selectedEmpDisplay = selectedEmployeeId !== 'custom'
    ? employees.find(e => e.id === selectedEmployeeId)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
      {/* Input Form */}
      <div className="space-y-6 overflow-y-auto pr-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase text-sm tracking-widest">Smart Contract Assembly</h2>
          <p className="text-slate-500 text-sm font-medium">
            Leveraging <span className="text-derivhr-500 font-bold">GPT-4o-mini</span> for Global compliance.
          </p>
        </div>

        {/* ── Employee Selector ──────────────────────────────────────────── */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <User size={12} className="text-derivhr-500" />
            Select Employee
          </label>
          <div className="relative">
            <select
              value={selectedEmployeeId}
              onChange={e => handleEmployeeSelect(e.target.value)}
              disabled={employeesLoading}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium text-sm appearance-none pr-10"
            >
              <option value="custom">— Custom (manual entry) —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {[emp.first_name, emp.last_name].filter(Boolean).join(' ')} — {emp.position_title || emp.role || 'Employee'} ({emp.department || 'N/A'})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {employeesLoading && (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Loading employees…
            </p>
          )}
          {selectedEmpDisplay && (
            <div className="grid grid-cols-2 gap-2 text-xs bg-derivhr-50 rounded-xl p-3">
              <span className="text-slate-500 font-bold">Email:</span>
              <span className="text-slate-700">{selectedEmpDisplay.email}</span>
              <span className="text-slate-500 font-bold">Department:</span>
              <span className="text-slate-700">{selectedEmpDisplay.department || '—'}</span>
              <span className="text-slate-500 font-bold">Nationality:</span>
              <span className="text-slate-700">{selectedEmpDisplay.nationality || '—'}</span>
              <span className="text-slate-500 font-bold">NRIC:</span>
              <span className="text-slate-700">{selectedEmpDisplay.nric || '—'}</span>
            </div>
          )}
        </div>

        {/* ── Contract Fields ────────────────────────────────────────────── */}
        <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Employee Name</label>
              <input
                name="employeeName"
                value={params.employeeName}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Role Title</label>
              <input
                name="role"
                value={params.role}
                onChange={handleChange}
                placeholder="e.g. Software Engineer"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Jurisdiction</label>
            <select
              name="jurisdiction"
              value={params.jurisdiction}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-bold text-sm appearance-none"
            >
              {SUPPORTED_JURISDICTIONS.map(jur => <option key={jur} value={jur}>{jur}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Compensation</label>
              <input
                name="salary"
                value={params.salary}
                onChange={handleChange}
                placeholder="e.g. MYR 5,000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date</label>
              <input
                name="startDate"
                type="date"
                value={params.startDate}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex justify-between">
              <span>Special Clauses / Complexity</span>
              <span className="text-derivhr-500 font-black">PREMIUM MODEL</span>
            </label>
            <textarea
              name="specialClauses"
              value={params.specialClauses}
              onChange={handleChange}
              rows={3}
              placeholder="E.g., Non-compete, IP assignment, Stock options vesting schedule..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none resize-none transition-all font-medium text-sm"
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 py-3 bg-derivhr-500 hover:bg-derivhr-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-derivhr-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Bot size={18} />
                  <span>Generate Contract</span>
                </>
              )}
            </button>

            {generatedDoc && (
              <button
                onClick={triggerNegotiation}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-black uppercase tracking-widest text-xs rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all"
              >
                <Handshake size={18} />
                <span>Negotiate Offer</span>
              </button>
            )}
          </div>
        </div>

        {negotiationMode && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-fade-in shadow-inner">
            <h3 className="text-derivhr-700 font-black flex items-center mb-4 uppercase text-xs tracking-widest">
              <TrendingUp className="mr-2" size={18} />
              Smart Negotiation Copilot
            </h3>
            {negotiationSuggestion ? (
              <div className="prose prose-sm text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">
                {negotiationSuggestion.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)}
              </div>
            ) : (
              <div className="flex items-center text-derivhr-500 font-bold text-xs uppercase tracking-wider">
                <Loader2 className="animate-spin mr-2" size={16} /> Analyzing market rates...
              </div>
            )}
          </div>
        )}

        {/* ── Onboarding Profile Data ──────────────────────────────────── */}
        {hasOnboardingData && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                <User className="mr-2 text-derivhr-500" size={14} />
                Onboarding Profile Data
              </h3>
              <button
                onClick={loadFromOnboarding}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-derivhr-50 text-derivhr-600 rounded-lg text-xs font-bold hover:bg-derivhr-100 transition-all"
              >
                <Upload size={12} />
                <span>Load into Form</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-slate-50 rounded-lg p-2">
                <span className="text-slate-400 font-bold">Name:</span>{' '}
                <span className="text-slate-800 font-medium">{onboardingProfile?.fullName || '—'}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <span className="text-slate-400 font-bold">Role:</span>{' '}
                <span className="text-slate-800 font-medium">{onboardingProfile?.role || '—'}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <span className="text-slate-400 font-bold">Dept:</span>{' '}
                <span className="text-slate-800 font-medium">{onboardingProfile?.department || '—'}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <span className="text-slate-400 font-bold">Salary:</span>{' '}
                <span className="text-slate-800 font-medium">MYR {onboardingProfile?.salary || '—'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold ${isAppDone ? 'bg-jade-100 text-jade-700' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle2 size={10} /> <span>Application</span>
              </span>
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold ${isOfferDone ? 'bg-jade-100 text-jade-700' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle2 size={10} /> <span>Offer</span>
              </span>
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold ${isContractDone ? 'bg-jade-100 text-jade-700' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle2 size={10} /> <span>Contract</span>
              </span>
            </div>

            <button
              onClick={downloadFullReport}
              disabled={reportLoading}
              className="w-full py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 hover:from-derivhr-600 hover:to-derivhr-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-derivhr-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
            >
              <Download size={16} />
              <span>{reportLoading ? 'Generating…' : 'Download Full Report PDF'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Preview Area */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden flex flex-col h-full relative shadow-2xl">

        {/* Status Bar */}
        <div className="bg-slate-50/50 p-4 border-b border-slate-50 flex justify-between items-center h-14">
          <div className="flex items-center space-x-2">
            <Scale size={18} className="text-slate-400" />
            <span className="font-black text-slate-500 text-[10px] uppercase tracking-widest">Document Preview</span>
          </div>
          {modelStatus !== 'idle' && (
            <div className="flex items-center space-x-3 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
              {modelStatus === 'local' && (
                <>
                  <div className="w-1.5 h-1.5 bg-jade-500 rounded-full animate-pulse"></div>
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Structure Analysis</span>
                </>
              )}
              {modelStatus === 'premium' && (
                <>
                  <div className="w-1.5 h-1.5 bg-derivhr-500 rounded-full animate-pulse"></div>
                  <span className="text-[9px] text-derivhr-600 font-black uppercase tracking-wider">Legal Reasoning</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-auto p-10 font-serif bg-white text-slate-900 pb-32 shadow-inner">
          {generatedDoc ? (
            <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed">
              {generatedDoc.split('\n').map((line, i) => (
                <p key={i} className="min-h-[1em] mb-2">{line}</p>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
              <FileDown size={48} className="opacity-10" />
              <p className="text-xs font-bold uppercase tracking-widest">Drafting engine idle</p>
              <p className="text-[10px] text-slate-300">Select an employee or fill fields manually, then click Generate</p>
            </div>
          )}
        </div>

        {/* Feedback Panel */}
        {generatedDoc && (
          <div className={`absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-6 transition-all duration-500 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] ${showFeedback ? 'h-72' : 'h-auto'}`}>
            {!showFeedback ? (
              <div className="flex justify-between items-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                  {feedbackSubmitted ? (
                    <span className="text-jade-600 flex items-center">
                      <CheckCircle2 className="mr-2" size={16} /> Feedback Recorded
                    </span>
                  ) : (
                    <span>Validate legal accuracy</span>
                  )}
                </div>
                {!feedbackSubmitted && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => { setFeedbackType('positive'); handleSubmitFeedback(); }}
                      className="p-2 bg-jade-50 hover:bg-jade-100 text-jade-600 rounded-xl transition-all border border-jade-100"
                    >
                      <ThumbsUp size={18} />
                    </button>
                    <button
                      onClick={() => { setFeedbackType('negative'); setShowFeedback(true); }}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-100"
                    >
                      <ThumbsDown size={18} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-slate-800 font-black flex items-center uppercase text-[10px] tracking-widest">
                    <MessageSquare className="mr-2 text-derivhr-500" size={16} />
                    Suggest Correction
                  </h4>
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mb-3 font-medium">
                  Correction added to the <span className="text-derivhr-500 font-black tracking-tight">{params.jurisdiction}</span> sandbox.
                </p>
                <textarea
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 resize-none focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-medium leading-relaxed"
                  placeholder="Explain the error or paste the correct clause..."
                />
                <button
                  onClick={handleSubmitFeedback}
                  className="mt-4 w-full py-2.5 bg-derivhr-dark text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl"
                >
                  Submit Correction
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
