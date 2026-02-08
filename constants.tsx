import React from 'react';
import { LayoutDashboard, FileText, Bot, TrendingUp, TestTube2, Database, CalendarDays, UserPlus, UserCircle, Home, ClipboardCheck, User, FolderOpen, MessageSquare, Sparkles } from 'lucide-react';
import { Sandbox, FeedbackLog, KnowledgeDoc, LeaveRequest, LeaveBalance, User as UserType, OnboardingTask } from './types';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'onboarding', label: 'Onboarding AI', icon: <UserPlus size={20} /> },
  // Candidate Portal removed from Sidebar as it is now the external frontend
  { id: 'leave', label: 'E-Leave (Global)', icon: <CalendarDays size={20} /> },
  { id: 'documents', label: 'Smart Contracts', icon: <FileText size={20} /> },
  { id: 'assistant', label: 'DerivHR Agents', icon: <Bot size={20} /> },
  // { id: 'hr_agent', label: 'JD Analyzer', icon: <Sparkles size={20} /> },
  { id: 'knowledge', label: 'Knowledge Base', icon: <Database size={20} /> },
  { id: 'planning', label: 'Workforce AI', icon: <TrendingUp size={20} /> },
  { id: 'training', label: 'Model Lab', icon: <TestTube2 size={20} /> },
];

export const GLOBAL_JURISDICTIONS = [
    'Malaysia (Employment Act 1955)',
    'Malaysia (Sabah Labour Ordinance)',
    'Malaysia (Sarawak Labour Ordinance)',
    'Singapore (Employment Act)',
    'United States (California Labor Code)',
    'United States (New York Labor Law)',
    'United Kingdom (Employment Rights Act 1996)',
    'European Union (GDPR & Working Time Directive)',
    'UAE (Labour Law Federal Decree-Law No. 33)',
    'Australia (Fair Work Act 2009)'
];

export const MALAYSIAN_STATES = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Penang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'KL', 'Putrajaya', 'Labuan'
];

export const PUBLIC_HOLIDAYS_MY = [
  { date: '2024-01-01', name: 'New Year\'s Day', type: 'State', states: ['KL', 'Selangor', 'Penang', 'Perak', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Sabah', 'Sarawak', 'Labuan', 'Putrajaya'] },
  { date: '2024-01-14', name: 'YDPB Negeri Sembilan\'s Birthday', type: 'State', states: ['Negeri Sembilan'] },
  { date: '2024-01-25', name: 'Thaipusam', type: 'State', states: ['Johor', 'KL', 'Negeri Sembilan', 'Penang', 'Perak', 'Putrajaya', 'Selangor'] },
  { date: '2024-02-01', name: 'Federal Territory Day', type: 'State', states: ['KL', 'Labuan', 'Putrajaya'] },
  { date: '2024-02-10', name: 'Chinese New Year', type: 'National', states: ['ALL'] },
  { date: '2024-02-11', name: 'Chinese New Year (Day 2)', type: 'National', states: ['ALL'] },
  { date: '2024-03-04', name: 'Installation of Sultan Terengganu', type: 'State', states: ['Terengganu'] },
  { date: '2024-03-12', name: 'Awal Ramadan', type: 'State', states: ['Johor', 'Kedah', 'Melaka'] },
  { date: '2024-03-28', name: 'Nuzul Al-Quran', type: 'State', states: ['KL', 'Labuan', 'Putrajaya', 'Kelantan', 'Pahang', 'Perak', 'Penang', 'Perlis', 'Selangor', 'Terengganu'] },
  { date: '2024-04-10', name: 'Hari Raya Aidilfitri', type: 'National', states: ['ALL'] },
  { date: '2024-04-11', name: 'Hari Raya Aidilfitri (Day 2)', type: 'National', states: ['ALL'] },
  { date: '2024-05-01', name: 'Labour Day', type: 'National', states: ['ALL'] },
  { date: '2024-05-22', name: 'Wesak Day', type: 'National', states: ['ALL'] },
  { date: '2024-05-30', name: 'Harvest Festival (Kaamatan)', type: 'State', states: ['Sabah', 'Labuan'] },
  { date: '2024-05-31', name: 'Harvest Festival (Day 2)', type: 'State', states: ['Sabah', 'Labuan'] },
  { date: '2024-06-01', name: 'Gawai Dayak', type: 'State', states: ['Sarawak'] },
  { date: '2024-06-02', name: 'Gawai Dayak (Day 2)', type: 'State', states: ['Sarawak'] },
  { date: '2024-06-03', name: 'Agong\'s Birthday', type: 'National', states: ['ALL'] },
  { date: '2024-06-17', name: 'Hari Raya Haji', type: 'National', states: ['ALL'] },
  { date: '2024-07-07', name: 'Awal Muharram', type: 'National', states: ['ALL'] },
  { date: '2024-07-22', name: 'Sarawak Independence Day', type: 'State', states: ['Sarawak'] },
  { date: '2024-08-31', name: 'Merdeka Day', type: 'National', states: ['ALL'] },
  { date: '2024-09-16', name: 'Malaysia Day', type: 'National', states: ['ALL'] },
  { date: '2024-10-31', name: 'Deepavali', type: 'National', states: ['ALL'] },
  { date: '2024-12-11', name: 'Sultan of Selangor\'s Birthday', type: 'State', states: ['Selangor'] },
  { date: '2024-12-25', name: 'Christmas Day', type: 'National', states: ['ALL'] }
];

export const MOCK_HIRING_DATA = [
  { month: 'Jan', external: 12, internal: 4 },
  { month: 'Feb', external: 15, internal: 6 },
  { month: 'Mar', external: 10, internal: 8 },
  { month: 'Apr', external: 18, internal: 12 },
  { month: 'May', external: 22, internal: 15 },
  { month: 'Jun', external: 25, internal: 20 },
];

export const MOCK_SKILL_GAP_DATA = [
  { subject: 'AI Literacy', A: 40, B: 90, fullMark: 150 },
  { subject: 'Leadership', A: 80, B: 110, fullMark: 150 },
  { subject: 'Data Analysis', A: 120, B: 100, fullMark: 150 },
  { subject: 'Compliance', A: 90, B: 130, fullMark: 150 },
  { subject: 'Remote Mgmt', A: 60, B: 80, fullMark: 150 },
];

export const MOCK_SANDBOXES: Sandbox[] = [
  {
    id: 'sb_my_001',
    name: 'Malaysian Employment Law',
    jurisdiction: 'Malaysia',
    baseModel: 'Falcon-40b',
    status: 'Ready',
    accuracy: 88.5,
    feedbackCount: 15,
    lastTrained: '4 hours ago'
  },
  {
    id: 'sb_us_001',
    name: 'US-California Labor',
    jurisdiction: 'United States (CA)',
    baseModel: 'Llama-3-70b',
    status: 'Live',
    accuracy: 96.2,
    feedbackCount: 124,
    lastTrained: '20 mins ago'
  },
  {
    id: 'sb_eu_001',
    name: 'EU GDPR & Working Time',
    jurisdiction: 'European Union',
    baseModel: 'Gemini-3-Pro',
    status: 'Training',
    accuracy: 91.0,
    feedbackCount: 45,
    lastTrained: 'In Progress...'
  },
  {
    id: 'sb_sg_001',
    name: 'Singapore Employment Act',
    jurisdiction: 'Singapore',
    baseModel: 'Mistral-Large',
    status: 'Ready',
    accuracy: 89.8,
    feedbackCount: 8,
    lastTrained: '2 days ago'
  }
];

export const MOCK_FEEDBACK_LOGS: FeedbackLog[] = [
  {
    id: 'fb_101',
    sandboxId: 'sb_my_001',
    source: 'Document',
    contentSnippet: 'Termination notice period set to 2 weeks for 5 years service.',
    feedbackType: 'negative',
    correction: 'Section 12(2)(b) of EA 1955 requires 6 weeks notice for 2-5 years service.',
    timestamp: '2023-10-25 14:30',
    status: 'Pending'
  },
  {
    id: 'fb_us_102',
    sandboxId: 'sb_us_001',
    source: 'Chat',
    contentSnippet: 'Non-compete agreement duration 1 year.',
    feedbackType: 'negative',
    correction: 'Non-competes are generally unenforceable in California (SB 699).',
    timestamp: '2024-01-15 09:15',
    status: 'Applied'
  }
];

export const MOCK_KNOWLEDGE_DOCS: KnowledgeDoc[] = [
    { id: '1', name: 'Global_Employee_Handbook_2024.pdf', type: 'PDF', size: '3.4 MB', uploadDate: '2024-01-15', status: 'Indexed', summary: 'Policies for MY, SG, US, and UK offices.' },
    { id: '2', name: 'Q2_Hiring_Budget_Global.xlsx', type: 'Spreadsheet', size: '210 KB', uploadDate: '2024-04-01', status: 'Indexed', summary: 'Headcount allocation for APAC and EMEA.' },
    { id: '3', name: 'Remote_Work_Policy_EU.pdf', type: 'Policy', size: '1.1 MB', uploadDate: '2024-02-20', status: 'Indexed', summary: 'Right to disconnect guidelines.' }
];

export const MOCK_LEAVE_BALANCES: LeaveBalance[] = [
    { type: 'Annual', entitled: 12, taken: 4, pending: 2 }, 
    { type: 'Sick', entitled: 18, taken: 2, pending: 0 },   
    { type: 'Hospitalization', entitled: 60, taken: 0, pending: 0 }, 
    { type: 'Maternity', entitled: 98, taken: 0, pending: 0 },
    { type: 'Paternity', entitled: 7, taken: 0, pending: 0 }
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
    { id: 'lr_001', employeeName: 'Sarah Jenkins', type: 'Annual', startDate: '2024-06-10', endDate: '2024-06-14', days: 5, reason: 'Family vacation', status: 'Pending', requestDate: '2024-05-20' },
    { id: 'lr_002', employeeName: 'Raj Muthu', type: 'Sick', startDate: '2024-05-15', endDate: '2024-05-16', days: 2, reason: 'Fever', status: 'Approved', requestDate: '2024-05-15' },
    { id: 'lr_003', employeeName: 'Ali Ahmad', type: 'Annual', startDate: '2024-04-10', endDate: '2024-04-11', days: 2, reason: 'Hari Raya Prep', status: 'Approved', requestDate: '2024-04-01' }
];

// ============================================
// Demo Users for Authentication
// ============================================

export const DEMO_USERS: UserType[] = [
  {
    id: '1',
    email: 'admin@derivhr.com',
    firstName: 'Sarah',
    lastName: 'Chen',
    role: 'hr_admin',
    department: 'Human Resources'
  },
  {
    id: '2',
    email: 'john@derivhr.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'employee',
    department: 'Engineering',
    employeeId: 'EMP-2024-001',
    startDate: '2024-01-15',
    // onboardingComplete: false,
    // applicationAccount: '',
    // OfferLetterId: '',
    // contractId: '',

  },
  {
    id: '3',
    email: 'jane@derivhr.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'employee',
    department: 'Marketing',
    employeeId: 'EMP-2023-042',
    startDate: '2023-06-01',
    onboardingComplete: true
  },
];

// ============================================
// Employee Portal Navigation
// ============================================

export const EMPLOYEE_NAV_ITEMS = [
  { id: 'employee_dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { id: 'my_onboarding', label: 'My Onboarding', icon: <ClipboardCheck size={20} /> },
  { id: 'my_leave', label: 'My Leave', icon: <CalendarDays size={20} /> },
  { id: 'my_documents', label: 'My Documents', icon: <FolderOpen size={20} /> },
  { id: 'employee_chat', label: 'Chat Assistant', icon: <MessageSquare size={20} /> },
  { id: 'my_profile', label: 'My Profile', icon: <User size={20} /> },
];

// ============================================
// Default Onboarding Tasks
// ============================================

export const DEFAULT_ONBOARDING_TASKS: Omit<OnboardingTask, 'id' | 'status' | 'completedAt'>[] = [
  // Documentation
  { title: 'Upload Identity Document', description: 'Upload a copy of your NRIC or Passport', category: 'documentation', priority: 'required', estimatedMinutes: 5, requiresUpload: true },
  { title: 'Accept Offer Letter', description: 'Review and sign the official offer acceptance form', category: 'documentation', priority: 'required', estimatedMinutes: 10, requiresSignature: true, templateId: 'offer_acceptance' },
  { title: 'Sign Employment Contract', description: 'Review and digitally sign your onboarding contract form', category: 'documentation', priority: 'required', estimatedMinutes: 15, requiresSignature: true, templateId: 'contract' },
  { title: 'Complete Tax Forms (EA/PCB)', description: 'Fill in your tax declaration forms for payroll', category: 'documentation', priority: 'required', estimatedMinutes: 10 },
  { title: 'Submit Bank Details', description: 'Provide your bank account information for salary', category: 'documentation', priority: 'required', estimatedMinutes: 5 },

  // IT Setup
  { title: 'Accept IT Acceptable Use Policy', description: 'Read and acknowledge the IT usage guidelines', category: 'it_setup', priority: 'required', estimatedMinutes: 10, requiresSignature: true },
  { title: 'Setup Two-Factor Authentication', description: 'Enable 2FA on your work accounts for security', category: 'it_setup', priority: 'required', estimatedMinutes: 10 },
  { title: 'Configure Email & Slack', description: 'Set up your email signature and join Slack channels', category: 'it_setup', priority: 'required', estimatedMinutes: 15 },

  // Compliance
  { title: 'Complete Anti-Harassment Training', description: 'Mandatory workplace harassment prevention course', category: 'compliance', priority: 'required', estimatedMinutes: 30 },
  { title: 'Acknowledge Data Protection Policy', description: 'Review and accept PDPA/GDPR guidelines', category: 'compliance', priority: 'required', estimatedMinutes: 10, requiresSignature: true },
  { title: 'Health & Safety Briefing', description: 'Watch the workplace safety orientation video', category: 'compliance', priority: 'required', estimatedMinutes: 20 },

  // Training
  { title: 'Watch Company Overview Video', description: 'Learn about our history, mission, and values', category: 'training', priority: 'recommended', estimatedMinutes: 15 },
  { title: 'Complete Role-Specific Training', description: 'Finish your department onboarding modules', category: 'training', priority: 'recommended', estimatedMinutes: 60 },

  // Culture
  { title: 'Join Interest Groups on Slack', description: 'Find and join hobby or interest-based channels', category: 'culture', priority: 'optional', estimatedMinutes: 5 },
  { title: 'Schedule Coffee Chat with Mentor', description: 'Book a 30-min intro call with your assigned buddy', category: 'culture', priority: 'recommended', estimatedMinutes: 5 },
  { title: 'Complete Your Profile', description: 'Add a photo and bio to your employee profile', category: 'culture', priority: 'optional', estimatedMinutes: 10 },
];