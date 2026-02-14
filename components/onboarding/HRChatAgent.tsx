import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, RefreshCw, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender_type: 'employee' | 'hr_agent' | 'system';
  sender_name?: string;
  message: string;
  attachments?: { name: string; url: string }[];
  created_at: string;
}

interface HRChatAgentProps {
  disputeId: string;
  employeeId: string;
  employeeName: string;
  disputeReason: string;
  disputeDetails?: string;
  onResolved?: () => void;
}

export const HRChatAgent: React.FC<HRChatAgentProps> = ({
  disputeId,
  employeeId,
  employeeName,
  disputeReason,
  disputeDetails,
  onResolved,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [resolved, setResolved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
  }, [disputeId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (resolved && onResolved) {
      onResolved();
    }
  }, [resolved, onResolved]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = () => {
    const systemMessage: ChatMessage = {
      id: '1',
      sender_type: 'system',
      message: `Welcome ${employeeName}. An HR representative has been notified about your dispute regarding "${formatDisputeReason(disputeReason)}". They will assist you shortly.`,
      created_at: new Date().toISOString(),
    };

    const hrWelcomeMessage: ChatMessage = {
      id: '2',
      sender_type: 'hr_agent',
      sender_name: 'HR Assistant',
      message: `Hello ${employeeName}! I'm here to help resolve your concern about ${formatDisputeReason(disputeReason).toLowerCase()}. I've reviewed your case details.\n\nCould you please provide more information about what specifically needs to be corrected?`,
      created_at: new Date().toISOString(),
    };

    setMessages([systemMessage, hrWelcomeMessage]);
  };

  const formatDisputeReason = (reason: string): string => {
    const reasons: Record<string, string> = {
      incorrect_personal: 'Incorrect Personal Information',
      incorrect_compensation: 'Incorrect Compensation Details',
      incorrect_position: 'Incorrect Position/Department',
      incorrect_start_date: 'Incorrect Start Date',
      other: 'Other Concerns',
    };
    return reasons[reason] || reason;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender_type: 'employee',
      sender_name: employeeName,
      message: inputMessage.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    setTimeout(() => {
      const hrResponse = generateHRResponse(inputMessage.trim());
      
      setMessages(prev => [...prev, hrResponse]);
      setIsTyping(false);
      setIsLoading(false);
    }, 1500);
  };

  const generateHRResponse = (userMessage: string): ChatMessage => {
    const lowerMessage = userMessage.toLowerCase();
    
    let response = '';
    let senderName = 'HR Assistant';

    if (lowerMessage.includes('salary') || lowerMessage.includes('compensation')) {
      response = `Thank you for the clarification about the compensation. I understand your concern about the salary details.\n\nLet me check our records and speak with the hiring manager about this discrepancy. I'll need to verify the agreed-upon salary from your offer discussion.\n\nIn the meantime, could you confirm what the discussed salary amount was?`;
    } else if (lowerMessage.includes('position') || lowerMessage.includes('title') || lowerMessage.includes('role')) {
      response = `I see there's a discrepancy with your position/title. This is important to get right.\n\nCould you please share:\n1. What position you interviewed for?\n2. What was discussed during your interview?\n\nI'll coordinate with the hiring manager to ensure your contract reflects the correct position.`;
    } else if (lowerMessage.includes('start date') || lowerMessage.includes('start_date')) {
      response = `Let me help resolve the start date issue.\n\nWhat was your agreed start date? I can work with HR to update your offer letter and ensure all documents reflect the correct date.\n\nPlease note that any changes to the start date might affect your onboarding schedule and equipment setup.`;
    } else if (lowerMessage.includes('name') || lowerMessage.includes('address') || lowerMessage.includes('personal')) {
      response = `Thank you for bringing the personal information discrepancy to our attention.\n\nCould you please provide the correct details? I can update the records accordingly:\n\n• Correct Name:\n• Correct Address:\n• Any other details to update:\n\nI'll ensure all your documents are updated with the correct information.`;
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('resolved') || lowerMessage.includes('ok') || lowerMessage.includes('sounds good')) {
      response = `You're welcome! I'm glad we could help resolve your concern.\n\nYour updated offer letter will be sent to your email within 24 hours. Is there anything else you'd like me to help you with regarding your onboarding?`;
      setResolved(true);
    } else if (lowerMessage.includes('yes') || lowerMessage.includes('correct')) {
      response = `Great! I've noted the correct information. I'll process the update right away.\n\nThe updated offer letter will be prepared and sent to your email address. You'll need to review and accept the revised offer.\n\nIs there anything else you'd like to clarify before I proceed with the update?`;
    } else if (lowerMessage.includes('no') || lowerMessage.includes('wait')) {
      response = `No problem, take your time. I'm here to help.\n\nLet me know when you're ready to continue or if you have additional questions.`;
    } else {
      response = `Thank you for providing that information. I understand your concern.\n\nLet me look into this and get back to you with a solution. In the meantime, is there any additional context you'd like to share that might help resolve this faster?`;
    }

    return {
      id: Date.now().toString(),
      sender_type: 'hr_agent',
      sender_name: senderName,
      message: response,
      created_at: new Date().toISOString(),
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">HR Support Chat</h3>
            <p className="text-sm text-blue-100">
              {resolved ? '✓ Issue Resolved' : 'Active • Usually responds instantly'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_type === 'employee' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] ${
                msg.sender_type === 'system'
                  ? 'bg-gray-100 text-gray-600 text-center py-2 px-4 rounded-lg text-sm w-full'
                  : msg.sender_type === 'employee'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2'
                  : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-2'
              }`}
            >
              {msg.sender_type !== 'system' && msg.sender_type !== 'employee' && (
                <p className="text-xs font-medium text-blue-600 mb-1">{msg.sender_name}</p>
              )}
              <p className="whitespace-pre-wrap">{msg.message}</p>
              {msg.sender_type !== 'system' && (
                <p className={`text-xs mt-1 ${
                  msg.sender_type === 'employee' ? 'text-blue-200' : 'text-gray-400'
                }`}>
                  {formatTime(msg.created_at)}
                </p>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {!resolved && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Quick responses:</p>
          <div className="flex flex-wrap gap-2">
            {['Yes, that\'s correct', 'No, let me clarify', 'Please update my records', 'Thank you for your help'].map((quickReply) => (
              <button
                key={quickReply}
                onClick={() => setInputMessage(quickReply)}
                className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600"
              >
                {quickReply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        {resolved ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-600">Your issue has been resolved!</p>
            <p className="text-sm text-gray-400 mt-1">Updated documents will be sent to your email.</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRChatAgent;