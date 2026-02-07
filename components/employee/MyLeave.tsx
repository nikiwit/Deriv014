import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LeaveType, LeaveRequest, LeaveBalance } from '../../types';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  X,
  Plane,
  Stethoscope,
  Baby,
  Heart
} from 'lucide-react';

const leaveTypeConfig: Record<LeaveType, { icon: React.ReactNode; color: string; bgColor: string }> = {
  Annual: { icon: <Plane size={16} />, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  Sick: { icon: <Stethoscope size={16} />, color: 'text-red-500', bgColor: 'bg-red-50' },
  Hospitalization: { icon: <Heart size={16} />, color: 'text-pink-500', bgColor: 'bg-pink-50' },
  Maternity: { icon: <Baby size={16} />, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  Paternity: { icon: <Baby size={16} />, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
  Unpaid: { icon: <Calendar size={16} />, color: 'text-slate-500', bgColor: 'bg-slate-50' },
};

export const MyLeave: React.FC = () => {
  const { user } = useAuth();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedType, setSelectedType] = useState<LeaveType>('Annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Mock data
  const [balances] = useState<LeaveBalance[]>([
    { type: 'Annual', entitled: 12, taken: 4, pending: 2 },
    { type: 'Sick', entitled: 18, taken: 2, pending: 0 },
    { type: 'Hospitalization', entitled: 60, taken: 0, pending: 0 },
  ]);

  const [requests, setRequests] = useState<LeaveRequest[]>([
    { id: '1', employeeName: user?.firstName + ' ' + user?.lastName || '', type: 'Annual', startDate: '2024-03-15', endDate: '2024-03-17', days: 3, reason: 'Family vacation', status: 'Pending', requestDate: '2024-02-20' },
    { id: '2', employeeName: user?.firstName + ' ' + user?.lastName || '', type: 'Sick', startDate: '2024-02-10', endDate: '2024-02-11', days: 2, reason: 'Flu', status: 'Approved', requestDate: '2024-02-10' },
    { id: '3', employeeName: user?.firstName + ' ' + user?.lastName || '', type: 'Annual', startDate: '2024-01-02', endDate: '2024-01-03', days: 2, reason: 'Personal matters', status: 'Approved', requestDate: '2023-12-20' },
  ]);

  const handleApply = () => {
    if (!startDate || !endDate || !reason) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const newRequest: LeaveRequest = {
      id: Date.now().toString(),
      employeeName: user?.firstName + ' ' + user?.lastName || '',
      type: selectedType,
      startDate,
      endDate,
      days,
      reason,
      status: 'Pending',
      requestDate: new Date().toISOString().split('T')[0],
    };

    setRequests([newRequest, ...requests]);
    setShowApplyModal(false);
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">My Leave</h1>
          <p className="text-slate-500 font-medium">Manage your leave requests and balances</p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-jade-500 text-white rounded-xl font-bold hover:bg-jade-600 transition-all shadow-lg shadow-jade-500/20"
        >
          <Plus size={18} />
          <span>Apply Leave</span>
        </button>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {balances.map((balance) => {
          const remaining = balance.entitled - balance.taken - balance.pending;
          const config = leaveTypeConfig[balance.type];

          return (
            <div key={balance.type} className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 ${config.bgColor} rounded-xl ${config.color}`}>
                  {config.icon}
                </div>
                <span className="font-bold text-slate-800">{balance.type} Leave</span>
              </div>

              <div className="flex items-end space-x-2 mb-4">
                <span className="text-4xl font-black text-slate-900">{remaining}</span>
                <span className="text-slate-400 font-bold text-sm mb-1">/ {balance.entitled} days</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-jade-500 rounded-full"
                  style={{ width: `${(remaining / balance.entitled) * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Taken: <strong className="text-slate-700">{balance.taken}</strong></span>
                <span className="text-amber-600">Pending: <strong>{balance.pending}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Leave History</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {requests.map((request) => {
            const config = leaveTypeConfig[request.type];

            return (
              <div key={request.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 ${config.bgColor} rounded-xl ${config.color}`}>
                    {config.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-bold text-slate-800">{request.type} Leave</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        request.status === 'Approved' ? 'bg-jade-100 text-jade-700' :
                        request.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {request.startDate} to {request.endDate} ({request.days} days)
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{request.reason}</p>
                  </div>

                  <div className="text-right">
                    {request.status === 'Approved' && <CheckCircle2 className="text-jade-500" size={20} />}
                    {request.status === 'Rejected' && <XCircle className="text-red-500" size={20} />}
                    {request.status === 'Pending' && <Clock className="text-amber-500" size={20} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="h-1.5 bg-gradient-to-r from-jade-500 to-jade-400"></div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Apply for Leave</h3>
                <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Leave Type */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Leave Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as LeaveType)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-jade-500/20 focus:border-jade-500 outline-none font-medium"
                  >
                    <option value="Annual">Annual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Hospitalization">Hospitalization Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-jade-500/20 focus:border-jade-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-jade-500/20 focus:border-jade-500 outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Reason
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Brief description..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-jade-500/20 focus:border-jade-500 outline-none font-medium resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!startDate || !endDate || !reason}
                  className="flex-1 py-3 px-4 bg-jade-500 text-white rounded-xl font-bold hover:bg-jade-600 transition-all shadow-lg shadow-jade-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
