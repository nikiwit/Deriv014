import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { Send, Bot, User, Cpu, RefreshCw, ShieldAlert, Info } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = "derivhr_employee_chat_messages";


// ─── Contract consent state ─────────────────────────────────────
interface PendingConsent {
  employeeId: string;
  contractData: any;  // structured contract data from backend
}

async function signAndStoreContract(
  employeeId: string,
  contractData: any,
  sessionId?: string
): Promise<any> {
  try {
    const res = await fetch('/api/employee-chat/sign-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        contract_data: contractData,
        session_id: sessionId,
      })
    });
    const data = await res.json();
    if (!res.ok && !data.status) {
      throw new Error(data.error || data.response || `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error("sign contract error", err);
    return { status: "error", response: String(err) };
  }
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

// ─── Messages persistence ──────────────────────────────────────
function getWelcomeMessage(user: any): Message {
  const name = user?.firstName || user?.fullName?.split(' ')[0] || 'there';
  return {
    id: '1',
    role: 'assistant',
    content: `Hello ${name}! I'm your personal HR Onboarding Assistant. I can help you with:\n\n- Your onboarding progress and next steps\n- Document status (application, offer letter, contract)\n- Company policies and procedures\n- Questions about your role and department\n\nHow can I help you today?`,
    timestamp: new Date(),
    modelUsed: 'System'
  };
}

function loadPersistedMessages(user: any): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [getWelcomeMessage(user)];
    const parsed: Message[] = JSON.parse(raw);
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [getWelcomeMessage(user)];
  }
}

function persistMessages(msgs: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch { /* quota exceeded */ }
}

// ─── Component ─────────────────────────────────────────────────
export const EmployeeChatAssistant: React.FC = () => {
  // Use authenticated user from AuthContext
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => loadPersistedMessages(user));
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(null);
  const [isContractNegotiation, setIsContractNegotiation] = useState(false);
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
    setPendingConsent(null);
    setIsContractNegotiation(false);
    setMessages([getWelcomeMessage(user)]);
  };

  const handleConsentSign = async () => {
    if (!pendingConsent) return;
    const { employeeId, contractData } = pendingConsent;
    setPendingConsent(null);

    const sessionId = user?.id ? `web_${user.id}` : undefined;
    const signResult = await signAndStoreContract(employeeId, contractData, sessionId);

    if (signResult?.status === 'ok') {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: signResult.response || `Your contract has been signed successfully!\n\n**Signed at:** ${new Date().toLocaleString()}\n\nYou can access a copy from **My Documents** in the sidebar.`,
        modelUsed: 'System',
        timestamp: new Date()
      }]);
      setIsContractNegotiation(false);
    } else if (signResult?.status === 'already_signed') {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: signResult.response || 'You have already signed your contract.',
        modelUsed: 'System',
        timestamp: new Date()
      }]);
      setIsContractNegotiation(false);
    } else {
      const reason = signResult?.response || signResult?.error || 'Could not complete signing at this time.';
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Contract signing could not be completed.\n\n**Reason:** ${reason}\n\nPlease contact HR for assistance.`,
        modelUsed: 'System',
        timestamp: new Date()
      }]);
    }
  };

  const handleConsentDecline = () => {
    setPendingConsent(null);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Contract declined. Your contract remains in pending status. You can restart the process at any time by saying \"sign my contract\".",
      modelUsed: 'System',
      timestamp: new Date()
    }]);
    // Deactivate negotiation mode
    setIsContractNegotiation(false);
  };

  // Build the employee context payload for the backend using authenticated user
  const buildEmployeeContext = () => {
    if (!user) return undefined;
    return {
      id: user.id,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      role: user.role,
      department: user.department,
      startDate: user.startDate,
      nationality: user.nationality,
      nric: user.nric,
      first_name: user.firstName,
      last_name: user.lastName,
      employee_id: user.employeeId,
    };
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

    // All queries go to backend (intent classification + routing happens server-side)
    try {
        const res = await fetch('/api/employee-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          session_id: user?.id ? `web_${user.id}` : undefined,
          employee_context: buildEmployeeContext(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      // Handle already_signed → inform user, no buttons
      if (data.status === 'already_signed') {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          modelUsed: 'contract_agent',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        setIsContractNegotiation(false);
      // Handle contract_ready → show contract in chat + Sign/Reject buttons
      } else if (data.status === 'contract_ready' && data.action === 'show_contract') {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          modelUsed: 'contract_agent',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        // Set pending consent so Sign/Reject buttons appear
        const userId = user?.id || '';
        setPendingConsent({ employeeId: userId, contractData: data.contract_data });
        // Activate contract negotiation mode
        setIsContractNegotiation(true);
      } else if (data.status === 'missing_fields' || data.intent === 'contract_data_collection') {
        // User is in data collection phase
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          modelUsed: 'contract_agent',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        // Set badge to show we're collecting contract data
        setIsContractNegotiation(true);
      } else if (data.status === 'modification_accepted') {
        // Contract modification approved - show success message with updated contract
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          modelUsed: 'contract_negotiation',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        
        // Update pending consent with new contract data
        if (data.updated_contract) {
          const userId = user?.id || '';
          setPendingConsent({ employeeId: userId, contractData: data.updated_contract });
        }
      } else if (data.status === 'modification_rejected') {
        // Contract modification rejected - show rejection with reasons
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          modelUsed: 'contract_negotiation',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        // Keep existing pending consent (don't update contract data)
      } else if (data.intent === 'contract_off_topic') {
        // Off-topic message during contract negotiation
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          modelUsed: 'contract_agent',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
      } else if (data.intent === 'contract_context') {
        // Contract-relevant question answered from contract data (no RAG)
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          modelUsed: 'contract_agent',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        // Normal response (predefined, RAG, missing_fields prompt, etc.)
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          modelUsed: data.agent_used || data.intent || 'Backend',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
      }
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
                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Not Authenticated'}
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
      {user && isAuthenticated && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center space-x-2">
          <Info size={14} className="text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-700 font-medium">
            Chatting as <strong>{user.firstName || ''} {user.lastName || ''}</strong> ({user.role}, {user.department || 'No Department'}) — This assistant can only access your profile data.
          </p>
        </div>
      )}

      {!user && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center space-x-2">
          <ShieldAlert size={14} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Not authenticated. Please log in to enable personalized assistance.
          </p>
        </div>
      )}

      {/* Contract Negotiation Badge */}
      {isContractNegotiation && (
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
            </div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              📝 Contract Negotiation Active
            </p>
          </div>
          <div className="flex items-center space-x-1 text-xs text-blue-600">
            <span className="font-medium">Session Mode:</span>
            <span className="px-2 py-0.5 bg-blue-100 rounded-full font-bold">Contract Review</span>
          </div>
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

      {/* Contract consent card — Sign / Reject buttons */}
      {pendingConsent && (() => {
        const cd = pendingConsent.contractData || {};
        return (
          <div className="px-4 py-3 bg-white border-t border-emerald-200 shadow-inner">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-3">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">Contract Summary</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                <span className="font-semibold">Employee</span>
                <span>{cd.employee_name || '—'}</span>
                <span className="font-semibold">Position</span>
                <span>{cd.position || '—'}</span>
                <span className="font-semibold">Department</span>
                <span>{cd.department || '—'}</span>
                <span className="font-semibold">Nationality</span>
                <span>{cd.nationality || '—'}</span>
                <span className="font-semibold">Start Date</span>
                <span>{cd.start_date || '—'}</span>
                <span className="font-semibold">Company</span>
                <span>{cd.company || '—'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              By clicking <strong>Sign</strong> you confirm that you have read and agree to the terms of this employment contract.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConsentSign}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                Sign Contract
              </button>
              <button
                onClick={handleConsentDecline}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Reject
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
