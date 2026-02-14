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
  Fingerprint,
  Mail,
  Globe,
  Loader2,
} from "lucide-react";
import { analyzeOnboarding, parseResume } from "../../services/geminiService";
import { createEmployee } from "../../services/api";
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
      const parsedData = await parseResume(file);

      // Save parsed data to localStorage so the form picks it up
      try {
        // Merge with existing or default structure
        const existing = localStorage.getItem("onboardingProfile");
        const base = existing
          ? JSON.parse(existing)
          : {
              fullName: "",
              email: "",
              role: "",
              department: "",
              startDate: "",
              nationality: "Malaysian",
              salary: "",
              nric: "",
            };

        const merged = { ...base, ...parsedData };
        localStorage.setItem("onboardingProfile", JSON.stringify(merged));
      } catch (err) {
        console.warn("Failed to save parsed resume data:", err);
      }

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

export const AIOnboarding: React.FC<AIOnboardingProps> = ({
  onSubmit,
  onCancel,
  existingEmployees = [],
}) => {
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "0",
      sender: "ai",
      text: "Hello! I'm DerivHR's AI Onboarding Assistant. 🤖\n\nI'll help you create an employee profile through a conversational interface. This data will be used to generate an offer letter automatically.\n\nLet's get started! What is the **employee's full name**?",
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
    department: "",
    startDate: "",
    nationality: "Malaysian",
    salary: "",
    nric: "",
  });

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (step === 7) {
      val = val.replace(/\D/g, "");
      if (val.length > 6) val = val.slice(0, 6) + "-" + val.slice(6);
      if (val.length > 9) val = val.slice(0, 9) + "-" + val.slice(9);
      val = val.slice(0, 14);
    }
    setInput(val);
  };

  const nextStep = async (value: string) => {
    if (!value) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: value,
    };

    // Validate NRIC
    if (step === 7) {
      const nricRegex = /^\d{6}-?\d{2}-?\d{4}$/;
      if (!nricRegex.test(value)) {
        setMessages((prev) => [
          ...prev,
          userMsg,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: "That doesn't look like a valid NRIC format (e.g. 910101-14-1234). Please double check.",
          },
        ]);
        setInput("");
        return;
      }
    }

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const newData = { ...formData };
    let nextPrompt = "";
    let nextStepNum = step + 1;

    switch (step) {
      case 0:
        newData.fullName = value;
        nextPrompt = `Great! What is their **email address**? 📧`;
        break;
      case 1:
        newData.email = value;
        nextPrompt = `Perfect! What **role** are they being hired for?`;
        break;
      case 2:
        newData.role = value;
        nextPrompt = `And which **department** will they be joining?`;
        break;
      case 3:
        newData.department = value;
        nextPrompt = `What is the monthly **salary**? (e.g., 5000 MYR)`;
        break;
      case 4:
        newData.salary = value;
        nextPrompt = `Is the candidate **Malaysian** or **Non-Malaysian**? 🇲🇾🌍`;
        break;
      case 5:
        newData.nationality = value as "Malaysian" | "Non-Malaysian";
        nextPrompt = `When is their **start date**? 🗓️`;
        break;
      case 6:
        newData.startDate = value;
        if (newData.nationality === "Malaysian") {
          nextPrompt = `Since they're Malaysian, please enter their **NRIC number** for EPF/SOCSO.`;
          nextStepNum = 7;
        } else {
          nextPrompt = `Excellent! Let me generate the onboarding plan and prepare the offer letter data...`;
          nextStepNum = 8;
          triggerAnalysis(newData);
        }
        break;
      case 7:
        newData.nric = value;
        nextPrompt = `Excellent! Let me generate the onboarding plan and prepare the offer letter data...`;
        nextStepNum = 8;
        triggerAnalysis(newData);
        break;
      default:
        break;
    }

    setFormData(newData);
    setStep(nextStepNum);

    if (step !== 6 || newData.nationality === "Malaysian") {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            text: nextPrompt,
            step: nextStepNum,
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
    let backendId = Date.now().toString();
    try {
      const created = await createEmployee({
        email: data.email,
        full_name: data.fullName,
        jurisdiction: data.nationality === "Malaysian" ? "MY" : "SG",
        position: data.role,
        department: data.department,
        start_date: data.startDate,
        nric: data.nric || "",
      });
      backendId = created.id;
    } catch (err) {
      console.error("Backend employee creation failed:", err);
    }

    // Store data in localStorage for offer letter generation
    try {
      localStorage.setItem(
        "preliminaryEmployeeData",
        JSON.stringify({
          ...data,
          employeeId: backendId,
          createdAt: new Date().toISOString(),
        }),
      );
    } catch (e) {
      console.warn("Failed to save preliminary data:", e);
    }

    // Add completion message
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `🎉 Perfect! I've collected all the preliminary employee data and created the onboarding record.\n\n**Summary:**\n- Name: ${data.fullName}\n- Email: ${data.email}\n- Role: ${data.role}\n- Department: ${data.department}\n- Start Date: ${data.startDate}\n- Salary: ${data.salary} MYR\n\nYou can now generate the **Offer Letter** from the Documents section!`,
          step: 9,
        },
      ]);
    }, 1500);
  };

  const handleRestart = () => {
    setStep(0);
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
      department: "",
      startDate: "",
      nationality: "Malaysian",
      salary: "",
      nric: "",
    });
  };

  const handleFinish = () => {
    // Pass the collected data back
    onSubmit(
      formData,
      analysis || "Employee profile created via AI assisted onboarding",
    );
  };

  const renderControls = () => {
    if (loading || step >= 8) return null;

    if (step === 5) {
      return (
        <div className="flex space-x-3 animate-fade-in">
          <button
            onClick={() => nextStep("Malaysian")}
            className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:border-derivhr-500 hover:bg-derivhr-50 rounded-xl font-bold text-slate-700 shadow-sm transition-all flex items-center justify-center space-x-2"
          >
            <span>🇲🇾</span> <span>Malaysian</span>
          </button>
          <button
            onClick={() => nextStep("Non-Malaysian")}
            className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50 rounded-xl font-bold text-slate-700 shadow-sm transition-all flex items-center justify-center space-x-2"
          >
            <span>🌍</span> <span>Non-Malaysian</span>
          </button>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div className="flex space-x-3 animate-fade-in w-full">
          <input
            type="date"
            value={input}
            onChange={handleInput}
            className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none shadow-sm font-medium"
          />
          <button
            onClick={() => nextStep(input)}
            disabled={!input}
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl px-6 transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            <ArrowRight size={24} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all">
        {step === 7 && (
          <Fingerprint className="text-slate-400 ml-2" size={20} />
        )}
        <input
          value={input}
          onChange={handleInput}
          onKeyDown={(e) => e.key === "Enter" && nextStep(input)}
          autoFocus
          placeholder={
            step === 7 ? "e.g. 910101-14-1234" : "Type your answer..."
          }
          className="flex-1 bg-transparent border-none text-slate-900 px-4 py-2 focus:ring-0 placeholder-slate-400 text-lg font-medium"
          maxLength={step === 7 ? 14 : undefined}
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
                Conversational data collection for offer letter generation
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
              {/* Render message with Markdown */}
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

        {step >= 8 && (
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
    department: string;
    startDate: string;
    nationality: string;
    salary: string;
    nric?: string;
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
  const [formData, setFormData] = useState({
    candidateName: preliminaryData?.fullName || "",
    nric: preliminaryData?.nric || "",
    position: preliminaryData?.role || "",
    department: preliminaryData?.department || "",
    startDate: preliminaryData?.startDate || "",
    salary: preliminaryData?.salary || "",
    bonus: "10",
    allowances: "",
    probationMonths: "3",
    workHours: "9:00 AM - 6:00 PM",
    workLocation: "Kuala Lumpur, Malaysia",
    hrContact: "hr@company.com",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Call the backend to generate offer letter
      const response = await fetch(
        "/api/documents/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_type: "offer_letter",
            employee_name: formData.candidateName,
            nric: formData.nric,
            position: formData.position,
            department: formData.department,
            jurisdiction:
              preliminaryData?.nationality === "Malaysian" ? "MY" : "SG",
            start_date: formData.startDate,
            salary: parseFloat(formData.salary),
            bonus: formData.bonus,
            allowances: formData.allowances,
            probation_months: parseInt(formData.probationMonths),
            work_hours: formData.workHours,
            work_location: formData.workLocation,
            hr_contact: formData.hrContact,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to generate offer letter");
      }

      const result = await response.json();
      onGenerate(result);
    } catch (error) {
      console.error("Error generating offer letter:", error);
      alert("Failed to generate offer letter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
