import React from "react";

// ============================================
// Authentication Types
// ============================================

export type UserRole = "hr_admin" | "employee" | "pending_employee";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: string;
  employeeId?: string;
  startDate?: string;
  onboardingComplete?: boolean;
  profilePicture?: string;
  nationality?: "Malaysian" | "Non-Malaysian";
  nric?: string;
}

// ============================================
// Job Contract Types
// ============================================

export type JobLevel = "Junior" | "Mid" | "Senior" | "Executive";

export type JobDepartment =
  | "Engineering"
  | "Sales"
  | "Marketing"
  | "HR"
  | "Finance"
  | "Operations"
  | "IT"
  | "Customer Support";

export interface JobDescription {
  title: string;
  department: JobDepartment;
  level: JobLevel;
  salary?: number;
  responsibilities: string[];
  requirements: string[];
  benefits?: string[];
  startDate?: string;
}

export interface JobContract {
  id: string;
  employeeName: string;
  position: string;
  department: JobDepartment;
  level: JobLevel;
  salary: string;
  startDate: string;
  contractType: "Permanent" | "Contract" | "Internship";
  benefits: string[];
  jurisdiction: "MY" | "SG";
  generatedAt: string;
}

// ============================================
// LMS (Learning Management System) Types
// ============================================

export type TrainingStatus = "not_started" | "in_progress" | "completed";

export interface LMSTraining {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  isRequired: boolean;
}

export interface RoleBasedTraining {
  role: UserRole;
  department: JobDepartment;
  level: JobLevel;
  requiredTrainings: LMSTraining[];
}

// ============================================
// Intelligent Onboarding Types
// ============================================

export type CompanyType = "MY" | "SG";

export type JourneyModuleType =
  | "compliance"
  | "documentation"
  | "training"
  | "it_setup"
  | "culture"
  | "benefits"
  | "access";

export interface JourneyModule {
  id: string;
  type: JourneyModuleType;
  title: string;
  description: string;
  isRequired: boolean;
  estimatedMinutes: number;
  dependencies?: string[];
}

export interface OnboardingJourneyTemplate {
  company: CompanyType;
  department: JobDepartment;
  level: JobLevel;
  modules: JourneyModule[];
  totalEstimatedMinutes: number;
}

export interface IntelligentOnboardingJourney {
  templateId: string;
  employeeName: string;
  email: string;
  position: string;
  department: JobDepartment;
  level: JobLevel;
  company: CompanyType;
  generatedAt: string;
  status: "generated" | "in_progress" | "completed";
  customizations: Record<string, any>;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role: UserRole) => boolean;
  loginWithUser: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
}

// ============================================
// Onboarding Types
// ============================================

export type TaskStatus = "locked" | "available" | "in_progress" | "completed";
export type TaskCategory =
  | "documentation"
  | "it_setup"
  | "compliance"
  | "training"
  | "culture";

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: "required" | "recommended" | "optional";
  estimatedMinutes: number;
  completedAt?: string;
  requiresUpload?: boolean;
  requiresSignature?: boolean;
  dependencies?: string[];
  /** Template identifier for tasks that open a document form (e.g. 'offer_acceptance', 'contract') */
  templateId?: "offer_acceptance" | "contract";
}

export interface OnboardingJourney {
  id: string;
  employeeId: string;
  employeeName: string;
  tasks: OnboardingTask[];
  progress: number;
  status: "not_started" | "in_progress" | "completed";
  aiPlan?: string;
  startDate: string;
  email?: string;
  position?: string;
  department?: string;
  jurisdiction?: string;
  role?: string;
}
export interface InitialOnboardingJourney {
  // System fields
  id: string;
  employeeId: string;
  createdAt: string;
  status: "in_progress" | "completed" | "on_hold";
  progress: number;
  aiPlan: string;

  // Personal & job data (from OnboardingData)
  fullName: string;
  email: string;
  role: string;
  department: string;
  startDate: string;
  nationality: "Malaysian" | "Non-Malaysian";
  nric?: string;

  // Onboarding workflow
  tasks: {
    id: string;
    title: string;
    status: "pending" | "completed";
    completedAt?: string;
  }[];
}

// ============================================
// View State (Extended)
// ============================================

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ViewState =
  // HR Admin views
  | "dashboard"
  | "documents"
  | "assistant"
  | "planning"
  | "training"
  | "knowledge"
  | "leave"
  | "onboarding"
  | "candidate"
  | "new_employee"
  | "hr_agent"
  | "document_reminders"
  // Auth views
  | "login"
  // Employee views
  | "employee_dashboard"
  | "my_onboarding"
  | "my_leave"
  | "my_documents"
  | "my_profile"
  | "employee_chat"
  // Employee Self-Onboarding (NRIC/Passport verification)
  | "employee_onboarding"
  // Training views
  | "employee_training"   // HR view
  | "my_training"         // Employee view
  // Offer views
  | "offer_success";      // Offer generation success

export interface ContractParams {
  employeeName: string;
  role: string;
  jurisdiction: string;
  salary: string;
  startDate: string;
  specialClauses: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelUsed?:
    | "Local-Llama-3"
    | "GPT-4o-mini"
    | "RAG-Local"
    | "System"
    | "Error"
    | string;
  timestamp: Date;
  feedback?: "positive" | "negative";
  feedbackComment?: string;
  attachments?: string[];
  // Agent system fields
  agentUsed?:
    | "main_hr"
    | "policy_research"
    | "compliance"
    | "document"
    | "employee_support";
  jurisdiction?: "MY" | "SG" | "BOTH";
  confidence?: number;
  sources?: ChatSource[];
}

export interface ChatSource {
  file: string;
  jurisdiction: string;
  score?: number | null;
  snippet?: string;
}

export interface ComplianceRisk {
  id: string;
  area: string;
  riskLevel: "Low" | "Medium" | "High";
  prediction: string;
}

export interface Sandbox {
  id: string;
  name: string;
  jurisdiction: string;
  baseModel: string;
  status: "Ready" | "Training" | "Validation Failed" | "Live";
  accuracy: number;
  feedbackCount: number;
  lastTrained: string;
}

export interface FeedbackLog {
  id: string;
  sandboxId: string;
  source: "Chat" | "Document";
  contentSnippet: string;
  feedbackType: "positive" | "negative";
  correction?: string;
  timestamp: string;
  status: "Pending" | "Applied";
}

export interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ReactNode;
}

export interface KnowledgeDoc {
  id: string;
  name: string;
  type: "PDF" | "Spreadsheet" | "Policy";
  size: string;
  uploadDate: string;
  status: "Indexed" | "Processing" | "Failed";
  summary?: string;
}

export type LeaveType =
  | "Annual"
  | "Sick"
  | "Hospitalization"
  | "Maternity"
  | "Paternity"
  | "Unpaid";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export interface LeaveRequest {
  id: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  requestDate: string;
}

export interface LeaveBalance {
  type: LeaveType;
  entitled: number;
  taken: number;
  pending: number;
}

export interface OnboardingData {
  fullName: string;
  email: string;
  role: string;
  department: string;
  startDate: string;
  nationality: "Malaysian" | "Non-Malaysian";
  salary: string;
  nric?: string;
  positionTitle?: string;
  workLocation?: string;
  workHours?: string;
  leaveAnnualDays?: string;
  leaveSickDays?: string;
  publicHolidaysPolicy?: string;
  dateOfBirth?: string;
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
}

// export interface CandidateProfile {
//     firstName: string;
//     lastName: string;
//     email: string;
//     phone: string;
//     bankName: string;
//     bankAccount: string;
//     taxId: string;
//     epfNo: string;
//     emergencyContact: string;
// }

export class CandidateProfile {
  // --- Identity ---
  id?: string;
  name: string;
  nationality: "Malaysian" | "Non-Malaysian" | string;
  nric?: string; // Malaysians only
  passportNumber?: string; // Non-Malaysians
  dateOfBirth?: string; // ISO date

  // --- Employment ---
  role: string;
  department: string;
  employmentType: "Permanent" | "Contract" | "Intern" | string;
  startDate: string; // ISO date
  salary: number;
  currency: string; // MYR, USD, etc.
  workLocation?: string; // MY / SG / Remote

  // --- Immigration (for expats) ---
  visaType?: string; // Employment Pass, Dependant Pass
  visaExpiryDate?: string; // ISO date
  immigrationStatus?: string; // Pending / Approved / Expired

  // --- Statutory / Payroll ---
  bankName?: string;
  bankAccount?: string;
  taxId?: string; // LHDN / TIN
  epf?: string; // KWSP
  socso?: string; // PERKESO
  eis?: string;

  // --- Contact ---
  email: string;
  phone?: string;
  emergencyContact?: string;

  // --- Metadata / Risk Flags ---
  onboardingStatus?: "Pending" | "In Progress" | "Completed";
  lastUpdated?: string;
  notes?: string;

  constructor(init: CandidateProfile) {
    Object.assign(this, init);
  }
}

export interface IntegrationConfig {
  type: "Telegram" | "WhatsApp" | "";
  apiKey: string;
  extraId?: string; // For WhatsApp Phone Number ID or Telegram Chat ID tracking
  connected: boolean;
  lastOffset?: number; // For Telegram Polling
}


// ============================================
// Training Types
// ============================================

export type TrainingCategory =
  | "it_systems"
  | "compliance"
  | "orientation"
  | "role_specific"
  | "soft_skills"
  | "security";

export type TrainingItemStatus = "locked" | "available" | "in_progress" | "completed";
export type TrainingFormat = "video" | "document" | "quiz" | "interactive" | "live_session";

export interface TrainingItem {
  id: string;
  title: string;
  description: string;
  category: TrainingCategory;
  status: TrainingItemStatus;
  format: TrainingFormat;
  estimatedMinutes: number;
  completedAt?: string;
  dueDate?: string;
  score?: number;
  required: boolean;
  order: number;
}

export interface TrainingCategoryInfo {
  id: TrainingCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export interface EmployeeTrainingProgress {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  startDate: string;
  items: TrainingItem[];
  overallProgress: number;
  status: "not_started" | "in_progress" | "completed" | "overdue";
  lastActivityDate?: string;
}

export interface TrainingCompletionTrend {
  month: string;
  completed: number;
  inProgress: number;
  overdue: number;
}

// ============================================
// Document Reminders Types
// ============================================

export type DocumentType = "contract" | "passport" | "visa" | "employment_pass" | "work_permit";
export type DocumentExpiryStatus = "valid" | "expiring_90" | "expiring_60" | "expiring_30" | "expired";

export interface DocumentInfo {
  id: string;
  document_type: DocumentType;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  computed_status: DocumentExpiryStatus;
  days_until_expiry: number;
  issuing_authority: string;
  notes: string;
}

export interface EmployeeDocumentGroup {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_department: string;
  employee_position: string;
  jurisdiction: string;
  contract: DocumentInfo;
  immigration?: DocumentInfo;
}

export interface DocumentReminderStats {
  total_tracked: number;
  expired: number;
  expiring_soon: number;
  expiring_60: number;
  expiring_90: number;
  valid: number;
  chart_data: { month: string; count: number }[];
}
