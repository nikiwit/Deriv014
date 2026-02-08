import React, { useState } from 'react';
import { Zap, Lock, Users, Briefcase, ArrowRight, Loader2, UserPlus, ShieldCheck } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { DEMO_USERS } from '../../constants';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Heading, Text } from '../design-system/Typography';
import { Badge } from '../design-system/Badge';

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

    await new Promise(resolve => setTimeout(resolve, 400));

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
      {/* Header - Professional Dark */}
      <nav className="bg-slate-900 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-derivhr-500 rounded-lg flex items-center justify-center">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Deriv<span className="text-derivhr-500">HR</span>
          </span>
        </div>
        <Badge variant="outline" className="border-slate-600 text-slate-200 font-semibold bg-white/5 px-3 py-1">
          Secure Portal
        </Badge>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-md">
          {/* Main Login Card */}
          <Card className="shadow-xl border-slate-200 p-0 overflow-hidden bg-white">
            <div className="p-8">
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
                  <Lock className="text-slate-900" size={28} />
                </div>
                <Heading level="h2" className="!text-2xl mb-2">Welcome Back</Heading>
                <Text variant="muted" weight="medium">Sign in to access your dashboard</Text>
              </div>

              <form onSubmit={handleLogin} className="space-y-8">
                {/* Role Selection */}
                <div>
                  <Text weight="bold" size="sm" className="uppercase tracking-widest !text-slate-400 mb-4 block">
                    Identity Selection
                  </Text>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('hr_admin')}
                      className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center space-y-3 ${
                        selectedRole === 'hr_admin'
                          ? 'border-derivhr-500 bg-white text-slate-900 shadow-md'
                          : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 text-slate-500'
                      }`}
                    >
                      <Users size={32} className={selectedRole === 'hr_admin' ? 'text-derivhr-500' : ''} />
                      <span className="font-bold text-sm">HR Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('employee')}
                      className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center space-y-3 ${
                        selectedRole === 'employee'
                          ? 'border-derivhr-500 bg-white text-slate-900 shadow-md'
                          : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 text-slate-500'
                      }`}
                    >
                      <Briefcase size={32} className={selectedRole === 'employee' ? 'text-derivhr-500' : ''} />
                      <span className="font-bold text-sm">Employee</span>
                    </button>
                  </div>

                  {/* New Onboarding Professional Banner */}
                  <div 
                    onClick={onNewOnboarding}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-derivhr-300 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 group-hover:text-derivhr-500 group-hover:border-derivhr-200 transition-colors">
                          <UserPlus size={20} />
                        </div>
                        <div className="text-left">
                          <Text weight="bold" size="sm" className="!text-slate-900">New Onboarding</Text>
                          <Text size="xs" className="!text-slate-500">Initiate journey for new hire</Text>
                        </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-derivhr-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                <div className="pt-2">
                    <Button
                      type="submit"
                      isLoading={loading}
                      size="lg"
                      className="w-full h-14 font-bold text-base shadow-lg shadow-derivhr-500/10"
                      rightIcon={<ArrowRight size={20} />}
                    >
                      Continue to Portal
                    </Button>
                </div>
              </form>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center space-x-2">
                <ShieldCheck size={14} className="text-jade-600" />
                <Text size="xs" weight="semibold" className="!text-slate-400 uppercase tracking-widest">Enterprise Security Active</Text>
            </div>
          </Card>

          <div className="text-center mt-8 space-y-1">
            <Text size="xs" weight="bold" className="!text-slate-400 uppercase tracking-widest">
                DerivHR Platform v2.0
            </Text>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400 border-slate-200">
                Authorized Demo Instance
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};
