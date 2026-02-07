import React, { useState } from 'react';
import { MOCK_SANDBOXES, MOCK_FEEDBACK_LOGS } from '../constants';
import { Sandbox, FeedbackLog } from '../types';
import { 
  Play, 
  RotateCw, 
  AlertOctagon, 
  CheckCircle2, 
  BrainCircuit, 
  GitBranch, 
  MessageSquarePlus,
  BarChart3,
  ThumbsDown,
  ThumbsUp,
  MessageSquare,
  ChevronRight
} from 'lucide-react';

export const ModelTraining: React.FC = () => {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>(MOCK_SANDBOXES);
  const [trainingId, setTrainingId] = useState<string | null>(null);
  const [selectedSandboxId, setSelectedSandboxId] = useState<string | null>(null);

  const handleFineTune = (id: string) => {
    setSandboxes(prev => prev.map(sb => sb.id === id ? { ...sb, status: 'Training' } : sb));
    setTrainingId(id);
    
    setTimeout(() => {
        setSandboxes(prev => prev.map(sb => {
            if (sb.id === id) {
                return {
                    ...sb,
                    status: 'Live',
                    lastTrained: 'Just now',
                    feedbackCount: 0, 
                    accuracy: Math.min(sb.accuracy + 0.5, 99.9)
                };
            }
            return sb;
        }));
        setTrainingId(null);
    }, 3000);
  };

  const getStatusColor = (status: Sandbox['status']) => {
    switch (status) {
        case 'Live': return 'text-jade-600 border-jade-200 bg-jade-50';
        case 'Training': return 'text-derivhr-600 border-derivhr-200 bg-derivhr-50 animate-pulse';
        case 'Validation Failed': return 'text-red-600 border-red-200 bg-red-50';
        default: return 'text-slate-500 border-slate-200 bg-slate-100';
    }
  };

  const getFilteredLogs = (sandboxId: string) => {
    return MOCK_FEEDBACK_LOGS.filter(log => log.sandboxId === sandboxId);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Model Sandboxes & Fine-tuning</h1>
          <p className="text-slate-500 font-medium">Manage jurisdiction-specific models, review feedback loops, and trigger fine-tuning.</p>
        </div>
        <div className="flex space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 bg-derivhr-500 hover:bg-derivhr-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-derivhr-500/20">
                <GitBranch size={16} />
                <span className="text-sm">Create New Sandbox</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sandboxes.map((sb) => (
          <div key={sb.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md relative transition-all duration-300 ${selectedSandboxId === sb.id ? 'border-derivhr-500 ring-1 ring-derivhr-500' : 'border-slate-200'}`}>
            {trainingId === sb.id && (
                <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                    <RotateCw className="text-derivhr-500 animate-spin mb-4" size={48} />
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Fine-Tuning in Progress</h3>
                    <p className="text-slate-500 font-medium">Incorporating {sb.feedbackCount} new feedback points...</p>
                </div>
            )}
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-start cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setSelectedSandboxId(selectedSandboxId === sb.id ? null : sb.id)}>
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">{sb.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border font-black uppercase tracking-wider ${getStatusColor(sb.status)}`}>
                            {sb.status}
                        </span>
                    </div>
                    <div className="flex items-center text-slate-500 text-xs font-bold uppercase tracking-wide space-x-4">
                        <span className="flex items-center"><BrainCircuit size={14} className="mr-1" /> {sb.baseModel}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black">Jurisdiction</p>
                    <p className="text-derivhr-500 text-sm font-bold uppercase tracking-tight">{sb.jurisdiction}</p>
                </div>
            </div>

            <div className="p-6 grid grid-cols-2 gap-6 bg-slate-50/50">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Accuracy</span>
                        <BarChart3 size={16} className="text-purple-500" />
                    </div>
                    <div className="flex items-end space-x-2">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">{sb.accuracy}%</span>
                        <span className="text-[10px] font-black text-jade-600 mb-1">+0.3%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-derivhr-500 to-purple-500 h-full rounded-full" style={{ width: `${sb.accuracy}%` }}></div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Feedback</span>
                        <MessageSquarePlus size={16} className="text-amber-500" />
                    </div>
                    <div className="flex items-end space-x-2">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">{sb.feedbackCount}</span>
                        <span className="text-[10px] font-black text-slate-400 mb-1 uppercase">Logs</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">
                        Pending review
                    </p>
                </div>
            </div>

            {/* Expanded Feedback View */}
            {selectedSandboxId === sb.id && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 animate-fade-in">
                    <h4 className="text-xs font-black text-slate-500 mb-3 flex items-center uppercase tracking-widest">
                        <MessageSquare className="mr-2 text-derivhr-500" size={16} />
                        Recent Feedback Logs
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {getFilteredLogs(sb.id).length > 0 ? getFilteredLogs(sb.id).map(log => (
                            <div key={log.id} className="bg-white rounded-xl p-4 border border-slate-100 text-sm shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest ${log.source === 'Chat' ? 'bg-purple-50 text-purple-600' : 'bg-derivhr-50 text-derivhr-600'}`}>
                                        {log.source}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{log.timestamp}</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0">
                                        {log.feedbackType === 'positive' ? (
                                            <ThumbsUp size={14} className="text-jade-500" />
                                        ) : (
                                            <ThumbsDown size={14} className="text-red-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-slate-50 p-3 rounded-lg mb-2 text-slate-700 font-mono text-[11px] border border-slate-100">
                                            "{log.contentSnippet}"
                                        </div>
                                        {log.correction && (
                                            <div className="text-slate-600 text-xs font-medium leading-relaxed">
                                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">User Correction</span>
                                                {log.correction}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-500 text-xs text-center py-4 font-medium">No recent feedback logs available.</p>
                        )}
                    </div>
                </div>
            )}

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last trained: {sb.lastTrained}</span>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setSelectedSandboxId(selectedSandboxId === sb.id ? null : sb.id)}
                        className="px-3 py-1.5 text-slate-500 hover:text-derivhr-500 text-xs font-bold uppercase tracking-widest transition-colors border border-transparent hover:bg-white rounded-lg flex items-center"
                    >
                       {selectedSandboxId === sb.id ? 'Hide Logs' : 'View Feedback'} <ChevronRight size={14} className={`ml-1 transform transition-transform ${selectedSandboxId === sb.id ? 'rotate-90' : ''}`} />
                    </button>
                    <button 
                        onClick={() => handleFineTune(sb.id)}
                        disabled={sb.feedbackCount === 0 || sb.status === 'Training'}
                        className="flex items-center space-x-2 px-4 py-1.5 bg-derivhr-500 hover:bg-derivhr-600 text-white font-black uppercase tracking-widest text-[10px] rounded-lg transition-all shadow-lg shadow-derivhr-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Play size={14} />
                        <span>Fine-Tune</span>
                    </button>
                </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
            <div className="p-3 bg-amber-100 rounded-lg">
                <AlertOctagon className="text-amber-600" size={24} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Compliance Sandbox Mode</h3>
                <p className="text-slate-600 text-sm mb-4">
                    All models shown above are isolated from the production environment. 
                    Changes made here (fine-tuning) require Legal Team approval before deployment.
                </p>
                <div className="flex items-center space-x-4 text-xs font-mono text-slate-500">
                    <span className="flex items-center"><CheckCircle2 size={12} className="mr-1 text-emerald-600" /> Auto-Validation On</span>
                    <span className="flex items-center"><CheckCircle2 size={12} className="mr-1 text-emerald-600" /> PII Redaction On</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};