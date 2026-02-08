import React from 'react';
import { ViewState } from '../types';
import { NAVIGATION_ITEMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Zap, Slack, LogOut } from 'lucide-react';
import { Text } from './design-system/Typography';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar - Professional Dark Theme */}
      <aside className="w-64 bg-slate-900 flex flex-col z-20 shadow-xl border-r border-slate-800">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-derivhr-500 rounded-lg flex items-center justify-center">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Deriv<span className="text-derivhr-500">HR</span>
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-2">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ViewState)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 group ${
                  isActive
                    ? 'bg-derivhr-500 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`transition-colors ${isActive ? 'text-white' : 'group-hover:text-derivhr-500'}`}>
                    {item.icon}
                </span>
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          {/* User Info */}
          <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
            <div className="w-9 h-9 bg-derivhr-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white font-semibold text-sm truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">HR Admin</p>
            </div>
          </div>

{/* Slack Integration */}
          <button
            onClick={() => {
              window.open(
                "https://slack.com/app_redirect?app=A0AE0F42GUR",
                "_blank"
              );
            }}
            className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors group"
          >
            <Slack size={18} className="text-slate-500 group-hover:text-[#4A154B]" />
            <span className="text-sm font-semibold text-slate-400 group-hover:text-white">
              Open Slack Bot
            </span>
            <span className="w-2 h-2 rounded-full bg-jade-500 animate-pulse"></span>
          </button>




          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-lg border border-slate-700 hover:bg-red-500/10 hover:border-red-500/20 transition-colors group"
          >
             <LogOut size={18} className="text-slate-500 group-hover:text-red-500" />
             <span className="text-sm font-semibold text-slate-400 group-hover:text-red-500">Sign Out</span>
          </button>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center space-x-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-jade-500" />
              <span className="text-xs font-bold text-jade-500 uppercase tracking-widest">Secure Core</span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Enterprise encryption active.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content - Minimalist White Background */}
      <main className="flex-1 overflow-auto relative bg-white">
         <div className="relative z-10 p-8 max-w-7xl mx-auto">
            {children}
         </div>
      </main>
    </div>
  );
};