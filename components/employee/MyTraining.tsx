import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Lock,
  Clock,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Play,
  X,
  Trophy,
} from 'lucide-react';
import { TrainingItem, TrainingCategory, TrainingItemStatus } from '../../types';
import { DEFAULT_TRAINING_ITEMS, TRAINING_CATEGORY_CONFIG, TRAINING_FORMAT_CONFIG } from '../../constants';

// Initialize mock items with varied statuses
function initializeItems(): TrainingItem[] {
  return DEFAULT_TRAINING_ITEMS.map((t, idx) => ({
    ...t,
    id: `training_${idx}`,
    status: (idx < 7 ? 'completed' : idx === 7 ? 'in_progress' : idx === 8 ? 'available' : 'locked') as TrainingItemStatus,
    completedAt: idx < 7 ? '2026-02-01T10:00:00Z' : undefined,
    score: idx < 7 && t.format === 'quiz' ? 85 + Math.floor(Math.random() * 15) : undefined,
  }));
}

export const MyTraining: React.FC = () => {
  const [items, setItems] = useState<TrainingItem[]>(initializeItems);
  const [selectedItem, setSelectedItem] = useState<TrainingItem | null>(null);

  const completedCount = items.filter(t => t.status === 'completed').length;
  const progress = Math.round((completedCount / items.length) * 100);
  const totalMinutes = items.filter(t => t.status !== 'completed').reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const handleCompleteItem = (itemId: string) => {
    setItems(prev => {
      const updated = prev.map(t => {
        if (t.id === itemId) {
          return {
            ...t,
            status: 'completed' as TrainingItemStatus,
            completedAt: new Date().toISOString(),
            score: t.format === 'quiz' ? 85 + Math.floor(Math.random() * 15) : undefined,
          };
        }
        return t;
      });
      // Unlock next item
      const completedIdx = updated.findIndex(t => t.id === itemId);
      if (completedIdx < updated.length - 1 && updated[completedIdx + 1].status === 'locked') {
        updated[completedIdx + 1] = { ...updated[completedIdx + 1], status: 'available' };
      }
      return updated;
    });
    setSelectedItem(null);
  };

  // Group by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<TrainingCategory, TrainingItem[]>);

  const categoryOrder: TrainingCategory[] = ['it_systems', 'compliance', 'orientation', 'role_specific', 'soft_skills', 'security'];

  const isOverdue = (item: TrainingItem) => {
    if (!item.dueDate || item.status === 'completed') return false;
    return new Date(item.dueDate) < new Date();
  };

  const getDueDateLabel = (item: TrainingItem) => {
    if (!item.dueDate) return null;
    const due = new Date(item.dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Overdue', className: 'bg-red-100 text-red-700' };
    if (diffDays <= 7) return { label: `Due in ${diffDays}d`, className: 'bg-amber-100 text-amber-700' };
    return { label: `Due ${due.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}`, className: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">My Training</h1>
        <p className="text-slate-500 font-medium">Your learning journey and progress tracker</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 sticky top-8">
            {/* Progress Ring */}
            <div className="flex justify-center mb-6">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="64" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                  <circle
                    cx="72" cy="72" r="64"
                    stroke="url(#trainingProgressGradient)"
                    strokeWidth="12" fill="none" strokeLinecap="round"
                    strokeDasharray={`${progress * 4.02} 402`}
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="trainingProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
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
                <span className="text-sm font-black text-jade-600">{completedCount}/{items.length}</span>
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
                {items.some(i => isOverdue(i))
                  ? 'You have overdue compliance items - prioritize those first to stay on track!'
                  : 'Complete IT Systems first to get set up, then tackle compliance modules before their deadlines.'}
              </p>
            </div>

            {/* Category Summary */}
            <div className="mt-6 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category Progress</p>
              {categoryOrder.map(catId => {
                const catItems = groupedItems[catId] || [];
                if (catItems.length === 0) return null;
                const catCompleted = catItems.filter(t => t.status === 'completed').length;
                const catProgress = Math.round((catCompleted / catItems.length) * 100);
                const config = TRAINING_CATEGORY_CONFIG[catId];
                return (
                  <div key={catId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">{config.label}</span>
                      <span className="text-[10px] font-black text-slate-400">{catCompleted}/{catItems.length}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${catProgress === 100 ? 'bg-jade-500' : config.color}`}
                        style={{ width: `${catProgress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Timeline & Checklist */}
        <div className="lg:col-span-2 space-y-2">
          {categoryOrder.map((catId, catIdx) => {
            const catItems = groupedItems[catId];
            if (!catItems || catItems.length === 0) return null;
            const config = TRAINING_CATEGORY_CONFIG[catId];
            const catCompleted = catItems.filter(t => t.status === 'completed').length;
            const categoryComplete = catCompleted === catItems.length;
            const hasOverdue = catItems.some(i => isOverdue(i));

            return (
              <React.Fragment key={catId}>
                {/* Connector line */}
                {catIdx > 0 && (
                  <div className="flex justify-center">
                    <div className="w-0.5 h-6 bg-slate-200 rounded-full"></div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
                  {/* Category Header */}
                  <div className={`p-4 flex items-center space-x-3 ${categoryComplete ? 'bg-jade-50' : 'bg-slate-50'} border-b border-slate-100`}>
                    <div className={`p-2 ${config.color} rounded-xl text-white`}>
                      {config.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-slate-800 tracking-tight">{config.label}</h3>
                      <p className="text-xs text-slate-500">{catCompleted}/{catItems.length} completed</p>
                    </div>
                    {categoryComplete && (
                      <div className="flex items-center space-x-1 text-jade-600">
                        <CheckCircle2 size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">Done</span>
                      </div>
                    )}
                    {hasOverdue && !categoryComplete && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full uppercase">Overdue</span>
                    )}
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-slate-100">
                    {catItems.map((item) => {
                      const dueDateInfo = getDueDateLabel(item);
                      const formatConfig = TRAINING_FORMAT_CONFIG[item.format];
                      return (
                        <button
                          key={item.id}
                          onClick={() => item.status !== 'locked' && setSelectedItem(item)}
                          disabled={item.status === 'locked'}
                          className={`w-full p-4 text-left transition-all flex items-center space-x-4 ${
                            item.status === 'locked' ? 'opacity-50 cursor-not-allowed' :
                            item.status === 'completed' ? 'bg-jade-50/50' :
                            'hover:bg-slate-50 cursor-pointer'
                          }`}
                        >
                          {/* Status Icon */}
                          <div className="flex-shrink-0">
                            {item.status === 'completed' ? (
                              <CheckCircle2 className="text-jade-500" size={22} />
                            ) : item.status === 'locked' ? (
                              <Lock className="text-slate-300" size={22} />
                            ) : item.status === 'in_progress' ? (
                              <div className="relative">
                                <Circle className="text-jade-300" size={22} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-2.5 h-2.5 bg-jade-500 rounded-full animate-pulse"></div>
                                </div>
                              </div>
                            ) : (
                              <Circle className="text-slate-300" size={22} />
                            )}
                          </div>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm ${item.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{item.description}</p>
                            <div className="flex items-center space-x-3 mt-1.5 flex-wrap gap-y-1">
                              {/* Format badge */}
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {formatConfig.icon}
                                <span>{formatConfig.label}</span>
                              </span>
                              {/* Time */}
                              <span className="text-[10px] font-bold text-slate-400">
                                <Clock size={10} className="inline mr-1" />
                                {item.estimatedMinutes} min
                              </span>
                              {/* Required badge */}
                              {item.required && item.status !== 'completed' && (
                                <span className="text-[10px] font-bold text-red-500 uppercase">Required</span>
                              )}
                              {/* Due date */}
                              {dueDateInfo && item.status !== 'completed' && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dueDateInfo.className}`}>
                                  {dueDateInfo.label}
                                </span>
                              )}
                              {/* Score for completed quizzes */}
                              {item.status === 'completed' && item.score != null && (
                                <span className="text-[10px] font-bold text-jade-600">
                                  <Trophy size={10} className="inline mr-1" />
                                  Score: {item.score}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action indicator */}
                          {(item.status === 'available' || item.status === 'in_progress') && (
                            <ChevronRight className="text-slate-400 flex-shrink-0" size={20} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="h-1.5 bg-gradient-to-r from-jade-500 to-jade-400"></div>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 ${TRAINING_CATEGORY_CONFIG[selectedItem.category].color} rounded-xl text-white`}>
                    {TRAINING_CATEGORY_CONFIG[selectedItem.category].icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {TRAINING_CATEGORY_CONFIG[selectedItem.category].label}
                    </p>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedItem.title}</h3>
                  </div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <p className="text-slate-600 mb-6">{selectedItem.description}</p>

              {/* Meta info */}
              <div className="flex items-center space-x-4 mb-6 flex-wrap gap-y-2">
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <Clock size={16} />
                  <span>~{selectedItem.estimatedMinutes} minutes</span>
                </div>
                <span className="inline-flex items-center space-x-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {TRAINING_FORMAT_CONFIG[selectedItem.format].icon}
                  <span className="ml-1">{TRAINING_FORMAT_CONFIG[selectedItem.format].label}</span>
                </span>
                {selectedItem.required && (
                  <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                )}
              </div>

              {/* Content area based on format */}
              {selectedItem.format === 'video' && (
                <div className="bg-slate-900 rounded-xl aspect-video flex items-center justify-center mb-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3 hover:bg-white/20 transition-colors cursor-pointer">
                      <Play size={32} className="text-white ml-1" />
                    </div>
                    <p className="text-white/60 text-sm font-medium">Click to play training video</p>
                  </div>
                </div>
              )}

              {selectedItem.format === 'quiz' && (
                <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-100">
                  <p className="text-sm font-bold text-slate-700 mb-3">Sample Assessment Question</p>
                  <p className="text-sm text-slate-600 mb-4">What is the primary purpose of data protection regulations like PDPA?</p>
                  <div className="space-y-2">
                    {['To protect personal data of individuals', 'To increase company profits', 'To reduce employee workload', 'To automate HR processes'].map((opt, i) => (
                      <label key={i} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-jade-300 cursor-pointer transition-colors">
                        <input type="radio" name="quiz" className="accent-jade-500" />
                        <span className="text-sm text-slate-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.format === 'document' && (
                <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-100 max-h-48 overflow-y-auto">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    This training module covers the essential policies and procedures for {selectedItem.title.toLowerCase()}.
                    Please read through the material carefully and mark it complete when you're done.
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-3">
                    Key topics include best practices, company policies, and compliance requirements relevant to your role at Deriv.
                  </p>
                </div>
              )}

              {selectedItem.format === 'interactive' && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-5 mb-6 border border-purple-100 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    {TRAINING_FORMAT_CONFIG.interactive.icon}
                  </div>
                  <p className="text-sm font-bold text-purple-700">Interactive Module</p>
                  <p className="text-xs text-purple-500 mt-1">This hands-on module will guide you through the setup process step by step.</p>
                </div>
              )}

              {selectedItem.format === 'live_session' && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 mb-6 border border-amber-100 text-center">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    {TRAINING_FORMAT_CONFIG.live_session.icon}
                  </div>
                  <p className="text-sm font-bold text-amber-700">Live Session</p>
                  <p className="text-xs text-amber-500 mt-1">This session is scheduled with your team lead. You'll be notified of the time.</p>
                </div>
              )}

              {/* Due date warning */}
              {selectedItem.dueDate && selectedItem.status !== 'completed' && (
                <div className={`flex items-center space-x-2 p-3 rounded-xl mb-6 ${
                  isOverdue(selectedItem) ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'
                }`}>
                  <AlertTriangle size={16} className={isOverdue(selectedItem) ? 'text-red-500' : 'text-amber-500'} />
                  <span className={`text-sm font-bold ${isOverdue(selectedItem) ? 'text-red-700' : 'text-amber-700'}`}>
                    {isOverdue(selectedItem)
                      ? `This item was due ${new Date(selectedItem.dueDate).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}`
                      : `Due by ${new Date(selectedItem.dueDate).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCompleteItem(selectedItem.id)}
                  disabled={selectedItem.status === 'completed'}
                  className="flex-1 py-3 px-4 bg-jade-500 text-white rounded-xl font-bold hover:bg-jade-600 transition-all shadow-lg shadow-jade-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedItem.status === 'completed' ? 'Already Complete' : 'Mark Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
