/**
 * Agent Registry for DerivHR Multi-Agent System
 *
 * Defines the specialized HR agents and their configurations:
 * - Main HR Agent: Orchestrator with multi-jurisdictional expertise
 * - Policy Research: Deep policy analysis
 * - Compliance: Statutory calculations and regulatory checks
 * - Document: Contract generation and form guidance
 * - Employee Support: Day-to-day HR assistance
 */

// Legacy agent IDs for backward compatibility
export type LegacyAgentId = 'HR' | 'Finance' | 'Logistics';

// New specialized HR agent IDs
export type HRAgentId = 'MAIN_HR' | 'POLICY_RESEARCH' | 'COMPLIANCE' | 'DOCUMENT' | 'EMPLOYEE_SUPPORT';

// Combined agent ID type
export type AgentId = LegacyAgentId | HRAgentId;

export interface AgentConfig {
  id: AgentId;
  name: string;
  role: string;
  description?: string;
  systemPrompt: string;
  allowedTools?: string[];
  capabilities?: string[];
  escalatesTo?: AgentId[];
  modelPreference: 'local' | 'premium' | 'hybrid';
  themeColor: string;
  icon?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW HR MULTI-AGENT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export const HR_AGENTS: Record<HRAgentId, AgentConfig> = {
  MAIN_HR: {
    id: 'MAIN_HR',
    name: 'Chief HR Intelligence Officer',
    role: 'Orchestrator & Expert',
    description: 'Primary HR interface with multi-jurisdictional expertise (MY/SG)',
    systemPrompt: `You are the Chief HR Intelligence Officer for Deriv Solutions with expertise in:
- Malaysia: Employment Act 1955, EPF/SOCSO/EIS, PCB taxation
- Singapore: Employment Act Cap. 91, CPF, Work Pass regulations

Always cite specific statutes and jurisdictions [MY] or [SG]. Use markdown formatting.`,
    capabilities: [
      'Query routing',
      'Multi-jurisdiction expertise',
      'Statutory knowledge (EPF, SOCSO, CPF)',
      'Employment law (EA 1955, EA Cap. 91)',
    ],
    escalatesTo: ['POLICY_RESEARCH', 'COMPLIANCE', 'DOCUMENT', 'EMPLOYEE_SUPPORT'],
    modelPreference: 'hybrid',
    themeColor: 'derivhr',
    icon: 'Bot'
  },

  POLICY_RESEARCH: {
    id: 'POLICY_RESEARCH',
    name: 'Policy Research Specialist',
    role: 'Deep Policy Analysis',
    description: 'Expert in policy interpretation and cross-referencing',
    systemPrompt: `You are a Policy Research Specialist. Provide thorough policy analysis with:
- Cross-reference multiple policy documents
- Compare MY vs SG policy differences
- Always cite source documents with sections
- Include confidence level: [HIGH] [MEDIUM] [LOW]`,
    capabilities: [
      'Policy interpretation',
      'Cross-document analysis',
      'MY vs SG comparison',
      'Gap identification',
    ],
    modelPreference: 'premium',
    themeColor: 'blue',
    icon: 'BookOpen'
  },

  COMPLIANCE: {
    id: 'COMPLIANCE',
    name: 'Compliance Officer',
    role: 'Statutory & Regulatory',
    description: 'Handles calculations, compliance checks, and risk assessment',
    systemPrompt: `You are a Compliance & Statutory Specialist. Provide:
- Accurate calculations with formula → values → result
- Risk levels: [HIGH RISK] [MEDIUM RISK] [LOW RISK]
- Statutory references with section numbers
- EPF/SOCSO/CPF calculation expertise`,
    capabilities: [
      'EPF/SOCSO/CPF calculations',
      'Overtime calculations',
      'Visa status checks',
      'Risk assessment',
    ],
    allowedTools: ['ot_calc', 'epf_calc'],
    modelPreference: 'hybrid',
    themeColor: 'amber',
    icon: 'ShieldCheck'
  },

  DOCUMENT: {
    id: 'DOCUMENT',
    name: 'Document Specialist',
    role: 'Forms & Contracts',
    description: 'Contract generation, form guidance, checklists',
    systemPrompt: `You are a Document & Forms Specialist. Provide:
- Clear document checklists in table format
- Step-by-step submission instructions
- Common issues to avoid
- Deadline and responsibility tracking`,
    capabilities: [
      'Contract generation',
      'Document checklists',
      'Form guidance',
      'Submission tracking',
    ],
    modelPreference: 'premium',
    themeColor: 'violet',
    icon: 'FileText'
  },

  EMPLOYEE_SUPPORT: {
    id: 'EMPLOYEE_SUPPORT',
    name: 'Employee Support',
    role: 'Day-to-Day Assistance',
    description: 'Friendly support for onboarding, leave, and general queries',
    systemPrompt: `You are an Employee Support Specialist - the friendly face of HR.
- Be warm and approachable
- Break complex processes into numbered steps
- Include helpful references
- End with "Is there anything else I can help you with?"`,
    capabilities: [
      'Leave queries',
      'Onboarding assistance',
      'Benefits explanation',
      'General HR support',
    ],
    allowedTools: ['leave_status'],
    escalatesTo: ['POLICY_RESEARCH', 'COMPLIANCE'],
    modelPreference: 'local',
    themeColor: 'emerald',
    icon: 'HeartHandshake'
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY AGENTS (for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export const LEGACY_AGENTS: Record<LegacyAgentId, AgentConfig> = {
  HR: {
    id: 'HR',
    name: 'Global HR Specialist',
    role: 'HR Expert',
    systemPrompt: `You are a Global HR Expert. Support US, UK, EU, Singapore, and Malaysian employment laws.
    Context: User is Malaysian employee 'Ali Ahmad'. Annual Leave Balance: 8 days. Sick Leave: 16 days.
    If user asks to apply for leave, guide them to the E-Leave module or confirm the request is noted.`,
    allowedTools: ['ot_calc', 'epf_calc', 'leave_status', 'knowledge_base'],
    modelPreference: 'hybrid',
    themeColor: 'derivhr'
  },
  Finance: {
    id: 'Finance',
    name: 'Finance Assistant',
    role: 'Finance Admin',
    systemPrompt: "You are a Finance Assistant. Focus on Payroll audits, Tax calculations, and Claims processing.",
    allowedTools: ['epf_calc', 'payroll_audit'],
    modelPreference: 'hybrid',
    themeColor: 'emerald'
  },
  Logistics: {
    id: 'Logistics',
    name: 'Logistics Coordinator',
    role: 'Fleet Manager',
    systemPrompt: "You are a Logistics Coordinator. Focus on fleet safety, driver working hours, and asset tracking.",
    allowedTools: ['vehicle_tracking'],
    modelPreference: 'hybrid',
    themeColor: 'orange'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED AGENTS
// ─────────────────────────────────────────────────────────────────────────────

export const AGENTS: Record<AgentId, AgentConfig> = {
  ...HR_AGENTS,
  ...LEGACY_AGENTS,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getAgentConfig = (id: AgentId): AgentConfig => {
  return AGENTS[id];
};

export const getHRAgentConfig = (id: HRAgentId): AgentConfig => {
  return HR_AGENTS[id];
};

export const getAgentByCapability = (capability: string): AgentConfig | undefined => {
  return Object.values(HR_AGENTS).find(agent =>
    agent.capabilities?.includes(capability)
  );
};

export const getAgentColor = (id: AgentId): string => {
  const agent = AGENTS[id];
  return agent?.themeColor || 'slate';
};

export const getAgentIcon = (id: AgentId): string => {
  const agent = AGENTS[id];
  return agent?.icon || 'Bot';
};

// Agent display names for UI
export const AGENT_DISPLAY_NAMES: Record<HRAgentId, string> = {
  MAIN_HR: 'HR Intelligence',
  POLICY_RESEARCH: 'Policy Research',
  COMPLIANCE: 'Compliance',
  DOCUMENT: 'Documents',
  EMPLOYEE_SUPPORT: 'Support',
};

// Agent colors for badges
export const AGENT_BADGE_COLORS: Record<HRAgentId, { bg: string; text: string }> = {
  MAIN_HR: { bg: 'bg-derivhr-100', text: 'text-derivhr-700' },
  POLICY_RESEARCH: { bg: 'bg-blue-100', text: 'text-blue-700' },
  COMPLIANCE: { bg: 'bg-amber-100', text: 'text-amber-700' },
  DOCUMENT: { bg: 'bg-violet-100', text: 'text-violet-700' },
  EMPLOYEE_SUPPORT: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};
