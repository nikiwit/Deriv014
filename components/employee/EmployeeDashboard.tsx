import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ViewState } from '../../types';
import {
  ClipboardCheck,
  Calendar,
  FileText,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Users,
  Gift
} from 'lucide-react';

interface EmployeeDashboardProps {
  onNavigate: (view: ViewState) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Mock data
  const onboardingProgress = user?.onboardingComplete ? 100 : 65;
  const pendingTasks = user?.onboardingComplete ? 0 : 5;
  const leaveBalance = { annual: 8, sick: 16 };

  const announcements = [
    { id: 1, title: 'Company Town Hall', date: 'Feb 15, 2024', type: 'event' },
    { id: 2, title: 'New Benefits Package Available', date: 'Feb 10, 2024', type: 'update' },
    { id: 3, title: 'Q1 Performance Reviews Starting', date: 'Feb 8, 2024', type: 'reminder' },
  ];

  const quickActions = [
    { id: 'my_leave', label: 'Apply for Leave', icon: <Calendar size={20} />, color: 'bg-purple-500' },
    { id: 'my_documents', label: 'Upload Document', icon: <FileText size={20} />, color: 'bg-amber-500' },
    { id: 'my_onboarding', label: 'View Tasks', icon: <ClipboardCheck size={20} />, color: 'bg-jade-500' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-jade-500 to-jade-600 rounded-2xl p-8 text-white shadow-xl shadow-jade-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles size={16} className="text-jade-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-jade-200">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-jade-100 font-medium text-lg">
            {user?.onboardingComplete
              ? "You're all set. Here's your dashboard overview."
              : `You're ${onboardingProgress}% through onboarding. Keep going!`
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Onboarding Progress Card (if not complete) */}
          {!user?.onboardingComplete && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-jade-50 rounded-xl">
                      <ClipboardCheck className="text-jade-500" size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">Onboarding Progress</h2>
                      <p className="text-sm text-slate-500">{pendingTasks} tasks remaining</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('my_onboarding')}
                    className="flex items-center space-x-2 px-4 py-2 bg-jade-500 text-white rounded-xl font-bold text-sm hover:bg-jade-600 transition-all shadow-lg shadow-jade-500/20"
                  >
                    <span>Continue</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-600">{onboardingProgress}% Complete</span>
                    <span className="text-xs text-slate-400">Est. 45 min remaining</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-jade-500 to-jade-400 rounded-full transition-all duration-500"
                      style={{ width: `${onboardingProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Task Preview */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="text-jade-500" size={18} />
                    <span className="text-sm font-medium text-slate-600 line-through">Upload Identity Document</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-jade-50 border border-jade-100 rounded-xl">
                    <Clock className="text-jade-600" size={18} />
                    <span className="text-sm font-bold text-jade-800">Sign Employment Contract</span>
                    <span className="ml-auto text-xs bg-jade-500 text-white px-2 py-1 rounded-full font-bold">Next</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl opacity-50">
                    <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />
                    <span className="text-sm font-medium text-slate-500">Complete Tax Forms</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-50 rounded-xl">
                  <Calendar className="text-purple-500" size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Annual Leave</span>
              </div>
              <div className="flex items-end space-x-2">
                <span className="text-4xl font-black text-slate-900">{leaveBalance.annual}</span>
                <span className="text-slate-400 font-bold text-sm mb-1">days left</span>
              </div>
              <button
                onClick={() => onNavigate('my_leave')}
                className="mt-4 text-purple-500 text-sm font-bold flex items-center space-x-1 hover:text-purple-600"
              >
                <span>Apply Now</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <TrendingUp className="text-amber-500" size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sick Leave</span>
              </div>
              <div className="flex items-end space-x-2">
                <span className="text-4xl font-black text-slate-900">{leaveBalance.sick}</span>
                <span className="text-slate-400 font-bold text-sm mb-1">days left</span>
              </div>
              <p className="mt-4 text-slate-400 text-sm font-medium">Medical cert required after 2 days</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => onNavigate(action.id as ViewState)}
                  className="flex flex-col items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all group"
                >
                  <div className={`${action.color} p-3 rounded-xl text-white mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Announcements */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Announcements</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {announcements.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      item.type === 'event' ? 'bg-purple-50' :
                      item.type === 'update' ? 'bg-jade-50' : 'bg-amber-50'
                    }`}>
                      {item.type === 'event' ? <Users size={16} className="text-purple-500" /> :
                       item.type === 'update' ? <Gift size={16} className="text-jade-500" /> :
                       <Clock size={16} className="text-amber-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button className="text-derivhr-500 text-sm font-bold w-full text-center hover:text-derivhr-600">
                View All Announcements
              </button>
            </div>
          </div>

          {/* Team Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center space-x-2 mb-3">
              <Users size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Your Team</span>
            </div>
            <p className="font-bold text-lg mb-1">{user?.department}</p>
            <p className="text-indigo-200 text-sm">12 team members</p>
            <button className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-all">
              View Team Directory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
