import React from 'react';
import { ViewState } from '../../types';
import { EMPLOYEE_NAV_ITEMS } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, Zap, LogOut, Bell } from 'lucide-react';

interface EmployeeLayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
}

export const EmployeeLayout: React.FC<EmployeeLayoutProps> = ({ currentView, onNavigate, children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar - Professional Dark Theme */}
      <aside className="w-64 bg-slate-900 flex flex-col z-20 shadow-xl border-r border-slate-800">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-jade-500 rounded-lg flex items-center justify-center">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight block">
              Deriv<span className="text-jade-500">HR</span>
            </span>
            <span className="text-[10px] text-slate-500 block font-medium tracking-widest uppercase">Employee Portal</span>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
            <div className="w-10 h-10 bg-jade-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white font-medium text-sm truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-slate-500 text-xs font-medium truncate">{user?.department}</p>
            </div>
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-2">
          {EMPLOYEE_NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ViewState)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 group ${
                  isActive
                    ? 'bg-jade-500 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`transition-colors ${isActive ? 'text-white' : 'group-hover:text-jade-500'}`}>
                    {item.icon}
                </span>
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg border border-slate-700 hover:bg-red-500/10 hover:border-red-500/20 transition-colors group"
          >
             <LogOut size={16} className="text-slate-500 group-hover:text-red-500" />
             <span className="text-xs font-medium text-slate-400 group-hover:text-red-500">Sign Out</span>
          </button>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center space-x-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-jade-500" />
              <span className="text-xs font-bold text-jade-500 uppercase tracking-widest">Secure Portal</span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Your data is encrypted and protected.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-white">
         <div className="relative z-10 p-8 max-w-7xl mx-auto">
            {children}
         </div>
      </main>
    </div>
  );
};