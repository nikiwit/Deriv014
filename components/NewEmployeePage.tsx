import React, { useState } from 'react';
import { analyzeOnboarding } from '../services/geminiService';
import { InitialOnboardingJourney, OnboardingData, OnboardingJourney, User, UserRole } from '../types';
import { NewEmployeeOnboardingForm } from './onboarding/NewEmployeeOnboardingForm';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  Briefcase,
  Zap,
  ChevronRight,
  LayoutGrid,
  MessageSquare,
  Home,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { Button } from './design-system/Button';
import { Card } from './design-system/Card';
import { Heading, Text } from './design-system/Typography';
import { Badge } from './design-system/Badge';

interface NewEmployeePageProps {
  onNavigate: (view: string) => void;
  onEmployeeCreated?: (employee: OnboardingJourney) => void;
  existingEmployees?: OnboardingJourney[];
  isAuthenticated?: boolean;
}

type OnboardingMode = 'form' | 'chat';

const SALES_TIPS = [
  "Employees who complete onboarding tasks within the first week are 50% more likely to stay for 3+ years.",
  "Assigning a 'Buddy' increases new hire productivity by 37%.",
  "Digital signatures reduce contract turnaround time from 5 days to 2 hours.",
  "Automated IT setup saves the average HR team 15 hours per hire."
];

export const NewEmployeePage: React.FC<NewEmployeePageProps> = ({
  onNavigate,
  onEmployeeCreated,
  existingEmployees = [],
  isAuthenticated = true
}) => {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<OnboardingMode>('form');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<InitialOnboardingJourney | null>(null);
  const [tipIndex, setTipIndex] = useState(0);

  const handleFormSubmit = async (data: OnboardingData, analysisResult: string) => {
    // Load existing employees from local storage
    const existingEmployees: InitialOnboardingJourney[] = JSON.parse(
      localStorage.getItem('employees') || '[]'
    );

    // Create new employee record
    const newEmployee: InitialOnboardingJourney = {
      id: Date.now().toString(),
      employeeId: `EMP-2024-${String(existingEmployees.length + 19).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),

      status: 'in_progress',
      progress: 0,
      aiPlan: analysisResult,

      fullName: data.fullName,
      email: data.email,
      role: data.role,
      department: data.department,
      startDate: data.startDate,
      nationality: data.nationality,
      nric: data.nric,

      tasks: []
    };

    // Add new employee to the list
    const updatedEmployees = [...existingEmployees, newEmployee];

    // Save back to local storage
    localStorage.setItem('employees', JSON.stringify(updatedEmployees));

    console.log('Employee saved:', newEmployee);

    // Persist employee to backend (SQLite + markdown profiles file)
    try {
      const jurisdiction = data.nationality === 'Malaysian' ? 'MY' : 'SG';
      await fetch('/api/onboarding/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          full_name: data.fullName,
          nric: data.nric || null,
          jurisdiction,
          position: data.role,
          department: data.department,
          start_date: data.startDate,
        }),
      });
    } catch (err) {
      console.warn('Backend employee creation failed (non-blocking):', err);
    }

    setCreatedEmployee(newEmployee);
    setShowSuccess(true);
    setTipIndex(Math.floor(Math.random() * SALES_TIPS.length));

    // Notify parent component
    if (onEmployeeCreated) {
      // @ts-ignore - mismatch between InitialOnboardingJourney and OnboardingJourney
      onEmployeeCreated(newEmployee);
    }
  };

  const handleCreateAnother = () => {
    setShowSuccess(false);
    setCreatedEmployee(null);
  };

  const handleBackToDashboard = () => {
    if (isAuthenticated) {
      onNavigate('dashboard');
    } else {
      onNavigate('login');
    }
  };

  const handleStartEmployeeJourney = () => {
    if (!createdEmployee) return;

    // Create User object for AuthContext
    const user: User = {
      id: createdEmployee.id,
      email: createdEmployee.email,
      firstName: createdEmployee.fullName.split(' ')[0],
      lastName: createdEmployee.fullName.split(' ').slice(1).join(' '),
      role: 'employee',
      department: createdEmployee.department,
      employeeId: createdEmployee.employeeId,
      startDate: createdEmployee.startDate,
      onboardingComplete: false,
      nationality: createdEmployee.nationality,
      nric: createdEmployee.nric
    };

    // Save to localStorage for persistence
    localStorage.setItem('onboardingProfile', JSON.stringify({
      email: createdEmployee.email,
      fullName: createdEmployee.fullName,
      department: createdEmployee.department,
      startDate: createdEmployee.startDate,
      nationality: createdEmployee.nationality,
      nric: createdEmployee.nric
    }));

    // Set user in context and navigate
    setUser(user);
    onNavigate('employee_dashboard');
  };

  // Success View
  if (showSuccess && createdEmployee) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in py-8">
        <div className="flex justify-between items-center mb-6">
           <Button variant="ghost" onClick={handleBackToDashboard} leftIcon={<ArrowLeft size={18} />}>
             Back to Dashboard
           </Button>
        </div>

        <Card noPadding className="overflow-hidden shadow-2xl border-0 bg-white rounded-lg">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10">
                <div className="w-20 h-20 bg-jade-500 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-lg shadow-jade-500/30 animate-bounce-in">
                  <CheckCircle2 className="text-white" size={40} />
                </div>
                <Heading level="h1" className="text-white mb-2 !text-3xl">
                  Employee Created Successfully!
                </Heading>
                <Text className="text-slate-400 font-medium text-lg">
                  <span className="text-white font-bold">{createdEmployee.fullName}</span> is ready to start.
                </Text>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* ID Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-derivhr-100 rounded-md flex items-center justify-center text-derivhr-600 font-bold">
                            {createdEmployee.fullName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Employee ID</p>
                            <p className="font-bold text-slate-900">{createdEmployee.employeeId}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                         <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Role</span>
                            <span className="font-semibold text-slate-900">{createdEmployee.role}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Department</span>
                            <span className="font-semibold text-slate-900">{createdEmployee.department}</span>
                         </div>
                    </div>
                </div>

                {/* AI Plan Summary */}
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                        <Sparkles size={100} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-derivhr-500" />
                        <span className="text-xs font-bold text-derivhr-600 uppercase tracking-wider">AI Workflow Generated</span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
                        {createdEmployee.aiPlan ? createdEmployee.aiPlan.substring(0, 150) + "..." : "Standard compliance workflow activated."}
                    </p>
                    <div className="mt-4 flex gap-2">
                        <Badge variant="secondary">Contract Generated</Badge>
                        <Badge variant="secondary">IT Provisioned</Badge>
                        <Badge variant="secondary">Welcome Email Queued</Badge>
                    </div>
                </div>
            </div>

            {/* Did You Know? Tip */}
            <div className="mb-8 bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-start gap-3">
                <Lightbulb className="text-indigo-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                    <h4 className="text-sm font-bold text-indigo-900 mb-1">Did you know?</h4>
                    <p className="text-sm text-indigo-700 leading-snug">
                        {SALES_TIPS[tipIndex]}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row items-center gap-4">
              <Button
                onClick={handleStartEmployeeJourney}
                size="lg"
                className="w-full h-14 text-lg animate-pulse shadow-xl shadow-derivhr-500/20"
                rightIcon={<ArrowRight size={20} />}
              >
                Start Onboarding Journey
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Main Onboarding View
  return (
    <div className="max-w-6xl mx-auto animate-fade-in py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBackToDashboard} className="!p-2">
             <ArrowLeft size={20} className="text-slate-500" />
          </Button>
          <div>
            <Heading level="h1">New Employee Onboarding</Heading>
            <Text variant="muted">Create a personalized onboarding journey for your new hire</Text>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
          <button
            onClick={() => setMode('form')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${
              mode === 'form' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid size={16} />
            <span>Form</span>
          </button>
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${
              mode === 'chat' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare size={16} />
            <span>AI Agent</span>
          </button>
        </div>
      </div>

      {/* Form Mode */}
      {mode === 'form' && (
        <NewEmployeeOnboardingForm
          onSubmit={handleFormSubmit}
          onCancel={handleBackToDashboard}
          existingEmployees={existingEmployees}
        />
      )}

      {/* Chat Mode */}
      {mode === 'chat' && (
        <Card className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="text-slate-400" size={32} />
          </div>
          <Heading level="h3" className="mb-2">AI Chat Assistant</Heading>
          <Text className="mb-6 max-w-md mx-auto">
            Conversational onboarding is coming soon. Please use the structured form for now.
          </Text>
          <Button onClick={() => setMode('form')}>
            Switch to Form Mode
          </Button>
        </Card>
      )}
    </div>
  );
};
