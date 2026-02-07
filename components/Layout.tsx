import React from 'react';
import { ViewState } from '../types';
import { NAVIGATION_ITEMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Zap, Slack, LogOut } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-derivhr-dark flex flex-col z-20 shadow-2xl">
        <div className="p-6 flex items-center space-x-3 border-b border-white/5">
          <div className="w-8 h-8 bg-derivhr-500 rounded-lg flex items-center justify-center shadow-lg shadow-derivhr-500/20">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-black text-white tracking-tighter">
            Deriv<span className="text-derivhr-500">HR</span>
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 mt-4">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ViewState)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-derivhr-500 text-white shadow-lg shadow-derivhr-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={`transition-colors ${isActive ? 'text-white' : 'group-hover:text-derivhr-500'}`}>
                    {item.icon}
                </span>
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-3">
          {/* User Info */}
          <div className="flex items-center space-x-3 p-2">
            <div className="w-8 h-8 bg-gradient-to-br from-derivhr-500 to-derivhr-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{user?.firstName} {user?.lastName}</p>
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">HR Admin</p>
            </div>
          </div>

          {/* Slack Integration Mockup */}
          <button className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all group">
             <Slack size={16} className="text-slate-500 group-hover:text-[#4A154B]" />
             <span className="text-xs font-bold text-slate-400 group-hover:text-white">Sync Slack</span>
             <span className="w-1.5 h-1.5 rounded-full bg-jade-500 animate-pulse"></span>
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
          >
             <LogOut size={16} className="text-slate-500 group-hover:text-red-500" />
             <span className="text-xs font-bold text-slate-400 group-hover:text-red-500">Sign Out</span>
          </button>

          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <div className="flex items-center space-x-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-jade-500" />
              <span className="text-[10px] font-black text-jade-500 uppercase tracking-widest">Secure Core</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug font-medium">
              Enterprise-grade encryption active. Data is processed in compliance with global standards.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-white">
         {/* Background decoration */}
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-derivhr-500/5 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px]"></div>
         </div>
         
         <div className="relative z-10 p-8 max-w-7xl mx-auto">
            {children}
         </div>
      </main>
    </div>
  );
};
