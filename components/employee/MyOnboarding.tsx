import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_ONBOARDING_TASKS, TASK_DEPENDENCIES, ONBOARDING_CATEGORY_WEIGHTS } from '../../constants';
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
  AlertCircle,
  AlertTriangle,
  Calendar,
  Trophy
} from 'lucide-react';
import { SignaturePad } from '../design-system/SignaturePad';

const categoryConfig: Record<TaskCategory, { label: string; icon: React.ReactNode; color: string }> = {
  documentation: { label: 'Documentation', icon: <FileText size={18} />, color: 'bg-blue-500' },
  it_setup: { label: 'IT Setup', icon: <Monitor size={18} />, color: 'bg-purple-500' },
  compliance: { label: 'Compliance', icon: <Shield size={18} />, color: 'bg-red-500' },
  training: { label: 'Training', icon: <GraduationCap size={18} />, color: 'bg-amber-500' },
  culture: { label: 'Culture', icon: <Heart size={18} />, color: 'bg-pink-500' },
};

const API_BASE = '';

// Helper to get task IDs for backend sync
const TASK_ID_MAP: Record<string, string> = {
  'doc_identity': 'doc_identity',
  'doc_personal_info': 'doc_personal_info',
  'doc_offer': 'doc_offer',
  'doc_contract': 'doc_contract',
  'doc_tax': 'doc_tax',
  'doc_bank': 'doc_bank',
  'it_policy': 'it_policy',
  'it_2fa': 'it_2fa',
  'it_email': 'it_email',
  'comp_harassment': 'comp_harassment',
  'comp_pdpa': 'comp_pdpa',
  'comp_safety': 'comp_safety',
  'train_overview': 'train_overview',
  'train_role': 'train_role',
  'culture_slack': 'culture_slack',
  'culture_buddy': 'culture_buddy',
  'culture_profile': 'culture_profile',
  'culture_org_chart': 'culture_org_chart',
  'culture_team_intro': 'culture_team_intro',
};

// Helper to determine if a task should be unlocked based on dependencies
const isTaskUnlocked = (taskId: string, completedTaskIds: Set<string>): boolean => {
  const deps = TASK_DEPENDENCIES[taskId] || [];
  if (deps.length === 0) return true;
  return deps.every(depId => completedTaskIds.has(depId));
};

export const MyOnboarding: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  // Get personalized tips based on department/role
  const getPersonalizedTips = () => {
    const dept = user?.department?.toLowerCase() || '';
    const role = user?.employeeId ? 'employee' : 'new';
    
    if (dept.includes('engineer') || dept.includes('tech') || dept.includes('dev')) {
      return "As an engineer, you'll need to complete IT security training and set up your development environment.";
    } else if (dept.includes('sales') || dept.includes('marketing')) {
      return "As part of Sales/Marketing, focus on CRM training and compliance modules.";
    } else if (dept.includes('finance') || dept.includes('account')) {
      return "Finance team members need additional compliance training - plan accordingly.";
    }
    return "Complete the documentation tasks first - they unlock IT and compliance modules faster!";
  };

  // Get user's start date or use today
  const startDate = useMemo(() => {
    return user?.startDate ? new Date(user.startDate) : new Date();
  }, [user?.startDate]);

  // Calculate due date for a task
  const getDueDate = (dueDaysFromStart: number | undefined): Date | null => {
    if (!dueDaysFromStart) return null;
    const due = new Date(startDate);
    due.setDate(due.getDate() + dueDaysFromStart);
    return due;
  };

  // Check if task is overdue
  const isOverdue = (dueDate: Date | null): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return dueDate < today;
  };

  // Initialize tasks from template with proper IDs and status
  const [tasks, setTasks] = useState<OnboardingTask[]>(() => {
    return DEFAULT_ONBOARDING_TASKS.map((t, idx) => {
      // Generate proper task ID from the task definition
      const taskId = `task_${t.title.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_|_$/g, '')}`;
      return {
        ...t,
        id: taskId,
        status: isTaskUnlocked(taskId, new Set()) ? 'available' as TaskStatus : 'locked' as TaskStatus,
        completedAt: undefined,
        startedAt: undefined,
        dueDate: getDueDate(t.dueDaysFromStart)?.toISOString(),
        isOverdue: false,
      };
    });
  });

  const [selectedTask, setSelectedTask] = useState<OnboardingTask | null>(null);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch tasks from backend on mount
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.employeeId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/multiagent/onboarding/employee/${user.employeeId}/tasks`);
        if (response.ok) {
          const data = await response.json();
          
          // Map backend tasks to frontend tasks
          setTasks(prev => prev.map(task => {
            // Find matching task in backend data
            for (const category of Object.values(data.tasks) as any[][]) {
              const backendTask = category.find((t: any) => 
                t.title.toLowerCase().includes(task.title.toLowerCase().split(' ')[0])
              );
              if (backendTask) {
                return {
                  ...task,
                  status: backendTask.status as TaskStatus,
                  completedAt: backendTask.status === 'completed' ? new Date().toISOString() : undefined,
                };
              }
            }
            return task;
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch tasks from backend:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user?.employeeId]);

  // Determine jurisdiction from user nationality (default MY)
  const jurisdiction = user?.department?.toLowerCase().includes('singapore') ? 'sg' : 'my';

  // Reset signature when task changes
  useEffect(() => {
    setSignature(null);
  }, [selectedTask?.id]);

  // Show welcome modal on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('onboarding_visited');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('onboarding_visited', 'true');
    }
  }, []);

  // Calculate weighted progress based on category weights
  const progressData = useMemo(() => {
    const completedTaskIds = new Set(tasks.filter(t => t.status === 'completed').map(t => t.id));
    
    const categoryStats = {} as Record<TaskCategory, { completed: number; total: number; weight: number }>;
    
    // Initialize categories
    (Object.keys(ONBOARDING_CATEGORY_WEIGHTS) as TaskCategory[]).forEach(cat => {
      categoryStats[cat] = { completed: 0, total: 0, weight: ONBOARDING_CATEGORY_WEIGHTS[cat] };
    });
    
    // Count by category
    tasks.forEach(task => {
      if (categoryStats[task.category]) {
        categoryStats[task.category].total++;
        if (task.status === 'completed') {
          categoryStats[task.category].completed++;
        }
      }
    });
    
    // Calculate weighted progress
    let weightedProgress = 0;
    let totalRequired = 0;
    let completedRequired = 0;
    
    Object.values(categoryStats).forEach(stat => {
      if (stat.total > 0) {
        const categoryProgress = stat.completed / stat.total;
        weightedProgress += categoryProgress * stat.weight;
      }
      // Track required tasks
      const requiredInCategory = tasks.filter(t => t.category === Object.keys(categoryStats).find(cat => categoryStats[cat] === stat) && t.priority === 'required');
      completedRequired += requiredInCategory.filter(t => t.status === 'completed').length;
      totalRequired += requiredInCategory.length;
    });
    
    const requiredProgress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
    const overallProgress = Math.round(weightedProgress * 100);
    
    // Calculate estimated completion date
    // Assume employee works 2 hours/day on onboarding
    const remainingMinutes = tasks.filter(t => t.status !== 'completed' && t.priority === 'required').reduce((sum, t) => sum + t.estimatedMinutes, 0);
    const daysToComplete = Math.ceil(remainingMinutes / 120); // 2 hours per day
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + daysToComplete);
    
    return {
      weightedPercentage: overallProgress,
      requiredPercentage: requiredProgress,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      totalTasks: tasks.length,
      requiredCompleted: completedRequired,
      requiredTotal: totalRequired,
      totalMinutesRemaining: remainingMinutes,
      estimatedCompletionDate: daysToComplete > 0 ? estimatedCompletion.toISOString() : undefined,
    };
  }, [tasks]);

  // Update overdue status when tasks or start date changes
  useEffect(() => {
    setTasks(prev => prev.map(task => ({
      ...task,
      isOverdue: task.status !== 'completed' && isOverdue(task.dueDate ? new Date(task.dueDate) : null),
    })));
  }, [startDate]);

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

  // Use weighted progress for display
  const progress = progressData.weightedPercentage;
  const completedCount = progressData.completedTasks;
  const totalMinutes = progressData.totalMinutesRemaining;

  const handleCompleteTask = async (taskId: string) => {
    if (selectedTask?.requiresSignature && !signature) {
      alert('Please provide your digital signature to proceed.');
      return;
    }

    const now = new Date().toISOString();

    // Update local state with dependency-based unlocking
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return { 
            ...t, 
            status: 'completed' as TaskStatus, 
            completedAt: now,
            startedAt: t.startedAt || now,
          };
        }
        return t;
      });

      // Get completed task IDs
      const completedIds = new Set(updated.filter(t => t.status === 'completed').map(t => t.id));
      
      // Unlock tasks based on dependencies (DAG)
      return updated.map(t => {
        if (t.status === 'locked' && isTaskUnlocked(t.id, completedIds)) {
          return { ...t, status: 'available' as TaskStatus };
        }
        return t;
      });
    });

    // Save to backend
    if (user?.employeeId) {
      try {
        const task = tasks.find(t => t.id === taskId);
        const taskIdMap: Record<string, string> = {
          'task_0': 'doc_identity',
          'task_1': 'doc_offer',
          'task_2': 'doc_contract',
          'task_3': 'doc_tax',
          'task_4': 'doc_bank',
          'task_5': 'it_policy',
          'task_6': 'it_2fa',
          'task_7': 'it_email',
          'task_8': 'comp_harassment',
          'task_9': 'comp_pdpa',
          'task_10': 'comp_safety',
          'task_11': 'train_overview',
          'task_12': 'train_role',
          'task_13': 'culture_slack',
          'task_14': 'culture_buddy',
          'task_15': 'culture_profile',
        };
        
        const backendTaskId = taskIdMap[taskId];
        
        // If there's a signature or file to upload, send them together with task completion
        if ((selectedTask?.requiresSignature && signature) || (selectedTask?.requiresUpload && uploadedFile)) {
          const formData = new FormData();
          formData.append('status', 'completed');
          
          if (signature) {
            formData.append('signature', signature);
          }
          
          if (uploadedFile) {
            formData.append('file', uploadedFile);
          }
          
          await fetch(`${API_BASE}/api/multiagent/onboarding/employee/${user.employeeId}/tasks/${backendTaskId}`, {
            method: 'POST',
            body: formData,
          });
        } else if (backendTaskId) {
          await fetch(`${API_BASE}/api/multiagent/onboarding/employee/${user.employeeId}/tasks/${backendTaskId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' }),
          });
        }
      } catch (err) {
        console.warn('Failed to save task to backend:', err);
      }
    }

    // Reset form state
    setSignature(null);
    setUploadedFile(null);
    setSelectedTask(null);
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<TaskCategory, OnboardingTask[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="animate-spin text-derivhr-500 mx-auto mb-4" size={40} />
          <p className="text-slate-500 font-medium">Loading your onboarding tasks...</p>
        </div>
      </div>
    );
  }

  // Welcome Modal for first-time visitors
  if (showWelcome) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
          <div className="h-2 bg-gradient-to-r from-jade-500 to-jade-400"></div>
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-jade-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="text-jade-600" size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">Welcome to Deriv!</h2>
            <p className="text-slate-600 mb-6">
              We're excited to have you join our team. Complete your onboarding tasks to get started.
            </p>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-bold text-slate-800 mb-3">Your Onboarding Journey:</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center"><CheckCircle2 size={16} className="text-jade-500 mr-2" /> Complete documentation tasks</li>
                <li className="flex items-center"><CheckCircle2 size={16} className="text-jade-500 mr-2" /> Set up IT & security</li>
                <li className="flex items-center"><CheckCircle2 size={16} className="text-jade-500 mr-2" /> Complete compliance training</li>
                <li className="flex items-center"><CheckCircle2 size={16} className="text-jade-500 mr-2" /> Get to know the team</li>
              </ul>
            </div>

            <button
              onClick={() => setShowWelcome(false)}
              className="w-full py-3 px-4 bg-jade-500 text-white rounded-xl font-bold hover:bg-jade-600 transition-all shadow-lg shadow-jade-500/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

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

              {/* Estimated Completion */}
              {progressData.estimatedCompletionDate && progress < 100 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-blue-500" />
                    <span className="text-sm font-bold text-blue-800">Est. Complete</span>
                  </div>
                  <span className="text-sm font-black text-blue-600">
                    {new Date(progressData.estimatedCompletionDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Overdue Alert */}
              {tasks.some(t => t.isOverdue) && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    <span className="text-sm font-bold text-red-700">Overdue</span>
                  </div>
                  <span className="text-sm font-black text-red-600">
                    {tasks.filter(t => t.isOverdue).length} task(s)
                  </span>
                </div>
              )}

              {/* Required vs Optional */}
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Trophy size={16} className="text-amber-500" />
                  <span className="text-sm font-bold text-amber-800">Required</span>
                </div>
                <span className="text-sm font-black text-amber-600">
                  {progressData.requiredCompleted}/{progressData.requiredTotal}
                </span>
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
                        task.isOverdue ? 'bg-red-50 animate-pulse' :
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
                          {task.dueDate && (
                            <span className={`text-[10px] font-bold ${
                              task.isOverdue ? 'text-red-500' :
                              new Date(task.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) ? 'text-amber-500' : 'text-slate-400'
                            }`}>
                              <Calendar size={10} className="inline mr-1" />
                              Due {new Date(task.dueDate).toLocaleDateString()}
                            </span>
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
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              alert('File size must be less than 10MB');
                              return;
                            }
                            setUploadedFile(file);
                          }
                        }}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="mx-auto text-slate-400 mb-2 group-hover:text-jade-500 transition-colors" size={32} />
                        {uploadedFile ? (
                          <>
                            <p className="font-bold text-jade-600">{uploadedFile.name}</p>
                            <p className="text-sm text-slate-400">Click to change file</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Click to upload or drag and drop</p>
                            <p className="text-sm text-slate-400">PDF, PNG, JPG up to 10MB</p>
                          </>
                        )}
                      </label>
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
