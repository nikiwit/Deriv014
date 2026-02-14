import React, { useState, useEffect } from 'react';
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Clock,
  Eye,
  Calendar,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface InviteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

interface InviteLink {
  id: string;
  token: string;
  employee_id: string;
  created_at: string;
  expires_at: string;
  is_one_time: boolean;
  custom_message: string;
  view_count: number;
  status: string;
  url: string;
}

const API_BASE = '';

export const InviteLinkModal: React.FC<InviteLinkModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}) => {
  const [expiryDays, setExpiryDays] = useState(7);
  const [isOneTime, setIsOneTime] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [generatedLink, setGeneratedLink] = useState<InviteLink | null>(null);
  const [existingLinks, setExistingLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchExistingLinks();
    }
  }, [isOpen, employeeId]);

  const fetchExistingLinks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/invite-links?employee_id=${employeeId}`);
      const data = await res.json();
      setExistingLinks(data.invite_links || []);
    } catch (err) {
      console.error('Failed to fetch invite links:', err);
    }
  };

  const generateLink = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/invite-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          expiry_days: expiryDays,
          is_one_time: isOneTime,
          custom_message: customMessage,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate link');
      }
      
      setGeneratedLink(data.invite_link);
      fetchExistingLinks();
    } catch (err: any) {
      setError(err.message || 'Failed to generate invite link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      const url = `${window.location.origin}${generatedLink.url}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      await fetch(`${API_BASE}/api/onboarding/invite-links/${linkId}`, {
        method: 'DELETE',
      });
      fetchExistingLinks();
    } catch (err) {
      console.error('Failed to delete link:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      active: { bg: 'bg-jade-100', text: 'text-jade-700' },
      expired: { bg: 'bg-amber-100', text: 'text-amber-700' },
      used: { bg: 'bg-blue-100', text: 'text-blue-700' },
      revoked: { bg: 'bg-red-100', text: 'text-red-700' },
    };
    const style = styles[status] || styles.active;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-derivhr-500 to-derivhr-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <LinkIcon className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Generate Invite Link</h2>
                <p className="text-white/80 text-sm font-medium">{employeeName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="text-white" size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Create New Link</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar size={14} className="inline mr-1" />
                  Expires in (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value) || 7)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOneTime}
                    onChange={(e) => setIsOneTime(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-derivhr-500 focus:ring-derivhr-500"
                  />
                  <span className="text-sm font-medium text-slate-700">One-time use only</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Custom Message (optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message for the employee..."
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none"
                rows={2}
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={generateLink}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold hover:from-derivhr-600 hover:to-derivhr-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <LinkIcon size={18} />
              )}
              Generate Invite Link
            </button>
          </div>

          {generatedLink && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-700">Generated Link</span>
                {getStatusBadge(generatedLink.status)}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${generatedLink.url}`}
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600"
                />
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-derivhr-500 text-white rounded-lg hover:bg-derivhr-600 transition-colors"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  {generatedLink.view_count} views
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  Expires: {new Date(generatedLink.expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {existingLinks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900">Existing Links</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {existingLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">
                          {link.token.slice(0, 8)}...
                        </span>
                        {getStatusBadge(link.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {link.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(link.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteLink(link.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
