import React, { useState } from 'react';
import { Zap, Lock, Users, Briefcase, ArrowRight, Loader2, UserPlus, Sparkles } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { DEMO_USERS } from '../../constants';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onNewOnboarding?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNewOnboarding }) => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('hr_admin');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));

    // Get default demo user for the selected role
    const defaultUser = DEMO_USERS.find(u => u.role === selectedRole);
    if (defaultUser) {
      const success = login(defaultUser.email, selectedRole);
      if (success) {
        onLoginSuccess();
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <nav className="bg-derivhr-dark px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-xl">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-derivhr-500 rounded-lg flex items-center justify-center shadow-lg shadow-derivhr-500/20">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-black text-white tracking-tighter">
            Deriv<span className="text-derivhr-500">HR</span>
          </span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-derivhr-500/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-derivhr-500 to-indigo-500 w-full"></div>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-derivhr-50 rounded-2xl mb-4">
                  <Lock className="text-derivhr-500 w-8 h-8" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Welcome Back</h1>
                <p className="text-slate-500 font-medium">Sign in to access your portal</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {/* Role Selection */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                    I am a...
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('hr_admin')}
                      className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center space-y-2 ${
                        selectedRole === 'hr_admin'
                          ? 'border-derivhr-500 bg-derivhr-50 text-derivhr-700 shadow-lg shadow-derivhr-500/10'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Users size={28} />
                      <span className="font-bold text-sm">HR Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('employee')}
                      className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center space-y-2 ${
                        selectedRole === 'employee'
                          ? 'border-jade-500 bg-jade-50 text-jade-700 shadow-lg shadow-jade-500/10'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Briefcase size={28} />
                      <span className="font-bold text-sm">Employee</span>
                    </button>
                  </div>

                  {/* New Onboarding Button */}
                  <button
                    type="button"
                    onClick={onNewOnboarding}
                    className="w-full p-4 rounded-xl border-2 border-derivhr-500 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white transition-all flex items-center justify-center space-x-3 hover:shadow-lg hover:shadow-derivhr-500/30 hover:scale-[1.02] group"
                  >
                    <div className="p-2 bg-white/20 rounded-lg">
                      <UserPlus size={24} />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-base block">New Employee Onboarding</span>
                      <span className="text-xs text-white/80 font-medium">Start onboarding for a new hire</span>
                    </div>
                    <Sparkles size={20} className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-derivhr-500 to-derivhr-600 hover:from-derivhr-600 hover:to-derivhr-700 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-derivhr-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>Continue to Portal</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="text-center mt-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            DerivHR Platform v2.0 — Demo Mode
          </div>
        </div>
      </div>
    </div>
  );
};
