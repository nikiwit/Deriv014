import React from 'react';

// ============================================
// Authentication Types
// ============================================

export type UserRole = 'hr_admin' | 'employee';

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
  nationality?: 'Malaysian' | 'Non-Malaysian';
  nric?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role: UserRole) => boolean;
  logout: () => void;
    setUser: (user: User | null) => void; // <-- added

}

// ============================================
// Onboarding Types
// ============================================

export type TaskStatus = 'locked' | 'available' | 'in_progress' | 'completed';
export type TaskCategory = 'documentation' | 'it_setup' | 'compliance' | 'training' | 'culture';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: 'required' | 'recommended' | 'optional';
  estimatedMinutes: number;
  completedAt?: string;
  requiresUpload?: boolean;
  requiresSignature?: boolean;
  dependencies?: string[];
  /** Template identifier for tasks that open a document form (e.g. 'offer_acceptance', 'contract') */
  templateId?: 'offer_acceptance' | 'contract';
}

export interface OnboardingJourney {
  id: string;
  employeeId: string;
  employeeName: string;
  tasks: OnboardingTask[];
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  aiPlan?: string;
  startDate: string;
}
export interface InitialOnboardingJourney {
  // System fields
  id: string;
  employeeId: string;
  createdAt: string;
  status: 'in_progress' | 'completed' | 'on_hold';
  progress: number;
  aiPlan: string;

  // Personal & job data (from OnboardingData)
  fullName: string;
  email: string;
  role: string;
  department: string;
  startDate: string;
  nationality: 'Malaysian' | 'Non-Malaysian';
  nric?: string;

  // Onboarding workflow
  tasks: {
    id: string;
    title: string;
    status: 'pending' | 'completed';
    completedAt?: string;
  }[];
}


// ============================================
// View State (Extended)
// ============================================

export type ViewState =
  // HR Admin views
  | 'dashboard' | 'documents' | 'assistant' | 'planning'
  | 'training' | 'knowledge' | 'leave' | 'onboarding' | 'candidate' | 'new_employee'
  // Auth views
  | 'login'
  // Employee views
  | 'employee_dashboard' | 'my_onboarding' | 'my_leave' | 'my_documents' | 'my_profile' | 'employee_chat';

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
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelUsed?: 'Local-Llama-3' | 'Gemini-3-Pro' | 'RAG-Local' | 'System' | 'Error' | string;
  timestamp: Date;
  feedback?: 'positive' | 'negative';
  feedbackComment?: string;
  attachments?: string[];
}

export interface ComplianceRisk {
  id: string;
  area: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  prediction: string;
}

export interface Sandbox {
  id: string;
  name: string;
  jurisdiction: string;
  baseModel: string;
  status: 'Ready' | 'Training' | 'Validation Failed' | 'Live';
  accuracy: number;
  feedbackCount: number;
  lastTrained: string;
}

export interface FeedbackLog {
  id: string;
  sandboxId: string;
  source: 'Chat' | 'Document';
  contentSnippet: string;
  feedbackType: 'positive' | 'negative';
  correction?: string;
  timestamp: string;
  status: 'Pending' | 'Applied';
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
    type: 'PDF' | 'Spreadsheet' | 'Policy';
    size: string;
    uploadDate: string;
    status: 'Indexed' | 'Processing' | 'Failed';
    summary?: string;
}

export type LeaveType = 'Annual' | 'Sick' | 'Hospitalization' | 'Maternity' | 'Paternity' | 'Unpaid';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

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
  nationality: 'Malaysian' | 'Non-Malaysian';
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
  nric?: string;                 // Malaysians only
  passportNumber?: string;       // Non-Malaysians
  dateOfBirth?: string;          // ISO date

  // --- Employment ---
  role: string;
  department: string;
  employmentType: "Permanent" | "Contract" | "Intern" | string;
  startDate: string;             // ISO date
  salary: number;
  currency: string;              // MYR, USD, etc.
  workLocation?: string;         // MY / SG / Remote

  // --- Immigration (for expats) ---
  visaType?: string;             // Employment Pass, Dependant Pass
  visaExpiryDate?: string;       // ISO date
  immigrationStatus?: string;    // Pending / Approved / Expired

  // --- Statutory / Payroll ---
  bankName?: string;
  bankAccount?: string;
  taxId?: string;                // LHDN / TIN
  epf?: string;                  // KWSP
  socso?: string;                // PERKESO
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
  type: 'Telegram' | 'WhatsApp' | '';
  apiKey: string;
  extraId?: string; // For WhatsApp Phone Number ID or Telegram Chat ID tracking
  connected: boolean;
  lastOffset?: number; // For Telegram Polling
}