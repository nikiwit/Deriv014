import React, { useState, useEffect } from 'react';
import { Zap, Lock, Users, Briefcase, ArrowRight, Loader2, UserPlus, ShieldCheck } from 'lucide-react';
import { UserRole, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../design-system/Card';
import { Heading, Text } from '../design-system/Typography';
import { Badge } from '../design-system/Badge';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onNewOnboarding?: () => void;
  onEmployeeOnboarding?: () => void;
}

interface SupabaseUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string;
  employee_id: string;
  start_date: string;
  onboarding_complete: boolean;
  nationality: string;
  nric: string;
}

function mapSupabaseUser(su: SupabaseUser): User {
  return {
    id: su.id,
    email: su.email,
    firstName: su.first_name,
    lastName: su.last_name,
    role: su.role as UserRole,
    department: su.department || '',
    employeeId: su.employee_id || undefined,
    startDate: su.start_date || undefined,
    onboardingComplete: su.onboarding_complete || false,
    nationality: su.nationality as 'Malaysian' | 'Non-Malaysian' | undefined,
    nric: su.nric || undefined,
  };
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNewOnboarding, onEmployeeOnboarding }) => {
  const { loginWithUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('hr_admin');
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:5001/api/auth/users?role=${selectedRole}`);
        if (!res.ok) throw new Error('Failed to fetch accounts');
        const data = await res.json();
        setAccounts(data.users.map((u: SupabaseUser) => mapSupabaseUser(u)));
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
        setError('Could not load accounts. Is the backend running?');
        setAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [selectedRole]);

  const handleAccountSelect = async (account: User) => {
    setLoggingIn(account.id);
    await new Promise(resolve => setTimeout(resolve, 300));
    loginWithUser(account);
    onLoginSuccess();
    setLoggingIn(null);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
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
        <div className="w-full max-w-lg">
          <Card className="shadow-xl border-slate-200 p-0 overflow-hidden bg-white">
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
                  <Lock className="text-slate-900" size={28} />
                </div>
                <Heading level="h2" className="!text-2xl mb-2">Welcome Back</Heading>
                <Text variant="muted" weight="medium">Select your identity to continue</Text>
              </div>

              <div>
                <Text weight="bold" size="sm" className="uppercase tracking-widest !text-slate-400 mb-4 block">
                  Identity Type
                </Text>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('hr_admin')}
                    className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center space-y-2 ${
                      selectedRole === 'hr_admin'
                        ? 'border-derivhr-500 bg-white text-slate-900 shadow-md'
                        : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    <Users size={28} className={selectedRole === 'hr_admin' ? 'text-derivhr-500' : ''} />
                    <span className="font-bold text-sm">HR Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('employee')}
                    className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center space-y-2 ${
                      selectedRole === 'employee'
                        ? 'border-derivhr-500 bg-white text-slate-900 shadow-md'
                        : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    <Briefcase size={28} className={selectedRole === 'employee' ? 'text-derivhr-500' : ''} />
                    <span className="font-bold text-sm">Employee</span>
                  </button>
                </div>
              </div>

              <div>
                <Text weight="bold" size="sm" className="uppercase tracking-widest !text-slate-400 mb-3 block">
                  Select Account
                </Text>

                {loadingAccounts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-derivhr-500" size={24} />
                    <Text variant="muted" className="ml-2">Loading accounts...</Text>
                  </div>
                ) : error ? (
                  <div className="text-center py-6">
                    <Text size="sm" className="!text-red-500">{error}</Text>
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-6">
                    <Text variant="muted" size="sm">No {selectedRole === 'hr_admin' ? 'HR admin' : 'employee'} accounts found.</Text>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => handleAccountSelect(account)}
                        disabled={loggingIn !== null}
                        className="w-full p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-derivhr-300 transition-all flex items-center justify-between group disabled:opacity-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-derivhr-100 text-derivhr-700 font-bold text-sm flex items-center justify-center">
                            {getInitials(account.firstName, account.lastName)}
                          </div>
                          <div className="text-left">
                            <Text weight="bold" size="sm" className="!text-slate-900">
                              {account.firstName} {account.lastName}
                            </Text>
                            <Text size="sm" className="!text-xs !text-slate-500">{account.email}</Text>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {account.department && (
                            <Badge variant="outline" className="text-[10px] !text-slate-400 border-slate-200">
                              {account.department}
                            </Badge>
                          )}
                          {loggingIn === account.id ? (
                            <Loader2 size={16} className="animate-spin text-derivhr-500" />
                          ) : (
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-derivhr-500 group-hover:translate-x-1 transition-all" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div
                  onClick={onNewOnboarding}
                  className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-derivhr-300 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 group-hover:text-derivhr-500 group-hover:border-derivhr-200 transition-colors">
                      <UserPlus size={20} />
                    </div>
                    <div className="text-left">
                      <Text weight="bold" size="sm" className="!text-slate-900">HR Admin: New Employee</Text>
                      <Text size="sm" className="!text-slate-500">Create onboarding for new hire</Text>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-300 group-hover:text-derivhr-500 group-hover:translate-x-1 transition-all" />
                </div>

                {onEmployeeOnboarding && (
                <div 
                  onClick={onEmployeeOnboarding}
                  className="w-full p-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-white hover:border-blue-400 transition-all cursor-pointer group flex items-center justify-between mt-3"
                >
                  <div className="flex items-center space-x-4">
                      <div className="p-2 bg-white rounded-lg border border-blue-200 text-blue-600 group-hover:text-blue-700 group-hover:border-blue-300 transition-colors">
                        <Zap size={20} />
                      </div>
                      <div className="text-left">
                        <Text weight="bold" size="sm" className="!text-blue-900">Employee: Verify Identity</Text>
                        <Text size="sm" className="!text-blue-600">Complete your onboarding</Text>
                      </div>
                  </div>
                  <ArrowRight size={18} className="text-blue-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center space-x-2">
              <ShieldCheck size={14} className="text-jade-600" />
              <Text size="sm" weight="semibold" className="!text-xs !text-slate-400 uppercase tracking-widest">Enterprise Security Active</Text>
            </div>
          </Card>

          <div className="text-center mt-8 space-y-1">
            <Text size="sm" weight="bold" className="!text-xs !text-slate-400 uppercase tracking-widest">
              DerivHR Platform v2.0
            </Text>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400 border-slate-200">
              Supabase Connected
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};
