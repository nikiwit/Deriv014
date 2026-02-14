import React from 'react';
import { LayoutDashboard, FileText, Bot, TrendingUp, TestTube2, Database, CalendarDays, UserPlus, UserCircle, Home, ClipboardCheck, User, FolderOpen, MessageSquare, Sparkles, GraduationCap, Monitor, Shield, Building2, Briefcase, Users2, KeyRound, Video, HelpCircle, Gamepad2, Radio } from 'lucide-react';
import { Sandbox, FeedbackLog, KnowledgeDoc, LeaveRequest, LeaveBalance, User as UserType, OnboardingTask, OnboardingProgress, OnboardingBadge, OnboardingFeedback, TaskCategory, TaskStatus, TrainingCategory, TrainingCategoryInfo, TrainingItem, TrainingFormat, EmployeeTrainingProgress, TrainingCompletionTrend, TrainingChecklistStatus, TrainingChecklistCategory, TrainingChecklistItem, TrainingChecklistProgress, TrainingChecklistByRole } from './types';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'onboarding', label: 'Onboarding AI', icon: <UserPlus size={20} /> },
  { id: 'onboarding_dashboard', label: 'Onboarding Progress', icon: <ClipboardCheck size={20} /> },
  // Candidate Portal removed from Sidebar as it is now the external frontend
  { id: 'leave', label: 'E-Leave (Global)', icon: <CalendarDays size={20} /> },
  { id: 'documents', label: 'Smart Contracts', icon: <FileText size={20} /> },
  { id: 'assistant', label: 'DerivHR Agents', icon: <Bot size={20} /> },
  // { id: 'hr_agent', label: 'JD Analyzer', icon: <Sparkles size={20} /> },
  { id: 'knowledge', label: 'Knowledge Base', icon: <Database size={20} /> },
  { id: 'planning', label: 'Workforce AI', icon: <TrendingUp size={20} /> },
  { id: 'employee_training', label: 'Employee Training', icon: <GraduationCap size={20} /> },
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
  { id: 'employee_dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { id: 'my_onboarding', label: 'My Onboarding', icon: <ClipboardCheck size={20} /> },
  { id: 'my_training_checklist', label: 'Training Checklist', icon: <GraduationCap size={20} /> },
  { id: 'my_training', label: 'Learning Hub', icon: <Monitor size={20} /> },
  { id: 'my_leave', label: 'My Leave', icon: <CalendarDays size={20} /> },
  { id: 'my_documents', label: 'My Documents', icon: <FolderOpen size={20} /> },
  { id: 'employee_chat', label: 'Chat Assistant', icon: <MessageSquare size={20} /> },
  { id: 'my_profile', label: 'My Profile', icon: <User size={20} /> },
];

// ============================================
// Default Onboarding Tasks (Enhanced with Dependencies & Due Dates)
// ============================================

// Task weights for progress calculation
export const ONBOARDING_CATEGORY_WEIGHTS: Record<TaskCategory, number> = {
  documentation: 0.40,  // 40%
  compliance: 0.25,     // 25%
  it_setup: 0.20,      // 20%
  training: 0.10,      // 10%
  culture: 0.05,       // 5%
};

// Task dependency graph - maps task ID to array of dependency IDs
export const TASK_DEPENDENCIES: Record<string, string[]> = {
  // After identity, personal info unlocks
  doc_personal_info: ['doc_identity'],
  // After personal info, these unlock
  doc_offer: ['doc_personal_info'],
  doc_contract: ['doc_personal_info'],
  doc_tax: ['doc_personal_info'],
  doc_bank: ['doc_personal_info'],
  // After contract, compliance unlocks
  comp_pdpa: ['doc_contract'],
  comp_harassment: ['comp_pdpa'],
  comp_safety: ['comp_pdpa'],
  // After compliance, IT unlocks
  it_policy: ['comp_pdpa'],
  it_2fa: ['it_policy'],
  it_email: ['it_2fa'],
  // After IT, training unlocks
  train_overview: ['it_email'],
  train_role: ['train_overview'],
  // Culture tasks can start after personal info
  culture_slack: ['doc_personal_info'],
  culture_buddy: ['doc_personal_info'],
  culture_profile: ['doc_personal_info'],
  culture_org_chart: ['doc_personal_info'],
  culture_team_intro: ['doc_personal_info'],
};

export const DEFAULT_ONBOARDING_TASKS: Omit<OnboardingTask, 'id' | 'status' | 'completedAt' | 'startedAt' | 'dueDate' | 'isOverdue'>[] = [
  // Documentation (Phase 1-2)
  { 
    title: 'Upload Identity Document', 
    description: 'Upload a copy of your NRIC or Passport for verification', 
    category: 'documentation', 
    priority: 'required', 
    estimatedMinutes: 5, 
    requiresUpload: true,
    orderIndex: 1,
    dueDaysFromStart: 1,
    dependencies: [],
  },
  { 
    title: 'Complete Personal Information', 
    description: 'Fill in your personal details - phone, address, emergency contact', 
    category: 'documentation', 
    priority: 'required', 
    estimatedMinutes: 10,
    orderIndex: 2,
    dueDaysFromStart: 1,
    dependencies: ['doc_identity'],
  },
  { 
    title: 'Accept Offer Letter', 
    description: 'Review and sign the official offer acceptance form', 
    category: 'documentation', 
    priority: 'required', 
    estimatedMinutes: 10, 
    requiresSignature: true, 
    templateId: 'offer_acceptance',
    orderIndex: 3,
    dueDaysFromStart: 3,
    dependencies: ['doc_personal_info'],
  },
  { 
    title: 'Sign Employment Contract', 
    description: 'Review and digitally sign your onboarding contract form', 
    category: 'documentation', 
    priority: 'required', 
    estimatedMinutes: 15, 
    requiresSignature: true, 
    templateId: 'contract',
    orderIndex: 4,
    dueDaysFromStart: 5,
    dependencies: ['doc_personal_info'],
  },
  { 
    title: 'Complete Tax Forms (EA/PCB)', 
    description: 'Fill in your tax declaration forms for payroll processing', 
    category: 'documentation', 
    priority: 'required', 
    estimatedMinutes: 10,
    orderIndex: 5,
    dueDaysFromStart: 7,
    dependencies: ['doc_personal_info'],
  },
  { 
    title: 'Submit Bank Details', 
    description: 'Provide your bank account information for salary disbursement', 
    category: 'documentation', 
    priority: 'required', 
    estimatedMinutes: 5,
    orderIndex: 6,
    dueDaysFromStart: 7,
    dependencies: ['doc_personal_info'],
  },

  // IT Setup (Phase 4)
  { 
    title: 'Accept IT Acceptable Use Policy', 
    description: 'Read and acknowledge the IT usage guidelines', 
    category: 'it_setup', 
    priority: 'required', 
    estimatedMinutes: 10, 
    requiresSignature: true,
    orderIndex: 7,
    dueDaysFromStart: 5,
    dependencies: ['doc_contract'],
  },
  { 
    title: 'Setup Two-Factor Authentication', 
    description: 'Enable 2FA on your work accounts for enhanced security', 
    category: 'it_setup', 
    priority: 'required', 
    estimatedMinutes: 10,
    orderIndex: 8,
    dueDaysFromStart: 3,
    dependencies: ['it_policy'],
  },
  { 
    title: 'Configure Email & Slack', 
    description: 'Set up your email signature and join Slack channels', 
    category: 'it_setup', 
    priority: 'required', 
    estimatedMinutes: 15,
    orderIndex: 9,
    dueDaysFromStart: 3,
    dependencies: ['it_2fa'],
  },

  // Compliance (Phase 3)
  { 
    title: 'Complete Anti-Harassment Training', 
    description: 'Mandatory workplace harassment prevention course with quiz', 
    category: 'compliance', 
    priority: 'required', 
    estimatedMinutes: 30,
    orderIndex: 10,
    dueDaysFromStart: 14,
    dependencies: ['doc_contract'],
  },
  { 
    title: 'Acknowledge Data Protection Policy', 
    description: 'Review and accept PDPA/GDPR guidelines', 
    category: 'compliance', 
    priority: 'required', 
    estimatedMinutes: 10, 
    requiresSignature: true,
    orderIndex: 11,
    dueDaysFromStart: 10,
    dependencies: ['comp_harassment'],
  },
  { 
    title: 'Health & Safety Briefing', 
    description: 'Watch the workplace safety orientation video', 
    category: 'compliance', 
    priority: 'required', 
    estimatedMinutes: 20,
    orderIndex: 12,
    dueDaysFromStart: 14,
    dependencies: ['comp_pdpa'],
  },

  // Training (Phase 5)
  { 
    title: 'Watch Company Overview Video', 
    description: 'Learn about our history, mission, and values', 
    category: 'training', 
    priority: 'recommended', 
    estimatedMinutes: 15,
    orderIndex: 13,
    dueDaysFromStart: 21,
    dependencies: ['it_email'],
  },
  { 
    title: 'Complete Role-Specific Training', 
    description: 'Finish your department onboarding modules', 
    category: 'training', 
    priority: 'recommended', 
    estimatedMinutes: 60,
    orderIndex: 14,
    dueDaysFromStart: 30,
    dependencies: ['train_overview'],
  },

  // Culture (Phase 6)
  { 
    title: 'Join Interest Groups on Slack', 
    description: 'Find and join hobby or interest-based channels', 
    category: 'culture', 
    priority: 'optional', 
    estimatedMinutes: 5,
    orderIndex: 15,
    dueDaysFromStart: 14,
    dependencies: ['it_email'],
  },
  { 
    title: 'Schedule Coffee Chat with Buddy', 
    description: 'Book a 30-min intro call with your assigned onboarding buddy', 
    category: 'culture', 
    priority: 'recommended', 
    estimatedMinutes: 5,
    orderIndex: 16,
    dueDaysFromStart: 7,
    dependencies: ['doc_personal_info'],
  },
  { 
    title: 'Complete Your Profile', 
    description: 'Add a photo and bio to your employee profile', 
    category: 'culture', 
    priority: 'optional', 
    estimatedMinutes: 10,
    orderIndex: 17,
    dueDaysFromStart: 14,
    dependencies: ['it_email'],
  },
  { 
    title: 'Explore Org Chart', 
    description: 'Get to know the company structure and key leaders', 
    category: 'culture', 
    priority: 'optional', 
    estimatedMinutes: 10,
    orderIndex: 18,
    dueDaysFromStart: 21,
    dependencies: ['doc_personal_info'],
  },
  { 
    title: 'Meet Your Team', 
    description: 'Watch a video introduction from your team members', 
    category: 'culture', 
    priority: 'recommended', 
    estimatedMinutes: 15,
    orderIndex: 19,
    dueDaysFromStart: 7,
    dependencies: ['doc_personal_info'],
  },
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
    status: idx < completedCount ? 'completed' as const : idx === completedCount ? 'in_progress' as const : 'not_started' as const,
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
// COMPREHENSIVE TRAINING CHECKLIST BY ROLE
// ============================================

// Training category config for checklist
export const TRAINING_CHECKLIST_CATEGORY_CONFIG: Record<TrainingChecklistCategory, { label: string; color: string; icon: React.ReactNode }> = {
  compliance:    { label: 'Compliance',    color: 'bg-red-500',    icon: <Shield size={18} /> },
  technical:     { label: 'Technical',     color: 'bg-blue-500',   icon: <Monitor size={18} /> },
  soft_skills:   { label: 'Soft Skills',  color: 'bg-pink-500',   icon: <Users2 size={18} /> },
  products:      { label: 'Products',      color: 'bg-amber-500',  icon: <Briefcase size={18} /> },
  tools:         { label: 'Tools',         color: 'bg-purple-500', icon: <KeyRound size={18} /> },
  security:      { label: 'Security',      color: 'bg-slate-700',  icon: <Shield size={18} /> },
  leadership:    { label: 'Leadership',    color: 'bg-jade-500',   icon: <Users2 size={18} /> },
};

// Role-specific training checklists
export const TRAINING_CHECKLIST_BY_ROLE: Record<string, Omit<TrainingChecklistItem, 'status' | 'completedAt' | 'startedAt' | 'isOverdue'>[]> = {
  // ============================================
  // ENGINEERING / SOFTWARE DEVELOPMENT
  // ============================================
  'Software Engineer': [
    // Compliance (Required)
    { id: 'eng_comp_1', title: 'Code of Conduct', description: 'Ethics, professional behavior, and workplace standards', category: 'compliance', priority: 'required', estimatedMinutes: 30, format: 'document', orderIndex: 1, applicableTo: ['all'] },
    { id: 'eng_comp_2', title: 'Data Privacy & GDPR', description: 'Handling customer data responsibly', category: 'compliance', priority: 'required', estimatedMinutes: 45, format: 'video', hasQuiz: true, quizPassingScore: 80, orderIndex: 2, applicableTo: ['all'] },
    
    // Technical - Engineering Specific
    { id: 'eng_tech_1', title: 'Development Workflow', description: 'Git branching, code review, and CI/CD pipelines', category: 'technical', priority: 'required', estimatedMinutes: 60, format: 'interactive', orderIndex: 3, applicableTo: ['Software Engineer', 'Senior Engineer', 'Tech Lead'] },
    { id: 'eng_tech_2', title: 'Code Quality & Testing', description: 'Unit testing, integration testing, and code coverage standards', category: 'technical', priority: 'required', estimatedMinutes: 45, format: 'video', orderIndex: 4, applicableTo: ['Software Engineer', 'Senior Engineer'] },
    { id: 'eng_tech_3', title: 'API Design Standards', description: 'RESTful API design, versioning, and documentation', category: 'technical', priority: 'recommended', estimatedMinutes: 40, format: 'document', orderIndex: 5, applicableTo: ['Software Engineer', 'Senior Engineer', 'Backend Developer'] },
    { id: 'eng_tech_4', title: 'Microservices Architecture', description: 'Service decomposition, communication patterns, and orchestration', category: 'technical', priority: 'recommended', estimatedMinutes: 60, format: 'video', orderIndex: 6, applicableTo: ['Senior Engineer', 'Tech Lead', 'Architect'] },
    { id: 'eng_tech_5', title: 'Cloud & Infrastructure', description: 'AWS/Azure/GCP fundamentals, containerization, and deployment', category: 'technical', priority: 'required', estimatedMinutes: 90, format: 'interactive', orderIndex: 7, applicableTo: ['Software Engineer', 'DevOps Engineer'] },
    
    // Security
    { id: 'eng_sec_1', title: 'Secure Coding Practices', description: 'OWASP Top 10, SQL injection, XSS prevention', category: 'security', priority: 'required', estimatedMinutes: 60, format: 'interactive', hasQuiz: true, quizPassingScore: 90, orderIndex: 8, applicableTo: ['Software Engineer', 'Senior Engineer'] },
    { id: 'eng_sec_2', title: 'Secrets Management', description: 'Environment variables, vaults, and API key handling', category: 'security', priority: 'required', estimatedMinutes: 25, format: 'document', orderIndex: 9, applicableTo: ['Software Engineer', 'DevOps Engineer'] },
    
    // Tools
    { id: 'eng_tools_1', title: 'IDE & Developer Tools', description: 'VS Code extensions, debugging tools, and productivity hacks', category: 'tools', priority: 'required', estimatedMinutes: 30, format: 'video', orderIndex: 10, applicableTo: ['Software Engineer'] },
    { id: 'eng_tools_2', title: 'Jira & Confluence', description: 'Project tracking, sprint planning, and documentation', category: 'tools', priority: 'required', estimatedMinutes: 25, format: 'interactive', orderIndex: 11, applicableTo: ['all'] },
    
    // Products
    { id: 'eng_prod_1', title: 'Product Overview', description: 'Our product suite, target customers, and market position', category: 'products', priority: 'required', estimatedMinutes: 45, format: 'video', orderIndex: 12, applicableTo: ['all'] },
    { id: 'eng_prod_2', title: 'Technical Architecture', description: 'System design, data flow, and integration points', category: 'products', priority: 'required', estimatedMinutes: 60, format: 'document', orderIndex: 13, applicableTo: ['Software Engineer', 'Senior Engineer'] },
    
    // Soft Skills
    { id: 'eng_ss_1', title: 'Effective Code Reviews', description: 'Giving and receiving constructive feedback', category: 'soft_skills', priority: 'recommended', estimatedMinutes: 30, format: 'video', orderIndex: 14, applicableTo: ['Software Engineer', 'Senior Engineer'] },
    { id: 'eng_ss_2', title: 'Remote Collaboration', description: 'Async communication, standups, and pair programming', category: 'soft_skills', priority: 'recommended', estimatedMinutes: 20, format: 'document', orderIndex: 15, applicableTo: ['all'] },
  ],

  // ============================================
  // SALES
  // ============================================
  'Sales': [
    // Compliance
    { id: 'sales_comp_1', title: 'Anti-Bribery & Corruption', description: 'FCPA, local laws, and gift policies', category: 'compliance', priority: 'required', estimatedMinutes: 45, format: 'video', hasQuiz: true, quizPassingScore: 80, orderIndex: 1, applicableTo: ['all'] },
    { id: 'sales_comp_2', title: 'Data Privacy (Sales)', description: 'CRM data handling, consent, and GDPR for sales', category: 'compliance', priority: 'required', estimatedMinutes: 30, format: 'video', orderIndex: 2, applicableTo: ['Sales'] },
    { id: 'sales_comp_3', title: 'Competition Law', description: 'Dealing with competitors, pricing, and antitrust', category: 'compliance', priority: 'required', estimatedMinutes: 40, format: 'document', hasQuiz: true, quizPassingScore: 80, orderIndex: 3, applicableTo: ['Sales'] },
    
    // Products
    { id: 'sales_prod_1', title: 'Product Catalog Deep Dive', description: 'All product features, pricing tiers, and competitive advantages', category: 'products', priority: 'required', estimatedMinutes: 90, format: 'interactive', orderIndex: 4, applicableTo: ['Sales'] },
    { id: 'sales_prod_2', title: 'Sales Pitch Mastery', description: 'Pitch decks, demo scripts, and objection handling', category: 'products', priority: 'required', estimatedMinutes: 60, format: 'live_session', orderIndex: 5, applicableTo: ['Sales'] },
    { id: 'sales_prod_3', title: 'CRM Training (Salesforce)', description: 'Lead management, opportunity pipeline, and reporting', category: 'products', priority: 'required', estimatedMinutes: 45, format: 'interactive', orderIndex: 6, applicableTo: ['Sales'] },
    
    // Tools
    { id: 'sales_tools_1', title: 'Sales Enablement Tools', description: 'Outreach, email tracking, and meeting scheduler', category: 'tools', priority: 'required', estimatedMinutes: 30, format: 'interactive', orderIndex: 7, applicableTo: ['Sales'] },
    { id: 'sales_tools_2', title: 'LinkedIn Sales Navigator', description: 'Prospecting and social selling', category: 'tools', priority: 'recommended', estimatedMinutes: 25, format: 'video', orderIndex: 8, applicableTo: ['Sales'] },
    
    // Soft Skills
    { id: 'sales_ss_1', title: 'Negotiation Skills', description: 'Closing techniques, power moves, and win-win outcomes', category: 'soft_skills', priority: 'required', estimatedMinutes: 60, format: 'live_session', orderIndex: 9, applicableTo: ['Sales'] },
    { id: 'sales_ss_2', title: 'Building Rapport', description: 'Active listening and relationship building', category: 'soft_skills', priority: 'required', estimatedMinutes: 30, format: 'video', orderIndex: 10, applicableTo: ['Sales'] },
    { id: 'sales_ss_3', title: 'Handling Objections', description: 'Turning "no" into "yes"', category: 'soft_skills', priority: 'recommended', estimatedMinutes: 40, format: 'interactive', orderIndex: 11, applicableTo: ['Sales'] },
  ],

  // ============================================
  // MARKETING
  // ============================================
  'Marketing': [
    // Compliance
    { id: 'mkt_comp_1', title: 'Advertising Regulations', description: 'FTC guidelines, claim substantiation, and disclaimers', category: 'compliance', priority: 'required', estimatedMinutes: 45, format: 'document', hasQuiz: true, quizPassingScore: 80, orderIndex: 1, applicableTo: ['Marketing'] },
    { id: 'mkt_comp_2', title: 'Brand Guidelines', description: 'Logo usage, voice tone, and brand consistency', category: 'compliance', priority: 'required', estimatedMinutes: 30, format: 'video', orderIndex: 2, applicableTo: ['Marketing'] },
    
    // Products
    { id: 'mkt_prod_1', title: 'Brand Story & Messaging', description: 'Our narrative, key messages, and positioning', category: 'products', priority: 'required', estimatedMinutes: 45, format: 'video', orderIndex: 3, applicableTo: ['Marketing'] },
    { id: 'mkt_prod_2', title: 'Competitive Analysis', description: 'Market landscape and competitor positioning', category: 'products', priority: 'required', estimatedMinutes: 40, format: 'document', orderIndex: 4, applicableTo: ['Marketing'] },
    
    // Tools
    { id: 'mkt_tools_1', title: 'Marketing Automation (HubSpot)', description: 'Email campaigns, lead scoring, and workflows', category: 'tools', priority: 'required', estimatedMinutes: 60, format: 'interactive', orderIndex: 5, applicableTo: ['Marketing'] },
    { id: 'mkt_tools_2', title: 'Analytics & Reporting', description: 'Google Analytics, dashboards, and KPIs', category: 'tools', priority: 'required', estimatedMinutes: 45, format: 'interactive', orderIndex: 6, applicableTo: ['Marketing'] },
    { id: 'mkt_tools_3', title: 'Social Media Management', description: 'Content scheduling and brand presence', category: 'tools', priority: 'required', estimatedMinutes: 30, format: 'video', orderIndex: 7, applicableTo: ['Marketing'] },
    
    // Soft Skills
    { id: 'mkt_ss_1', title: 'Content Strategy', description: 'Planning, calendars, and content marketing', category: 'soft_skills', priority: 'recommended', estimatedMinutes: 40, format: 'video', orderIndex: 8, applicableTo: ['Marketing'] },
    { id: 'mkt_ss_2', title: 'Creative Briefs', description: 'Briefing agencies and internal teams', category: 'soft_skills', priority: 'recommended', estimatedMinutes: 25, format: 'document', orderIndex: 9, applicableTo: ['Marketing'] },
  ],

  // ============================================
  // FINANCE / ACCOUNTING
  // ============================================
  'Finance': [
    // Compliance - Critical for Finance
    { id: 'fin_comp_1', title: 'Financial Regulations', description: 'SOX compliance, audit requirements, and reporting', category: 'compliance', priority: 'required', estimatedMinutes: 90, format: 'document', hasQuiz: true, quizPassingScore: 90, orderIndex: 1, applicableTo: ['Finance'] },
    { id: 'fin_comp_2', title: 'Expense Policy', description: 'Reimbursement rules, approval limits, and documentation', category: 'compliance', priority: 'required', estimatedMinutes: 30, format: 'document', orderIndex: 2, applicableTo: ['Finance'] },
    { id: 'fin_comp_3', title: 'Anti-Money Laundering (AML)', description: 'KYC, suspicious activity reporting, and compliance', category: 'compliance', priority: 'required', estimatedMinutes: 60, format: 'video', hasQuiz: true, quizPassingScore: 90, orderIndex: 3, applicableTo: ['Finance'] },
    { id: 'fin_comp_4', title: 'Tax Compliance', description: 'Local tax laws and reporting obligations', category: 'compliance', priority: 'required', estimatedMinutes: 60, format: 'document', orderIndex: 4, applicableTo: ['Finance'] },
    
    // Technical - Finance Specific
    { id: 'fin_tech_1', title: 'ERP System Training', description: 'SAP/Oracle/NetSuite fundamentals', category: 'technical', priority: 'required', estimatedMinutes: 90, format: 'interactive', orderIndex: 5, applicableTo: ['Finance'] },
    { id: 'fin_tech_2', title: 'Financial Modeling', description: 'Excel advanced, forecasting, and scenario analysis', category: 'technical', priority: 'required', estimatedMinutes: 60, format: 'interactive', orderIndex: 6, applicableTo: ['Finance'] },
    { id: 'fin_tech_3', title: 'Business Intelligence', description: 'Tableau, Power BI, and data visualization', category: 'technical', priority: 'recommended', estimatedMinutes: 45, format: 'interactive', orderIndex: 7, applicableTo: ['Finance'] },
    
    // Tools
    { id: 'fin_tools_1', title: 'Accounting Software', description: 'QuickBooks, Xero, or company-specific tools', category: 'tools', priority: 'required', estimatedMinutes: 60, format: 'interactive', orderIndex: 8, applicableTo: ['Finance'] },
    { id: 'fin_tools_2', title: 'Expense Management', description: 'Concur or equivalent system', category: 'tools', priority: 'required', estimatedMinutes: 30, format: 'interactive', orderIndex: 9, applicableTo: ['Finance'] },
    
    // Soft Skills
    { id: 'fin_ss_1', title: 'Financial Communication', description: 'Presenting numbers to non-finance stakeholders', category: 'soft_skills', priority: 'required', estimatedMinutes: 40, format: 'video', orderIndex: 10, applicableTo: ['Finance'] },
  ],

  // ============================================
  // HUMAN RESOURCES
  // ============================================
  'Human Resources': [
    // Compliance - Critical for HR
    { id: 'hr_comp_1', title: 'Employment Law Basics', description: 'Hiring, termination, and labor law fundamentals', category: 'compliance', priority: 'required', estimatedMinutes: 60, format: 'document', hasQuiz: true, quizPassingScore: 85, orderIndex: 1, applicableTo: ['Human Resources'] },
    { id: 'hr_comp_2', title: 'Equal Opportunity Employment', description: 'Anti-discrimination, harassment prevention, and EEOC', category: 'compliance', priority: 'required', estimatedMinutes: 45, format: 'video', hasQuiz: true, quizPassingScore: 90, orderIndex: 2, applicableTo: ['Human Resources'] },
    { id: 'hr_comp_3', title: 'Data Privacy (HR)', description: 'Employee data handling, records, and GDPR', category: 'compliance', priority: 'required', estimatedMinutes: 40, format: 'video', orderIndex: 3, applicableTo: ['Human Resources'] },
    { id: 'hr_comp_4', title: 'Benefits Administration', description: 'Health insurance, leave policies, and compliance', category: 'compliance', priority: 'required', estimatedMinutes: 60, format: 'interactive', orderIndex: 4, applicableTo: ['Human Resources'] },
    
    // Tools
    { id: 'hr_tools_1', title: 'HRIS System (BambooHR/Workday)', description: 'Employee data management and workflows', category: 'tools', priority: 'required', estimatedMinutes: 60, format: 'interactive', orderIndex: 5, applicableTo: ['Human Resources'] },
    { id: 'hr_tools_2', title: 'ATS Training', description: 'Recruitment pipeline and candidate management', category: 'tools', priority: 'required', estimatedMinutes: 45, format: 'interactive', orderIndex: 6, applicableTo: ['Human Resources'] },
    { id: 'hr_tools_3', title: 'Payroll System', description: 'Processing payroll and handling queries', category: 'tools', priority: 'required', estimatedMinutes: 45, format: 'interactive', orderIndex: 7, applicableTo: ['Human Resources'] },
    
    // Soft Skills
    { id: 'hr_ss_1', title: 'Conflict Resolution', description: 'Mediating workplace disputes', category: 'soft_skills', priority: 'required', estimatedMinutes: 45, format: 'live_session', orderIndex: 8, applicableTo: ['Human Resources'] },
    { id: 'hr_ss_2', title: 'Interviewing Techniques', description: 'Structured interviews and bias awareness', category: 'soft_skills', priority: 'required', estimatedMinutes: 40, format: 'interactive', orderIndex: 9, applicableTo: ['Human Resources'] },
    { id: 'hr_ss_3', title: 'Performance Management', description: 'Reviews, feedback, and PIPs', category: 'soft_skills', priority: 'required', estimatedMinutes: 45, format: 'video', orderIndex: 10, applicableTo: ['Human Resources'] },
  ],

  // ============================================
  // PRODUCT MANAGEMENT
  // ============================================
  'Product': [
    // Compliance
    { id: 'pm_comp_1', title: 'Product Compliance', description: 'Industry regulations affecting product decisions', category: 'compliance', priority: 'required', estimatedMinutes: 45, format: 'document', orderIndex: 1, applicableTo: ['Product'] },
    
    // Technical - Product Specific
    { id: 'pm_tech_1', title: 'Agile & Scrum', description: 'Sprint planning, standups, and retrospectives', category: 'technical', priority: 'required', estimatedMinutes: 60, format: 'interactive', orderIndex: 2, applicableTo: ['Product'] },
    { id: 'pm_tech_2', title: 'Product Analytics', description: 'Metrics, A/B testing, and data-driven decisions', category: 'technical', priority: 'required', estimatedMinutes: 60, format: 'interactive', orderIndex: 3, applicableTo: ['Product'] },
    { id: 'pm_tech_3', title: 'Roadmapping Tools', description: 'Jira, Productboard, or equivalent', category: 'technical', priority: 'required', estimatedMinutes: 30, format: 'interactive', orderIndex: 4, applicableTo: ['Product'] },
    
    // Products
    { id: 'pm_prod_1', title: 'Product Strategy', description: 'Vision, mission, and OKRs', category: 'products', priority: 'required', estimatedMinutes: 45, format: 'video', orderIndex: 5, applicableTo: ['Product'] },
    { id: 'pm_prod_2', title: 'User Research Methods', description: 'Customer interviews, surveys, and usability testing', category: 'products', priority: 'required', estimatedMinutes: 50, format: 'video', orderIndex: 6, applicableTo: ['Product'] },
    { id: 'pm_prod_3', title: 'Competitive Analysis', description: 'Market research and positioning', category: 'products', priority: 'required', estimatedMinutes: 40, format: 'document', orderIndex: 7, applicableTo: ['Product'] },
    
    // Soft Skills
    { id: 'pm_ss_1', title: 'Stakeholder Management', description: 'Working with engineering, design, and execs', category: 'soft_skills', priority: 'required', estimatedMinutes: 40, format: 'video', orderIndex: 8, applicableTo: ['Product'] },
    { id: 'pm_ss_2', title: 'Writing PRDs', description: 'Product requirements and specifications', category: 'soft_skills', priority: 'required', estimatedMinutes: 35, format: 'document', orderIndex: 9, applicableTo: ['Product'] },
    { id: 'pm_ss_3', title: 'Prioritization Frameworks', description: 'MoSCoW, Kano, and RICE methods', category: 'soft_skills', priority: 'recommended', estimatedMinutes: 30, format: 'video', orderIndex: 10, applicableTo: ['Product'] },
  ],

  // ============================================
  // CUSTOMER SUPPORT
  // ============================================
  'Customer Support': [
    // Compliance
    { id: 'cs_comp_1', title: 'Customer Data Privacy', description: 'Handling PII and support ticket security', category: 'compliance', priority: 'required', estimatedMinutes: 40, format: 'video', hasQuiz: true, quizPassingScore: 80, orderIndex: 1, applicableTo: ['Customer Support'] },
    { id: 'cs_comp_2', title: 'Support Policies', description: 'Refund, escalation, and SLA policies', category: 'compliance', priority: 'required', estimatedMinutes: 45, format: 'document', orderIndex: 2, applicableTo: ['Customer Support'] },
    
    // Products
    { id: 'cs_prod_1', title: 'Product Knowledge Base', description: 'All features, use cases, and troubleshooting', category: 'products', priority: 'required', estimatedMinutes: 120, format: 'interactive', orderIndex: 3, applicableTo: ['Customer Support'] },
    { id: 'cs_prod_2', title: 'Customer Journey', description: 'Onboarding, retention, and upsell paths', category: 'products', priority: 'required', estimatedMinutes: 45, format: 'video', orderIndex: 4, applicableTo: ['Customer Support'] },
    
    // Tools
    { id: 'cs_tools_1', title: 'Zendesk/Intercom', description: 'Ticket management and macros', category: 'tools', priority: 'required', estimatedMinutes: 60, format: 'interactive', orderIndex: 5, applicableTo: ['Customer Support'] },
    { id: 'cs_tools_2', title: 'Knowledge Base Management', description: 'Creating and maintaining help articles', category: 'tools', priority: 'required', estimatedMinutes: 30, format: 'interactive', orderIndex: 6, applicableTo: ['Customer Support'] },
    
    // Soft Skills
    { id: 'cs_ss_1', title: 'Empathy & Active Listening', description: 'Dealing with frustrated customers', category: 'soft_skills', priority: 'required', estimatedMinutes: 40, format: 'live_session', orderIndex: 7, applicableTo: ['Customer Support'] },
    { id: 'cs_ss_2', title: 'De-escalation Techniques', description: 'Turning negative experiences positive', category: 'soft_skills', priority: 'required', estimatedMinutes: 45, format: 'interactive', orderIndex: 8, applicableTo: ['Customer Support'] },
    { id: 'cs_ss_3', title: 'Writing Clear Responses', description: 'Knowledge base articles and email etiquette', category: 'soft_skills', priority: 'recommended', estimatedMinutes: 25, format: 'document', orderIndex: 9, applicableTo: ['Customer Support'] },
  ],

  // ============================================
  // DESIGN
  // ============================================
  'Design': [
    // Compliance
    { id: 'des_comp_1', title: 'Brand Guidelines', description: 'Visual identity, logo usage, and style guides', category: 'compliance', priority: 'required', estimatedMinutes: 45, format: 'video', orderIndex: 1, applicableTo: ['Design'] },
    { id: 'des_comp_2', title: 'Accessibility (WCAG)', description: 'Designing for all abilities', category: 'compliance', priority: 'required', estimatedMinutes: 60, format: 'video', hasQuiz: true, quizPassingScore: 85, orderIndex: 2, applicableTo: ['Design'] },
    
    // Tools
    { id: 'des_tools_1', title: 'Design System', description: 'Component library, tokens, and documentation', category: 'tools', priority: 'required', estimatedMinutes: 60, format: 'interactive', orderIndex: 3, applicableTo: ['Design'] },
    { id: 'des_tools_2', title: 'Figma/Adobe CC', description: 'Design tools and collaboration', category: 'tools', priority: 'required', estimatedMinutes: 45, format: 'interactive', orderIndex: 4, applicableTo: ['Design'] },
    { id: 'des_tools_3', title: 'Prototyping', description: 'Figma prototypes and user flows', category: 'tools', priority: 'required', estimatedMinutes: 40, format: 'interactive', orderIndex: 5, applicableTo: ['Design'] },
    
    // Products
    { id: 'des_prod_1', title: 'Product Design Process', description: 'Discovery, ideation, and validation', category: 'products', priority: 'required', estimatedMinutes: 50, format: 'video', orderIndex: 6, applicableTo: ['Design'] },
    { id: 'des_prod_2', title: 'User Research for Designers', description: 'Usability testing and feedback sessions', category: 'products', priority: 'required', estimatedMinutes: 40, format: 'video', orderIndex: 7, applicableTo: ['Design'] },
    
    // Soft Skills
    { id: 'des_ss_1', title: 'Presenting Design Work', description: 'Critiques, stakeholder demos, and rationale', category: 'soft_skills', priority: 'required', estimatedMinutes: 30, format: 'video', orderIndex: 8, applicableTo: ['Design'] },
    { id: 'des_ss_2', title: 'Design Handoff', description: 'Working with engineers effectively', category: 'soft_skills', priority: 'required', estimatedMinutes: 25, format: 'document', orderIndex: 9, applicableTo: ['Design'] },
  ],
};

// ============================================
// ALL EMPLOYEES (Common Training)
// ============================================
export const COMMON_TRAINING_CHECKLIST: Omit<TrainingChecklistItem, 'status' | 'completedAt' | 'startedAt' | 'isOverdue'>[] = [
  // Company-Wide Compliance
  { id: 'common_comp_1', title: 'Company Values & Culture', description: 'Our mission, vision, and core values', category: 'compliance', priority: 'required', estimatedMinutes: 30, format: 'video', orderIndex: 0, applicableTo: ['all'] },
  { id: 'common_comp_2', title: 'Workplace Harassment', description: 'Zero tolerance policy and reporting procedures', category: 'compliance', priority: 'required', estimatedMinutes: 45, format: 'video', hasQuiz: true, quizPassingScore: 100, orderIndex: 0, applicableTo: ['all'] },
  { id: 'common_comp_3', title: 'Health & Safety', description: 'Emergency procedures and workplace safety', category: 'compliance', priority: 'required', estimatedMinutes: 30, format: 'video', orderIndex: 0, applicableTo: ['all'] },
  
  // IT & Security (All Employees)
  { id: 'common_sec_1', title: 'Cybersecurity Basics', description: 'Phishing, passwords, and data protection', category: 'security', priority: 'required', estimatedMinutes: 40, format: 'interactive', hasQuiz: true, quizPassingScore: 80, orderIndex: 0, applicableTo: ['all'] },
  { id: 'common_sec_2', title: 'Password & MFA Setup', description: 'Securing your accounts with 2FA', category: 'security', priority: 'required', estimatedMinutes: 15, format: 'interactive', orderIndex: 0, applicableTo: ['all'] },
  { id: 'common_sec_3', title: 'Data Classification', description: 'Handling confidential vs public information', category: 'security', priority: 'required', estimatedMinutes: 25, format: 'document', orderIndex: 0, applicableTo: ['all'] },
  
  // Tools (All Employees)
  { id: 'common_tools_1', title: 'Communication Tools', description: 'Slack, email, and calendar best practices', category: 'tools', priority: 'required', estimatedMinutes: 20, format: 'video', orderIndex: 0, applicableTo: ['all'] },
  { id: 'common_tools_2', title: 'VPN & Remote Access', description: 'Secure remote working procedures', category: 'tools', priority: 'required', estimatedMinutes: 15, format: 'document', orderIndex: 0, applicableTo: ['all'] },
  { id: 'common_tools_3', title: 'IT Support & Ticketing', description: 'How to get help when you need it', category: 'tools', priority: 'required', estimatedMinutes: 10, format: 'document', orderIndex: 0, applicableTo: ['all'] },
];

// Get training checklist for a specific role
export const getTrainingChecklistForRole = (role: string, department: string): TrainingChecklistItem[] => {
  // Start with common training
  const checklist: TrainingChecklistItem[] = COMMON_TRAINING_CHECKLIST.map(t => ({
    ...t,
    status: 'available' as TrainingChecklistStatus,
  }));
  
  // Find role-specific training
  const roleTraining = TRAINING_CHECKLIST_BY_ROLE[role] || TRAINING_CHECKLIST_BY_ROLE[department] || [];
  
  // Add role-specific training
  const roleItems: TrainingChecklistItem[] = roleTraining.map(t => ({
    ...t,
    status: 'available' as TrainingChecklistStatus,
  }));
  
  return [...checklist, ...roleItems];
};

// Get available roles for training checklist
export const AVAILABLE_TRAINING_ROLES = Object.keys(TRAINING_CHECKLIST_BY_ROLE);