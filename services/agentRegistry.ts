export type AgentId = 'HR' | 'Finance' | 'Logistics';

export interface AgentConfig {
  id: AgentId;
  name: string;
  role: string;
  systemPrompt: string;
  allowedTools: string[];
  modelPreference?: 'local' | 'premium' | 'hybrid';
  themeColor: string; // Taildwind color class prefix (e.g., 'derivhr', 'emerald')
}

export const AGENTS: Record<AgentId, AgentConfig> = {
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

export const getAgentConfig = (id: AgentId): AgentConfig => {
  return AGENTS[id];
};
