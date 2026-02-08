import React, { useState } from 'react';
import { analyzeOnboarding } from '../services/geminiService';
import { InitialOnboardingJourney, OnboardingData, OnboardingJourney } from '../types';
import { NewEmployeeOnboardingForm } from './onboarding/NewEmployeeOnboardingForm';
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
  Home
} from 'lucide-react';

interface NewEmployeePageProps {
  onNavigate: (view: string) => void;
  onEmployeeCreated?: (employee: OnboardingJourney) => void;
  existingEmployees?: OnboardingJourney[];
  isAuthenticated?: boolean;
}

type OnboardingMode = 'form' | 'chat';

export const NewEmployeePage: React.FC<NewEmployeePageProps> = ({
  onNavigate,
  onEmployeeCreated,
  existingEmployees = [],
  isAuthenticated = true
}) => {
  const [mode, setMode] = useState<OnboardingMode>('form');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<OnboardingJourney | null>(null);

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

    // Notify parent component
    if (onEmployeeCreated) {
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

  const handleBackToOnboarding = () => {
    if (isAuthenticated) {
      onNavigate('onboarding');
    } else {
      onNavigate('login');
    }
  };

  // Success View
  if (showSuccess && createdEmployee) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Back Button */}
        <button
          onClick={handleBackToDashboard}
          className="flex items-center space-x-2 text-slate-500 hover:text-derivhr-500 font-medium mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </button>

        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-jade-500 to-jade-600 px-8 py-12 text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in">
              <CheckCircle2 className="text-white" size={48} />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
              Employee Created Successfully!
            </h1>
            <p className="text-white/80 font-medium">
              {createdEmployee.employeeName}'s onboarding journey has been initiated
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Employee Details */}
            <div className="bg-slate-50 rounded-2xl p-6 mb-6">
              <div className="flex items-center space-x-4 mb-6">
                {/* <div className="w-16 h-16 bg-gradient-to-br from-derivhr-500 to-derivhr-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                  {createdEmployee.employeeName.split(' ').map(n => n[0]).join('')}
                </div> */}
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{createdEmployee.employeeName}</h2>
                  <p className="text-slate-500 font-medium">{createdEmployee.employeeId}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 text-center">
                  <Clock className="text-derivhr-500 mx-auto mb-2" size={24} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</p>
                  <p className="text-sm font-bold text-slate-900">{createdEmployee.startDate}</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <Briefcase className="text-derivhr-500 mx-auto mb-2" size={24} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-sm font-bold text-amber-600">In Progress</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <Zap className="text-derivhr-500 mx-auto mb-2" size={24} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Progress</p>
                  <p className="text-sm font-bold text-slate-900">{createdEmployee.progress}%</p>
                </div>
              </div>
            </div>

            {/* AI Generated Plan Summary */}
            {createdEmployee.aiPlan && (
              <div className="bg-gradient-to-br from-derivhr-50 to-indigo-50 rounded-2xl p-6 border border-derivhr-100 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-derivhr-100 rounded-xl">
                    <Sparkles className="text-derivhr-500" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">AI-Generated Onboarding Plan</h3>
                    <p className="text-sm text-slate-500">Personalized workflow created automatically</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    {createdEmployee.aiPlan.substring(0, 300)}...
                  </p>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-slate-50 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Next Steps</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 bg-white rounded-xl p-4">
                  <div className="w-8 h-8 bg-jade-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-jade-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">Employee record created</p>
                    <p className="text-xs text-slate-500">Added to the system</p>
                  </div>
                  <ChevronRight className="text-slate-400" size={18} />
                </div>
                <div className="flex items-center space-x-3 bg-white rounded-xl p-4">
                  <div className="w-8 h-8 bg-derivhr-100 rounded-lg flex items-center justify-center">
                    <MailIcon />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">Welcome email sent</p>
                    <p className="text-xs text-slate-500">Employee will receive onboarding instructions</p>
                  </div>
                  <ChevronRight className="text-slate-400" size={18} />
                </div>
                <div className="flex items-center space-x-3 bg-white rounded-xl p-4">
                  <div className="w-8 h-8 bg-derivhr-100 rounded-lg flex items-center justify-center">
                    <Users size={16} className="text-derivhr-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">Track progress</p>
                    <p className="text-xs text-slate-500">Monitor onboarding in the dashboard</p>
                  </div>
                  <ChevronRight className="text-slate-400" size={18} />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4 mt-8">
              <button
                onClick={handleCreateAnother}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold shadow-lg shadow-derivhr-500/25 hover:shadow-xl hover:scale-105 transition-all"
              >
                <Sparkles size={18} />
                <span>Create Another Employee</span>
              </button>
              {isAuthenticated ? (
                <button
                  onClick={handleBackToOnboarding}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  <Users size={18} />
                  <span>View All Employees</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  <Home size={18} />
                  <span>Back to Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Onboarding View
  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToDashboard}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">New Employee Onboarding</h1>
            <p className="text-slate-500 font-medium">Create a personalized onboarding journey for your new hire</p>
          </div>
        </div>

        {/* Back to Login Button (when not authenticated) */}
        {!isAuthenticated && (
          <button
            onClick={() => onNavigate('login')}
            className="flex items-center space-x-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Home size={16} />
            <span>Back to Login</span>
          </button>
        )}

        {/* Mode Toggle */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setMode('form')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              mode === 'form' 
                ? 'bg-white text-derivhr-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid size={18} />
            <span>Form Mode</span>
          </button>
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              mode === 'chat' 
                ? 'bg-white text-derivhr-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare size={18} />
            <span>AI Chat Mode</span>
          </button>
        </div>
      </div>

      {/* Mode Description */}
      <div className="bg-gradient-to-r from-derivhr-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-derivhr-100">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-derivhr-100 rounded-xl">
            <Sparkles className="text-derivhr-500" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {mode === 'form' ? 'Structured Form Mode' : 'AI Chat Mode'}
            </h3>
            <p className="text-slate-600 font-medium">
              {mode === 'form' 
                ? 'Fill out a structured form with step-by-step validation. Perfect for detailed employee information and compliance requirements.'
                : 'Have a conversational experience with our AI. Simply answer questions and let the AI guide you through the onboarding process.'}
            </p>
          </div>
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

      {/* Chat Mode - Placeholder for future implementation */}
      {mode === 'chat' && (
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
          <div className="w-20 h-20 bg-derivhr-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="text-derivhr-500" size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">AI Chat Mode</h2>
          <p className="text-slate-500 font-medium mb-6 max-w-md mx-auto">
            The conversational AI onboarding experience will be available soon. For now, please use the Form Mode.
          </p>
          <button
            onClick={() => setMode('form')}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold shadow-lg shadow-derivhr-500/25 hover:shadow-xl hover:scale-105 transition-all"
          >
            <LayoutGrid size={18} />
            <span>Switch to Form Mode</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Simple Mail Icon component
const MailIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
