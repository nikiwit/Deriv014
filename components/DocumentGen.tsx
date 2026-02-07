import React, { useState } from 'react';
import { generateComplexContract } from '../services/geminiService';
import { ContractParams } from '../types';
import { GLOBAL_JURISDICTIONS } from '../constants';
import { Bot, FileDown, Loader2, Scale, ThumbsUp, ThumbsDown, MessageSquare, Handshake, TrendingUp } from 'lucide-react';

export const DocumentGen: React.FC = () => {
  const [params, setParams] = useState<ContractParams>({
    employeeName: '',
    role: '',
    jurisdiction: 'Malaysia (Employment Act 1955)',
    salary: '',
    startDate: '',
    specialClauses: ''
  });
  
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setParams(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedDoc('');
    setFeedbackSubmitted(false);
    setNegotiationMode(false);
    
    // Simulate Intelligent Routing Analysis
    setModelStatus('local'); 
    await new Promise(r => setTimeout(r, 800));
    setModelStatus('premium');
    
    const promptData = JSON.stringify(params);
    const result = await generateComplexContract(promptData);
    
    setGeneratedDoc(result);
    setLoading(false);
    setModelStatus('idle');
  };

  const triggerNegotiation = () => {
      setNegotiationMode(true);
      // Simulate analysis
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
      {/* Input Form */}
      <div className="space-y-6 overflow-y-auto pr-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase text-sm tracking-widest">Smart Contract Assembly</h2>
          <p className="text-slate-500 text-sm font-medium">
            Leveraging <span className="text-derivhr-500 font-bold">Gemini 3 Pro</span> for Global compliance.
          </p>
        </div>

        <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Employee Name</label>
              <input 
                name="employeeName" 
                value={params.employeeName} 
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Role Title</label>
              <input 
                name="role"
                value={params.role}
                onChange={handleChange} 
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
              {GLOBAL_JURISDICTIONS.map(jur => <option key={jur} value={jur}>{jur}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Compensation</label>
              <input 
                name="salary"
                value={params.salary}
                onChange={handleChange}
                placeholder="e.g. USD 5,000 / MYR 8,000"
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
              rows={4}
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