import React, { useState, useRef, useEffect } from 'react';
import { chatWithEmployeeAgent } from '../services/geminiService';
import { Message } from '../types';
import { Send, Bot, User, Cpu, RefreshCw, ShieldAlert, Info } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import intentsData from '../docs/intents.json';

const STORAGE_KEY = "derivhr_employee_chat_messages";

// ─── Intent types ─────────────────────────────────────────────
type IntentKey = 'PROFILE_QUERY' | 'REQUEST_HR_TALK' | 'SMALL_TALK' | 'BOT_CAPABILITIES' | "SIGN_CONTRACT";

const INTENTS = intentsData as Record<IntentKey, string[]>;

// ─── Intent classifier ───────────────────────────────────────
function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function classifyIntent(userText: string): IntentKey | null {
  const normalised = normalise(userText);
  const words = normalised.split(/\s+/);

  let bestIntent: IntentKey | null = null;
  let bestScore = 0;

  for (const [intent, examples] of Object.entries(INTENTS) as [IntentKey, string[]][]) {
    for (const example of examples) {
      const normExample = normalise(example);

      // Exact match
      if (normalised === normExample) return intent;

      // Check if user text contains the example or vice-versa
      if (normalised.includes(normExample) || normExample.includes(normalised)) {
        const score = normExample.length / Math.max(normalised.length, 1);
        if (score > bestScore) {
          bestScore = score;
          bestIntent = intent;
        }
        continue;
      }

      // Word overlap scoring
      const exampleWords = normExample.split(/\s+/);
      const overlap = words.filter(w => exampleWords.includes(w)).length;
      const score = overlap / Math.max(exampleWords.length, 1);
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestIntent = intent;
      }
    }
  }

  return bestScore >= 0.4 ? bestIntent : null;
}

// ─── Profile loader ────────────────────────────────────────────
interface EmployeeProfile {
  id?: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  startDate: string;
  nationality: string;
  nric?: string;
  salary?: string;
  status?: string;
}

function loadProfile(): EmployeeProfile | null {
  try {
    const raw = localStorage.getItem('onboardingProfile');
    if (!raw) return null;
    return JSON.parse(raw) as EmployeeProfile;
  } catch {
    return null;
  }
}

function loadUserId(): string | null {
  try {
    const raw = localStorage.getItem('derivhr_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

function loadJsonSafe(key: string): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Contract data collection ──────────────────────────────────
interface ContractField {
  key: keyof EmployeeProfile;
  label: string;
  question: string;
}

const REQUIRED_CONTRACT_FIELDS: ContractField[] = [
  { key: 'role',        label: 'Job Role',    question: 'What is your official job title or position?' },
  { key: 'department',  label: 'Department',  question: 'Which department are you joining?' },
  { key: 'startDate',   label: 'Start Date',  question: 'What is your expected start date? (e.g. 1 March 2025)' },
  { key: 'nationality', label: 'Nationality', question: 'What is your nationality?' },
];

interface ContractCollectionState {
  pendingFields: string[];          // keys still to ask
  currentField: string;             // key currently being asked
  collectedData: Record<string, string>;
}

function checkMissingContractFields(profile: EmployeeProfile | null): string[] {
  return REQUIRED_CONTRACT_FIELDS
    .filter(f => !profile || !profile[f.key] || String(profile[f.key]).trim() === '')
    .map(f => f.key);
}

async function validateJobRole(role: string, department: string, sessionId: string): Promise<{ status: string; rag_result?: string }> {
  try {
    const res = await fetch('/api/validate_job_role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, department, session_id: sessionId })
    });
    if (!res.ok) return { status: 'error' };
    return await res.json();
  } catch {
    return { status: 'error' };
  }
}

interface PendingConsent {
  employeeId: string;
  contractData: any;  // full response from sign_contract_pipeline
}

async function storeContractJson(employeeId: string, contractData: any): Promise<{ status: string }> {
  try {
    const res = await fetch('/api/store_contract_json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId, contract_data: contractData })
    });
    if (!res.ok) return { status: 'error' };
    return await res.json();
  } catch {
    return { status: 'error' };
  }
}

// ─── Intent response builders ─────────────────────────────────
function buildProfileResponse(profile: EmployeeProfile | null): string {
  if (!profile) {
    return "I don't have your profile on file yet. Please complete the onboarding application form first, and I'll be able to answer questions about your details.";
  }

  const offerData = loadJsonSafe('offerAcceptanceData');
  const contractData = loadJsonSafe('contractData');

  return `Here's your profile information:\n
| Field | Details |
|---|---|
| **Full Name** | ${profile.fullName} |
| **Email** | ${profile.email} |
| **Role / Position** | ${profile.role} |
| **Department** | ${profile.department} |
| **Start Date** | ${profile.startDate} |
| **Nationality** | ${profile.nationality} |
${profile.nric ? `| **NRIC** | ${profile.nric} |\n` : ''}${profile.salary ? `| **Salary** | MYR ${profile.salary} |\n` : ''}| **Onboarding Status** | ${profile.status || 'In Progress'} |

**Document Status:**
- Application Form: ${profile.status === 'in_progress' ? 'Completed' : 'Pending'}
- Offer Acceptance: ${offerData?.completedAt ? 'Completed (' + offerData.completedAt + ')' : 'Pending'}
- Employment Contract: ${contractData?.completedAt ? 'Completed (' + contractData.completedAt + ')' : 'Pending'}

Let me know if you need help with anything else!`;
}

// function buildContractSignResponse(): string {
//   const contractData = loadJsonSafe('contractData');
//   const offerData = loadJsonSafe('offerAcceptanceData');

//   if (contractData?.completedAt) {
//     return `Your employment contract was already signed on **${contractData.completedAt}**. No further action is needed.\n\nIf you believe this is an error or need a copy, please navigate to **My Documents** in the sidebar.`;
//   }

//   if (!offerData?.completedAt) {
//     return `Before signing your employment contract, you need to **accept your offer letter** first.\n\nPlease go to **My Onboarding** in the sidebar and complete the **"Accept Offer Letter"** task. Once that's done, the contract signing step will become available.`;
//   }

//   return `Your contract is ready for signing! Here's how to proceed:\n\n1. Go to **My Onboarding** in the sidebar\n2. Find the **"Sign Employment Contract"** task\n3. Click on it to review and digitally sign your contract\n\nIf you're having trouble finding it, make sure previous required tasks are completed first.`;
// }



// frontend/helpers/signContract.js
async function buildSignContractResponse({
  employeeId,
  requesterId,
  sessionId = null,
  collectedData = {}
}: {
  employeeId: string;
  requesterId: string;
  sessionId?: string | null;
  collectedData?: Record<string, string>;
}) {
  try {
    const res = await fetch("/api/sign_contract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        employee_id: employeeId,
        requester_id: requesterId,
        session_id: sessionId,
        collected_data: collectedData
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }

    const data = await res.json();
    // data will contain fields like: { status, allowed, llm_result, reason, action }
    return data;
  } catch (err) {
    console.error("sign contract error", err);
    return { status: "error", error: String(err) };
  }
}

function buildHrTalkResponse(): string {
  return `I understand you'd like to speak with HR. Here are your options:\n\n1. **HR Support Email:** Send an email to hr@derivhr.com for general inquiries\n2. **Schedule a Meeting:** Contact your HR manager directly to set up a call\n3. **Urgent Issues:** For confidential or urgent matters, use the internal HR ticketing system\n\nWould you like me to help you with anything else in the meantime?`;
}

function buildDocumentUploadResponse(): string {
  return `To upload your documents:\n\n1. Navigate to **My Onboarding** in the sidebar\n2. Find the relevant document task (e.g., "Upload Identity Document")\n3. Click on the task and use the upload button to attach your file\n\n**Accepted formats:** PDF, JPG, PNG, DOC/DOCX\n**Max file size:** 10MB per file\n\nRequired documents typically include:\n- Identity document (NRIC / Passport)\n- Educational certificates\n- Bank account details\n- Passport-sized photographs\n\nIf you're having trouble uploading, try a different browser or check your file size.`;
}

function buildSmallTalkResponse(userText: string): string {
  const lower = userText.toLowerCase().trim();

  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening))/.test(lower)) {
    return "Hello! How can I help you with your onboarding today?";
  }
  if (/^(thanks|thank\s*you|thx|appreciate)/.test(lower)) {
    return "You're welcome! Let me know if there's anything else I can help with.";
  }
  if (/^(bye|goodbye|see\s*you|talk\s*later)/.test(lower)) {
    return "Goodbye! Feel free to come back anytime if you have more questions. Have a great day!";
  }
  if (/^(sorry|my\s*bad)/.test(lower)) {
    return "No worries at all! How can I assist you?";
  }

  return "I'm here to help with your onboarding! Feel free to ask me about your profile, documents, contract signing, or anything HR-related.";
}

function buildBotCapabilitiesResponse(): string {
  return `I'm your **DerivHR Onboarding Assistant**. Here's what I can help you with:\n
| Capability | Description |
|---|---|
| **Profile Queries** | View your personal details, salary, role, department, and employment info |
| **Contract Signing** | Guide you through the contract and offer letter signing process |
| **Document Upload** | Help you understand how to upload required onboarding documents |
| **HR Contact** | Provide information on how to reach HR for support |
| **Onboarding Status** | Check your onboarding progress and next steps |
| **Company Policies** | Answer questions about workplace policies and procedures |

Just ask me a question and I'll do my best to help!`;
}

// ─── Access validation ─────────────────────────────────────────
const BLOCKED_PATTERNS = [
  /show\s+(me\s+)?(all|every|other)\s+(employee|user|staff|people|person)/i,
  /list\s+(all\s+)?(employee|user|staff|people)/i,
  /give\s+me\s+(info|information|data|details)\s+(about|on|for)\s+(other|another|all)/i,
  /access\s+(other|another|all)\s+(employee|user|staff|people)/i,
  /who\s+(else|are\s+the\s+other)/i,
  /database\s+(of|with)\s+(employee|user|staff)/i,
  /employee\s+(list|database|records|directory)/i,
  /other\s+(employee|user|people|staff|colleague)('s|s')?\s+(info|data|profile|salary|detail)/i,
  /salary\s+of\s+(other|another|all|every)/i,
  /nric\s+of\s+(other|another|all|every)/i,
];

function isBlockedQuery(query: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(query));
}

const BLOCKED_RESPONSE = "I can only assist with questions about your own profile and onboarding. I cannot provide information about other employees. If you need help with something specific to your account, please ask!";

// ─── System prompt builder ─────────────────────────────────────
function buildSystemPrompt(profile: EmployeeProfile | null): string {
  const offerData = loadJsonSafe('offerAcceptanceData');
  const contractData = loadJsonSafe('contractData');

  let prompt = `You are a friendly HR Onboarding Assistant for DerivHR. You help new employees with their onboarding process.

STRICT RULES:
1. You can ONLY answer questions about the current employee whose profile is provided below.
2. You must NEVER reveal, discuss, or look up information about any other employee.
3. If asked about other employees, politely decline and explain you can only help with the current user's profile.
4. Keep answers concise, professional, and helpful.
5. You can help with: onboarding steps, document status, company policies, profile questions, and general HR queries.
`;

  if (profile) {
    prompt += `
CURRENT EMPLOYEE PROFILE:
- Full Name: ${profile.fullName}
- Email: ${profile.email}
- Role/Position: ${profile.role}
- Department: ${profile.department}
- Start Date: ${profile.startDate}
- Nationality: ${profile.nationality}
${profile.nric ? `- NRIC: ${profile.nric}` : ''}
${profile.salary ? `- Salary: ${profile.salary}` : ''}
- Onboarding Status: ${profile.status || 'in_progress'}
`;

    prompt += `\nDOCUMENT STATUS:\n`;
    prompt += `- Application Form: ${profile.status === 'in_progress' ? 'Completed' : 'Pending'}\n`;
    prompt += `- Offer Acceptance: ${offerData?.completedAt ? 'Completed (' + offerData.completedAt + ')' : 'Pending'}\n`;
    prompt += `- Employment Contract: ${contractData?.completedAt ? 'Completed (' + contractData.completedAt + ')' : 'Pending'}\n`;
  } else {
    prompt += `\nNOTE: No employee profile found in the system. Ask the user to complete their application first.\n`;
  }

  return prompt;
}

// ─── Messages persistence ──────────────────────────────────────
function getWelcomeMessage(profile: EmployeeProfile | null): Message {
  const name = profile?.fullName?.split(' ')[0] || 'there';
  return {
    id: '1',
    role: 'assistant',
    content: `Hello ${name}! I'm your personal HR Onboarding Assistant. I can help you with:\n\n- Your onboarding progress and next steps\n- Document status (application, offer letter, contract)\n- Company policies and procedures\n- Questions about your role and department\n\nHow can I help you today?`,
    timestamp: new Date(),
    modelUsed: 'System'
  };
}

function loadPersistedMessages(profile: EmployeeProfile | null): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [getWelcomeMessage(profile)];
    const parsed: Message[] = JSON.parse(raw);
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [getWelcomeMessage(profile)];
  }
}

function persistMessages(msgs: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch { /* quota exceeded */ }
}

// ─── Format sign contract API response into a chat message ────
function formatSignContractResult(data: any): string {
  if (!data) return "Something went wrong processing your contract request. Please try again.";

  if (data.status === 'error') {
    return `There was an error processing your contract request.\n\n_${data.message || data.error || 'Unknown error'}_\n\nPlease contact HR if the issue persists.`;
  }

  if (data.status === 'already_signed') {
    return `Your employment contract has already been signed. ${data.message || ''}\n\nIf you need a copy, navigate to **My Documents** in the sidebar.`;
  }

  if (data.status === 'blocked') {
    return `Contract signing is not yet available.\n\n**Reason:** ${data.message || 'Manager or HR confirmation is still pending.'}\n\nPlease check with your manager or HR team to confirm your contract is ready for signing.`;
  }

  if (data.status === 'ok') {
    const action = data.recommended_action;
    const explanation = data.llm_result?.explanation || '';

    if (action === 'allow_sign') {
      return `Your contract has been approved for signing!\n\n${explanation ? `**Summary:** ${explanation}\n\n` : ''}Your signature has been recorded. You can view your signed contract in **My Documents**.`;
    }

    if (action === 'llm_unavailable') {
      return `All pre-checks passed (manager confirmed, no prior signature found).\n\nHowever, the final LLM analysis step is currently unavailable. Please contact HR to complete the signing process manually.\n\n_${explanation}_`;
    }

    if (action === 'require_approval') {
      return `Your contract requires additional approval before it can be signed.\n\n${explanation ? `**Details:** ${explanation}\n\n` : ''}Please contact HR or your manager for next steps.`;
    }

    if (action === 'block') {
      return `Contract signing has been blocked at this time.\n\n${explanation ? `**Reason:** ${explanation}\n\n` : ''}Please reach out to HR for clarification.`;
    }
  }
  console.log(`Received data is ${data.message}`);
  return "Received an unexpected response from the contract service. Please contact HR.";

}

// ─── Handle intent-based response ──────────────────────────────
function getIntentResponse(intent: Exclude<IntentKey, 'SIGN_CONTRACT'>, userText: string, profile: EmployeeProfile | null): string {
  switch (intent) {
    case 'PROFILE_QUERY':
      return buildProfileResponse(profile);
    case 'REQUEST_HR_TALK':
      return buildHrTalkResponse();
    case 'SMALL_TALK':
      return buildSmallTalkResponse(userText);
    case 'BOT_CAPABILITIES':
      return buildBotCapabilitiesResponse();
  }
}

// ─── Component ─────────────────────────────────────────────────
export const EmployeeChatAssistant: React.FC = () => {
  const [profile] = useState<EmployeeProfile | null>(loadProfile);
  const [messages, setMessages] = useState<Message[]>(() => loadPersistedMessages(profile));
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [contractCollection, setContractCollection] = useState<ContractCollectionState | null>(null);
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist messages
  useEffect(() => {
    persistMessages(messages);
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewChat = () => {
    setContractCollection(null);
    setPendingConsent(null);
    setMessages([getWelcomeMessage(profile)]);
  };

  const handleConsentSign = async () => {
    if (!pendingConsent) return;
    const { employeeId, contractData } = pendingConsent;
    setPendingConsent(null);
    const result = await storeContractJson(employeeId, contractData);
    const contract = contractData?.contract || {};
    const content = result.status === 'ok'
      ? `Your contract has been signed and saved.\n\n**Contract ID:** ${contract.id || 'N/A'}\n**Signed at:** ${new Date().toLocaleString()}\n\nYou can access a copy from **My Documents** in the sidebar.`
      : "There was a problem saving your contract file. Please contact HR.";
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      modelUsed: 'System',
      timestamp: new Date()
    }]);
  };

  const handleConsentDecline = () => {
    setPendingConsent(null);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Contract signing cancelled. Your contract remains in pending status. You can restart the process at any time.",
      modelUsed: 'System',
      timestamp: new Date()
    }]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input.trim();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Validation: block queries about other users
    if (isBlockedQuery(userText)) {
      const blockedMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: BLOCKED_RESPONSE,
        modelUsed: 'System',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, blockedMsg]);
      setIsTyping(false);
      return;
    }

    // ── Collection mode: intercept answers for missing contract fields ──────
    if (contractCollection) {
      const { currentField, pendingFields, collectedData } = contractCollection;

      if (userText.toLowerCase().trim() === 'cancel') {
        setContractCollection(null);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Contract signing process cancelled. Let me know if you need anything else.",
          modelUsed: 'System',
          timestamp: new Date()
        }]);
        setIsTyping(false);
        return;
      }

      const updatedData = { ...collectedData, [currentField]: userText };

      // RAG validation after role or department is provided
      if (currentField === 'role' || currentField === 'department') {
        const userId = loadUserId() || '';
        const valResult = await validateJobRole(
          updatedData.role || profile?.role || '',
          updatedData.department || profile?.department || '',
          `web_${userId}`
        );
        if (valResult.status === 'ok' && valResult.rag_result) {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `_Policy check for **${currentField === 'role' ? 'job role' : 'department'}**:_\n\n${valResult.rag_result}`,
            modelUsed: 'System',
            timestamp: new Date()
          }]);
        }
      }

      const remaining = pendingFields.filter(f => f !== currentField);

      if (remaining.length > 0) {
        const nextFieldDef = REQUIRED_CONTRACT_FIELDS.find(f => f.key === remaining[0])!;
        setContractCollection({ pendingFields: remaining, currentField: remaining[0], collectedData: updatedData });
        setMessages(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `${nextFieldDef.question}\n\n_Type 'cancel' to exit._`,
          modelUsed: 'System',
          timestamp: new Date()
        }]);
      } else {
        // All fields collected — proceed with signing
        setContractCollection(null);
        const userId = loadUserId()!;
        const result = await buildSignContractResponse({
          employeeId: userId,
          requesterId: userId,
          sessionId: `web_${userId}`,
          collectedData: updatedData
        });
        if (result?.recommended_action === 'allow_sign') {
          setMessages(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: "Your contract is ready. Please review the details below and confirm your consent to sign.",
            modelUsed: 'System',
            timestamp: new Date()
          }]);
          setPendingConsent({ employeeId: userId, contractData: result });
        } else {
          setMessages(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: formatSignContractResult(result),
            modelUsed: 'System',
            timestamp: new Date()
          }]);
        }
      }

      setIsTyping(false);
      return;
    }

    // Intent classification: check against intents.json
    const intent = classifyIntent(userText);

    // SIGN_CONTRACT is async — check for missing fields first, collect if needed
    if (intent === 'SIGN_CONTRACT') {
      const userId = loadUserId();
      if (!userId) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I couldn't find your session. Please log in again and try signing your contract.",
          modelUsed: 'System',
          timestamp: new Date()
        }]);
        setIsTyping(false);
        return;
      }

      const missing = checkMissingContractFields(profile);
      if (missing.length > 0) {
        const firstFieldDef = REQUIRED_CONTRACT_FIELDS.find(f => f.key === missing[0])!;
        setContractCollection({ pendingFields: missing, currentField: missing[0], collectedData: {} });
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Before I can process your contract, I need a few details.\n\n${firstFieldDef.question}\n\n_Type 'cancel' to exit._`,
          modelUsed: 'System',
          timestamp: new Date()
        }]);
        setIsTyping(false);
        return;
      }

      // All fields present — proceed directly
      const result = await buildSignContractResponse({
        employeeId: userId,
        requesterId: userId,
        sessionId: `web_${userId}`,
        collectedData: {}
      });
      if (result?.recommended_action === 'allow_sign') {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Your contract is ready. Please review the details below and confirm your consent to sign.",
          modelUsed: 'System',
          timestamp: new Date()
        }]);
        setPendingConsent({ employeeId: userId, contractData: result });
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: formatSignContractResult(result),
          modelUsed: 'System',
          timestamp: new Date()
        }]);
      }
      setIsTyping(false);
      return;
    }

    if (intent) {
      // Matched a known intent — respond with predefined answer
      const response = getIntentResponse(intent, userText, profile);
      const intentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        modelUsed: 'System',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, intentMsg]);
      setIsTyping(false);
      return;
    }

    // No intent matched — fall through to LLM
    try {
      const systemPrompt = buildSystemPrompt(profile);
      const { response, modelUsed } = await chatWithEmployeeAgent(userText, systemPrompt);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        modelUsed: modelUsed,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I'm having trouble connecting right now. Please try again in a moment.\n\n_Error: ${String(error)}_`,
        modelUsed: 'Error',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }

    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg relative">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-100 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-jade-600">
            <Bot className="text-white w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 tracking-tight text-sm">HR Onboarding Assistant</h3>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 bg-jade-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {profile ? `${profile.fullName}` : 'No Profile'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Privacy badge */}
          <div className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <ShieldAlert size={14} />
            <span>Private Session</span>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-slate-50 transition-all"
            title="Start new conversation"
          >
            <RefreshCw size={14} />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Profile context banner */}
      {profile && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center space-x-2">
          <Info size={14} className="text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-700 font-medium">
            Chatting as <strong>{profile.fullName}</strong> ({profile.role}, {profile.department}) — This assistant can only access your profile data.
          </p>
        </div>
      )}

      {!profile && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center space-x-2">
          <ShieldAlert size={14} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            No profile loaded. Please complete your application form first to enable personalized assistance.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] flex ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                msg.role === 'user' ? 'bg-slate-200 text-slate-600' :
                msg.modelUsed === 'System' ? 'bg-jade-500 text-white' :
                msg.modelUsed === 'Error' ? 'bg-red-500 text-white' :
                'bg-emerald-600 text-white'
              }`}>
                {msg.role === 'user' ? <User size={14} /> : <Cpu size={14} />}
              </div>

              {/* Bubble */}
              <div className="group relative">
                <div className={`p-4 rounded-2xl shadow-sm border ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none border-emerald-600'
                    : 'bg-white border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="leading-relaxed whitespace-pre-wrap text-sm font-medium">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer content={msg.content} className="text-sm" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contract consent card — shown when signing is approved and awaiting user confirmation */}
      {pendingConsent && (() => {
        const contract = pendingConsent.contractData?.contract || {};
        const prof = pendingConsent.contractData?.profile || {};
        return (
          <div className="px-4 py-3 bg-white border-t border-emerald-200 shadow-inner">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-3">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">Contract Preview</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                <span className="font-semibold">Employee</span>
                <span>{prof.full_name || '—'}</span>
                <span className="font-semibold">Position</span>
                <span>{prof.position_title || prof.role || '—'}</span>
                <span className="font-semibold">Department</span>
                <span>{prof.department || '—'}</span>
                <span className="font-semibold">Nationality</span>
                <span>{prof.nationality || '—'}</span>
                <span className="font-semibold">Contract ID</span>
                <span className="font-mono">{contract.id || '—'}</span>
                <span className="font-semibold">Status</span>
                <span className="capitalize">{contract.status || 'pending_signature'}</span>
                {contract.hr_signed_at && (
                  <>
                    <span className="font-semibold">HR Signed</span>
                    <span>{new Date(contract.hr_signed_at).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              By clicking <strong>I Consent &amp; Sign</strong> you confirm that you have read and agree to the terms of this employment contract.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConsentSign}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                I Consent &amp; Sign
              </button>
              <button
                onClick={handleConsentDecline}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 rounded-xl p-2 px-4 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your onboarding, documents, or policies..."
            className="flex-1 bg-transparent border-none text-slate-800 focus:ring-0 placeholder-slate-400 font-medium"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
