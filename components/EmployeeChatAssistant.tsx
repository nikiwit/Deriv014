import React, { useState, useRef, useEffect } from 'react';
import { chatWithEmployeeAgent } from '../services/geminiService';
import { Message } from '../types';
import { Send, Bot, User, Cpu, RefreshCw, ShieldAlert, Info } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

const STORAGE_KEY = "derivhr_employee_chat_messages";

// ─── Profile loader ────────────────────────────────────────────
interface EmployeeProfile {
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

function loadJsonSafe(key: string): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Access validation ─────────────────────────────────────────
// Block queries that try to fish for other employees' data
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

    // Document completion status
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

// ─── Component ─────────────────────────────────────────────────
export const EmployeeChatAssistant: React.FC = () => {
  const [profile] = useState<EmployeeProfile | null>(loadProfile);
  const [messages, setMessages] = useState<Message[]>(() => loadPersistedMessages(profile));
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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
    setMessages([getWelcomeMessage(profile)]);
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

    // Send to AI with profile context
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
