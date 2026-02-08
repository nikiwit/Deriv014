import React, { useState } from 'react';
import { MOCK_LEAVE_BALANCES, MOCK_LEAVE_REQUESTS, PUBLIC_HOLIDAYS_MY } from '../constants';
import { LeaveRequest, LeaveType } from '../types';
import { Calendar, CheckCircle2, XCircle, Clock, Plane, Plus, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { Card } from './design-system/Card';
import { Heading, Text } from './design-system/Typography';
import { Badge } from './design-system/Badge';
import { Button } from './design-system/Button';

export const LeaveManagement: React.FC = () => {
    const [view, setView] = useState<'my_leave' | 'approvals'>('my_leave');
    const [balances, setBalances] = useState(MOCK_LEAVE_BALANCES);
    const [requests, setRequests] = useState(MOCK_LEAVE_REQUESTS);
    const [showApplyModal, setShowApplyModal] = useState(false);
    
    const [leaveType, setLeaveType] = useState<LeaveType>('Annual');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [yearsOfService, setYearsOfService] = useState(3);

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
        setBalances(prev => prev.map(b => b.type === leaveType ? { ...b, pending: b.pending + days } : b));
        
        setShowApplyModal(false);
        setReason('');
        setStartDate('');
        setEndDate('');
    };

    const handleApproval = (id: string, approved: boolean) => {
        setRequests(prev => prev.map(req => req.id === id ? { ...req, status: approved ? 'Approved' : 'Rejected' } : req));
    };

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
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <Heading level="h1" className="mb-2">Leave Management</Heading>
                    <Text variant="muted" weight="medium">
                        Global leave tracking with Malaysian Statutory Compliance (EA 1955) built-in.
                    </Text>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button 
                        onClick={() => setView('my_leave')}
                        className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'my_leave' ? 'bg-white text-derivhr-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        My Leave
                    </button>
                    <button 
                        onClick={() => setView('approvals')}
                        className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'approvals' ? 'bg-white text-derivhr-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Approvals <Badge variant="destructive" className="ml-1 px-1.5 min-w-[18px] h-[18px] flex items-center justify-center !text-[9px]">{requests.filter(r => r.status === 'Pending' && r.employeeName !== 'Ali Ahmad (You)').length}</Badge>
                    </button>
                </div>
            </div>

            {view === 'my_leave' && (
                <>
                    {/* Simulator Controls */}
                    <Card className="bg-derivhr-50 border-derivhr-100 p-4">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <Info className="text-derivhr-500" size={20} />
                                </div>
                                <div>
                                    <Text weight="bold" size="sm" className="!text-derivhr-900 uppercase tracking-wider">Compliance Simulator</Text>
                                    <Text size="sm" className="!text-derivhr-700">Adjust service years to see EA 1955 entitlement changes.</Text>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4 bg-white p-2 px-4 rounded-xl shadow-sm border border-derivhr-100">
                                <Text weight="bold" size="xs" className="uppercase tracking-widest text-slate-400">Tenure</Text>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="10" 
                                    step="1" 
                                    value={yearsOfService}
                                    onChange={(e) => recalcEntitlement(parseInt(e.target.value))}
                                    className="accent-derivhr-500 w-32"
                                />
                                <Badge variant="secondary" className="px-3 py-1 text-sm font-bold">{yearsOfService} Yrs</Badge>
                            </div>
                         </div>
                    </Card>

                    {/* Balances */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {balances.slice(0,3).map((bal) => (
                            <Card key={bal.type} className="relative overflow-hidden group hover:shadow-md transition-all border-slate-200">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                    <Plane size={80} className="text-derivhr-500" />
                                </div>
                                <Text variant="muted" weight="bold" size="xs" className="uppercase tracking-widest mb-3">{bal.type} Leave</Text>
                                <div className="flex items-end space-x-2 mb-4">
                                    <span className="text-4xl font-bold text-slate-900 tracking-tight">{bal.entitled - bal.taken}</span>
                                    <Text weight="semibold" size="sm" className="mb-1 !text-slate-400 uppercase tracking-wider">/ {bal.entitled} Left</Text>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${bal.type === 'Annual' ? 'bg-derivhr-500' : bal.type === 'Sick' ? 'bg-jade-500' : 'bg-purple-500'}`} 
                                        style={{ width: `${((bal.entitled - bal.taken) / bal.entitled) * 100}%` }}
                                    ></div>
                                </div>
                                {bal.pending > 0 && (
                                    <Badge variant="warning" className="mt-4 w-full justify-center py-1 font-bold">
                                        {bal.pending} days pending approval
                                    </Badge>
                                )}
                            </Card>
                        ))}
                    </div>

                    <div className="flex justify-between items-center">
                        <Heading level="h3" className="!text-lg">Recent History</Heading>
                        <Button 
                            onClick={() => setShowApplyModal(true)}
                            leftIcon={<Plus size={18} />}
                            className="font-bold"
                        >
                            Apply for Leave
                        </Button>
                    </div>

                    {/* My Requests List */}
                    <Card noPadding className="overflow-hidden border-slate-200">
                        <div className="divide-y divide-slate-100">
                            {requests.filter(r => r.employeeName === 'Ali Ahmad (You)').map(req => (
                                <div key={req.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-3 rounded-xl ${req.type === 'Annual' ? 'bg-derivhr-50 text-derivhr-500' : 'bg-jade-50 text-jade-500'}`}>
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <Text weight="bold" className="!text-slate-900">{req.type} Leave</Text>
                                            <Text size="sm" weight="medium" className="!text-slate-500">{req.startDate} to {req.endDate} • {req.days} days</Text>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <Badge variant={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'destructive' : 'warning'}>
                                            {req.status}
                                        </Badge>
                                        <Text size="xs" weight="medium" className="!text-slate-400">Requested: {req.requestDate}</Text>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}

            {view === 'approvals' && (
                <div className="space-y-6">
                    <Card noPadding className="overflow-hidden border-slate-200">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <Text weight="bold" size="sm" className="uppercase tracking-widest !text-slate-500">Pending Approvals</Text>
                            <Badge variant="secondary">Direct Reports</Badge>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {requests.filter(r => r.employeeName !== 'Ali Ahmad (You)').map(req => (
                                <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-start justify-between hover:bg-slate-50 transition-colors gap-6">
                                    <div className="flex items-start space-x-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-lg">
                                            {req.employeeName.charAt(0)}
                                        </div>
                                        <div className="space-y-1">
                                            <Text weight="bold" size="lg" className="!text-slate-900">{req.employeeName}</Text>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{req.type} Leave</Badge>
                                                <Text size="sm" weight="bold" className="!text-slate-500">{req.days} Days</Text>
                                            </div>
                                            <Text size="xs" weight="medium" className="!text-slate-400">{req.startDate} - {req.endDate}</Text>
                                            <div className="mt-3 bg-white p-4 rounded-xl text-sm text-slate-600 italic border border-slate-200 shadow-sm leading-relaxed max-w-lg">
                                                "{req.reason}"
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 self-end md:self-center">
                                        {req.status === 'Pending' ? (
                                            <>
                                                <Button 
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleApproval(req.id, false)}
                                                    className="hover:!text-red-600 hover:!border-red-200"
                                                >
                                                    Reject
                                                </Button>
                                                <Button 
                                                    size="sm"
                                                    onClick={() => handleApproval(req.id, true)}
                                                >
                                                    Approve
                                                </Button>
                                            </>
                                        ) : (
                                            <Badge variant={req.status === 'Approved' ? 'success' : 'destructive'} className="px-4 py-1.5 text-sm uppercase">
                                                {req.status}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Apply Modal */}
            {showApplyModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card noPadding className="w-full max-w-lg overflow-hidden border-0 shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <Heading level="h3" className="!text-lg">New Leave Request</Heading>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <Text weight="bold" size="sm" className="!text-slate-700">Leave Type</Text>
                                <select 
                                    value={leaveType} 
                                    onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                                    className="w-full bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-semibold text-sm appearance-none"
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
                                <div className="space-y-1.5">
                                    <Text weight="bold" size="sm" className="!text-slate-700">Start Date</Text>
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-semibold text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Text weight="bold" size="sm" className="!text-slate-700">End Date</Text>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-semibold text-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Text weight="bold" size="sm" className="!text-slate-700">Reason</Text>
                                <textarea 
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none resize-none font-medium text-sm"
                                    placeholder="Brief description..."
                                />
                            </div>
                            
                            <div className="bg-derivhr-50 p-4 rounded-xl border border-derivhr-100 flex justify-between items-center shadow-inner">
                                <Text weight="bold" size="xs" className="!text-derivhr-700 uppercase tracking-widest">Available Balance</Text>
                                <Text weight="bold" size="lg" className="!text-derivhr-600">
                                    {balances.find(b => b.type === leaveType)?.entitled! - balances.find(b => b.type === leaveType)?.taken!} Days
                                </Text>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex space-x-3 bg-slate-50/50">
                            <Button variant="ghost" onClick={() => setShowApplyModal(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleApply}
                                disabled={!startDate || !endDate}
                                className="flex-1 font-bold"
                            >
                                Submit Request
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};