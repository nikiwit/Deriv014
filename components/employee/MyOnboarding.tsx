import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_ONBOARDING_TASKS } from '../../constants';
import { OnboardingTask, TaskStatus, TaskCategory } from '../../types';
import {
  CheckCircle2,
  Circle,
  Lock,
  Clock,
  Upload,
  FileSignature,
  ChevronRight,
  Sparkles,
  FileText,
  Shield,
  Monitor,
  GraduationCap,
  Heart,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { SignaturePad } from '../design-system/SignaturePad';

const categoryConfig: Record<TaskCategory, { label: string; icon: React.ReactNode; color: string }> = {
  documentation: { label: 'Documentation', icon: <FileText size={18} />, color: 'bg-blue-500' },
  it_setup: { label: 'IT Setup', icon: <Monitor size={18} />, color: 'bg-purple-500' },
  compliance: { label: 'Compliance', icon: <Shield size={18} />, color: 'bg-red-500' },
  training: { label: 'Training', icon: <GraduationCap size={18} />, color: 'bg-amber-500' },
  culture: { label: 'Culture', icon: <Heart size={18} />, color: 'bg-pink-500' },
};

export const MyOnboarding: React.FC = () => {
  const { user } = useAuth();

  // Initialize tasks from template with status
  const [tasks, setTasks] = useState<OnboardingTask[]>(() =>
    DEFAULT_ONBOARDING_TASKS.map((t, idx) => ({
      ...t,
      id: `task_${idx}`,
      status: idx < 3 ? 'completed' : idx === 3 ? 'available' : 'locked' as TaskStatus,
      completedAt: idx < 3 ? new Date().toISOString() : undefined,
    }))
  );

  const [selectedTask, setSelectedTask] = useState<OnboardingTask | null>(null);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  // Determine jurisdiction from user nationality (default MY)
  const jurisdiction = user?.department?.toLowerCase().includes('singapore') ? 'sg' : 'my';

  // Reset signature when task changes
  useEffect(() => {
    setSignature(null);
  }, [selectedTask?.id]);

  // Fetch template when a task with templateId is selected
  useEffect(() => {
    if (!selectedTask?.templateId) {
      setTemplateContent(null);
      setTemplateError(null);
      return;
    }

    const templateName = `${selectedTask.templateId}_${jurisdiction}`;
    const params = new URLSearchParams({
      name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      email: user?.email || '',
      department: user?.department || '',
      start_date: user?.startDate || new Date().toISOString().split('T')[0],
      job_title: 'Software Engineer',
      company_name: jurisdiction === 'sg' ? 'Deriv Solutions Pte Ltd' : 'Deriv Solutions Sdn Bhd',
      employment_type: 'Permanent',
      probation_period: '3 months',
      currency: jurisdiction === 'sg' ? 'SGD' : 'MYR',
      acceptance_date: new Date().toISOString().split('T')[0],
      offer_date: new Date().toISOString().split('T')[0],
    });

    setTemplateLoading(true);
    setTemplateError(null);

    fetch(`/api/onboarding/templates/${templateName}?${params}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load template (${res.status})`);
        return res.json();
      })
      .then(data => {
        setTemplateContent(data.content);
      })
      .catch(err => {
        console.warn('Template fetch failed:', err);
        setTemplateError(err.message);
      })
      .finally(() => setTemplateLoading(false));
  }, [selectedTask?.templateId, selectedTask?.id]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progress = Math.round((completedCount / tasks.length) * 100);
  const totalMinutes = tasks.filter(t => t.status !== 'completed').reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const handleCompleteTask = (taskId: string) => {
    if (selectedTask?.requiresSignature && !signature) {
      alert('Please provide your digital signature to proceed.');
      return;
    }

    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return { ...t, status: 'completed' as TaskStatus, completedAt: new Date().toISOString() };
        }
        return t;
      });

      // Unlock next task
      const completedIdx = updated.findIndex(t => t.id === taskId);
      if (completedIdx < updated.length - 1 && updated[completedIdx + 1].status === 'locked') {
        updated[completedIdx + 1].status = 'available';
      }

      return updated;
    });
    setSelectedTask(null);
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<TaskCategory, OnboardingTask[]>);

  if (user?.onboardingComplete) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 bg-jade-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-jade-600" size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Onboarding Complete!</h2>
          <p className="text-slate-500 font-medium">You've completed all your onboarding tasks. Welcome to the team!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">My Onboarding</h1>
        <p className="text-slate-500 font-medium">Complete these tasks to finish your onboarding journey</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 sticky top-8">
            {/* Progress Ring */}
            <div className="flex justify-center mb-6">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    stroke="url(#progressGradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 4.02} 402`}
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-900">{progress}%</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Complete</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-jade-50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-jade-500" />
                  <span className="text-sm font-bold text-jade-800">Completed</span>
                </div>
                <span className="text-sm font-black text-jade-600">{completedCount}/{tasks.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Clock size={16} className="text-slate-500" />
                  <span className="text-sm font-bold text-slate-600">Time Remaining</span>
                </div>
                <span className="text-sm font-black text-slate-800">~{totalMinutes} min</span>
              </div>
            </div>

            {/* AI Tip */}
            <div className="mt-6 p-4 bg-gradient-to-br from-derivhr-50 to-indigo-50 rounded-xl border border-derivhr-100">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles size={14} className="text-derivhr-500" />
                <span className="text-[10px] font-black text-derivhr-600 uppercase tracking-widest">AI Tip</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Complete the documentation tasks first - they unlock IT and compliance modules faster!
              </p>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="lg:col-span-2 space-y-6">
          {(Object.entries(groupedTasks) as [TaskCategory, OnboardingTask[]][]).map(([category, categoryTasks]) => {
            const config = categoryConfig[category];
            const categoryComplete = categoryTasks.every(t => t.status === 'completed');

            return (
              <div key={category} className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
                <div className={`p-4 flex items-center space-x-3 ${categoryComplete ? 'bg-jade-50' : 'bg-slate-50'} border-b border-slate-100`}>
                  <div className={`p-2 ${config.color} rounded-xl text-white`}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800 tracking-tight">{config.label}</h3>
                    <p className="text-xs text-slate-500">
                      {categoryTasks.filter(t => t.status === 'completed').length}/{categoryTasks.length} completed
                    </p>
                  </div>
                  {categoryComplete && (
                    <div className="flex items-center space-x-1 text-jade-600">
                      <CheckCircle2 size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Done</span>
                    </div>
                  )}
                </div>

                <div className="divide-y divide-slate-100">
                  {categoryTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => task.status !== 'locked' && setSelectedTask(task)}
                      disabled={task.status === 'locked'}
                      className={`w-full p-4 text-left transition-all flex items-center space-x-4 ${
                        task.status === 'locked' ? 'opacity-50 cursor-not-allowed' :
                        task.status === 'completed' ? 'bg-jade-50/50' :
                        'hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="text-jade-500" size={22} />
                        ) : task.status === 'locked' ? (
                          <Lock className="text-slate-300" size={22} />
                        ) : (
                          <Circle className="text-slate-300" size={22} />
                        )}
                      </div>

                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{task.description}</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-[10px] font-bold text-slate-400">
                            <Clock size={10} className="inline mr-1" />
                            {task.estimatedMinutes} min
                          </span>
                          {task.priority === 'required' && (
                            <span className="text-[10px] font-bold text-red-500 uppercase">Required</span>
                          )}
                          {task.requiresUpload && (
                            <span className="text-[10px] font-bold text-blue-500">
                              <Upload size={10} className="inline mr-1" />Upload
                            </span>
                          )}
                          {task.requiresSignature && (
                            <span className="text-[10px] font-bold text-purple-500">
                              <FileSignature size={10} className="inline mr-1" />Sign
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      {task.status === 'available' && (
                        <ChevronRight className="text-slate-400" size={20} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden animate-fade-in ${selectedTask.templateId ? 'max-w-3xl max-h-[90vh] flex flex-col' : 'max-w-lg'}`}>
            <div className="h-1.5 bg-gradient-to-r from-jade-500 to-jade-400 flex-shrink-0"></div>
            <div className={`p-6 ${selectedTask.templateId ? 'flex flex-col overflow-hidden flex-1' : ''}`}>
              <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
                <div className={`p-2 ${categoryConfig[selectedTask.category].color} rounded-xl text-white`}>
                  {categoryConfig[selectedTask.category].icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {categoryConfig[selectedTask.category].label}
                  </p>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedTask.title}</h3>
                </div>
              </div>

              {/* Template document view */}
              {selectedTask.templateId ? (
                <>
                  {templateLoading && (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="animate-spin text-jade-500 mr-3" size={24} />
                      <span className="text-slate-500 font-medium">Loading document...</span>
                    </div>
                  )}
                  {templateError && (
                    <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-xl mb-4">
                      <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-bold text-red-700">Failed to load document</p>
                        <p className="text-xs text-red-500">{templateError}</p>
                      </div>
                    </div>
                  )}
                  {templateContent && (
                    <div className="overflow-y-auto flex-1 mb-4 border border-slate-200 rounded-xl">
                      <div className="p-6 prose prose-sm prose-slate max-w-none">
                        {templateContent.split('\n').map((line, i) => {
                          if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-black text-slate-900 mb-2">{line.slice(2)}</h1>;
                          if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-slate-800 mt-4 mb-2 border-b border-slate-100 pb-1">{line.slice(3)}</h2>;
                          if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-slate-700 my-1">{line.slice(2, -2)}</p>;
                          if (line.startsWith('- ')) return <li key={i} className="text-slate-600 ml-4 my-0.5">{line.slice(2)}</li>;
                          if (line.startsWith('---')) return <hr key={i} className="my-3 border-slate-200" />;
                          if (line.match(/^\*\*.*\*\*:/)) {
                            const parts = line.match(/^\*\*(.*?)\*\*:\s*(.*)/);
                            if (parts) return <p key={i} className="my-1"><span className="font-bold text-slate-700">{parts[1]}:</span> <span className="text-slate-600">{parts[2]}</span></p>;
                          }
                          if (line.startsWith('I,') || line.startsWith('I ')) return <p key={i} className="text-slate-600 my-2 italic">{line}</p>;
                          if (line.includes('_______')) return <p key={i} className="my-2 text-slate-400 border-b-2 border-dashed border-slate-300 pb-2 inline-block">{line.replace(/_+/g, '                    ')}</p>;
                          if (line.trim() === '') return <div key={i} className="h-2" />;
                          return <p key={i} className="text-slate-600 my-1">{line}</p>;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Signature area for template tasks */}
                  {selectedTask.requiresSignature && templateContent && (
                    <div className="bg-slate-50 rounded-xl p-6 mb-4 flex-shrink-0 border border-slate-100">
                      <p className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                        <FileSignature className="mr-2 text-jade-500" size={18} />
                        Digital Signature Required
                      </p>
                      <SignaturePad 
                        onSave={setSignature} 
                        onClear={() => setSignature(null)} 
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Standard task view */}
                  <p className="text-slate-600 mb-6">{selectedTask.description}</p>

                  <div className="flex items-center space-x-4 mb-6">
                    <div className="flex items-center space-x-2 text-sm text-slate-500">
                      <Clock size={16} />
                      <span>~{selectedTask.estimatedMinutes} minutes</span>
                    </div>
                    {selectedTask.priority === 'required' && (
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                    )}
                  </div>

                  {selectedTask.requiresUpload && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center mb-6 hover:border-jade-500 transition-colors cursor-pointer group">
                      <Upload className="mx-auto text-slate-400 mb-2 group-hover:text-jade-500 transition-colors" size={32} />
                      <p className="font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Click to upload or drag and drop</p>
                      <p className="text-sm text-slate-400">PDF, PNG, JPG up to 10MB</p>
                    </div>
                  )}

                  {selectedTask.requiresSignature && (
                    <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-100">
                      <p className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                        <FileSignature className="mr-2 text-jade-500" size={18} />
                        Digital Signature Required
                      </p>
                      <SignaturePad 
                        onSave={setSignature} 
                        onClear={() => setSignature(null)} 
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex space-x-3 flex-shrink-0">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCompleteTask(selectedTask.id)}
                  disabled={selectedTask.templateId ? templateLoading || !!templateError : (selectedTask.requiresSignature && !signature)}
                  className="flex-1 py-3 px-4 bg-jade-500 text-white rounded-xl font-bold hover:bg-jade-600 transition-all shadow-lg shadow-jade-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedTask.status === 'completed' ? 'Already Complete' :
                   selectedTask.templateId ? 'Sign & Submit' : 'Mark Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
