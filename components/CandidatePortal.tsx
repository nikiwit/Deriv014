import React, { useState } from 'react';
import { CandidateProfile } from '../types';
import { reviewCandidateSubmission } from '../services/geminiService';
import { 
    User, 
    CreditCard, 
    FileText, 
    Check, 
    ChevronRight, 
    ChevronLeft, 
    Sparkles, 
    Loader2, 
    ShieldCheck,
    Zap,
    Lock
} from 'lucide-react';

interface CandidatePortalProps {
    onHrLogin?: () => void;
}

export const CandidatePortal: React.FC<CandidatePortalProps> = ({ onHrLogin }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [reviewResult, setReviewResult] = useState('');
    const [profile, setProfile] = useState<CandidateProfile>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        bankName: '',
        bankAccount: '',
        taxId: '',
        epfNo: '',
        emergencyContact: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        setLoading(true);
        const result = await reviewCandidateSubmission(profile);
        setReviewResult(result);
        setLoading(false);
        setStep(4);
    };

    const handleReset = () => {
        setStep(1);
        setProfile({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            bankName: '',
            bankAccount: '',
            taxId: '',
            epfNo: '',
            emergencyContact: ''
        });
        setReviewResult('');
    };

    const steps = [
        { id: 1, label: 'Personal Info', icon: <User size={18} /> },
        { id: 2, label: 'Payroll Setup', icon: <CreditCard size={18} /> },
        { id: 3, label: 'Review', icon: <FileText size={18} /> },
        { id: 4, label: 'Complete', icon: <Check size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Public Header */}
            <nav className="bg-derivhr-dark px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-xl">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-derivhr-500 rounded-lg flex items-center justify-center shadow-lg shadow-derivhr-500/20">
                        <Zap className="text-white w-5 h-5 fill-current" />
                    </div>
                    <span className="text-xl font-black text-white tracking-tighter">
                        Deriv<span className="text-derivhr-500">HR</span> <span className="text-slate-500 font-bold ml-1 text-sm tracking-widest uppercase">Careers</span>
                    </span>
                </div>
                <div>
                    {onHrLogin && (
                        <button 
                            onClick={onHrLogin}
                            className="flex items-center space-x-2 text-sm font-bold text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-xl hover:bg-white/5 border border-white/10"
                        >
                            <Lock size={16} />
                            <span>HR Portal Login</span>
                        </button>
                    )}
                </div>
            </nav>

            <div className="flex-1 flex flex-col items-center justify-start pt-12 pb-12 animate-fade-in relative overflow-hidden bg-white">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-derivhr-500/5 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]"></div>
                </div>

                <div className="w-full max-w-3xl relative z-10 px-4">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Welcome to the Team! 🚀</h1>
                        <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium">
                            We're thrilled to have you. Let's get your payroll and compliance details sorted so your first day is seamless.
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex justify-between items-center mb-8 px-4 md:px-12">
                        {steps.map((s, idx) => (
                            <div key={s.id} className="flex flex-col items-center relative z-10">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${step >= s.id ? 'bg-derivhr-500 text-white border-derivhr-50 shadow-lg scale-110' : 'bg-white text-slate-300 border-slate-100'}`}>
                                    {s.icon}
                                </div>
                                <span className={`text-[10px] mt-3 font-black uppercase tracking-widest ${step >= s.id ? 'text-derivhr-500' : 'text-slate-300'}`}>{s.label}</span>
                            </div>
                        ))}
                        {/* Connecting Line */}
                        <div className="absolute top-[186px] left-[calc(50%-300px)] md:left-[calc(50%-320px)] w-[600px] md:w-[640px] h-1 bg-slate-100 -z-0 rounded-full overflow-hidden hidden md:block">
                             <div 
                                className="h-full bg-derivhr-500 transition-all duration-500 ease-out"
                                style={{ width: `${((step - 1) / 3) * 100}%` }}
                             ></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                        {/* Top Decoration */}
                        <div className="h-1.5 bg-gradient-to-r from-derivhr-500 to-indigo-500 w-full"></div>

                        <div className="p-8 min-h-[400px]">
                            {step === 1 && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-2 bg-derivhr-50 rounded-lg text-derivhr-500">
                                            <User size={24} />
                                        </div>
                                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Personal Information</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">First Name</label>
                                            <input name="firstName" value={profile.firstName} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium" placeholder="e.g. Sarah" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">Last Name</label>
                                            <input name="lastName" value={profile.lastName} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium" placeholder="e.g. Jenkins" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">Personal Email</label>
                                            <input name="email" type="email" value={profile.email} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium" placeholder="sarah@example.com" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">Mobile Number</label>
                                            <input name="phone" value={profile.phone} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium" placeholder="+60 12 345 6789" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">Emergency Contact</label>
                                            <input name="emergencyContact" value={profile.emergencyContact} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium" placeholder="Name & Relationship" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-2 bg-jade-50 rounded-lg text-jade-500">
                                            <CreditCard size={24} />
                                        </div>
                                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Payroll & Banking</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">Bank Name</label>
                                            <select name="bankName" value={profile.bankName} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium appearance-none">
                                                <option value="">Select Bank...</option>
                                                <option value="Maybank">Maybank</option>
                                                <option value="CIMB">CIMB Bank</option>
                                                <option value="Public Bank">Public Bank</option>
                                                <option value="RHB">RHB Bank</option>
                                                <option value="Hong Leong">Hong Leong Bank</option>
                                                <option value="Foreign Bank">Foreign Bank (Requires SWIFT)</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">Account Number</label>
                                            <input name="bankAccount" value={profile.bankAccount} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium" placeholder="e.g. 114123456789" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">Income Tax ID (LHDN)</label>
                                            <input name="taxId" value={profile.taxId} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium" placeholder="Optional if pending" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">EPF / KWSP Number</label>
                                            <input name="epfNo" value={profile.epfNo} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium" placeholder="Optional if pending" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                            <FileText size={24} />
                                        </div>
                                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Review Details</h2>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
                                        <div className="flex justify-between border-b border-slate-200/50 pb-3">
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Full Name</span>
                                            <span className="font-bold text-slate-900 tracking-tight">{profile.firstName} {profile.lastName}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200/50 pb-3">
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Email</span>
                                            <span className="font-bold text-slate-900 tracking-tight">{profile.email}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200/50 pb-3">
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Bank Details</span>
                                            <span className="font-bold text-slate-900 tracking-tight">{profile.bankName} • {profile.bankAccount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tax / EPF</span>
                                            <span className="font-bold text-slate-900 tracking-tight">{profile.taxId || 'N/A'} / {profile.epfNo || 'N/A'}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start space-x-3 bg-derivhr-50 text-derivhr-900 p-5 rounded-2xl text-sm border border-derivhr-100">
                                        <Sparkles size={18} className="flex-shrink-0 mt-0.5 text-derivhr-500" />
                                        <p className="font-medium leading-relaxed">
                                            <strong className="font-black uppercase text-[10px] tracking-widest block mb-1">AI Validation Active</strong> Upon submission, our system will verify your bank format, check for missing compliance data, and instantly generate your Day 1 Welcome Kit.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="flex flex-col items-center justify-center h-full animate-fade-in text-center">
                                    {loading ? (
                                        <div className="py-20 flex flex-col items-center">
                                            <Loader2 className="animate-spin text-derivhr-500 mb-6 shadow-derivhr-500/20" size={56} />
                                            <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Analyzing your profile...</h3>
                                            <p className="text-slate-500 font-medium">Running compliance checks against Malaysian Employment Act 1955.</p>
                                        </div>
                                    ) : (
                                        <div className="w-full text-left">
                                            <div className="flex items-center justify-center mb-8">
                                                <div className="w-20 h-20 bg-jade-100 rounded-full flex items-center justify-center shadow-inner">
                                                    <Check className="text-jade-600" size={40} />
                                                </div>
                                            </div>
                                            <h2 className="text-3xl font-black text-slate-900 text-center mb-2 tracking-tighter">You're all set! 🎉</h2>
                                            <p className="text-center text-slate-500 mb-8 font-medium">Your profile has been verified and securely sent to HR.</p>
                                            
                                            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 shadow-inner">
                                                {/* Markdown rendering simulation */}
                                                {reviewResult.split('\n').map((line, i) => {
                                                    if (line.includes('✅')) return <h3 key={i} className="text-jade-700 font-black text-lg mb-4 flex items-center tracking-tight">{line}</h3>
                                                    if (line.includes('🔍')) return <h4 key={i} className="text-slate-800 font-black mt-6 mb-3 border-b border-slate-200 pb-1 uppercase text-xs tracking-widest">{line.replace('###', '')}</h4>
                                                    if (line.includes('🚀')) return <h4 key={i} className="text-derivhr-700 font-black mt-6 mb-3 border-b border-slate-200 pb-1 uppercase text-xs tracking-widest">{line.replace('###', '')}</h4>
                                                    if (line.trim().startsWith('-')) return <li key={i} className="ml-4 mb-2 text-slate-700 font-medium">{line.replace('-','')}</li>
                                                    return <p key={i} className="mb-1 text-slate-600 leading-relaxed font-medium">{line}</p>
                                                })}
                                            </div>

                                            <button 
                                                onClick={handleReset}
                                                className="mt-8 w-full py-4 bg-derivhr-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl"
                                            >
                                                Submit Another Profile
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Buttons */}
                        {step < 4 && (
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between">
                                <button 
                                    onClick={handleBack}
                                    disabled={step === 1}
                                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 flex items-center text-sm"
                                >
                                    <ChevronLeft size={18} className="mr-1" /> Back
                                </button>
                                {step === 3 ? (
                                    <button 
                                        onClick={handleSubmit}
                                        className="px-8 py-3 bg-derivhr-500 hover:bg-derivhr-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-derivhr-500/30 transition-all flex items-center transform hover:-translate-y-1"
                                    >
                                        Submit Profile <ShieldCheck size={18} className="ml-2" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleNext}
                                        disabled={
                                            (step === 1 && (!profile.firstName || !profile.email)) ||
                                            (step === 2 && (!profile.bankName || !profile.bankAccount))
                                        }
                                        className="px-8 py-3 bg-derivhr-dark hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center transform hover:-translate-y-1"
                                    >
                                        Next Step <ChevronRight size={18} className="ml-1" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="text-center mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        &copy; 2024 DerivHR AI. Secure Candidate Portal.
                    </div>
                </div>
            </div>
        </div>
    );
}