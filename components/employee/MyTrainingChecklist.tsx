import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getTrainingChecklistForRole, COMMON_TRAINING_CHECKLIST, TRAINING_CHECKLIST_BY_ROLE, AVAILABLE_TRAINING_ROLES } from '../../constants';
import { TrainingChecklistItem, TrainingChecklistStatus, TrainingChecklistCategory, TRAINING_CATEGORY_WEIGHTS } from '../../types';
import {
  CheckCircle2,
  Circle,
  Lock,
  Clock,
  ChevronRight,
  FileText,
  Shield,
  Monitor,
  GraduationCap,
  Briefcase,
  Users,
  KeyRound,
  Video,
  FileQuestion,
  Gamepad2,
  Radio,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Trophy,
  PlayCircle,
  BookOpen,
  Sparkles
} from 'lucide-react';

const categoryConfig: Record<TrainingChecklistCategory, { label: string; icon: React.ReactNode; color: string }> = {
  compliance: { label: 'Compliance', icon: <Shield size={18} />, color: 'bg-red-500' },
  technical: { label: 'Technical', icon: <Monitor size={18} />, color: 'bg-blue-500' },
  soft_skills: { label: 'Soft Skills', icon: <Users size={18} />, color: 'bg-purple-500' },
  products: { label: 'Products', icon: <Briefcase size={18} />, color: 'bg-amber-500' },
  tools: { label: 'Tools', icon: <FileQuestion size={18} />, color: 'bg-green-500' },
  security: { label: 'Security', icon: <KeyRound size={18} />, color: 'bg-orange-500' },
  leadership: { label: 'Leadership', icon: <Trophy size={18} />, color: 'bg-jade-500' },
};

const formatIcon: Record<string, React.ReactNode> = {
  video: <Video size={16} />,
  document: <FileText size={16} />,
  quiz: <FileQuestion size={16} />,
  interactive: <Gamepad2 size={16} />,
  live_session: <Radio size={16} />,
};

const API_BASE = '';

// Task dependencies - some tasks unlock others
const TRAINING_TASK_DEPENDENCIES: Record<string, string[]> = {
  'common_comp_1': [], // Company Values
  'common_comp_2': ['common_comp_1'], // Harassment requires Values
  'common_comp_3': ['common_comp_1'], // Safety requires Values
  'common_sec_1': ['common_comp_1'], // Security basics requires Values
  'common_sec_2': ['common_sec_1'], // MFA requires Security basics
  'common_sec_3': ['common_sec_1'], // Data classification requires Security basics
  'common_tools_1': [], // Comm tools
  'common_tools_2': ['common_tools_1'], // VPN requires Comm tools
  'common_tools_3': ['common_tools_1'], // IT Support requires Comm tools
};

// Helper to determine if a task should be unlocked based on dependencies
const isTrainingTaskUnlocked = (taskId: string, completedTaskIds: Set<string>): boolean => {
  const deps = TRAINING_TASK_DEPENDENCIES[taskId] || [];
  if (deps.length === 0) return true;
  return deps.every(depId => completedTaskIds.has(depId));
};

export const MyTrainingChecklist: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  
  // Determine user's role and department for training
  const userRole = user?.department || 'Engineering';
  const userDepartment = user?.department || 'Engineering';
  
  // Initialize tasks from training checklist
  const [tasks, setTasks] = useState<TrainingChecklistItem[]>(() => {
    const initialTasks = getTrainingChecklistForRole(userRole, userDepartment);
    return initialTasks.map((t, idx) => ({
      ...t,
      id: t.id || `training_${idx}`,
      status: isTrainingTaskUnlocked(t.id || `training_${idx}`, new Set()) ? 'available' as TrainingChecklistStatus : 'locked' as TrainingChecklistStatus,
      completedAt: undefined,
      startedAt: undefined,
      isOverdue: false,
    }));
  });

  const [selectedTask, setSelectedTask] = useState<TrainingChecklistItem | null>(null);

  // Show welcome modal on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('training_visited');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('training_visited', 'true');
    }
  }, []);

  // Fetch tasks from backend on mount
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.employeeId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/multiagent/training/employee/${user.employeeId}/tasks`);
        if (response.ok) {
          const data = await response.json();
          
          setTasks(prev => prev.map(task => {
            const backendTask = data.tasks?.find((t: any) => 
              t.id === task.id || t.title?.toLowerCase().includes(task.title?.toLowerCase()?.split(' ')[0])
            );
            if (backendTask) {
              return {
                ...task,
                status: backendTask.status as TrainingChecklistStatus,
                completedAt: backendTask.status === 'completed' ? new Date().toISOString() : undefined,
                startedAt: backendTask.startedAt || undefined,
              };
            }
            return task;
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch training tasks from backend:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user?.employeeId]);

  // Calculate weighted progress based on category weights
  const progressData = useMemo(() => {
    const completedTaskIds = new Set(tasks.filter(t => t.status === 'completed').map(t => t.id));
    
    const categoryStats = {} as Record<TrainingChecklistCategory, { completed: number; total: number; weight: number }>;
    
    // Initialize categories
    (Object.keys(TRAINING_CATEGORY_WEIGHTS) as TrainingChecklistCategory[]).forEach(cat => {
      categoryStats[cat] = { completed: 0, total: 0, weight: TRAINING_CATEGORY_WEIGHTS[cat] };
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
    let completedRequired = 0;
    let totalRequired = 0;
    
    Object.values(categoryStats).forEach(stat => {
      if (stat.total > 0) {
        const categoryProgress = stat.completed / stat.total;
        weightedProgress += categoryProgress * stat.weight;
      }
    });
    
    // Track required tasks
    const requiredTasks = tasks.filter(t => t.priority === 'required');
    completedRequired = requiredTasks.filter(t => t.status === 'completed').length;
    totalRequired = requiredTasks.length;
    
    const requiredProgress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
    const overallProgress = Math.round(weightedProgress * 100);
    
    // Calculate estimated completion date
    const remainingMinutes = tasks
      .filter(t => t.status !== 'completed' && t.priority === 'required')
      .reduce((sum, t) => sum + t.estimatedMinutes, 0);
    const daysToComplete = Math.ceil(remainingMinutes / 60); // 1 hour per day
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

  // Handle task completion
  const handleCompleteTask = async (taskId: string) => {
    const now = new Date().toISOString();

    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return { 
            ...t, 
            status: 'completed' as TrainingChecklistStatus, 
            completedAt: now,
            startedAt: t.startedAt || now,
          };
        }
        return t;
      });

      // Get completed task IDs
      const completedIds = new Set(updated.filter(t => t.status === 'completed').map(t => t.id));
      
      // Unlock tasks based on dependencies
      return updated.map(t => {
        if (t.status === 'locked' && isTrainingTaskUnlocked(t.id, completedIds)) {
          return { ...t, status: 'available' as TrainingChecklistStatus };
        }
        return t;
      });
    });

    // Save to backend
    if (user?.employeeId) {
      try {
        await fetch(`${API_BASE}/api/multiagent/training/employee/${user.employeeId}/tasks/${taskId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        });
      } catch (err) {
        console.warn('Failed to save training task to backend:', err);
      }
    }

    setSelectedTask(null);
  };

  // Group tasks by category
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<TrainingChecklistCategory, TrainingChecklistItem[]>);

  const progress = progressData.weightedPercentage;
  const completedCount = progressData.completedTasks;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="animate-spin text-derivhr-500 mx-auto mb-4" size={40} />
          <p className="text-slate-500 font-medium">Loading your training checklist...</p>
        </div>
      </div>
    );
  }

  // Welcome Modal for first-time visitors
  if (showWelcome) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <GraduationCap size={40} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Welcome to Your Training Journey!</h2>
            <p className="text-slate-600 mb-6">
              Complete your role-specific training to get up to speed quickly. 
              Your progress is tracked and you'll earn badges as you go!
            </p>
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800 font-medium">
                {progressData.requiredTotal} required trainings • ~{Math.round(progressData.totalMinutesRemaining / 60)} hours total
              </p>
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Let's Get Started!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">My Training Checklist</h1>
            <p className="text-blue-100">
              {user?.department ? `${user.department} Role` : 'Employee'} Training • {AVAILABLE_TRAINING_ROLES.includes(userRole) ? userRole : userDepartment}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{progress}%</div>
            <div className="text-blue-100 text-sm">Complete</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{completedCount}</div>
            <div className="text-xs text-blue-100">Completed</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{progressData.totalTasks - completedCount}</div>
            <div className="text-xs text-blue-100">Remaining</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{progressData.requiredCompleted}/{progressData.requiredTotal}</div>
            <div className="text-xs text-blue-100">Required</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">
              {progressData.estimatedCompletionDate 
                ? new Date(progressData.estimatedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '-'}
            </div>
            <div className="text-xs text-blue-100">Est. Complete</div>
          </div>
        </div>
      </div>

      {/* Category Progress */}
      <div className="grid grid-cols-7 gap-2">
        {Object.entries(categoryConfig).map(([cat, config]) => {
          const catTasks = groupedTasks[cat as TrainingChecklistCategory] || [];
          const catCompleted = catTasks.filter(t => t.status === 'completed').length;
          const catTotal = catTasks.length;
          const catProgress = catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0;
          
          return (
            <button
              key={cat}
              onClick={() => {
                const el = document.getElementById(`category-${cat}`);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`p-3 rounded-xl text-center transition-all hover:scale-105 ${
                catProgress === 100 ? 'bg-green-50 border-2 border-green-200' : 'bg-white border border-slate-200'
              }`}
            >
              <div className={`w-8 h-8 ${config.color} rounded-full flex items-center justify-center mx-auto mb-1`}>
                {catProgress === 100 ? <CheckCircle2 size={16} className="text-white" /> : config.icon}
              </div>
              <div className="text-xs font-medium text-slate-700">{config.label}</div>
              <div className="text-xs text-slate-500">{catCompleted}/{catTotal}</div>
            </button>
          );
        })}
      </div>

      {/* Task Categories */}
      <div className="space-y-4">
        {(Object.keys(groupedTasks) as TrainingChecklistCategory[]).map(category => {
          const config = categoryConfig[category];
          const categoryTasks = groupedTasks[category];
          const completedInCategory = categoryTasks.filter(t => t.status === 'completed').length;
          
          return (
            <div 
              key={category} 
              id={`category-${category}`}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Category Header */}
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center`}>
                    {config.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{config.label}</h3>
                    <p className="text-sm text-slate-500">
                      {completedInCategory} of {categoryTasks.length} completed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${config.color.replace('bg-', 'bg-')}`}
                      style={{ 
                        width: `${categoryTasks.length > 0 ? (completedInCategory / categoryTasks.length) * 100 : 0}%`,
                        backgroundColor: config.color === 'bg-red-500' ? '#ef4444' :
                                        config.color === 'bg-blue-500' ? '#3b82f6' :
                                        config.color === 'bg-purple-500' ? '#a855f7' :
                                        config.color === 'bg-amber-500' ? '#f59e0b' :
                                        config.color === 'bg-green-500' ? '#22c55e' :
                                        config.color === 'bg-orange-500' ? '#f97316' : '#14b8a6'
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    {categoryTasks.length > 0 ? Math.round((completedInCategory / categoryTasks.length) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Task List */}
              <div className="divide-y divide-slate-100">
                {categoryTasks
                  .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                  .map(task => {
                    const isLocked = task.status === 'locked';
                    const isCompleted = task.status === 'completed';
                    const isInProgress = task.status === 'in_progress';
                    
                    return (
                      <div
                        key={task.id}
                        className={`px-6 py-4 flex items-center gap-4 ${
                          isLocked ? 'bg-slate-50/50' : 'hover:bg-slate-50'
                        } transition-colors cursor-pointer`}
                        onClick={() => !isLocked && setSelectedTask(task)}
                      >
                        {/* Status Icon */}
                        <div className={`flex-shrink-0 ${
                          isLocked ? 'text-slate-300' : 
                          isCompleted ? 'text-green-500' : 
                          isInProgress ? 'text-blue-500' : 'text-slate-400'
                        }`}>
                          {isLocked ? <Lock size={20} /> :
                           isCompleted ? <CheckCircle2 size={20} /> :
                           isInProgress ? <Loader2 size={20} className="animate-spin" /> :
                           <Circle size={20} />}
                        </div>

                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium ${
                              isLocked ? 'text-slate-400' : 
                              isCompleted ? 'text-slate-600 line-through' : 'text-slate-800'
                            }`}>
                              {task.title}
                            </h4>
                            {task.priority === 'required' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                Required
                              </span>
                            )}
                            {task.hasQuiz && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <FileQuestion size={12} /> Quiz
                              </span>
                            )}
                          </div>
                          <p className={`text-sm truncate ${
                            isLocked ? 'text-slate-300' : 'text-slate-500'
                          }`}>
                            {task.description}
                          </p>
                        </div>

                        {/* Format & Duration */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className={`flex items-center gap-1 ${
                            isLocked ? 'text-slate-300' : 'text-slate-500'
                          }`}>
                            {formatIcon[task.format] || <BookOpen size={16} />}
                            <span>{task.format.replace('_', ' ')}</span>
                          </div>
                          <div className={`flex items-center gap-1 ${
                            isLocked ? 'text-slate-300' : 'text-slate-500'
                          }`}>
                            <Clock size={14} />
                            <span>{task.estimatedMinutes}m</span>
                          </div>
                          {!isLocked && (
                            <ChevronRight size={18} className="text-slate-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className={`h-2 ${
              categoryConfig[selectedTask.category]?.color?.replace('bg-', 'bg-') || 'bg-blue-500'
            }`} />
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${
                    categoryConfig[selectedTask.category]?.color || 'bg-blue-500'
                  } rounded-xl flex items-center justify-center text-white`}>
                    {categoryConfig[selectedTask.category]?.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{selectedTask.title}</h3>
                    <p className="text-sm text-slate-500">{categoryConfig[selectedTask.category]?.label}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-slate-600 mb-6">{selectedTask.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                    <Clock size={16} />
                  </div>
                  <div className="font-semibold text-slate-800">{selectedTask.estimatedMinutes} min</div>
                  <div className="text-xs text-slate-500">Duration</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                    {formatIcon[selectedTask.format]}
                  </div>
                  <div className="font-semibold text-slate-800 capitalize">{selectedTask.format.replace('_', ' ')}</div>
                  <div className="text-xs text-slate-500">Format</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                    {selectedTask.priority === 'required' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  </div>
                  <div className="font-semibold text-slate-800 capitalize">{selectedTask.priority}</div>
                  <div className="text-xs text-slate-500">Priority</div>
                </div>
              </div>

              {selectedTask.hasQuiz && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 text-amber-800 font-medium mb-1">
                    <FileQuestion size={18} />
                    Quiz Required
                  </div>
                  <p className="text-sm text-amber-700">
                    Passing score: {selectedTask.quizPassingScore || 80}%
                  </p>
                </div>
              )}

              {selectedTask.status === 'completed' && selectedTask.completedAt && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 text-green-800 font-medium">
                    <CheckCircle2 size={18} />
                    Completed on {new Date(selectedTask.completedAt).toLocaleDateString()}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {selectedTask.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => handleCompleteTask(selectedTask.id)}
                      className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={20} />
                      Mark as Complete
                    </button>
                    <button className="py-3 px-6 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                      <PlayCircle size={20} />
                      Start Training
                    </button>
                  </>
                )}
                {selectedTask.status === 'completed' && (
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="flex-1 py-3 px-6 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
