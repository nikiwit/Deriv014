import React from "react";

// ============================================
// Authentication Types
// ============================================

export type UserRole = "hr_admin" | "employee";

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
  requiresUpload?: boolean;
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

// Missing training types that constants.tsx expects
export type TrainingCategory = 
  | "it_systems" 
  | "compliance" 
  | "orientation" 
  | "role_specific" 
  | "soft_skills" 
  | "security";

export interface TrainingCategoryInfo {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export type TrainingFormat = 
  | "video" 
  | "document" 
  | "quiz" 
  | "interactive" 
  | "live_session";

export interface TrainingItem {
  id: string;
  title: string;
  description: string;
  category: TrainingCategory;
  format: TrainingFormat;
  estimatedMinutes: number;
  required: boolean;
  order: number;
  status?: "not_started" | "in_progress" | "completed";
  completedAt?: string;
  score?: number;
  dueDate?: string;
}

export interface EmployeeTrainingProgress {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  startDate: string;
  overallProgress: number;
  status: "not_started" | "in_progress" | "completed" | "overdue";
  lastActivityDate?: string;
  items: TrainingItem[];
}

export type TrainingCompletionTrend = {
  month: string;
  completed: number;
  inProgress: number;
  overdue: number;
};

// ============================================
// Training Checklist Types (similar to onboarding)
// ============================================

export type TrainingChecklistStatus = "locked" | "available" | "in_progress" | "completed";
export type TrainingChecklistCategory = 
  | "compliance"
  | "technical" 
  | "soft_skills" 
  | "products" 
  | "tools"
  | "security"
  | "leadership";

export interface TrainingChecklistItem {
  id: string;
  title: string;
  description: string;
  category: TrainingChecklistCategory;
  status: TrainingChecklistStatus;
  priority: "required" | "recommended" | "optional";
  estimatedMinutes: number;
  completedAt?: string;
  startedAt?: string;
  dueDate?: string;
  isOverdue?: boolean;
  format: "video" | "document" | "quiz" | "interactive" | "live_session";
  hasQuiz?: boolean;
  quizPassingScore?: number;
  orderIndex?: number;
  /** Which roles/departments this training applies to */
  applicableTo: string[];
}

export interface TrainingChecklistProgress {
  percentage: number;
  completedTasks: number;
  totalTasks: number;
  requiredCompleted: number;
  requiredTotal: number;
}

export interface TrainingChecklistByRole {
  role: string;
  department: string;
  tasks: TrainingChecklistItem[];
}

// Category weights for progress calculation
export const TRAINING_CATEGORY_WEIGHTS: Record<TrainingChecklistCategory, number> = {
  compliance: 0.30,
  technical: 0.25,
  products: 0.20,
  tools: 0.10,
  soft_skills: 0.10,
  security: 0.03,
  leadership: 0.02,
};

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: "required" | "recommended" | "optional";
  estimatedMinutes: number;
  completedAt?: string;
  startedAt?: string;
  dueDate?: string;
  isOverdue?: boolean;
  requiresUpload?: boolean;
  requiresSignature?: boolean;
  /** Template identifier for tasks that open a document form */
  templateId?: "offer_acceptance" | "contract";
  /** Task dependencies - IDs of tasks that must be completed first */
  dependencies?: string[];
  /** Order index for sorting */
  orderIndex?: number;
  /** Days from start date when this task is due */
  dueDaysFromStart?: number;
}

export interface OnboardingTaskDefinition extends Omit<OnboardingTask, 'status' | 'completedAt' | 'startedAt' | 'dueDate' | 'isOverdue'> {
  isActive: boolean;
}

export interface OnboardingProgress {
  percentage: number;
  completedTasks: number;
  totalTasks: number;
  requiredCompleted: number;
  requiredTotal: number;
  estimatedCompletionDate?: string;
  weightedPercentage?: number;
}

export interface OnboardingBadge {
  id: string;
  type: 'first_task' | 'half_way' | 'completed' | 'speed_demon' | 'documentation_master' | 'culture_hero';
  name: string;
  description: string;
  earnedAt: string;
}

export interface OnboardingFeedback {
  ratingOverall: number;
  ratingClarity: number;
  ratingSupport: number;
  ratingTools: number;
  wouldRecommend: boolean;
  feedbackText?: string;
  suggestions?: string;
  submittedAt: string;
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
  | "onboarding_dashboard"
  | "candidate"
  | "new_employee"
  | "hr_agent"
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
  | "my_training"          // Employee LMS training
  | "my_training_checklist" // Employee training checklist
  // Identity verification
  | "verify_identity";

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
