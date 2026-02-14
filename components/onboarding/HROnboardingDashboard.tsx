import React, { useState, useEffect } from 'react';
import {
  Plus,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Bell,
  Send,
  UserPlus,
  FileText,
  Loader2,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const API_BASE = 'http://localhost:5001';

interface OnboardingState {
  id: string;
  employee_id: string;
  offer_id: string;
  status: string;
  employee_name: string;
  email: string;
  position: string;
  department: string;
  salary: number;
  jurisdiction: string;
  start_date: string;
  offer_sent_at: string;
  offer_expires_at: string;
  accepted_at?: string;
  rejected_at?: string;
  days_until_expiry?: number;
}

interface OnboardingStats {
  total: number;
  offer_pending: number;
  offer_accepted: number;
  offer_rejected: number;
  onboarding_active: number;
  onboarding_complete: number;
}

export const HROnboardingDashboard: React.FC = () => {
  const [pendingOffers, setPendingOffers] = useState<OnboardingState[]>([]);
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewOfferModal, setShowNewOfferModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<OnboardingState | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/multiagent/onboarding/pending`),
        fetch(`${API_BASE}/api/multiagent/onboarding/stats`),
      ]);

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingOffers(pendingData.pending_offers || []);
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const sendReminder = async (employee: OnboardingState) => {
    setSendingReminder(true);
    try {
      await fetch(`${API_BASE}/api/multiagent/onboarding/reminders/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.employee_id,
          type: 'offer_pending',
          channel: 'email',
        }),
      });
      alert('Reminder sent successfully!');
    } catch (error) {
      console.error('Failed to send reminder:', error);
    } finally {
      setSendingReminder(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon?: React.ReactNode }> = {
      offer_pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock size={12} /> },
      offer_accepted: { bg: 'bg-jade-100', text: 'text-jade-700', icon: <CheckCircle2 size={12} /> },
      offer_rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={12} /> },
      onboarding_active: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <UserPlus size={12} /> },
      onboarding_complete: { bg: 'bg-jade-100', text: 'text-jade-700', icon: <CheckCircle2 size={12} /> },
    };
    const style = styles[status] || styles.offer_pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>
        {style.icon}
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-derivhr-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Onboarding Dashboard</h1>
          <p className="text-slate-500 font-medium">Manage employee offers and onboarding workflows</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 text-slate-500 hover:text-derivhr-500 hover:bg-derivhr-50 rounded-xl transition-all"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => setShowNewOfferModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold hover:from-derivhr-600 hover:to-derivhr-700 transition-all shadow-lg shadow-derivhr-500/30"
          >
            <Plus size={20} />
            <span>Create Offer</span>
            <Sparkles size={16} />
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
            </div>
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-400 uppercase">Pending</span>
            </div>
            <span className="text-2xl font-black text-amber-600">{stats.offer_pending}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-jade-500" />
              <span className="text-xs font-bold text-slate-400 uppercase">Accepted</span>
            </div>
            <span className="text-2xl font-black text-jade-600">{stats.offer_accepted}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <XCircle size={16} className="text-red-500" />
              <span className="text-xs font-bold text-slate-400 uppercase">Rejected</span>
            </div>
            <span className="text-2xl font-black text-red-600">{stats.offer_rejected}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-slate-400 uppercase">Onboarding</span>
            </div>
            <span className="text-2xl font-black text-blue-600">{stats.onboarding_active}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-derivhr-500" />
              <span className="text-xs font-bold text-slate-400 uppercase">Complete</span>
            </div>
            <span className="text-2xl font-black text-derivhr-600">{stats.onboarding_complete}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Active Offers & Onboarding</h2>
        </div>

        {pendingOffers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No active offers or onboarding</p>
            <button
              onClick={() => setShowNewOfferModal(true)}
              className="mt-4 px-4 py-2 bg-derivhr-500 text-white rounded-lg font-bold text-sm hover:bg-derivhr-600 transition-all"
            >
              Create First Offer
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingOffers.map((offer) => (
              <div
                key={offer.id}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedEmployee(offer)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-derivhr-500 to-derivhr-600 rounded-xl flex items-center justify-center text-white font-bold">
                    {offer.employee_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{offer.employee_name}</span>
                      {getStatusBadge(offer.status)}
                      {offer.days_until_expiry !== undefined && offer.days_until_expiry <= 2 && offer.status === 'offer_pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          <AlertCircle size={10} />
                          Expiring Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {offer.position} • {offer.department} • {offer.jurisdiction === 'MY' ? '🇲🇾' : '🇸🇬'}
                    </p>
                    <p className="text-xs text-slate-400">{offer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">
                      {offer.jurisdiction === 'MY' ? 'RM' : 'SGD'} {offer.salary?.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">Start: {offer.start_date || 'TBD'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {offer.status === 'offer_pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendReminder(offer);
                        }}
                        disabled={sendingReminder}
                        className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                        title="Send Reminder"
                      >
                        <Bell size={18} />
                      </button>
                    )}
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewOfferModal && (
        <NewOfferModal
          onClose={() => setShowNewOfferModal(false)}
          onSuccess={() => {
            setShowNewOfferModal(false);
            fetchData();
          }}
        />
      )}

      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
};

const NewOfferModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    nric: '',
    jurisdiction: 'MY',
    position: '',
    department: '',
    salary: '',
    start_date: '',
    probation_months: 3,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/multiagent/onboarding/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_data: {
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            nric: formData.nric,
            jurisdiction: formData.jurisdiction,
          },
          offer_details: {
            position: formData.position,
            department: formData.department,
            salary: parseFloat(formData.salary) || 0,
            start_date: formData.start_date,
            probation_months: formData.probation_months,
          },
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create offer');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="h-1.5 bg-gradient-to-r from-derivhr-500 to-derivhr-400"></div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900">Create New Offer</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500"
                  placeholder="+60123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Jurisdiction *</label>
                <select
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500"
                >
                  <option value="MY">🇲🇾 Malaysia</option>
                  <option value="SG">🇸🇬 Singapore</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">NRIC</label>
                <input
                  type="text"
                  value={formData.nric}
                  onChange={(e) => setFormData({ ...formData, nric: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500"
                  placeholder="910101-14-1234"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Position *</label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500"
                  placeholder="Software Engineer"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500"
                  placeholder="Engineering"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Salary *</label>
                <input
                  type="number"
                  required
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500"
                  placeholder="5000"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold hover:from-derivhr-600 hover:to-derivhr-700 transition-all shadow-lg shadow-derivhr-500/20 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Offer & Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const EmployeeDetailModal: React.FC<{
  employee: OnboardingState;
  onClose: () => void;
  onRefresh: () => void;
}> = ({ employee, onClose, onRefresh }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
        <div className="h-1.5 bg-gradient-to-r from-derivhr-500 to-derivhr-400"></div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-900">{employee.employee_name}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Email</p>
                <p className="text-sm font-medium text-slate-800">{employee.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Position</p>
                <p className="text-sm font-medium text-slate-800">{employee.position}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Department</p>
                <p className="text-sm font-medium text-slate-800">{employee.department || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Status</p>
                <p className="text-sm font-medium text-slate-800 capitalize">{employee.status.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Offer Details</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Salary:</span>{' '}
                  <span className="font-bold">{employee.jurisdiction === 'MY' ? 'RM' : 'SGD'} {employee.salary?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Start:</span>{' '}
                  <span className="font-bold">{employee.start_date || 'TBD'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Close
              </button>
              <a
                href={`/employee/offer/${employee.offer_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 bg-derivhr-500 text-white rounded-xl font-bold text-center hover:bg-derivhr-600 transition-all"
              >
                View Offer Page
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HROnboardingDashboard;
