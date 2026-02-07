import React, { useState, useEffect, useRef } from 'react';
import { analyzeOnboarding } from '../services/geminiService';
import { listEmployees, createEmployee } from '../services/api';
import { InitialOnboardingJourney, OnboardingData, OnboardingJourney } from '../types';


import { NewEmployeeOnboardingForm } from './onboarding/NewEmployeeOnboardingForm';
import {
    Send,
    Sparkles,
    User,
    Briefcase,
    CreditCard,
    Calendar,
    Globe,
    Mail,
    ChevronRight,
    RefreshCcw,
    CheckCircle2,
    Loader2,
    ArrowRight,
    Fingerprint,
    Plus,
    Users,
    Clock,
    Filter,
    Search,
    MoreVertical,
    Eye,
    Bell,
    FileText,
    LayoutGrid,
    MessageSquare,
    Zap,
    Download,
    XCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:5001';

// Helper: load JSON from localStorage
function loadJson(key: string): Record<string, any> | null {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

interface ChatMessage {
    id: string;
    sender: 'ai' | 'user';
    text: string;
    step?: number;
}

// No more mock data — employees are loaded from the backend

type ViewMode = 'list' | 'wizard' | 'form';



export const Onboarding: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [employees, setEmployees] = useState<OnboardingJourney[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all');
    const [showFormMode, setShowFormMode] = useState(false);

    // Onboarding profile from localStorage (employee-submitted data)
    const [onboardingProfile, setOnboardingProfile] = useState<Record<string, any> | null>(null);
    const [offerData, setOfferData] = useState<Record<string, any> | null>(null);
    const [contractData, setContractData] = useState<Record<string, any> | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        setOnboardingProfile(loadJson('onboardingProfile'));
        setOfferData(loadJson('offerAcceptanceData'));
        setContractData(loadJson('contractData'));
    }, []);

    const isAppDone = onboardingProfile?.status === 'in_progress';
    const isOfferDone = !!(offerData && offerData.completedAt);
    const isContractDone = !!(contractData && contractData.completedAt);

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

    // Wizard state
    const [step, setStep] = useState(0);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '0', sender: 'ai', text: "Hello! I'm DerivHR, your Onboarding Architect. 🌟\n\nI'll guide you through setting up a compliant, personalized onboarding journey for your new hire.\n\nLet's start! What is the **Employee's Full Name**?", step: 0 }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string>('');
    const [formData, setFormData] = useState<OnboardingData>({
        fullName: '',
        email: '',
        role: '',
        department: '',
        startDate: '',
        nationality: 'Malaysian',
        salary: '',
        nric: ''
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Load employees from backend on mount
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const data = await listEmployees();
                const mapped: OnboardingJourney[] = data.employees.map(emp => {
                    const parts = emp.progress.split('/').map(Number);
                    const [submitted, total] = parts;
                    return {
                        id: emp.id,
                        employeeId: emp.id.slice(0, 13),
                        employeeName: emp.full_name,
                        tasks: [],
                        progress: total > 0 ? Math.round((submitted / total) * 100) : 0,
                        status: emp.status === 'active' ? 'completed' : 'in_progress',
                        startDate: emp.created_at?.split('T')[0] || '',
                    };
                });
                setEmployees(mapped);
            } catch (err) {
                console.error('Failed to load employees from backend:', err);
            }
        };
        fetchEmployees();
    }, []);

    // Filter employees
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || emp.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: employees.length,
        inProgress: employees.filter(e => e.status === 'in_progress').length,
        completed: employees.filter(e => e.status === 'completed').length,
        avgProgress: Math.round(employees.reduce((sum, e) => sum + e.progress, 0) / employees.length),
    };

    // Format NRIC input automatically
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;

        if (step === 7) {
            val = val.replace(/\D/g, '');
            if (val.length > 6) val = val.slice(0, 6) + '-' + val.slice(6);
            if (val.length > 9) val = val.slice(0, 9) + '-' + val.slice(9);
            val = val.slice(0, 14);
        }

        setInput(val);
    };

    const nextStep = async (value: string) => {
        if (!value) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: value };

        if (step === 7) {
             const nricRegex = /^\d{6}-?\d{2}-?\d{4}$/;
             if (!nricRegex.test(value)) {
                 setMessages(prev => [
                     ...prev,
                     userMsg,
                     { id: Date.now().toString(), sender: 'ai', text: "That doesn't look like a valid NRIC format (e.g. 910101-14-1234). Please double check." }
                 ]);
                 setInput('');
                 return;
             }
        }

        setMessages(prev => [...prev, userMsg]);
        setInput('');

        const newData = { ...formData };
        let nextPrompt = '';
        let nextStepNum = step + 1;

        switch (step) {
            case 0:
                newData.fullName = value;
                nextPrompt = `Nice to meet ${value}! What is their **Email Address**? 📧`;
                break;
            case 1:
                newData.email = value;
                nextPrompt = `Got it. What **Role** are they being hired for?`;
                break;
            case 2:
                newData.role = value;
                nextPrompt = `And which **Department** will they be joining?`;
                break;
            case 3:
                newData.department = value;
                nextPrompt = `What is the monthly **Salary (MYR)**? (For compliance checks)`;
                break;
            case 4:
                newData.salary = value;
                nextPrompt = `Is the candidate **Malaysian** or **Non-Malaysian**? (Crucial for Visa logic)`;
                break;
            case 5:
                newData.nationality = value as 'Malaysian' | 'Non-Malaysian';
                nextPrompt = `Almost done. When is the **Start Date**? 🗓️`;
                break;
            case 6:
                newData.startDate = value;
                if (newData.nationality === 'Malaysian') {
                    nextPrompt = `Since they are Malaysian, please enter their **NRIC Number** for statutory verification (EPF/SOCSO).`;
                    nextStepNum = 7;
                } else {
                    nextPrompt = `Perfect. I'm analyzing compliance requirements, visa needs (if applicable), and building the culture plan...`;
                    nextStepNum = 8;
                    triggerAnalysis(newData);
                }
                break;
            case 7:
                newData.nric = value;
                nextPrompt = `Perfect. I'm verifying the NRIC and building the onboarding journey...`;
                nextStepNum = 8;
                triggerAnalysis(newData);
                break;
            default:
                break;
        }

        setFormData(newData);
        setStep(nextStepNum);

        if (step !== 6 || newData.nationality === 'Malaysian') {
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: nextPrompt, step: nextStepNum }]);
            }, 600);
        }
    };

    const triggerAnalysis = async (data: OnboardingData) => {
        setLoading(true);
        if (data.nationality === 'Non-Malaysian') {
             setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: "Perfect. I'm analyzing compliance requirements, visa needs (if applicable), and building the culture plan...", step: 8 }]);
            }, 600);
        }

        const result = await analyzeOnboarding(data);
        setAnalysis(result);
        setLoading(false);

        // Register in backend
        let backendId = Date.now().toString();
        try {
            const created = await createEmployee({
                email: data.email,
                full_name: data.fullName,
                jurisdiction: data.nationality === 'Malaysian' ? 'MY' : 'SG',
                position: data.role,
                department: data.department,
                start_date: data.startDate,
                nric: data.nric || '',
            });
            backendId = created.id;
        } catch (err) {
            console.error('Backend employee creation failed:', err);
        }

        // Add new employee to local list
        const newEmployee: OnboardingJourney = {
            id: backendId,
            employeeId: backendId.slice(0, 13),
            employeeName: data.fullName,
            tasks: [],
            progress: 0,
            status: 'in_progress',
            startDate: data.startDate,
        };
        setEmployees(prev => [newEmployee, ...prev]);
    }

    const handleRestart = () => {
        setStep(0);
        setMessages([{ id: '0', sender: 'ai', text: "Ready for the next one! What is the **Employee's Full Name**?", step: 0 }]);
        setAnalysis('');
        setFormData({
            fullName: '',
            email: '',
            role: '',
            department: '',
            startDate: '',
            nationality: 'Malaysian',
            salary: '',
            nric: ''
        });
    };

    const handleStartNewOnboarding = () => {
        handleRestart();
        setViewMode('wizard');
    };

    const handleStartFormOnboarding = () => {
        handleRestart();
        setShowFormMode(true);
    };

    const handleBackToList = () => {
        setViewMode('list');
        setShowFormMode(false);
        handleRestart();
    };

    // const handleFormSubmit = (data: OnboardingData, analysisResult: string) => {
    //     // Add new employee to list
    //     const newEmployee: OnboardingJourney = {
    //         id: Date.now().toString(),
    //         employeeId: `EMP-2024-${String(employees.length + 19).padStart(3, '0')}`,
    //         employeeName: data.fullName,
    //         tasks: [],
    //         progress: 0,
    //         status: 'in_progress',
    //         startDate: data.startDate,
    //         aiPlan: analysisResult,
    //     };
    //     setEmployees(prev => [newEmployee, ...prev]);
    //     setShowFormMode(false);
    //     setViewMode('list');
    // };

    


    const handleFormSubmit = (data: OnboardingData, analysisResult: string) => {
        const newEmployee: InitialOnboardingJourney = {
            id: Date.now().toString(),
            employeeId: `EMP-2024-${String(employees.length + 19).padStart(3, '0')}`,
            createdAt: new Date().toISOString(),

            status: 'in_progress',
            progress: 0,
            aiPlan: analysisResult,

            fullName: data.fullName,
            email: data.email,
            role: data.role,
            department: data.department,
            startDate: data.startDate,
            nationality: data.nationality,
            nric: data.nric,

            tasks: []
        };

        setEmployees(prev => [newEmployee, ...prev]);
        setShowFormMode(false);
        setViewMode('list');
        };

    const renderControls = () => {
        if (loading || step >= 8) return null;

        if (step === 5) {
            return (
                <div className="flex space-x-3 animate-fade-in">
                    <button
                        onClick={() => nextStep('Malaysian')}
                        className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:border-derivhr-500 hover:bg-derivhr-50 rounded-xl font-bold text-slate-700 shadow-sm transition-all flex items-center justify-center space-x-2 transform hover:-translate-y-1"
                    >
                        <span className="text-xl">🇲🇾</span> <span>Malaysian</span>
                    </button>
                    <button
                        onClick={() => nextStep('Non-Malaysian')}
                        className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50 rounded-xl font-bold text-slate-700 shadow-sm transition-all flex items-center justify-center space-x-2 transform hover:-translate-y-1"
                    >
                        <span className="text-xl">🌍</span> <span>Non-Malaysian</span>
                    </button>
                </div>
            );
        }

        if (step === 6) {
             return (
                 <div className="flex space-x-3 animate-fade-in w-full">
                     <input
                        type="date"
                        value={input}
                        onChange={handleInput}
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none shadow-sm font-medium"
                     />
                     <button
                        onClick={() => nextStep(input)}
                        disabled={!input}
                        className="bg-derivhr-500 hover:bg-derivhr-600 text-white rounded-xl px-6 transition-colors shadow-lg shadow-derivhr-500/20 disabled:opacity-50"
                     >
                        <ArrowRight size={24} />
                     </button>
                 </div>
             )
        }

        return (
            <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-derivhr-500/20 focus-within:border-derivhr-500 transition-all animate-slide-in-up">
                {step === 7 && <Fingerprint className="text-slate-400 ml-2" size={20} />}
                <input
                    value={input}
                    onChange={handleInput}
                    onKeyDown={(e) => e.key === 'Enter' && nextStep(input)}
                    autoFocus
                    placeholder={step === 7 ? "e.g. 910101-14-1234" : "Type your answer..."}
                    className="flex-1 bg-transparent border-none text-slate-900 px-4 py-2 focus:ring-0 placeholder-slate-400 text-lg font-medium"
                    maxLength={step === 7 ? 14 : undefined}
                />
                <button
                    onClick={() => nextStep(input)}
                    disabled={!input}
                    className="p-2.5 bg-derivhr-500 hover:bg-derivhr-600 text-white rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-derivhr-500/20"
                >
                    <Send size={20} />
                </button>
            </div>
        );
    };

    // LIST VIEW
    if (viewMode === 'list') {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Onboarding Management</h1>
                        <p className="text-slate-500 font-medium">Track and manage employee onboarding journeys</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Mode Toggle */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setShowFormMode(false)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                    !showFormMode 
                                        ? 'bg-white text-derivhr-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <MessageSquare size={16} />
                                <span>AI Chat</span>
                            </button>
                            <button
                                onClick={() => setShowFormMode(true)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                    showFormMode 
                                        ? 'bg-white text-derivhr-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <LayoutGrid size={16} />
                                <span>Form</span>
                            </button>
                        </div>
                        <button
                            onClick={showFormMode ? handleStartFormOnboarding : handleStartNewOnboarding}
                            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold hover:from-derivhr-600 hover:to-derivhr-700 transition-all shadow-lg shadow-derivhr-500/30 transform hover:-translate-y-0.5"
                        >
                            <Plus size={20} />
                            <span>New Employee</span>
                            <Sparkles size={16} className="ml-1" />
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-slate-100 rounded-xl">
                                <Users className="text-slate-600" size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                        </div>
                        <span className="text-3xl font-black text-slate-900">{stats.total}</span>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-amber-50 rounded-xl">
                                <Clock className="text-amber-500" size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Progress</span>
                        </div>
                        <span className="text-3xl font-black text-amber-600">{stats.inProgress}</span>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-jade-50 rounded-xl">
                                <CheckCircle2 className="text-jade-500" size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed</span>
                        </div>
                        <span className="text-3xl font-black text-jade-600">{stats.completed}</span>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-derivhr-50 rounded-xl">
                                <Sparkles className="text-derivhr-500" size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Progress</span>
                        </div>
                        <span className="text-3xl font-black text-derivhr-600">{stats.avgProgress}%</span>
                    </div>
                </div>

                {/* ── Onboarding Profile Card (from localStorage) ─────────── */}
                {onboardingProfile && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-derivhr-500 to-derivhr-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                    {(onboardingProfile.fullName || '?').split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">{onboardingProfile.fullName || 'Unknown'}</h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {onboardingProfile.role || '—'} &bull; {onboardingProfile.department || '—'} &bull; Start: {onboardingProfile.startDate || '—'}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-derivhr-500 uppercase tracking-widest bg-derivhr-50 px-3 py-1 rounded-full">
                                Active Onboarding
                            </span>
                        </div>

                        {/* Profile details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                            <div className="bg-slate-50 rounded-xl p-3">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</div>
                                <div className="text-sm font-bold text-slate-800 truncate">{onboardingProfile.email || '—'}</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nationality</div>
                                <div className="text-sm font-bold text-slate-800">{onboardingProfile.nationality || '—'}</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Salary</div>
                                <div className="text-sm font-bold text-slate-800">MYR {onboardingProfile.salary || '—'}</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">NRIC</div>
                                <div className="text-sm font-bold text-slate-800">{onboardingProfile.nric || '—'}</div>
                            </div>
                        </div>

                        {/* Document status */}
                        <div className="flex items-center space-x-3 mb-5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Documents:</span>
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${isAppDone ? 'bg-jade-100 text-jade-700' : 'bg-slate-100 text-slate-400'}`}>
                                <CheckCircle2 size={12} /> <span>Application</span>
                            </span>
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${isOfferDone ? 'bg-jade-100 text-jade-700' : 'bg-slate-100 text-slate-400'}`}>
                                <CheckCircle2 size={12} /> <span>Offer Letter</span>
                            </span>
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${isContractDone ? 'bg-jade-100 text-jade-700' : 'bg-slate-100 text-slate-400'}`}>
                                <CheckCircle2 size={12} /> <span>Contract</span>
                            </span>
                        </div>

                        {/* Action button */}
                        <button
                            onClick={downloadFullReport}
                            disabled={reportLoading}
                            className="inline-flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold text-sm hover:from-derivhr-600 hover:to-derivhr-700 transition-all shadow-lg shadow-derivhr-500/20 disabled:opacity-60"
                        >
                            <Download size={16} />
                            <span>{reportLoading ? 'Generating Report…' : 'Get Full Report PDF'}</span>
                        </button>
                    </div>
                )}

                {/* Employee List */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none w-64"
                                />
                            </div>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
                            >
                                <option value="all">All Status</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <span className="text-sm text-slate-500 font-medium">{filteredEmployees.length} employees</span>
                    </div>

                    {/* Table */}
                    <div className="divide-y divide-slate-100">
                        {filteredEmployees.map((emp) => (
                            <div key={emp.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-derivhr-500 to-derivhr-600 rounded-xl flex items-center justify-center text-white font-bold text-sm mr-4">
                                    {emp.employeeName.split(' ').map(n => n[0]).join('')}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-slate-800">{emp.employeeName}</span>
                                        <span className="text-xs text-slate-400 font-medium">{emp.employeeId}</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Started {emp.startDate}</p>
                                </div>

                                <div className="w-48 mr-6">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-600">{emp.progress}%</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                            emp.status === 'completed' ? 'bg-jade-100 text-jade-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {emp.status === 'completed' ? 'Complete' : 'In Progress'}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                emp.status === 'completed' ? 'bg-jade-500' : 'bg-derivhr-500'
                                            }`}
                                            style={{ width: `${emp.progress}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <button className="p-2 text-slate-400 hover:text-derivhr-500 hover:bg-derivhr-50 rounded-lg transition-all" title="View Details">
                                        <Eye size={18} />
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="Send Reminder">
                                        <Bell size={18} />
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="More">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // FORM MODE
    if (showFormMode) {
        return (
            <div className="animate-fade-in">
                <NewEmployeeOnboardingForm
                    onSubmit={handleFormSubmit}
                    onCancel={handleBackToList}
                    existingEmployees={employees}
                />
            </div>
        );
    }

    // WIZARD VIEW
    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">

            {/* Chat Column */}
            <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${analysis ? 'w-1/3' : 'w-full max-w-2xl mx-auto'}`}>

                {/* Header (Only visible if full width) */}
                {!analysis && (
                    <div className="mb-8 text-center space-y-2 animate-fade-in">
                        <button
                            onClick={handleBackToList}
                            className="mb-4 text-sm text-slate-500 hover:text-derivhr-500 font-medium flex items-center mx-auto"
                        >
                            <ChevronRight className="rotate-180 mr-1" size={16} />
                            Back to Employee List
                        </button>
                        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-derivhr-500 to-red-600 rounded-2xl shadow-lg shadow-derivhr-500/20 mb-4">
                            <Sparkles className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">AI Onboarding Architect</h1>
                        <p className="text-slate-500 font-medium">I'll guide you through creating a personalized, compliant onboarding journey.</p>
                    </div>
                )}

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-4 pb-4 scroll-smooth" ref={scrollRef}>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm animate-fade-in ${
                                msg.sender === 'user'
                                ? 'bg-derivhr-dark text-white rounded-br-none shadow-md'
                                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-sm font-medium'
                            }`}>
                                {msg.sender === 'ai' && (
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Sparkles size={12} className="text-derivhr-500" />
                                        <span className="text-[10px] font-black text-derivhr-500 uppercase tracking-widest">DerivHR AI</span>
                                    </div>
                                )}
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start animate-pulse">
                             <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center space-x-3">
                                <Loader2 className="animate-spin text-derivhr-500" size={18} />
                                <span className="text-sm text-slate-500 font-bold tracking-tight">Analyzing with AI...</span>
                             </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="pt-4 pb-2">
                    {renderControls()}
                </div>
            </div>

            {/* Result Column (Slides In) */}
            {analysis && (
                <div className="w-2/3 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
                    <div className="h-1.5 bg-gradient-to-r from-derivhr-500 via-red-500 to-indigo-500"></div>

                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm text-2xl">
                                {formData.nationality === 'Malaysian' ? '🇲🇾' : '🌍'}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">{formData.fullName}</h2>
                                <p className="text-xs font-bold text-slate-500 flex items-center uppercase tracking-wide">
                                    {formData.role} • {formData.department} • <span className="text-derivhr-500 ml-1">Starts {formData.startDate}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleBackToList}
                                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                                Done
                            </button>
                            <button
                                onClick={handleRestart}
                                className="p-2 text-slate-400 hover:text-derivhr-500 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200"
                                title="Add Another"
                            >
                                <RefreshCcw size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                         <div className="prose prose-slate max-w-none">
                            {analysis.split('\n').map((line, i) => {
                                if (line.startsWith('##')) return <h2 key={i} className="text-2xl font-black text-slate-800 mt-6 mb-4 pb-2 border-b border-slate-100 tracking-tight">{line.replace('##', '').trim()}</h2>
                                if (line.startsWith('###')) return <h3 key={i} className="text-lg font-bold text-derivhr-600 mt-4 mb-2 tracking-tight uppercase text-xs">{line.replace('###', '').trim()}</h3>
                                if (line.includes('**')) {
                                    const parts = line.split('**');
                                    return (
                                        <p key={i} className="mb-2 text-sm font-medium leading-relaxed">
                                            {parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-slate-900 font-black">{part}</strong> : part)}
                                        </p>
                                    )
                                }
                                if (line.trim().startsWith('-')) return (
                                    <div key={i} className="flex items-start mb-2 ml-1">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-derivhr-400 mr-3 flex-shrink-0"></div>
                                        <span className="text-slate-600 leading-relaxed text-sm font-medium">{line.replace('-', '').trim()}</span>
                                    </div>
                                )
                                return <p key={i} className="mb-2 text-slate-600 text-sm font-medium leading-relaxed">{line}</p>
                            })}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center space-x-4">
                            <span className="flex items-center"><CheckCircle2 size={14} className="mr-1 text-jade-500" /> Compliance Checked</span>
                            <span className="flex items-center"><Globe size={14} className="mr-1 text-purple-500" /> Strategy Applied</span>
                        </div>
                        <button className="text-derivhr-500 hover:underline flex items-center space-x-1">
                            <FileText size={14} />
                            <span>Export to PDF</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
