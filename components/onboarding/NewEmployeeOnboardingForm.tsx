import React, { useState } from 'react';
import { analyzeOnboarding, parseResume } from '../../services/geminiService';
import { createEmployee } from '../../services/api';
import { OnboardingData, OnboardingJourney } from '../../types';
import {
  User,
  Mail,
  Briefcase,
  Building2,
  Calendar,
  Globe,
  CreditCard,
  Fingerprint,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Info,
  Upload,
  FileText
} from 'lucide-react';
import { Button } from '../design-system/Button';

interface NewEmployeeOnboardingFormProps {
  onSubmit: (data: OnboardingData, analysis: string) => void;
  onCancel: () => void;
  existingEmployees?: OnboardingJourney[];
}

type FormStep = 'personal' | 'employment' | 'compliance' | 'review';

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Customer Success',
  'Legal'
];

const ROLES = [
  'Software Engineer',
  'Product Manager',
  'UI/UX Designer',
  'Marketing Manager',
  'Sales Representative',
  'HR Specialist',
  'Financial Analyst',
  'Operations Manager',
  'Customer Success Manager',
  'Legal Counsel'
];

export const NewEmployeeOnboardingForm: React.FC<NewEmployeeOnboardingFormProps> = ({
  onSubmit,
  onCancel,
  existingEmployees = []
}) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('personal');
  const [loading, setLoading] = useState(false);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<string>('');

  // Lazy-load whole profile from localStorage (single key "onboardingProfile").
  const [formData, setFormData] = useState<OnboardingData>(() => {
    try {
      const saved = localStorage.getItem('onboardingProfile');
      return saved
        ? JSON.parse(saved)
        : {
            fullName: '',
            email: '',
            role: '',
            department: '',
            startDate: '',
            nationality: 'Malaysian',
            salary: '',
            nric: ''
          };
    } catch (e) {
      console.warn('Failed to parse onboardingProfile from localStorage', e);
      return {
        fullName: '',
        email: '',
        role: '',
        department: '',
        startDate: '',
        nationality: 'Malaysian',
        salary: '',
        nric: ''
      };
    }
  });

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingResume(true);
    setResumeName(file.name);
    setErrors({}); // Clear previous errors

    try {
      const extractedData = await parseResume(file);
      
      setFormData(prev => ({
        ...prev,
        fullName: extractedData.fullName || prev.fullName,
        email: extractedData.email || prev.email,
        role: extractedData.role || prev.role,
        department: extractedData.department || prev.department,
        nationality: (extractedData.nationality === 'Malaysian' || extractedData.nationality === 'Non-Malaysian') 
          ? extractedData.nationality 
          : prev.nationality,
        nric: extractedData.nric || prev.nric,
        salary: extractedData.salary || prev.salary
      }));

    } catch (error) {
      console.error("Resume parsing failed", error);
      setErrors(prev => ({ ...prev, resume: "Failed to extract data. Please fill manually." }));
    } finally {
      setAnalyzingResume(false);
    }
  };

  const validateStep = (step: FormStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'personal':
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        break;
      case 'employment':
        if (!formData.role.trim()) newErrors.role = 'Role is required';
        if (!formData.department.trim()) newErrors.department = 'Department is required';
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.salary.trim()) newErrors.salary = 'Salary is required';
        else if (isNaN(Number(formData.salary)) || Number(formData.salary) <= 0) {
          newErrors.salary = 'Please enter a valid salary amount';
        }
        break;
      case 'compliance':
        if (formData.nationality === 'Malaysian' && !formData.nric.trim()) {
          newErrors.nric = 'NRIC is required for Malaysian employees';
        } else if (formData.nationality === 'Malaysian' && formData.nric) {
          const nricRegex = /^\d{6}-?\d{2}-?\d{4}$/;
          if (!nricRegex.test(formData.nric)) {
            newErrors.nric = 'Invalid NRIC format (e.g., 910101-14-1234)';
          }
        }
        break;
      case 'review':
        // optionally do a final pass; keep as-is
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const steps: FormStep[] = ['personal', 'employment', 'compliance', 'review'];
      const currentIndex = steps.indexOf(currentStep);
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1]);
      }
    }
  };

  const handleBack = () => {
    const steps: FormStep[] = ['personal', 'employment', 'compliance', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const ERROR_MSG = 'Error generating onboarding plan.';

  // On submit: call analyzeOnboarding, store whole profile to localStorage (single write),
  // set analysis, and call parent onSubmit.
  const handleSubmit = async () => {
    if (!validateStep('review')) return;

    setLoading(true);
    try {
      // const result = await analyzeOnboarding(formData);
      const result = "true"; // Mocked for demo purposes

      if (result === ERROR_MSG) {
        throw new Error(ERROR_MSG);
      }

      setAnalysis(result);

      formData.status = 'in_progress';

      // Persist the whole profile object to localStorage under one key
      try {
        localStorage.setItem('onboardingProfile', JSON.stringify(formData));
      } catch (e) {
        // Don't block submission if storage fails (quota, private mode, etc.)
        console.warn('Could not save onboarding profile to localStorage:', e);
      }

      // Create employee in backend with auto-generated documents
      try {
        const response = await fetch('http://localhost:5001/api/onboarding/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            full_name: formData.fullName,
            jurisdiction: formData.nationality === 'Malaysian' ? 'MY' : 'SG',
            position: formData.role,
            department: formData.department,
            start_date: formData.startDate,
            nric: formData.nric || '',
            salary: formData.salary
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create employee');
        }

        const employeeData = await response.json();
        
        // Store generated documents info
        if (employeeData.generated_documents && employeeData.generated_documents.length > 0) {
          localStorage.setItem('generatedDocuments', JSON.stringify(employeeData.generated_documents));
          console.log('Auto-generated documents:', employeeData.generated_documents);
        }

        if (employeeData.workflow_errors && employeeData.workflow_errors.length > 0) {
          console.warn('Workflow warnings:', employeeData.workflow_errors);
        }
      } catch (backendError: any) {
        console.error('Backend employee creation failed:', backendError);
        // Don't block submission if backend fails, but log the error
        setErrors({ 
          submit: `Onboarding created but document generation had issues: ${backendError.message}` 
        });
      }

      onSubmit(formData, result);
    } catch (error: any) {
      const message =
        error?.message && error?.message !== ERROR_MSG
          ? error.message
          : 'Failed to generate onboarding plan. Please try again.';
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  };

  // Update only in-memory state on each field change — no per-keystroke write to localStorage.
  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field if present
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const formatNRIC = (value: string) => {
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 6) formatted = formatted.slice(0, 6) + '-' + formatted.slice(6);
    if (formatted.length > 9) formatted = formatted.slice(0, 9) + '-' + formatted.slice(9);
    return formatted.slice(0, 14);
  };

  const handleCancel = () => {
    // optional: remove saved profile when user cancels
    try {
      localStorage.removeItem('onboardingProfile');
    } catch (e) {
      console.warn('Failed to remove onboardingProfile from localStorage', e);
    }
    onCancel();
  };

  const steps = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'compliance', label: 'Compliance', icon: Fingerprint },
    { id: 'review', label: 'Review', icon: CheckCircle2 }
  ];

  const getStepIndex = (step: FormStep) => steps.findIndex(s => s.id === step);

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-derivhr-500 to-derivhr-600 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">New Employee Onboarding</h2>
              <p className="text-white/80 text-sm font-medium">AI-powered compliance & workflow automation</p>
            </div>
          </div>
          <button onClick={handleCancel} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="text-white" size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-8">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = getStepIndex(currentStep) > index;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                    ${isActive ? 'bg-white text-derivhr-600 scale-110 shadow-lg' :
                      isCompleted ? 'bg-jade-500 text-white' : 'bg-white/20 text-white/60'}
                  `}
                  >
                    {isCompleted ? <CheckCircle2 size={20} /> : <StepIcon size={20} />}
                  </div>
                  <span
                    className={`
                    mt-2 text-xs font-bold uppercase tracking-wider transition-colors
                    ${isActive ? 'text-white' : isCompleted ? 'text-jade-300' : 'text-white/50'}
                  `}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 transition-colors ${
                      isCompleted ? 'bg-jade-400' : 'bg-white/20'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-8">
        {currentStep === 'personal' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <User className="text-derivhr-500" size={24} />
                        Personal Information
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">Enter the new employee's basic details or upload a CV.</p>
                </div>
                
                {/* Resume Upload Button */}
                <div className="w-full md:w-auto">
                    <input
                        type="file"
                        id="resume-upload"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={handleResumeUpload}
                    />
                    <label 
                        htmlFor="resume-upload"
                        className={`
                            flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all border-2 border-dashed
                            ${analyzingResume 
                                ? 'bg-slate-50 border-slate-300 text-slate-400 cursor-wait' 
                                : 'bg-white border-derivhr-200 text-derivhr-600 hover:bg-derivhr-50 hover:border-derivhr-400'
                            }
                        `}
                    >
                        {analyzingResume ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Extracting Data...</span>
                            </>
                        ) : resumeName ? (
                            <>
                                <FileText size={16} />
                                <span>{resumeName} (Change)</span>
                            </>
                        ) : (
                            <>
                                <Upload size={16} />
                                <span>Auto-fill from Resume</span>
                            </>
                        )}
                    </label>
                    {errors.resume && <p className="text-red-500 text-xs mt-1 font-bold text-center">{errors.resume}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  Full Name <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="e.g., John Doe"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all ${
                      errors.fullName ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-red-500 text-xs font-bold flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  Email Address <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="e.g., john.doe@company.com"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs font-bold flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {currentStep === 'employment' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center space-x-2 mb-6">
              <div className="p-2 bg-derivhr-50 rounded-xl">
                <Briefcase className="text-derivhr-500" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Employment Details</h3>
                <p className="text-slate-500 text-sm">Define the role and compensation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  Role <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all appearance-none cursor-pointer ${
                      errors.role ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <option value="">Select a role</option>
                    {ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                {errors.role && (
                  <p className="text-red-500 text-xs font-bold flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.role}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  Department <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all appearance-none cursor-pointer ${
                      errors.department ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <option value="">Select a department</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                {errors.department && (
                  <p className="text-red-500 text-xs font-bold flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.department}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  Start Date <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all ${
                      errors.startDate ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  />
                </div>
                {errors.startDate && (
                  <p className="text-red-500 text-xs font-bold flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  Monthly Salary (MYR) <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => handleInputChange('salary', e.target.value)}
                    placeholder="e.g., 5000"
                    min="0"
                    step="100"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all ${
                      errors.salary ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  />
                </div>
                {errors.salary && (
                  <p className="text-red-500 text-xs font-bold flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.salary}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {currentStep === 'compliance' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center space-x-2 mb-6">
              <div className="p-2 bg-derivhr-50 rounded-xl">
                <Fingerprint className="text-derivhr-500" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Compliance Information</h3>
                <p className="text-slate-500 text-sm">Required for statutory compliance</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  Nationality <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={formData.nationality}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Malaysian">🇲🇾 Malaysian</option>
                    <option value="Non-Malaysian">🌍 Non-Malaysian</option>
                  </select>
                </div>
                <div className="flex items-start space-x-2 mt-2 p-3 bg-blue-50 rounded-xl">
                  <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700 font-medium">
                    {formData.nationality === 'Malaysian'
                      ? 'Malaysian employees require NRIC for EPF and SOCSO registration.'
                      : 'Non-Malaysian employees may require work permit and visa processing.'}
                  </p>
                </div>
              </div>

              {formData.nationality === 'Malaysian' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center">
                    NRIC Number <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={formData.nric}
                      onChange={(e) => handleInputChange('nric', formatNRIC(e.target.value))}
                      placeholder="e.g., 910101-14-1234"
                      maxLength={14}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none transition-all ${
                        errors.nric ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                      }`}
                    />
                  </div>
                  {errors.nric && (
                    <p className="text-red-500 text-xs font-bold flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.nric}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center space-x-2 mb-6">
              <div className="p-2 bg-derivhr-50 rounded-xl">
                <CheckCircle2 className="text-derivhr-500" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Review & Submit</h3>
                <p className="text-slate-500 text-sm">Verify all information before creating the onboarding journey</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</p>
                  <p className="text-sm font-bold text-slate-900">{formData.fullName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm font-bold text-slate-900">{formData.email}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Role</p>
                  <p className="text-sm font-bold text-slate-900">{formData.role}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                  <p className="text-sm font-bold text-slate-900">{formData.department}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</p>
                  <p className="text-sm font-bold text-slate-900">{formData.startDate}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Salary</p>
                  <p className="text-sm font-bold text-slate-900">RM {Number(formData.salary).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nationality</p>
                  <p className="text-sm font-bold text-slate-900">
                    {formData.nationality === 'Malaysian' ? '🇲🇾 Malaysian' : '🌍 Non-Malaysian'}
                  </p>
                </div>
                {formData.nric && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">NRIC</p>
                    <p className="text-sm font-bold text-slate-900">{formData.nric}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-derivhr-50 to-indigo-50 rounded-2xl p-6 border border-derivhr-100">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-derivhr-100 rounded-xl">
                  <Sparkles className="text-derivhr-500" size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">AI Will Generate:</h4>
                  <ul className="space-y-1">
                    <li className="text-xs text-slate-600 font-medium flex items-center">
                      <CheckCircle2 size={12} className="text-jade-500 mr-2" />
                      Personalized onboarding task list
                    </li>
                    <li className="text-xs text-slate-600 font-medium flex items-center">
                      <CheckCircle2 size={12} className="text-jade-500 mr-2" />
                      Compliance checklist based on role & nationality
                    </li>
                    <li className="text-xs text-slate-600 font-medium flex items-center">
                      <CheckCircle2 size={12} className="text-jade-500 mr-2" />
                      Automated document generation
                    </li>
                    <li className="text-xs text-slate-600 font-medium flex items-center">
                      <CheckCircle2 size={12} className="text-jade-500 mr-2" />
                      Culture integration plan
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
                <AlertCircle size={20} className="text-red-500" />
                <p className="text-sm font-bold text-red-700">{errors.submit}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <button
            onClick={handleBack}
            disabled={currentStep === 'personal'}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all ${
              currentStep === 'personal'
                ? 'text-slate-400 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold shadow-lg shadow-derivhr-500/25 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Create Onboarding Journey</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold shadow-lg shadow-derivhr-500/25 hover:shadow-xl hover:scale-105 transition-all"
            >
              <span>Next</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
