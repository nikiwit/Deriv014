import React, { useState } from 'react';
import { MOCK_LEAVE_BALANCES, MOCK_LEAVE_REQUESTS, PUBLIC_HOLIDAYS_MY } from '../constants';
import { LeaveRequest, LeaveType } from '../types';
import { Calendar, CheckCircle2, XCircle, Clock, Plane, Plus, ChevronRight, AlertCircle, Info } from 'lucide-react';

export const LeaveManagement: React.FC = () => {
    const [view, setView] = useState<'my_leave' | 'approvals'>('my_leave');
    const [balances, setBalances] = useState(MOCK_LEAVE_BALANCES);
    const [requests, setRequests] = useState(MOCK_LEAVE_REQUESTS);
    const [showApplyModal, setShowApplyModal] = useState(false);
    
    // Application Form State
    const [leaveType, setLeaveType] = useState<LeaveType>('Annual');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [yearsOfService, setYearsOfService] = useState(3); // Default to 3 years for demo logic

    const handleApply = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const newRequest: LeaveRequest = {
            id: Date.now().toString(),
            employeeName: 'Ali Ahmad (You)',
            type: leaveType,
            startDate,
            endDate,
            days,
            reason,
            status: 'Pending',
            requestDate: new Date().toISOString().split('T')[0]
        };

        setRequests([newRequest, ...requests]);
        
        // Update pending balance locally for display
        setBalances(prev => prev.map(b => b.type === leaveType ? { ...b, pending: b.pending + days } : b));
        
        setShowApplyModal(false);
        setReason('');
        setStartDate('');
        setEndDate('');
    };

    const handleApproval = (id: string, approved: boolean) => {
        setRequests(prev => prev.map(req => req.id === id ? { ...req, status: approved ? 'Approved' : 'Rejected' } : req));
    };

    // Malaysian EA 1955 Statutory Logic Helper
    const getStatutoryEntitlement = (type: LeaveType, years: number) => {
        if (type === 'Annual') {
            if (years < 2) return 8;
            if (years < 5) return 12;
            return 16;
        }
        if (type === 'Sick') {
            if (years < 2) return 14;
            if (years < 5) return 18;
            return 22;
        }
        if (type === 'Hospitalization') return 60;
        if (type === 'Maternity') return 98;
        if (type === 'Paternity') return 7;
        return 0;
    };

    const recalcEntitlement = (years: number) => {
        setYearsOfService(years);
        setBalances(prev => prev.map(b => ({
            ...b,
            entitled: getStatutoryEntitlement(b.type, years)
        })));
    };

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">E-Leave Management</h1>
                    <p className="text-slate-500">
                        Global leave tracking with Malaysian Statutory Compliance (EA 1955) built-in.
                    </p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setView('my_leave')}
                        className={`px-4 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${view === 'my_leave' ? 'bg-white text-derivhr-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        My Leave
                    </button>
                    <button 
                        onClick={() => setView('approvals')}
                        className={`px-4 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${view === 'approvals' ? 'bg-white text-derivhr-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Approvals <span className="ml-1 bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full">{requests.filter(r => r.status === 'Pending' && r.employeeName !== 'Ali Ahmad (You)').length}</span>
                    </button>
                </div>
            </div>

            {view === 'my_leave' && (
                <>
                    {/* Simulator Controls */}
                    <div className="bg-derivhr-50 border border-derivhr-100 p-4 rounded-xl flex items-center justify-between">
                         <div className="flex items-center space-x-2">
                             <Info className="text-derivhr-500" size={20} />
                             <span className="text-xs text-derivhr-900 font-black uppercase tracking-wider">Compliance Simulator</span>
                             <span className="text-xs text-derivhr-600 font-medium">Adjust service years to see EA 1955 entitlement changes.</span>
                         </div>
                         <div className="flex items-center space-x-3">
                             <span className="text-[10px] font-black text-derivhr-800 uppercase tracking-widest">Years of Service</span>
                             <input 
                                type="range" 
                                min="0" 
                                max="10" 
                                step="1" 
                                value={yearsOfService}
                                onChange={(e) => recalcEntitlement(parseInt(e.target.value))}
                                className="accent-derivhr-500 w-32"
                             />
                             <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-derivhr-200 text-derivhr-600 shadow-inner">{yearsOfService} Yrs</span>
                         </div>
                    </div>

                    {/* Balances */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {balances.slice(0,3).map((bal) => (
                            <div key={bal.type} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                    <Plane size={80} className="text-derivhr-500" />
                                </div>
                                <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">{bal.type} Leave</h3>
                                <div className="flex items-end space-x-2 mb-4">
                                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{bal.entitled - bal.taken}</span>
                                    <span className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-wider">/ {bal.entitled} Left</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${bal.type === 'Annual' ? 'bg-derivhr-500' : bal.type === 'Sick' ? 'bg-jade-500' : 'bg-purple-500'}`} 
                                        style={{ width: `${((bal.entitled - bal.taken) / bal.entitled) * 100}%` }}
                                    ></div>
                                </div>
                                {bal.pending > 0 && (
                                    <p className="text-[10px] text-amber-600 mt-2 font-black uppercase tracking-wider">
                                        {bal.pending} days pending
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-end">
                        <button 
                            onClick={() => setShowApplyModal(true)}
                            className="flex items-center space-x-2 px-6 py-3 bg-derivhr-500 hover:bg-derivhr-600 text-white rounded-xl shadow-lg shadow-derivhr-500/20 transition-all font-black uppercase tracking-widest text-xs"
                        >
                            <Plus size={18} />
                            <span>Apply for Leave</span>
                        </button>
                    </div>

                    {/* My Requests List */}
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">My Leave History</h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {requests.filter(r => r.employeeName === 'Ali Ahmad (You)').map(req => (
                                <div key={req.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-2.5 rounded-xl ${req.type === 'Annual' ? 'bg-derivhr-50 text-derivhr-500' : 'bg-jade-50 text-jade-500'}`}>
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 tracking-tight text-sm">{req.type} Leave</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">{req.startDate} to {req.endDate} ({req.days} days)</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                            req.status === 'Approved' ? 'bg-jade-100 text-jade-700' : 
                                            req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {req.status}
                                        </span>
                                        <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase tracking-tight">Requested: {req.requestDate}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {view === 'approvals' && (
                <div className="space-y-6">
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Pending Approvals</h3>
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Direct Reports</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {requests.filter(r => r.employeeName !== 'Ali Ahmad (You)').map(req => (
                                <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start space-x-4 mb-4 md:mb-0">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm shadow-inner">
                                            {req.employeeName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 tracking-tight">{req.employeeName}</p>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{req.type} Leave • {req.days} Days</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium">{req.startDate} - {req.endDate}</p>
                                            <div className="mt-2 bg-white p-3 rounded-xl text-xs text-slate-600 italic border border-slate-100 shadow-sm leading-relaxed">
                                                "{req.reason}"
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        {req.status === 'Pending' ? (
                                            <>
                                                <button 
                                                    onClick={() => handleApproval(req.id, false)}
                                                    className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-red-600 transition-all shadow-sm"
                                                >
                                                    Reject
                                                </button>
                                                <button 
                                                    onClick={() => handleApproval(req.id, true)}
                                                    className="px-4 py-2 bg-derivhr-500 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-derivhr-600 shadow-lg shadow-derivhr-500/20 transition-all"
                                                >
                                                    Approve
                                                </button>
                                            </>
                                        ) : (
                                            <span className={`font-black uppercase text-xs tracking-widest ${req.status === 'Approved' ? 'text-jade-600' : 'text-red-600'}`}>
                                                {req.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Apply Modal */}
            {showApplyModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase text-sm tracking-widest">New Leave Request</h3>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Leave Type</label>
                                <select 
                                    value={leaveType} 
                                    onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-bold text-sm appearance-none"
                                >
                                    <option value="Annual">Annual Leave</option>
                                    <option value="Sick">Sick Leave</option>
                                    <option value="Hospitalization">Hospitalization</option>
                                    <option value="Maternity">Maternity</option>
                                    <option value="Paternity">Paternity</option>
                                    <option value="Unpaid">Unpaid Leave</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Start Date</label>
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-bold text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">End Date</label>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-bold text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Reason</label>
                                <textarea 
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none resize-none font-medium text-sm"
                                    placeholder="Brief description..."
                                />
                            </div>
                            
                            {/* Entitlement Check */}
                            <div className="bg-derivhr-50 p-4 rounded-xl border border-derivhr-100 text-xs flex justify-between items-center">
                                <span className="text-derivhr-700 font-bold uppercase tracking-wider">Available Balance:</span>
                                <span className="font-black text-derivhr-600 text-lg">
                                    {balances.find(b => b.type === leaveType)?.entitled! - balances.find(b => b.type === leaveType)?.taken!} Days
                                </span>
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-50 flex space-x-4 bg-slate-50/50">
                            <button 
                                onClick={() => setShowApplyModal(false)}
                                className="flex-1 py-3 text-slate-500 hover:bg-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all border border-transparent hover:border-slate-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleApply}
                                disabled={!startDate || !endDate}
                                className="flex-1 py-3 bg-derivhr-500 text-white hover:bg-derivhr-600 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-derivhr-500/30 transition-all disabled:opacity-50"
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};