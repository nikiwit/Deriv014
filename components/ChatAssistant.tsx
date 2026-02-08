import React, { useState, useRef, useEffect } from 'react';
import { chatWithAgent, getRAGContext, resetRagSession } from '../services/geminiService';
import { sendChatMessage, ChatResponse } from '../services/api';
import { validateTelegramToken, getTelegramUpdates, sendTelegramMessage, sendWhatsAppMessage } from '../services/messagingService';
import { AGENTS, AgentId, getAgentConfig } from '../services/agentRegistry';
import { Message, IntegrationConfig } from '../types';
import { calculateOvertime, calculateContributions } from '../utils/payroll';
import { PUBLIC_HOLIDAYS_MY, MALAYSIAN_STATES, MOCK_LEAVE_BALANCES } from '../constants';
import { Send, Paperclip, Bot, User, Cpu, ThumbsUp, ThumbsDown, Calculator, BriefcaseBusiness, Truck, Wallet, MessageCircle, Smartphone, Check, Briefcase, RefreshCw, AlertCircle, Slack } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

type ToolType = 'none' | 'ot_calc' | 'epf_calc' | 'leave_status';

const STORAGE_KEY_MESSAGES = "derivhr_chat_messages";

const WELCOME_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: 'Hello! I am your Global HR Specialist. I can help with International Employment Laws, Leave Requests (Malaysia specific), or Compliance. How can I assist?',
  timestamp: new Date(),
  modelUsed: 'Local-Llama-3'
};

function loadPersistedMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (!raw) return [WELCOME_MESSAGE];
    const parsed: Message[] = JSON.parse(raw);
    // Restore Date objects from JSON strings
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [WELCOME_MESSAGE];
  }
}

function persistMessages(msgs: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(msgs));
  } catch { /* quota exceeded — ignore for prototype */ }
}

export const ChatAssistant: React.FC = () => {
  const [currentAgent, setCurrentAgent] = useState<AgentId>('HR');
  const [messages, setMessages] = useState<Message[]>(loadPersistedMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>('none');
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>({ 
      type: '', 
      apiKey: '', 
      extraId: '', // For WhatsApp Phone ID or tracking Telegram Chat ID
      connected: false,
      lastOffset: 0
  });
  const [connectionError, setConnectionError] = useState('');
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  
  // Tool State
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [hoursInput, setHoursInput] = useState<string>('');
  const [dayTypeInput, setDayTypeInput] = useState<'normal' | 'rest' | 'holiday'>('normal');
  const [manualLabour, setManualLabour] = useState<boolean>(false);
  const [selectedState, setSelectedState] = useState<string>('Selangor');
  const [otDate, setOtDate] = useState<string>('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist messages to localStorage on every change
  useEffect(() => {
    persistMessages(messages);
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Polling Effect for Telegram
  useEffect(() => {
      if (integrationConfig.connected && integrationConfig.type === 'Telegram') {
          const poll = async () => {
              const updates = await getTelegramUpdates(integrationConfig.apiKey, integrationConfig.lastOffset);
              
              if (updates && updates.length > 0) {
                  const newOffset = updates[updates.length - 1].update_id + 1;
                  
                  // Update offset ref for next poll
                  setIntegrationConfig(prev => ({ ...prev, lastOffset: newOffset }));

                  // Process messages
                  for (const update of updates) {
                      if (update.message && update.message.text) {
                          const chatId = update.message.chat.id;
                          const text = update.message.text;
                          const sender = update.message.from.first_name;

                          // Store Chat ID for reply
                          setIntegrationConfig(prev => ({ ...prev, extraId: chatId.toString(), lastOffset: newOffset }));

                          // Add User Message to UI
                          const userMsg: Message = {
                              id: Date.now().toString(),
                              role: 'user',
                              content: `[via Telegram - ${sender}]: ${text}`,
                              timestamp: new Date()
                          };
                          setMessages(prev => [...prev, userMsg]);

                          // Trigger AI Response
                          await processAIResponse(text, userMsg.id, 'Telegram', chatId.toString());
                      }
                  }
              }
          };

          // Poll every 3 seconds
          pollingRef.current = setInterval(poll, 3000);
      }

      return () => {
          if (pollingRef.current) clearInterval(pollingRef.current);
      };
  }, [integrationConfig.connected, integrationConfig.type, integrationConfig.lastOffset, currentAgent]);


  const handleNewChat = () => {
    resetRagSession();
    setMessages([WELCOME_MESSAGE]);
  };

  const handleAgentSwitch = (agentId: AgentId) => {
    setCurrentAgent(agentId);
    const agent = getAgentConfig(agentId);
    
    setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Switched to ${agent.name}. ${agent.role} ready.`,
        timestamp: new Date(),
        modelUsed: 'System'
    }]);
  };

  const handleToolSelection = (tool: ToolType) => {
    setActiveTool(tool);
    setSalaryInput('');
    setHoursInput('');
    setOtDate('');
  };

  const connectIntegration = async () => {
      setConnectionError('');
      
      if (integrationConfig.type === 'Telegram') {
          const isValid = await validateTelegramToken(integrationConfig.apiKey);
          if (!isValid) {
              setConnectionError('Invalid Bot Token. Please check and try again.');
              return;
          }
      } else if (integrationConfig.type === 'WhatsApp') {
          if (!integrationConfig.extraId) {
              setConnectionError('Phone Number ID is required for WhatsApp.');
              return;
          }
      }

      setIntegrationConfig(prev => ({ ...prev, connected: true }));
      setShowIntegrations(false);
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'system',
          content: `✅ Successfully connected to ${integrationConfig.type}. \n${integrationConfig.type === 'Telegram' ? 'Listening for messages...' : 'Ready to send messages.' }`,
          timestamp: new Date(),
          modelUsed: 'System'
      }]);
  };

  const disconnectIntegration = () => {
      setIntegrationConfig({ type: '', apiKey: '', extraId: '', connected: false, lastOffset: 0 });
      if (pollingRef.current) clearInterval(pollingRef.current);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `🔌 Integration disconnected.`,
        timestamp: new Date(),
        modelUsed: 'System'
    }]);
  };

  // Centralized AI Logic — calls Flask backend RAG
  const processAIResponse = async (userText: string, replyToId: string, source: 'UI' | 'Telegram' | 'WhatsApp', externalId?: string) => {
    setIsTyping(true);
    try {
      const result: ChatResponse = await sendChatMessage(userText, chatSessionId);

      // Persist session for follow-up messages
      if (!chatSessionId) setChatSessionId(result.session_id);

      const sourceSuffix = result.sources.length > 0
        ? '\n\n---\n_Sources: ' + result.sources.map(s => `${s.file} (${s.jurisdiction})`).join(', ') + '_'
        : '';

      const assistantResponse = result.response + sourceSuffix;

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantResponse,
        modelUsed: 'GPT-4o-mini',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);

      // Send back to External API if applicable
      if (integrationConfig.connected) {
        if (source === 'Telegram' && externalId) {
            await sendTelegramMessage(integrationConfig.apiKey, externalId, result.response);
        } else if (source === 'UI' && integrationConfig.type === 'Telegram' && integrationConfig.extraId) {
             await sendTelegramMessage(integrationConfig.apiKey, integrationConfig.extraId, result.response);
        } else if (source === 'UI' && integrationConfig.type === 'WhatsApp' && integrationConfig.extraId) {
             await sendWhatsAppMessage(integrationConfig.apiKey, integrationConfig.extraId, '60123456789', result.response);
        }
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error connecting to the backend. Please ensure the server is running.',
        modelUsed: 'System',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    // Process response (Routing logic included)
    await processAIResponse(userMsg.content, userMsg.id, 'UI');
  };

  const simulateIncomingWhatsApp = () => {
    const fakeMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: "[via WhatsApp +6012...]: Hello, I have a question about my payslip.",
        timestamp: new Date()
    };
    setMessages(prev => [...prev, fakeMsg]);
    processAIResponse("Hello, I have a question about my payslip.", fakeMsg.id, 'WhatsApp', '6012...');
  };

  // Tool Execution
  const executeCalculation = () => {
    const salary = parseFloat(salaryInput);
    if (isNaN(salary) && activeTool !== 'leave_status') return;

    let resultText = '';

    if (activeTool === 'ot_calc') {
        const hours = parseFloat(hoursInput) || 0;
        const res = calculateOvertime(salary, hours, dayTypeInput, manualLabour, selectedState, otDate);
        resultText = `**Overtime Calculation Results:**\n` +
                     `_Jurisdiction: ${selectedState} (Malaysia)_\n\n` +
                     `${res.warning ? `⚠️ *${res.warning}*\n\n` : ''}` +
                     `• **Hourly Rate (ORP):** RM${res.hourlyRate}\n` +
                     `• **Type:** ${res.description}\n` +
                     `• **Multiplier:** ${res.multiplier}x\n` +
                     `• **Total Payout:** RM${res.amount}\n\n`;
    } else if (activeTool === 'epf_calc') {
        const res = calculateContributions(salary);
        resultText = `**Statutory Contributions Breakdown:**\n\n` +
                     `**EPF (KWSP):**\n` +
                     `• Employee (${res.epf.rateEm}): RM${res.epf.employee}\n` +
                     `• Employer (${res.epf.rateEr}): RM${res.epf.employer}\n\n` +
                     `**SOCSO & EIS (Capped @ RM6k):**\n` +
                     `• Total SOCSO: RM${(parseFloat(res.socso.employee) + parseFloat(res.socso.employer)).toFixed(2)}\n` +
                     `• Total EIS: RM${(parseFloat(res.eis.employee) + parseFloat(res.eis.employer)).toFixed(2)}\n\n` +
                     `**Net Salary:** RM${res.netSalary}`;
    } else if (activeTool === 'leave_status') {
        const annual = MOCK_LEAVE_BALANCES.find(b => b.type === 'Annual');
        const sick = MOCK_LEAVE_BALANCES.find(b => b.type === 'Sick');
        resultText = `**Your Leave Balance (Ali Ahmad):**\n\n` +
                     `🏖️ **Annual:** ${annual?.entitled! - annual?.taken!} days remaining (of ${annual?.entitled})\n` +
                     `🤒 **Sick:** ${sick?.entitled! - sick?.taken!} days remaining (of ${sick?.entitled})\n\n` +
                     `_You can apply for leave directly in the E-Leave module or ask me to "Apply for Annual Leave tomorrow"._`;
    }

    const toolMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: resultText,
        modelUsed: 'System',
        timestamp: new Date()
    };
    setMessages(prev => [...prev, toolMsg]);
    setActiveTool('none');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg relative">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-100 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${currentAgent === 'HR' ? 'bg-derivhr-500' : currentAgent === 'Finance' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
             {currentAgent === 'HR' && <Bot className="text-white w-5 h-5" />}
             {currentAgent === 'Finance' && <Wallet className="text-white w-5 h-5" />}
             {currentAgent === 'Logistics' && <Truck className="text-white w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-800 tracking-tight text-sm">DerivHR Agent</h3>
                <span className="text-xs text-slate-300">|</span>
                <select 
                    value={currentAgent}
                    onChange={(e) => handleAgentSwitch(e.target.value as AgentId)}
                    className="bg-transparent text-sm font-bold text-derivhr-500 outline-none cursor-pointer hover:text-derivhr-600"
                >
                    {Object.values(AGENTS).map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 bg-jade-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active • GPT-4o-mini</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
            <button
                onClick={handleNewChat}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:text-derivhr-500 hover:bg-slate-50 transition-all mr-1"
                title="Start new conversation"
            >
                <RefreshCw size={14} />
                <span>New Chat</span>
            </button>
            {integrationConfig.connected && integrationConfig.type === 'WhatsApp' && (
                <button 
                    onClick={simulateIncomingWhatsApp}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 mr-2"
                >
                    <Smartphone size={14} />
                    <span>Simulate Reply</span>
                </button>
            )}
            <button 
                onClick={() => setShowIntegrations(true)}
                className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all mr-2 ${integrationConfig.connected ? 'bg-jade-50 text-jade-600 border-jade-200' : 'text-slate-600 hover:text-derivhr-500 hover:bg-slate-50 border-transparent hover:border-slate-200'}`}
            >
                {integrationConfig.connected ? <Check size={14} /> : <MessageCircle size={14} />}
                <span>{integrationConfig.connected ? 'Chat Linked' : 'Connect Chat'}</span>
            </button>
            <div className="w-px h-8 bg-slate-200 mx-2"></div>
            <button 
                onClick={() => handleToolSelection(activeTool === 'leave_status' ? 'none' : 'leave_status')}
                className={`p-2 rounded-lg transition-colors ${activeTool === 'leave_status' ? 'bg-derivhr-50 text-derivhr-500 border border-derivhr-200' : 'bg-white text-slate-400 hover:bg-slate-50 border border-transparent'}`}
                title="Check Leave Balance"
            >
                <Briefcase size={18} />
            </button>
            <button 
                onClick={() => handleToolSelection(activeTool === 'ot_calc' ? 'none' : 'ot_calc')}
                className={`p-2 rounded-lg transition-colors ${activeTool === 'ot_calc' ? 'bg-derivhr-50 text-derivhr-500 border border-derivhr-200' : 'bg-white text-slate-400 hover:bg-slate-50 border border-transparent'}`}
                title="Overtime Calculator (MY)"
            >
                <Calculator size={18} />
            </button>
            <button 
                onClick={() => handleToolSelection(activeTool === 'epf_calc' ? 'none' : 'epf_calc')}
                className={`p-2 rounded-lg transition-colors ${activeTool === 'epf_calc' ? 'bg-derivhr-50 text-derivhr-500 border border-derivhr-200' : 'bg-white text-slate-400 hover:bg-slate-50 border border-transparent'}`}
                title="EPF/SOCSO Calculator (MY)"
            >
                <BriefcaseBusiness size={18} />
            </button>
        </div>
      </div>

      {/* Integration Modal */}
      {showIntegrations && (
          <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Connect Chat Platform</h3>
                  <p className="text-sm text-slate-500 mb-6">Bring your own API key to enable 2-way communication. <br/> <span className="text-xs text-amber-600">Note: Telegram supports instant 2-way via browser. WhatsApp requires a webhook for incoming messages.</span></p>
                  
                  {integrationConfig.connected ? (
                      <div className="text-center py-6">
                           <div className="w-16 h-16 bg-jade-100 rounded-full flex items-center justify-center mx-auto mb-4">
                               <Check size={32} className="text-jade-600" />
                           </div>
                           <h4 className="font-bold text-slate-800 mb-1">Connected to {integrationConfig.type}</h4>
                           <p className="text-xs text-slate-500 mb-4">Messages are synchronized.</p>
                           <button 
                                onClick={disconnectIntegration}
                                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-semibold"
                           >
                               Disconnect
                           </button>
                      </div>
                  ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button 
                                onClick={() => setIntegrationConfig({ ...integrationConfig, type: 'Telegram' })}
                                className={`p-4 border rounded-xl flex flex-col items-center justify-center space-y-2 transition-all ${integrationConfig.type === 'Telegram' ? 'border-derivhr-500 bg-derivhr-50' : 'border-slate-200 hover:border-derivhr-200'}`}
                            >
                                <Send size={32} className="text-[#0088cc]" />
                                <span className="font-semibold text-slate-700">Telegram</span>
                            </button>
                            <button 
                                onClick={() => setIntegrationConfig({ ...integrationConfig, type: 'WhatsApp' })}
                                className={`p-4 border rounded-xl flex flex-col items-center justify-center space-y-2 transition-all ${integrationConfig.type === 'WhatsApp' ? 'border-derivhr-500 bg-derivhr-50' : 'border-slate-200 hover:border-derivhr-200'}`}
                            >
                                <Smartphone size={32} className="text-[#25D366]" />
                                <span className="font-semibold text-slate-700">WhatsApp</span>
                            </button>
                        </div>
                        
                        {/* Slack Integration Stub */}
                        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between opacity-70 cursor-not-allowed">
                            <div className="flex items-center space-x-3">
                                <Slack className="text-[#4A154B]" size={24} />
                                <span className="text-sm font-bold text-slate-700">Slack Bot</span>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Coming Soon</span>
                        </div>

                        {integrationConfig.type && (
                            <div className="space-y-4 mb-6 animate-fade-in">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                                        {integrationConfig.type === 'Telegram' ? 'Bot Token' : 'Permanent Access Token'}
                                    </label>
                                    <input 
                                        type="password" 
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-derivhr-500"
                                        placeholder={`Enter your ${integrationConfig.type} token...`}
                                        value={integrationConfig.apiKey}
                                        onChange={(e) => setIntegrationConfig({ ...integrationConfig, apiKey: e.target.value })}
                                    />
                                </div>
                                
                                {integrationConfig.type === 'WhatsApp' && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                                            Phone Number ID
                                        </label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-derivhr-500"
                                            placeholder="e.g. 104523..."
                                            value={integrationConfig.extraId}
                                            onChange={(e) => setIntegrationConfig({ ...integrationConfig, extraId: e.target.value })}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">Found in Meta Developer Portal</p>
                                    </div>
                                )}

                                {connectionError && (
                                    <div className="text-xs text-red-600 flex items-center">
                                        <AlertCircle size={12} className="mr-1" />
                                        {connectionError}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex space-x-3">
                            <button onClick={() => setShowIntegrations(false)} className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                            <button 
                                onClick={connectIntegration}
                                disabled={!integrationConfig.apiKey || !integrationConfig.type}
                                className="flex-1 py-2 bg-derivhr-500 text-white rounded-lg font-bold disabled:opacity-50 hover:bg-derivhr-600 flex justify-center items-center shadow-lg shadow-derivhr-500/20"
                            >
                                Connect
                            </button>
                        </div>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* Tool Overlay */}
      {activeTool !== 'none' && (
          <div className="absolute top-20 left-0 right-0 z-10 p-4 animate-fade-in">
              <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-6 shadow-2xl max-w-md mx-auto ring-1 ring-slate-200">
                  <h4 className="text-slate-800 font-bold mb-4 flex items-center text-sm uppercase tracking-wider">
                      {activeTool === 'ot_calc' ? '🇲🇾 Advanced OT Calculator' : activeTool === 'leave_status' ? '🏝️ Leave Quick Check' : '🇲🇾 Statutory Calculator'}
                  </h4>
                  
                  {activeTool === 'leave_status' ? (
                      <div className="space-y-4">
                           <p className="text-sm text-slate-600 font-medium">Retrieving latest leave balances for current user session...</p>
                           <button 
                              onClick={executeCalculation}
                              className="w-full py-2.5 bg-derivhr-500 hover:bg-derivhr-600 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
                          >
                              Show My Balance
                          </button>
                          <button 
                              onClick={() => setActiveTool('none')}
                              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                          >
                              Close
                          </button>
                      </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                          <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase tracking-wide">Monthly Salary (MYR)</label>
                          <input 
                              type="number" 
                              value={salaryInput}
                              onChange={(e) => setSalaryInput(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:border-derivhr-500 outline-none transition-colors font-medium" 
                              placeholder="e.g. 4500"
                          />
                      </div>
                      
                      {activeTool === 'ot_calc' && (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase tracking-wide">Overtime Hours</label>
                                    <input 
                                        type="number" 
                                        value={hoursInput}
                                        onChange={(e) => setHoursInput(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:border-derivhr-500 outline-none font-medium" 
                                        placeholder="e.g. 2.5"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase tracking-wide">Work State</label>
                                    <select 
                                        value={selectedState}
                                        onChange={(e) => setSelectedState(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:border-derivhr-500 outline-none text-sm font-medium"
                                    >
                                        {MALAYSIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase tracking-wide">Work Date (Optional)</label>
                                <input 
                                    type="date" 
                                    value={otDate}
                                    onChange={(e) => setOtDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:border-derivhr-500 outline-none text-sm font-medium"
                                />
                                <span className="text-[10px] text-slate-400 font-medium">Used to auto-detect holidays</span>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase tracking-wide">Day Type</label>
                                <select 
                                    value={dayTypeInput}
                                    onChange={(e) => setDayTypeInput(e.target.value as any)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:border-derivhr-500 outline-none font-medium"
                                >
                                    <option value="normal">Normal Work Day (1.5x)</option>
                                    <option value="rest">Rest Day (2.0x)</option>
                                    <option value="holiday">Public Holiday (3.0x)</option>
                                </select>
                            </div>
                            <div className="flex items-center space-x-2 pt-1">
                                <input 
                                    type="checkbox" 
                                    id="manualLabour"
                                    checked={manualLabour}
                                    onChange={(e) => setManualLabour(e.target.checked)}
                                    className="rounded border-slate-300 text-derivhr-500 focus:ring-derivhr-500"
                                />
                                <label htmlFor="manualLabour" className="text-[11px] text-slate-600 font-medium">
                                    Manual Labourer / Supervisor (Forces EA coverage)
                                </label>
                            </div>
                          </>
                      )}
                      
                      <div className="flex space-x-2 pt-4">
                          <button 
                              onClick={() => setActiveTool('none')}
                              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={executeCalculation}
                              className="flex-1 py-2.5 bg-derivhr-500 hover:bg-derivhr-600 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
                          >
                              Calculate
                          </button>
                      </div>
                  </div>
                  )}
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
                msg.modelUsed === 'GPT-4o-mini' ? 'bg-derivhr-500 text-white' : 
                msg.modelUsed === 'System' ? 'bg-jade-500 text-white' : 'bg-slate-800 text-white'
              }`}>
                {msg.role === 'user' ? <User size={14} /> : msg.modelUsed === 'System' ? <RefreshCw size={14} /> : <Cpu size={14} />}
              </div>

              {/* Bubble */}
              <div className="group relative">
                <div className={`p-4 rounded-2xl shadow-sm border ${
                    msg.role === 'user'
                    ? 'bg-derivhr-500 text-white rounded-tr-none border-derivhr-500'
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
                 <div className="w-2 h-2 bg-derivhr-500 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-derivhr-500 rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-derivhr-500 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 rounded-xl p-2 px-4 focus-within:ring-2 focus-within:ring-derivhr-500/20 focus-within:border-derivhr-500 transition-all">
          <button className="text-slate-400 hover:text-derivhr-500 transition-colors">
            <Paperclip size={20} />
          </button>
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask ${currentAgent}...`}
            className="flex-1 bg-transparent border-none text-slate-800 focus:ring-0 placeholder-slate-400 font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2 bg-derivhr-500 hover:bg-derivhr-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-derivhr-500/20"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};