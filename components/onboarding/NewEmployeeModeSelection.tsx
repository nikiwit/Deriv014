import React, { useState, useEffect } from "react";
import {
  X,
  LayoutGrid,
  Sparkles,
  ArrowRight,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  Bot,
  MessageSquare,
  Upload,
  User,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  Mail,
  Globe,
  Loader2,
  MapPin,
  Banknote,
  Shield,
  Cake,
  Link as LinkIcon,
  Copy,
  Check,
  XCircle,
} from "lucide-react";
import { analyzeOnboarding, parseResume } from "../../services/geminiService";
import { createEmployee, acceptOfferLetter, rejectOfferLetter } from "../../services/api";
import { OnboardingData, OnboardingJourney } from "../../types";
import { MarkdownRenderer } from "../MarkdownRenderer";

interface NewEmployeeModeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onModeSelect: (mode: "form" | "ai") => void;
}

// Modal for selecting onboarding mode
export const NewEmployeeModeSelection: React.FC<
  NewEmployeeModeSelectionProps
> = ({ isOpen, onClose, onModeSelect }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await parseResume(file);

      // Navigate to form
      onModeSelect("form");
    } catch (error) {
      console.error("Resume parsing error:", error);
      alert("Failed to parse resume. Please try entering details manually.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 animate-slide-in-up overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-derivhr-500 to-derivhr-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">
                  New Employee Onboarding
                </h2>
                <p className="text-white/80 text-sm font-medium">
                  Choose how you'd like to create the employee profile
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="text-white" size={20} />
            </button>
          </div>
        </div>

        {/* Mode Options */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Mode (Upload CV) */}
          <div className="relative group">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="w-full h-full p-6 border-2 border-slate-200 rounded-2xl hover:border-derivhr-500 hover:bg-derivhr-50 transition-all text-left relative disabled:opacity-70 disabled:cursor-wait"
            >
              <div className="absolute top-4 right-4">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-derivhr-100 transition-colors">
                  {isUploading ? (
                    <Loader2
                      className="animate-spin text-derivhr-500"
                      size={16}
                    />
                  ) : (
                    <LayoutGrid
                      className="text-slate-500 group-hover:text-derivhr-500"
                      size={16}
                    />
                  )}
                </div>
              </div>
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-lg transition-all">
                <Upload className="text-slate-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Upload CV/Resume
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {isUploading
                  ? "Extracting data..."
                  : "Upload a CV or Resume to auto-fill employee details."}
              </p>
              <ul className="space-y-2 mb-8">
                <li className="flex items-center text-xs text-slate-600">
                  <CheckCircle2 size={14} className="text-jade-500 mr-2" />
                  Resume upload & auto-fill
                </li>
                <li className="flex items-center text-xs text-slate-600">
                  <CheckCircle2 size={14} className="text-jade-500 mr-2" />
                  Full form wizard with validation
                </li>
                <li className="flex items-center text-xs text-slate-600">
                  <CheckCircle2 size={14} className="text-jade-500 mr-2" />
                  4-step process
                </li>
              </ul>

              <div className="absolute bottom-6 left-6 right-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="inline-flex items-center text-sm font-bold text-derivhr-600 group-hover:translate-x-1 transition-transform">
                  Upload File <ArrowRight size={16} className="ml-1" />
                </span>
              </div>
            </button>
            {/* Secondary Action: Manual Entry */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onModeSelect("form");
              }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 translate-y-full text-[10px] text-slate-400 hover:text-derivhr-500 hover:underline font-medium py-2"
            >
              Or enter details manually
            </button>
          </div>

          {/* AI Assisted Mode */}
          <button
            onClick={() => onModeSelect("ai")}
            className="group relative p-6 border-2 border-purple-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
          >
            <div className="absolute top-4 right-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Sparkles className="text-purple-500" size={16} />
              </div>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-lg transition-all">
              <Bot className="text-purple-600" size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              AI Assisted (Guided)
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              AI-powered conversational interface. Answer questions to create
              employee profile naturally.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center text-xs text-slate-600">
                <CheckCircle2 size={14} className="text-purple-500 mr-2" />
                Conversational AI chat
              </li>
              <li className="flex items-center text-xs text-slate-600">
                <CheckCircle2 size={14} className="text-purple-500 mr-2" />
                Smart suggestions
              </li>
              <li className="flex items-center text-xs text-slate-600">
                <CheckCircle2 size={14} className="text-purple-500 mr-2" />
                Auto-generates offer letter data
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-purple-100">
              <span className="inline-flex items-center text-sm font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
                Select AI Guided <ArrowRight size={16} className="ml-1" />
              </span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            Both modes will create an employee profile that can be used to
            generate offer letters and contracts.
          </p>
        </div>
      </div>
    </div>
  );
};

// AI Assisted Onboarding Form
interface AIOnboardingProps {
  onSubmit: (data: OnboardingData, analysis: string) => void;
  onCancel: () => void;
  existingEmployees?: OnboardingJourney[];
}

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  step?: number;
}

// Available position titles from jobs catalog
const POSITION_TITLES = [
  "Full Stack Developer",
  "DevOps Engineer",
  "Cloud Solutions Engineer",
];

// Step definitions for the AI chat flow
interface OnboardingStep {
  key: string;
  prompt: string;
  icon: string;
  type?: "choice" | "date" | "position_select";
  choices?: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  { key: "fullName", prompt: "What is the **employee's full name**?", icon: "User" },
  { key: "email", prompt: "What is their **email address**?", icon: "Mail" },
  { key: "positionTitle", prompt: "Select the **position title** for this employee:", icon: "Briefcase", type: "position_select" },
  { key: "bankName", prompt: "What is the employee's **bank name**? (e.g., Maybank)", icon: "Banknote" },
  { key: "bankAccountHolder", prompt: "What is the **bank account holder name**?", icon: "Banknote" },
  { key: "bankAccountNumber", prompt: "What is the **bank account number**?", icon: "Banknote" },
];

const FINAL_STEP = ONBOARDING_STEPS.length;

// Predefined defaults for all other fields
const PREDEFINED_DEFAULTS = {
  role: "",  // will be set from positionTitle
  department: "Engineering",
  salary: "7000",
  nationality: "Malaysian" as const,
  nric: "",
  dateOfBirth: "",
  startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
  workLocation: "Kuala Lumpur, Malaysia",
  workHours: "9:00 AM - 6:00 PM, Mon-Fri",
  leaveAnnualDays: "14",
  leaveSickDays: "14",
  publicHolidaysPolicy: "Follow Malaysian public holidays",
};

export const AIOnboarding: React.FC<AIOnboardingProps> = ({
  onSubmit,
  onCancel,
  existingEmployees = [],
}) => {
  const [step, setStep] = useState(0);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "0",
      sender: "ai",
      text: "Hello! I'm DerivHR's AI Onboarding Assistant.\n\nI'll help you create a new employee profile quickly. I just need a few key details — everything else will be pre-filled with standard defaults.\n\nLet's get started! What is the **employee's full name**?",
      step: 0,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [formData, setFormData] = useState<OnboardingData>({
    fullName: "",
    email: "",
    role: "",
    department: PREDEFINED_DEFAULTS.department,
    startDate: PREDEFINED_DEFAULTS.startDate,
    nationality: PREDEFINED_DEFAULTS.nationality,
    salary: PREDEFINED_DEFAULTS.salary,
    nric: PREDEFINED_DEFAULTS.nric,
    positionTitle: "",
    workLocation: PREDEFINED_DEFAULTS.workLocation,
    workHours: PREDEFINED_DEFAULTS.workHours,
    leaveAnnualDays: PREDEFINED_DEFAULTS.leaveAnnualDays,
    leaveSickDays: PREDEFINED_DEFAULTS.leaveSickDays,
    publicHolidaysPolicy: PREDEFINED_DEFAULTS.publicHolidaysPolicy,
    dateOfBirth: PREDEFINED_DEFAULTS.dateOfBirth,
    bankName: "",
    bankAccountHolder: "",
    bankAccountNumber: "",
  });

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const currentStepDef = step < ONBOARDING_STEPS.length ? ONBOARDING_STEPS[step] : null;

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const nextStep = async (value: string) => {
    if (!value) return;

    // If waiting for manager confirmation
    if (waitingForConfirmation) {
      const confirmWords = ["yes", "continue", "proceed", "ok", "confirm", "go", "approve"];
      const isConfirmed = confirmWords.some(w => value.toLowerCase().trim().includes(w));

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: "user",
        text: value,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      if (isConfirmed) {
        setWaitingForConfirmation(false);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "ai",
              text: "Excellent! Generating the onboarding plan and preparing the offer letter data...",
              step: FINAL_STEP,
            },
          ]);
        }, 600);
        triggerAnalysis(formData);
      } else {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "ai",
              text: "No problem. Type **yes**, **continue**, or **proceed** when you're ready to generate the offer letter. Or click **Cancel** to start over.",
            },
          ]);
        }, 600);
      }
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: value,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const newData = { ...formData };
    if (currentStepDef) {
      (newData as any)[currentStepDef.key] = value;
      // Sync role with positionTitle
      if (currentStepDef.key === "positionTitle") {
        newData.role = value;
      }
    }

    setFormData(newData);

    const nextIdx = step + 1;

    if (nextIdx >= FINAL_STEP) {
      // All fields collected — show summary and wait for confirmation
      setStep(FINAL_STEP);
      setWaitingForConfirmation(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: `I've collected all the required details. Here's the summary:\n\n**Employee Details:**\n- **Name:** ${newData.fullName}\n- **Email:** ${newData.email}\n- **Position:** ${newData.positionTitle}\n- **Department:** ${newData.department}\n- **Salary:** ${newData.salary} MYR\n- **Start Date:** ${newData.startDate}\n- **Nationality:** ${newData.nationality}\n- **Work Location:** ${newData.workLocation}\n- **Work Hours:** ${newData.workHours}\n\n**Banking Details:**\n- **Bank:** ${newData.bankName}\n- **Account Holder:** ${newData.bankAccountHolder}\n- **Account Number:** ${newData.bankAccountNumber}\n\nType **yes**, **continue**, or **proceed** to generate the offer letter.`,
            step: FINAL_STEP,
          },
        ]);
      }, 600);
    } else {
      setStep(nextIdx);
      const nextDef = ONBOARDING_STEPS[nextIdx];
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: nextDef.prompt,
            step: nextIdx,
          },
        ]);
      }, 600);
    }
  };

  const triggerAnalysis = async (data: OnboardingData) => {
    setLoading(true);

    const result = await analyzeOnboarding(data);
    setAnalysis(result);
    setLoading(false);

    // Create employee in backend
    try {
      await createEmployee({
        email: data.email,
        full_name: data.fullName,
        jurisdiction: data.nationality === "Malaysian" ? "MY" : "SG",
        position: data.positionTitle || data.role,
        department: data.department,
        start_date: data.startDate,
        nric: data.nric || "",
        bank_name: data.bankName || "",
        bank_account: data.bankAccountNumber || "",
      });
    } catch (err) {
      console.error("Backend employee creation failed:", err);
    }

    // Add completion message
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `Profile created successfully! You can now generate the **Offer Letter**.`,
          step: FINAL_STEP + 1,
        },
      ]);
    }, 1500);
  };

  const handleRestart = () => {
    setStep(0);
    setWaitingForConfirmation(false);
    setMessages([
      {
        id: "0",
        sender: "ai",
        text: "Ready for the next one! What is the **employee's full name**?",
        step: 0,
      },
    ]);
    setAnalysis("");
    setFormData({
      fullName: "",
      email: "",
      role: "",
      department: PREDEFINED_DEFAULTS.department,
      startDate: PREDEFINED_DEFAULTS.startDate,
      nationality: PREDEFINED_DEFAULTS.nationality,
      salary: PREDEFINED_DEFAULTS.salary,
      nric: PREDEFINED_DEFAULTS.nric,
      positionTitle: "",
      workLocation: PREDEFINED_DEFAULTS.workLocation,
      workHours: PREDEFINED_DEFAULTS.workHours,
      leaveAnnualDays: PREDEFINED_DEFAULTS.leaveAnnualDays,
      leaveSickDays: PREDEFINED_DEFAULTS.leaveSickDays,
      publicHolidaysPolicy: PREDEFINED_DEFAULTS.publicHolidaysPolicy,
      dateOfBirth: PREDEFINED_DEFAULTS.dateOfBirth,
      bankName: "",
      bankAccountHolder: "",
      bankAccountNumber: "",
    });
  };

  const handleFinish = () => {
    onSubmit(
      formData,
      analysis || "Employee profile created via AI assisted onboarding",
    );
  };

  const renderControls = () => {
    if (loading) return null;

    // Finished — show action buttons
    if (step >= FINAL_STEP && !waitingForConfirmation) {
      return null;
    }

    // Position select dropdown
    if (currentStepDef?.type === "position_select") {
      return (
        <div className="flex flex-col space-y-2 animate-fade-in">
          {POSITION_TITLES.map((title) => (
            <button
              key={title}
              onClick={() => nextStep(title)}
              className="w-full py-3 px-4 bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50 rounded-xl font-bold text-slate-700 shadow-sm transition-all text-left flex items-center space-x-3"
            >
              <Briefcase size={16} className="text-purple-500" />
              <span>{title}</span>
            </button>
          ))}
        </div>
      );
    }

    // Text input (default — including confirmation step)
    return (
      <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all">
        <input
          value={input}
          onChange={handleInput}
          onKeyDown={(e) => e.key === "Enter" && nextStep(input)}
          autoFocus
          placeholder={
            waitingForConfirmation
              ? "Type yes, continue, or proceed..."
              : "Type your answer..."
          }
          className="flex-1 bg-transparent border-none text-slate-900 px-4 py-2 focus:ring-0 placeholder-slate-400 text-lg font-medium"
        />
        <button
          onClick={() => nextStep(input)}
          disabled={!input}
          className="p-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-purple-500/20"
        >
          <MessageSquare size={20} />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                AI Assisted Onboarding
              </h2>
              <p className="text-white/80 text-sm font-medium">
                {waitingForConfirmation
                  ? "Review & Confirm"
                  : `Step ${Math.min(step + 1, FINAL_STEP)} of ${FINAL_STEP}`}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="text-white" size={20} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="p-6 h-[400px] overflow-y-auto space-y-4" ref={scrollRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.sender === "user"
                  ? "bg-purple-600 text-white rounded-br-none"
                  : "bg-slate-100 text-slate-800 rounded-bl-none"
              }`}
            >
              {msg.sender === "ai" && (
                <div className="flex items-center space-x-2 mb-2">
                  <Bot size={12} className="text-purple-500" />
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">
                    AI Assistant
                  </span>
                </div>
              )}
              <MarkdownRenderer content={msg.text} className="text-sm" />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-100 p-4 rounded-2xl rounded-bl-none flex items-center space-x-3">
              <Loader2 className="animate-spin text-purple-500" size={18} />
              <span className="text-sm text-slate-500 font-bold">
                Processing...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-slate-100">
        {renderControls()}

        {step >= FINAL_STEP && !loading && !waitingForConfirmation && (
          <div className="flex justify-center space-x-3 mt-4">
            <button
              onClick={handleRestart}
              className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              Add Another
            </button>
            <button
              onClick={handleFinish}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all flex items-center space-x-2"
            >
              <CheckCircle2 size={18} />
              <span>Finish & Generate Offer Letter</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Offer Letter Generator from preliminary data
interface OfferLetterGeneratorProps {
  preliminaryData: {
    fullName: string;
    email: string;
    role: string;
    positionTitle?: string;
    department: string;
    startDate: string;
    nationality: string;
    salary: string;
    nric?: string;
    dateOfBirth?: string;
    workLocation?: string;
    workHours?: string;
    leaveAnnualDays?: string;
    leaveSickDays?: string;
    publicHolidaysPolicy?: string;
    bankName?: string;
    bankAccountHolder?: string;
    bankAccountNumber?: string;
  } | null;
  onGenerate: (data: any) => void;
  onCancel: () => void;
}

export const OfferLetterGenerator: React.FC<OfferLetterGeneratorProps> = ({
  preliminaryData,
  onGenerate,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [formData, setFormData] = useState({
    candidateName: preliminaryData?.fullName || "",
    email: preliminaryData?.email || "",
    nric: preliminaryData?.nric || "",
    position: preliminaryData?.role || "",
    positionTitle: preliminaryData?.positionTitle || preliminaryData?.role || "",
    department: preliminaryData?.department || "",
    startDate: preliminaryData?.startDate || "",
    salary: preliminaryData?.salary || "",
    nationality: preliminaryData?.nationality || "Malaysian",
    dateOfBirth: preliminaryData?.dateOfBirth || "",
    workLocation: preliminaryData?.workLocation || "Kuala Lumpur, Malaysia",
    workHours: preliminaryData?.workHours || "9:00 AM - 6:00 PM",
    leaveAnnualDays: preliminaryData?.leaveAnnualDays || "14",
    leaveSickDays: preliminaryData?.leaveSickDays || "14",
    publicHolidaysPolicy: preliminaryData?.publicHolidaysPolicy || "Follow Malaysian public holidays",
    bankName: preliminaryData?.bankName || "",
    bankAccountHolder: preliminaryData?.bankAccountHolder || "",
    bankAccountNumber: preliminaryData?.bankAccountNumber || "",
    bonus: "10",
    allowances: "",
    probationMonths: "3",
    hrContact: "hr@company.com",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerate = async () => {
    setLoading(true);

    console.log("Starting offer letter generation...");
    console.log("Form Data:", formData);

    try {
      // Validate required fields
      if (!formData.candidateName || !formData.email || !formData.position) {
        throw new Error("Please fill in all required fields (Name, Email, Position)");
      }
      
      // Prepare comprehensive employee data for offer approval
      const offerApprovalData = {
        full_name: formData.candidateName,
        email: formData.email,
        first_name: formData.candidateName.split(" ")[0],
        last_name: formData.candidateName.split(" ").slice(1).join(" ") || formData.candidateName.split(" ")[0],
        nric: formData.nric,
        position_title: formData.positionTitle || formData.position,
        position: formData.position,
        department: formData.department,
        start_date: formData.startDate,
        salary: formData.salary,
        nationality: formData.nationality,
        date_of_birth: formData.dateOfBirth,
        work_location: formData.workLocation,
        work_hours: formData.workHours,
        leave_annual_days: parseInt(formData.leaveAnnualDays) || 14,
        leave_sick_days: parseInt(formData.leaveSickDays) || 14,
        public_holidays_policy: formData.publicHolidaysPolicy,
        bank_name: formData.bankName,
        bank_account_holder: formData.bankAccountHolder,
        bank_account_number: formData.bankAccountNumber,
        jurisdiction: formData.nationality === "Malaysian" ? "MY" : "SG",
        bonus: formData.bonus,
        probation_months: parseInt(formData.probationMonths),
      };

      console.log("📤 Sending data to backend:", offerApprovalData);

      // Store data to show in UI while processing
      setSubmittedData(offerApprovalData);

      // Call new backend endpoint to generate offer approval JSON and create user
      let response;
      try {
        response = await fetch("/api/onboarding-workflow/generate-offer-approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(offerApprovalData),
        });
        console.log("📥 Response status:", response.status);
      } catch (fetchError: any) {
        console.error("❌ Network error:", fetchError);
        throw new Error(
          "Cannot connect to backend server!\n\n" +
          "Please make sure the backend is running:\n" +
          "1. Open a terminal\n" +
          "2. cd backend\n" +
          "3. source ../venv/bin/activate\n" +
          "4. python run.py\n\n" +
          "The backend should start on http://localhost:5000"
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`Server error (${response.status}): ${errorText.substring(0, 200)}`);
        }
        
        throw new Error(errorData.error || `Failed to generate offer letter (${response.status})`);
      }

      const result = await response.json();
      console.log("✅ Success! Result:", result);
      
      // Show success notification with the offer URL
      const offerUrl = `${window.location.origin}${result.offer_url}`;
      console.log("🔗 Offer URL:", offerUrl);
      
      // FIX: Clear loading state BEFORE calling onGenerate to prevent stuck state
      setLoading(false);
      
      // Pass result to parent to display offer letter view
      onGenerate(result);
    } catch (error: any) {
      console.error("❌ Error generating offer letter:", error);
      
      // Show detailed error to user
      const errorMessage = error.message || "Unknown error occurred";
      alert(`Failed to generate offer letter:\n\n${errorMessage}\n\nCheck the browser console for more details.`);
      
      // Keep the form open so user can try again
      setSubmittedData(null);
      setLoading(false);
    }
  };

  // Show processing state with data preview
  if (loading && submittedData) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Loader2 className="text-white animate-spin" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">
                  Generating Offer Letter...
                </h2>
                <p className="text-white/80 text-sm font-medium">
                  Creating pending_employee record
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Processing Status */}
        <div className="p-8 space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <Loader2 className="text-blue-500 animate-spin" size={24} />
            <div>
              <p className="text-lg font-bold text-slate-900">
                Processing your request...
              </p>
              <p className="text-sm text-slate-500">
                This will take just a moment
              </p>
            </div>
          </div>

          {/* Data Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
              📋 Submitting Employee Data
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Personal Information */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">
                  Personal Information
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Full Name:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {submittedData.full_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Email:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {submittedData.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Nationality:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {submittedData.nationality}
                    </span>
                  </div>
                  {submittedData.nric && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">NRIC:</span>
                      <span className="text-xs font-bold text-slate-900">
                        {submittedData.nric}
                      </span>
                    </div>
                  )}
                  {submittedData.date_of_birth && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">DOB:</span>
                      <span className="text-xs font-bold text-slate-900">
                        {submittedData.date_of_birth}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Employment Details */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">
                  Employment Details
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Position:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {submittedData.position_title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Department:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {submittedData.department}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Start Date:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {submittedData.start_date}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Salary:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {submittedData.salary} MYR
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Jurisdiction:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {submittedData.jurisdiction}
                    </span>
                  </div>
                </div>
              </div>

              {/* Work Details */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">
                  Work Details
                </h4>
                <div className="space-y-2">
                  {submittedData.work_location && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Location:</span>
                      <span className="text-xs font-bold text-slate-900">
                        {submittedData.work_location}
                      </span>
                    </div>
                  )}
                  {submittedData.work_hours && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Hours:</span>
                      <span className="text-xs font-bold text-slate-900">
                        {submittedData.work_hours}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Annual Leave:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {submittedData.leave_annual_days} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Sick Leave:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {submittedData.leave_sick_days} days
                    </span>
                  </div>
                </div>
              </div>

              {/* Banking Details */}
              {submittedData.bank_name && (
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">
                    Banking Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Bank:</span>
                      <span className="text-xs font-bold text-slate-900">
                        {submittedData.bank_name}
                      </span>
                    </div>
                    {submittedData.bank_account_holder && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Holder:</span>
                        <span className="text-xs font-bold text-slate-900">
                          {submittedData.bank_account_holder}
                        </span>
                      </div>
                    )}
                    {submittedData.bank_account_number && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Account:</span>
                        <span className="text-xs font-bold text-slate-900">
                          {submittedData.bank_account_number}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Messages */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <CheckCircle2 className="text-jade-500" size={16} />
              <span>Validating employee data...</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Loader2 className="text-blue-500 animate-spin" size={16} />
              <span>Creating JSON file in backend/temp_data/...</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <Clock className="text-slate-400" size={16} />
              <span>Creating user with role: pending_employee...</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <FileText className="text-slate-400" size={16} />
              <span>Generating offer letter URL...</span>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Globe className="text-blue-500 mt-0.5" size={16} />
              <div>
                <p className="text-xs font-bold text-blue-900 mb-1">
                  API Request in Progress
                </p>
                <p className="text-xs text-blue-700">
                  POST /api/onboarding-workflow/generate-offer-approval
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Creating pending_employee record with employee_id (UUID)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!preliminaryData) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <p className="text-slate-500">
          No preliminary data available. Please complete the onboarding first.
        </p>
        <button
          onClick={onCancel}
          className="mt-4 px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-derivhr-500 to-derivhr-600 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                Generate Offer Letter
              </h2>
              <p className="text-white/80 text-sm font-medium">
                Using data from {preliminaryData.fullName}'s profile
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="text-white" size={20} />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Candidate Name
            </label>
            <input
              type="text"
              name="candidateName"
              value={formData.candidateName}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              NRIC / Passport No
            </label>
            <input
              type="text"
              name="nric"
              value={formData.nric}
              onChange={handleChange}
              placeholder="e.g. 910101-14-1234 or A12345678"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Position</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Position Title
            </label>
            <input
              type="text"
              name="positionTitle"
              value={formData.positionTitle}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Department
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Nationality
            </label>
            <input
              type="text"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Monthly Salary (MYR)
            </label>
            <input
              type="number"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Bonus (%)
            </label>
            <input
              type="number"
              name="bonus"
              value={formData.bonus}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Probation (months)
            </label>
            <select
              name="probationMonths"
              value={formData.probationMonths}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            >
              <option value="1">1 month</option>
              <option value="2">2 months</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Work Location
            </label>
            <input
              type="text"
              name="workLocation"
              value={formData.workLocation}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Work Hours
            </label>
            <input
              type="text"
              name="workHours"
              value={formData.workHours}
              onChange={handleChange}
              placeholder="e.g. 9:00 AM - 6:00 PM"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Annual Leave Days
            </label>
            <input
              type="number"
              name="leaveAnnualDays"
              value={formData.leaveAnnualDays}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Sick Leave Days
            </label>
            <input
              type="number"
              name="leaveSickDays"
              value={formData.leaveSickDays}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700">
              Public Holidays Policy
            </label>
            <input
              type="text"
              name="publicHolidaysPolicy"
              value={formData.publicHolidaysPolicy}
              onChange={handleChange}
              placeholder="e.g. Follow Malaysian public holidays"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Bank Name
            </label>
            <input
              type="text"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              placeholder="e.g. Maybank"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Bank Account Holder
            </label>
            <input
              type="text"
              name="bankAccountHolder"
              value={formData.bankAccountHolder}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Bank Account Number
            </label>
            <input
              type="text"
              name="bankAccountNumber"
              value={formData.bankAccountNumber}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
            />
          </div>
        </div>

        {/* Data Source Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle2 className="text-blue-500" size={18} />
            <span className="text-sm font-bold text-blue-700">Data Source</span>
          </div>
          <p className="text-xs text-blue-600">
            This form is pre-filled with data from the preliminary employee
            profile. You can edit any field before generating the offer letter.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-8 py-6 border-t border-slate-100 flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold shadow-lg shadow-derivhr-500/25 hover:shadow-xl transition-all flex items-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <FileText size={18} />
              <span>Generate Offer Letter</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Offer Letter Display Component - Shows generated offer with Accept/Reject
interface OfferLetterDisplayProps {
  offerData: {
    employee_id: string;
    offer_url: string;
    user_id: string;
    message: string;
  };
  employeeData: {
    full_name: string;
    email: string;
    position_title: string;
    department: string;
    start_date: string;
    salary: string;
    nationality: string;
    work_location?: string;
    work_hours?: string;
    leave_annual_days?: number;
    leave_sick_days?: number;
    bank_name?: string;
    [key: string]: any;
  };
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
}

export const OfferLetterDisplay: React.FC<OfferLetterDisplayProps> = ({
  offerData,
  employeeData,
  onAccept,
  onReject,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${offerData.offer_url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      await acceptOfferLetter(offerData.employee_id);
      alert("Offer accepted successfully! Your account has been created.");
      onAccept();
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      alert(`Failed to accept offer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }

    setLoading(true);
    try {
      await rejectOfferLetter(offerData.employee_id, rejectReason);
      alert("Offer rejected. HR has been notified and will contact you.");
      onReject();
    } catch (error: any) {
      console.error("Error rejecting offer:", error);
      alert(`Failed to reject offer: ${error.message}`);
    } finally {
      setLoading(false);
      setShowRejectDialog(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-jade-500 to-jade-600 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                Offer Letter Generated
              </h2>
              <p className="text-white/80 text-sm font-medium">
                Review and take action on your offer
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="text-white" size={20} />
          </button>
        </div>
      </div>

      {/* Success Banner */}
      <div className="bg-jade-50 border-b border-jade-200 px-8 py-4">
        <div className="flex items-start space-x-3">
          <CheckCircle2 className="text-jade-600 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm font-bold text-jade-900">
              Offer letter generated successfully!
            </p>
            <p className="text-xs text-jade-700 mt-1">
              Employee ID: <span className="font-mono">{offerData.employee_id}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Offer URL Section */}
      <div className="px-8 py-6 bg-slate-50 border-b border-slate-200">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
          Offer Letter URL (Share with candidate)
        </label>
        <div className="flex items-center space-x-3">
          <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-700">
            {window.location.origin}{offerData.offer_url}
          </div>
          <button
            onClick={handleCopyLink}
            className="px-4 py-3 bg-derivhr-500 hover:bg-derivhr-600 text-white rounded-xl font-bold transition-all flex items-center space-x-2"
          >
            {copied ? (
              <>
                <Check size={18} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Offer Details */}
      <div className="p-8 space-y-6">
        <h3 className="text-lg font-black text-slate-900">Offer Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
              Personal Information
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Full Name</label>
                <p className="text-sm font-bold text-slate-900">{employeeData.full_name}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Email</label>
                <p className="text-sm font-bold text-slate-900">{employeeData.email}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Nationality</label>
                <p className="text-sm font-bold text-slate-900">{employeeData.nationality}</p>
              </div>
              {employeeData.date_of_birth && (
                <div>
                  <label className="text-xs text-slate-500">Date of Birth</label>
                  <p className="text-sm font-bold text-slate-900">{employeeData.date_of_birth}</p>
                </div>
              )}
            </div>
          </div>

          {/* Employment Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
              Employment Details
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Position</label>
                <p className="text-sm font-bold text-slate-900">{employeeData.position_title}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Department</label>
                <p className="text-sm font-bold text-slate-900">{employeeData.department}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Start Date</label>
                <p className="text-sm font-bold text-slate-900">{employeeData.start_date}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Monthly Salary</label>
                <p className="text-sm font-bold text-slate-900">{employeeData.salary} MYR</p>
              </div>
            </div>
          </div>

          {/* Work Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
              Work Details
            </h4>
            <div className="space-y-3">
              {employeeData.work_location && (
                <div>
                  <label className="text-xs text-slate-500">Work Location</label>
                  <p className="text-sm font-bold text-slate-900">{employeeData.work_location}</p>
                </div>
              )}
              {employeeData.work_hours && (
                <div>
                  <label className="text-xs text-slate-500">Work Hours</label>
                  <p className="text-sm font-bold text-slate-900">{employeeData.work_hours}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500">Annual Leave</label>
                <p className="text-sm font-bold text-slate-900">{employeeData.leave_annual_days || 14} days</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Sick Leave</label>
                <p className="text-sm font-bold text-slate-900">{employeeData.leave_sick_days || 14} days</p>
              </div>
            </div>
          </div>

          {/* Banking Details */}
          {employeeData.bank_name && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                Banking Details
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Bank Name</label>
                  <p className="text-sm font-bold text-slate-900">{employeeData.bank_name}</p>
                </div>
                {employeeData.bank_account_holder && (
                  <div>
                    <label className="text-xs text-slate-500">Account Holder</label>
                    <p className="text-sm font-bold text-slate-900">{employeeData.bank_account_holder}</p>
                  </div>
                )}
                {employeeData.bank_account_number && (
                  <div>
                    <label className="text-xs text-slate-500">Account Number</label>
                    <p className="text-sm font-bold text-slate-900">{employeeData.bank_account_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <button
          onClick={() => setShowRejectDialog(true)}
          disabled={loading}
          className="px-6 py-3 border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all disabled:opacity-50 flex items-center space-x-2"
        >
          <XCircle size={18} />
          <span>Reject Offer</span>
        </button>

        <button
          onClick={handleAccept}
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-jade-500 to-jade-600 text-white rounded-xl font-bold shadow-lg shadow-jade-500/25 hover:shadow-xl transition-all disabled:opacity-50 flex items-center space-x-2"
        >
                        <span>Accept Offer</span>

          {/* {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>Accept Offer</span>
            </>
          )} */}
        </button>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !loading && setShowRejectDialog(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Reject Offer
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this offer. HR will be notified.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter your reason here..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
              rows={4}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowRejectDialog(false)}
                disabled={loading}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {loading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Offer Generation Success - Simple view with copyable link
interface OfferGenerationSuccessProps {
  offerData: {
    employee_id: string;
    offer_url: string;
    user_id: string;
    message: string;
  };
  onDone: () => void;
}

export const OfferGenerationSuccess: React.FC<OfferGenerationSuccessProps> = ({
  offerData,
  onDone,
}) => {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}${offerData.offer_url}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-jade-500 to-jade-600 px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <CheckCircle2 className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                Offer Letter Generated Successfully!
              </h2>
              <p className="text-white/80 text-sm font-medium mt-1">
                User created with pending_employee role
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Employee Info */}
          <div className="bg-jade-50 border border-jade-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <User className="text-jade-600" size={18} />
              <span className="text-sm font-bold text-jade-900">Employee Details</span>
            </div>
            <div className="space-y-1 ml-6">
              <p className="text-sm text-jade-800">
                <span className="font-bold">ID:</span>{" "}
                <span className="font-mono text-xs">{offerData.employee_id}</span>
              </p>
            </div>
          </div>

          {/* Copyable Link Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <LinkIcon className="text-derivhr-500" size={20} />
              <h3 className="text-lg font-bold text-slate-900">
                Share Offer Letter with Candidate
              </h3>
            </div>
            <p className="text-sm text-slate-600">
              Copy the link below and share it with the candidate via email or messaging app.
              The candidate can view and accept/reject the offer directly.
            </p>
            
            {/* Link Box */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                Offer Letter URL
              </label>
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-3 font-mono text-sm text-slate-700 break-all">
                  {fullUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 px-6 py-3 bg-derivhr-500 hover:bg-derivhr-600 text-white rounded-lg font-bold transition-all flex items-center space-x-2 shadow-lg"
                >
                  {copied ? (
                    <>
                      <Check size={18} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <MessageSquare className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
              <div className="space-y-2">
                <p className="text-sm font-bold text-blue-900">Next Steps:</p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Copy the offer letter URL above</li>
                  <li>Send it to the candidate via email, WhatsApp, or other messaging</li>
                  <li>Candidate opens the link to view their offer</li>
                  <li>Candidate can accept or reject the offer directly</li>
                  <li>You'll be notified when they respond</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-center space-x-2 py-4">
            <div className="px-4 py-2 bg-jade-100 text-jade-700 rounded-full text-sm font-bold flex items-center space-x-2">
              <Clock size={16} />
              <span>Status: Pending Candidate Response</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onDone}
            className="px-8 py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
          >
            <CheckCircle2 size={18} />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
