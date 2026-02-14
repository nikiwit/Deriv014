import React from 'react';
import { LayoutDashboard, FileText, Bot, TrendingUp, TestTube2, Database, CalendarDays, UserPlus, UserCircle, Home, ClipboardCheck, User, FolderOpen, MessageSquare, Sparkles, GraduationCap, Monitor, Shield, Building2, Briefcase, Users2, KeyRound, Video, HelpCircle, Gamepad2, Radio, FileWarning } from 'lucide-react';
import { Sandbox, FeedbackLog, KnowledgeDoc, LeaveRequest, LeaveBalance, User as UserType, OnboardingTask, TrainingCategory, TrainingCategoryInfo, TrainingItem, TrainingFormat, EmployeeTrainingProgress, TrainingCompletionTrend, EmployeeDocumentGroup } from './types';

export const NAVIGATION_ITEMS = [
  // { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'onboarding', label: 'Onboarding AI', icon: <UserPlus size={20} /> },
  // Candidate Portal removed from Sidebar as it is now the external frontend
  // { id: 'leave', label: 'E-Leave (Global)', icon: <CalendarDays size={20} /> },
  { id: 'documents', label: 'Smart Contracts', icon: <FileText size={20} /> },
  { id: 'assistant', label: 'DerivHR Agents', icon: <Bot size={20} /> },
  // { id: 'hr_agent', label: 'JD Analyzer', icon: <Sparkles size={20} /> },
  // { id: 'knowledge', label: 'Knowledge Base', icon: <Database size={20} /> },
  // { id: 'planning', label: 'Workforce AI', icon: <TrendingUp size={20} /> },
  { id: 'employee_training', label: 'Employee Training', icon: <GraduationCap size={20} /> },
  { id: 'document_reminders', label: 'Document Reminders', icon: <FileWarning size={20} /> },
  // { id: 'training', label: 'Model Lab', icon: <TestTube2 size={20} /> },
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
    baseModel: 'GPT-4o-mini',
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
    department: 'Finance',
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
  // { id: 'employee_dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { id: 'my_onboarding', label: 'My Onboarding', icon: <ClipboardCheck size={20} /> },
  { id: 'my_training', label: 'My Training', icon: <GraduationCap size={20} /> },
  // { id: 'my_leave', label: 'My Leave', icon: <CalendarDays size={20} /> },
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

// ============================================
// Training Configuration & Mock Data
// ============================================

export const TRAINING_CATEGORY_CONFIG: Record<TrainingCategory, TrainingCategoryInfo> = {
  it_systems:    { id: 'it_systems',    label: 'IT Systems',    icon: <Monitor size={18} />,   color: 'bg-purple-500', description: 'Internal tools, platforms, and access setup' },
  compliance:    { id: 'compliance',    label: 'Compliance',    icon: <Shield size={18} />,    color: 'bg-red-500',    description: 'Legal, regulatory, and policy requirements' },
  orientation:   { id: 'orientation',   label: 'Orientation',   icon: <Building2 size={18} />, color: 'bg-blue-500',   description: 'Company culture, values, and structure' },
  role_specific: { id: 'role_specific', label: 'Role-Specific', icon: <Briefcase size={18} />, color: 'bg-amber-500',  description: 'Department and role-based training modules' },
  soft_skills:   { id: 'soft_skills',   label: 'Soft Skills',   icon: <Users2 size={18} />,    color: 'bg-pink-500',   description: 'Communication, teamwork, and leadership' },
  security:      { id: 'security',      label: 'Security',      icon: <KeyRound size={18} />,  color: 'bg-slate-700',  description: 'Information security and data protection' },
};

export const TRAINING_FORMAT_CONFIG: Record<TrainingFormat, { label: string; icon: React.ReactNode }> = {
  video:        { label: 'Video',       icon: <Video size={12} /> },
  document:     { label: 'Reading',     icon: <FileText size={12} /> },
  quiz:         { label: 'Quiz',        icon: <HelpCircle size={12} /> },
  interactive:  { label: 'Interactive', icon: <Gamepad2 size={12} /> },
  live_session: { label: 'Live Session', icon: <Radio size={12} /> },
};

export const DEFAULT_TRAINING_ITEMS: Omit<TrainingItem, 'id' | 'status' | 'completedAt' | 'score'>[] = [
  // IT Systems
  { title: 'Internal Tools Onboarding',        description: 'Jira, Confluence, and Slack workspace setup and best practices',  category: 'it_systems',    format: 'interactive', estimatedMinutes: 30, required: true,  order: 1 },
  { title: 'Development Environment Setup',    description: 'Git workflows, CI/CD pipelines, and code review process',         category: 'it_systems',    format: 'document',    estimatedMinutes: 45, required: true,  order: 2 },
  { title: 'HR Portal & Payroll Systems',      description: 'How to use DerivHR portal, submit claims, and view payslips',     category: 'it_systems',    format: 'video',       estimatedMinutes: 15, required: true,  order: 3 },

  // Compliance
  { title: 'Anti-Money Laundering (AML)',       description: 'Regulatory requirements and reporting obligations',               category: 'compliance',    format: 'video',       estimatedMinutes: 45, required: true,  order: 1, dueDate: '2026-03-15' },
  { title: 'Data Protection (PDPA/GDPR)',       description: 'Personal data handling, consent, and breach procedures',          category: 'compliance',    format: 'quiz',        estimatedMinutes: 30, required: true,  order: 2, dueDate: '2026-03-15' },
  { title: 'Code of Conduct',                  description: 'Ethics, conflicts of interest, and whistleblowing policy',        category: 'compliance',    format: 'document',    estimatedMinutes: 20, required: true,  order: 3 },

  // Orientation
  { title: 'Welcome to Deriv',                 description: 'Company history, mission, vision, and organizational structure',   category: 'orientation',   format: 'video',       estimatedMinutes: 20, required: true,  order: 1 },
  { title: 'Benefits & Perks Overview',         description: 'Insurance, wellness programs, learning budget, and more',         category: 'orientation',   format: 'document',    estimatedMinutes: 15, required: false, order: 2 },
  { title: 'Office Tour & Facilities',          description: 'Virtual tour of offices and booking shared spaces',              category: 'orientation',   format: 'video',       estimatedMinutes: 10, required: false, order: 3 },

  // Role-Specific
  { title: 'Department Processes & Workflows',  description: 'Team-specific standard operating procedures',                     category: 'role_specific', format: 'interactive', estimatedMinutes: 60, required: true,  order: 1 },
  { title: 'Product Knowledge Deep Dive',       description: 'Understanding our product suite and customer segments',           category: 'role_specific', format: 'video',       estimatedMinutes: 45, required: true,  order: 2 },
  { title: 'Stakeholder Map & Escalation Paths', description: 'Key contacts and decision-making chains',                        category: 'role_specific', format: 'document',    estimatedMinutes: 15, required: false, order: 3 },

  // Soft Skills
  { title: 'Effective Communication',           description: 'Written and verbal communication in a remote-first company',      category: 'soft_skills',   format: 'live_session', estimatedMinutes: 60, required: false, order: 1 },
  { title: 'Giving & Receiving Feedback',       description: 'Constructive feedback frameworks and growth mindset',             category: 'soft_skills',   format: 'video',        estimatedMinutes: 25, required: false, order: 2 },

  // Security
  { title: 'Cybersecurity Awareness',           description: 'Phishing, social engineering, and password hygiene',              category: 'security',      format: 'quiz',        estimatedMinutes: 25, required: true,  order: 1, dueDate: '2026-03-01' },
  { title: 'Incident Response Protocol',        description: 'What to do if you suspect a security breach',                     category: 'security',      format: 'document',    estimatedMinutes: 15, required: true,  order: 2 },
  { title: 'Physical Security & Access Control', description: 'Badge access, visitor policies, and clean desk policy',           category: 'security',      format: 'video',       estimatedMinutes: 10, required: false, order: 3 },
];

// Helper to generate mock training items with varied statuses
function generateMockItems(completedCount: number): TrainingItem[] {
  return DEFAULT_TRAINING_ITEMS.map((t, idx) => ({
    ...t,
    id: `training_${idx}`,
    status: idx < completedCount ? 'completed' as const : idx === completedCount ? 'in_progress' as const : idx === completedCount + 1 ? 'available' as const : 'locked' as const,
    completedAt: idx < completedCount ? '2026-01-15T10:00:00Z' : undefined,
    score: idx < completedCount && t.format === 'quiz' ? 85 + Math.floor(Math.random() * 15) : undefined,
  }));
}

export const MOCK_EMPLOYEE_TRAINING_PROGRESS: EmployeeTrainingProgress[] = [
  {
    employeeId: 'EMP-2024-001',
    employeeName: 'John Doe',
    department: 'Engineering',
    role: 'Software Engineer',
    startDate: '2024-01-15',
    overallProgress: 65,
    status: 'in_progress',
    lastActivityDate: '2026-02-12',
    items: generateMockItems(11),
  },
  {
    employeeId: 'EMP-2023-042',
    employeeName: 'Jane Smith',
    department: 'Marketing',
    role: 'Marketing Specialist',
    startDate: '2023-06-01',
    overallProgress: 100,
    status: 'completed',
    lastActivityDate: '2025-12-20',
    items: generateMockItems(17),
  },
  {
    employeeId: 'EMP-2025-003',
    employeeName: 'Ahmad Razak',
    department: 'Finance',
    role: 'Financial Analyst',
    startDate: '2025-11-01',
    overallProgress: 35,
    status: 'in_progress',
    lastActivityDate: '2026-02-10',
    items: generateMockItems(6),
  },
  {
    employeeId: 'EMP-2025-007',
    employeeName: 'Priya Nair',
    department: 'Engineering',
    role: 'QA Engineer',
    startDate: '2025-12-15',
    overallProgress: 18,
    status: 'overdue',
    lastActivityDate: '2026-01-20',
    items: generateMockItems(3),
  },
  {
    employeeId: 'EMP-2026-001',
    employeeName: 'Wei Lin Tan',
    department: 'Product',
    role: 'Product Manager',
    startDate: '2026-01-10',
    overallProgress: 47,
    status: 'in_progress',
    lastActivityDate: '2026-02-13',
    items: generateMockItems(8),
  },
  {
    employeeId: 'EMP-2026-002',
    employeeName: 'Siti Aisyah',
    department: 'Human Resources',
    role: 'HR Executive',
    startDate: '2026-02-01',
    overallProgress: 0,
    status: 'not_started',
    lastActivityDate: undefined,
    items: generateMockItems(0),
  },
];

export const MOCK_TRAINING_COMPLETION_TREND: TrainingCompletionTrend[] = [
  { month: 'Sep', completed: 8,  inProgress: 12, overdue: 3 },
  { month: 'Oct', completed: 14, inProgress: 10, overdue: 2 },
  { month: 'Nov', completed: 18, inProgress: 8,  overdue: 4 },
  { month: 'Dec', completed: 22, inProgress: 6,  overdue: 1 },
  { month: 'Jan', completed: 25, inProgress: 9,  overdue: 2 },
  { month: 'Feb', completed: 28, inProgress: 7,  overdue: 3 },
];

// ============================================
// Document Reminders Mock Data
// ============================================

export const MOCK_EMPLOYEE_DOCUMENTS: EmployeeDocumentGroup[] = [
  {
    employee_id: 'EMP-2024-001',
    employee_name: 'John Doe',
    employee_email: 'john@derivhr.com',
    employee_department: 'Engineering',
    employee_position: 'Software Engineer',
    jurisdiction: 'MY',
    contract: {
      id: 'doc_c_001', document_type: 'contract', document_number: 'CTR-MY-2024-0045',
      issue_date: '2024-01-15', expiry_date: '2026-01-15',
      computed_status: 'expired', days_until_expiry: -30,
      issuing_authority: 'Deriv Solutions Sdn Bhd', notes: 'Renewal in progress',
    },
    immigration: {
      id: 'doc_i_001', document_type: 'employment_pass', document_number: 'EP-MY-2024-7821',
      issue_date: '2024-01-15', expiry_date: '2026-03-01',
      computed_status: 'expiring_30', days_until_expiry: 15,
      issuing_authority: 'Immigration Dept Malaysia', notes: '',
    },
  },
  {
    employee_id: 'EMP-2025-003',
    employee_name: 'Ahmad Razak',
    employee_email: 'ahmad@derivhr.com',
    employee_department: 'Finance',
    employee_position: 'Financial Analyst',
    jurisdiction: 'MY',
    contract: {
      id: 'doc_c_002', document_type: 'contract', document_number: 'CTR-MY-2025-0112',
      issue_date: '2025-11-01', expiry_date: '2027-11-01',
      computed_status: 'valid', days_until_expiry: 625,
      issuing_authority: 'Deriv Solutions Sdn Bhd', notes: '',
    },
    immigration: {
      id: 'doc_i_002', document_type: 'employment_pass', document_number: 'EP-MY-2024-9876',
      issue_date: '2024-06-01', expiry_date: '2026-06-01',
      computed_status: 'valid', days_until_expiry: 107,
      issuing_authority: 'Immigration Dept Malaysia', notes: 'Dependent pass linked',
    },
  },
  {
    employee_id: 'EMP-2025-007',
    employee_name: 'Priya Nair',
    employee_email: 'priya@derivhr.com',
    employee_department: 'Engineering',
    employee_position: 'QA Engineer',
    jurisdiction: 'SG',
    contract: {
      id: 'doc_c_003', document_type: 'contract', document_number: 'CTR-SG-2025-0034',
      issue_date: '2025-12-15', expiry_date: '2027-12-15',
      computed_status: 'valid', days_until_expiry: 669,
      issuing_authority: 'Deriv Solutions Pte Ltd', notes: '',
    },
    immigration: {
      id: 'doc_i_003', document_type: 'visa', document_number: 'V-SG-2024-5432',
      issue_date: '2024-01-15', expiry_date: '2026-04-13',
      computed_status: 'expiring_60', days_until_expiry: 58,
      issuing_authority: 'MOM Singapore', notes: 'S Pass holder',
    },
  },
  {
    employee_id: 'EMP-2026-001',
    employee_name: 'Wei Lin Tan',
    employee_email: 'weilin@derivhr.com',
    employee_department: 'Product',
    employee_position: 'Product Manager',
    jurisdiction: 'MY',
    contract: {
      id: 'doc_c_004', document_type: 'contract', document_number: 'CTR-MY-2026-0003',
      issue_date: '2026-01-10', expiry_date: '2028-01-10',
      computed_status: 'valid', days_until_expiry: 695,
      issuing_authority: 'Deriv Solutions Sdn Bhd', notes: '',
    },
    immigration: {
      id: 'doc_i_004', document_type: 'work_permit', document_number: 'WP-MY-2025-1111',
      issue_date: '2025-01-10', expiry_date: '2027-01-10',
      computed_status: 'valid', days_until_expiry: 330,
      issuing_authority: 'Immigration Dept Malaysia', notes: '',
    },
  },
  {
    employee_id: 'EMP-2023-042',
    employee_name: 'Jane Smith',
    employee_email: 'jane@derivhr.com',
    employee_department: 'Marketing',
    employee_position: 'Marketing Specialist',
    jurisdiction: 'MY',
    contract: {
      id: 'doc_c_005', document_type: 'contract', document_number: 'CTR-MY-2023-0088',
      issue_date: '2023-06-01', expiry_date: '2026-06-01',
      computed_status: 'valid', days_until_expiry: 107,
      issuing_authority: 'Deriv Solutions Sdn Bhd', notes: 'Renewal discussion scheduled',
    },
    immigration: {
      id: 'doc_p_005', document_type: 'passport', document_number: 'A12345678',
      issue_date: '2020-03-10', expiry_date: '2030-03-10',
      computed_status: 'valid', days_until_expiry: 1485,
      issuing_authority: 'Jabatan Imigresen Malaysia', notes: '',
    },
  },
  {
    employee_id: 'EMP-2026-002',
    employee_name: 'Siti Aisyah',
    employee_email: 'siti@derivhr.com',
    employee_department: 'Human Resources',
    employee_position: 'HR Executive',
    jurisdiction: 'MY',
    contract: {
      id: 'doc_c_006', document_type: 'contract', document_number: 'CTR-MY-2026-0008',
      issue_date: '2026-02-01', expiry_date: '2028-02-01',
      computed_status: 'valid', days_until_expiry: 717,
      issuing_authority: 'Deriv Solutions Sdn Bhd', notes: '',
    },
    immigration: {
      id: 'doc_p_006', document_type: 'passport', document_number: 'B98765432',
      issue_date: '2022-08-15', expiry_date: '2032-08-15',
      computed_status: 'valid', days_until_expiry: 2373,
      issuing_authority: 'Jabatan Imigresen Malaysia', notes: '',
    },
  },
];

export const MOCK_DOCUMENT_EXPIRY_TREND: { month: string; count: number }[] = [
  { month: 'Mar 2026', count: 2 },
  { month: 'Apr 2026', count: 1 },
  { month: 'May 2026', count: 0 },
  { month: 'Jun 2026', count: 2 },
  { month: 'Jul 2026', count: 0 },
  { month: 'Aug 2026', count: 1 },
  { month: 'Sep 2026', count: 0 },
  { month: 'Oct 2026', count: 0 },
  { month: 'Nov 2026', count: 1 },
  { month: 'Dec 2026', count: 2 },
  { month: 'Jan 2027', count: 2 },
  { month: 'Feb 2027', count: 0 },
];