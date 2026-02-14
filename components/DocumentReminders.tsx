import React, { useState } from 'react';
import {
  FileWarning,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Send,
  Edit3,
  RefreshCw,
  Calendar,
  MapPin,
  Hash,
  FileText,
  Briefcase,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EmployeeDocumentGroup, DocumentExpiryStatus, DocumentInfo } from '../types';
import {
  MOCK_EMPLOYEE_DOCUMENTS,
  MOCK_DOCUMENT_EXPIRY_TREND,
} from '../constants';
import { Card } from './design-system/Card';
import { Heading, Text } from './design-system/Typography';

type FilterTab = 'all' | 'expiring_soon' | 'expired' | 'valid';

const statusConfig: Record<DocumentExpiryStatus, { label: string; className: string }> = {
  valid:        { label: 'Valid',      className: 'bg-jade-100 text-jade-700' },
  expiring_90:  { label: '< 90 Days', className: 'bg-yellow-100 text-yellow-700' },
  expiring_60:  { label: '< 60 Days', className: 'bg-amber-100 text-amber-700' },
  expiring_30:  { label: '< 30 Days', className: 'bg-orange-100 text-orange-700' },
  expired:      { label: 'Expired',   className: 'bg-red-100 text-red-700' },
};

const immigrationTypeLabels: Record<string, string> = {
  passport: 'Passport',
  visa: 'Visa',
  employment_pass: 'Employment Pass',
  work_permit: 'Work Permit',
};

/** Return the worst (most urgent) status from an employee's documents. */
function getWorstStatus(emp: EmployeeDocumentGroup): DocumentExpiryStatus {
  const order: DocumentExpiryStatus[] = ['expired', 'expiring_30', 'expiring_60', 'expiring_90', 'valid'];
  const statuses = [emp.contract.computed_status];
  if (emp.immigration) statuses.push(emp.immigration.computed_status);
  for (const s of order) {
    if (statuses.includes(s)) return s;
  }
  return 'valid';
}

/** Collect all individual documents from all employees for counting. */
function getAllDocs(employees: EmployeeDocumentGroup[]): DocumentInfo[] {
  const docs: DocumentInfo[] = [];
  for (const emp of employees) {
    docs.push(emp.contract);
    if (emp.immigration) docs.push(emp.immigration);
  }
  return docs;
}

export const DocumentReminders: React.FC = () => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const employees: EmployeeDocumentGroup[] = MOCK_EMPLOYEE_DOCUMENTS;
  const allDocs = getAllDocs(employees);

  const totalTracked = allDocs.length;
  const expiredCount = allDocs.filter(d => d.computed_status === 'expired').length;
  const expiringSoonCount = allDocs.filter(d => d.computed_status.startsWith('expiring')).length;
  const validCount = allDocs.filter(d => d.computed_status === 'valid').length;

  const filteredEmployees = employees.filter(emp => {
    const worst = getWorstStatus(emp);
    if (filter === 'expiring_soon' && !worst.startsWith('expiring')) return false;
    if (filter === 'expired' && worst !== 'expired') return false;
    if (filter === 'valid' && worst !== 'valid') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        emp.employee_name.toLowerCase().includes(q) ||
        emp.employee_department.toLowerCase().includes(q) ||
        emp.employee_position.toLowerCase().includes(q) ||
        emp.contract.document_number.toLowerCase().includes(q) ||
        (emp.immigration?.document_number.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const getDaysLabel = (days: number) => {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today';
    return `${days}d`;
  };

  const getDaysColor = (days: number) => {
    if (days < 0) return 'text-red-600 font-black';
    if (days <= 30) return 'text-orange-600 font-bold';
    if (days <= 60) return 'text-amber-600 font-bold';
    if (days <= 90) return 'text-yellow-600';
    return 'text-jade-600';
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <Heading level="h1" className="mb-2">Document Reminders</Heading>
        <Text variant="muted" weight="medium">
          Track employee contract and immigration document expirations.
        </Text>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Text variant="muted" size="sm" weight="medium">Total Tracked</Text>
              <Heading level="h3" className="mt-1 !text-2xl">{totalTracked}</Heading>
            </div>
            <div className="p-2 rounded-lg bg-derivhr-50 text-derivhr-500">
              <FileWarning size={20} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500">{employees.length} employees</span>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Text variant="muted" size="sm" weight="medium">Expiring Soon</Text>
              <Heading level="h3" className="mt-1 !text-2xl">{expiringSoonCount}</Heading>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-500">
              <Clock size={20} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-amber-600">Within 90 days</span>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Text variant="muted" size="sm" weight="medium">Expired</Text>
              <Heading level="h3" className="mt-1 !text-2xl">{expiredCount}</Heading>
            </div>
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-red-600">Requires action</span>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Text variant="muted" size="sm" weight="medium">Valid</Text>
              <Heading level="h3" className="mt-1 !text-2xl">{validCount}</Heading>
            </div>
            <div className="p-2 rounded-lg bg-jade-50 text-jade-500">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-jade-500">All clear</span>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card noPadding className="lg:col-span-2">
          <div className="p-6 pb-2">
            <Heading level="h4" className="!text-sm mb-1">Upcoming Expirations</Heading>
            <Text variant="muted" size="sm" className="!text-xs">Number of documents expiring per month</Text>
          </div>
          <div className="px-4 pb-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_DOCUMENT_EXPIRY_TREND} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="count" name="Expiring" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Breakdown by type */}
        <Card>
          <Heading level="h4" className="!text-sm mb-1">By Document Type</Heading>
          <Text variant="muted" size="sm" className="!text-xs mb-5">Contracts vs immigration documents</Text>
          <div className="space-y-4">
            {([
              { key: 'contract' as const, label: 'Employment Contracts', color: 'bg-derivhr-500' },
              { key: 'immigration' as const, label: 'Immigration Documents', color: 'bg-blue-500' },
            ]).map(({ key, label, color }) => {
              const docs = key === 'contract'
                ? employees.map(e => e.contract)
                : employees.filter(e => e.immigration).map(e => e.immigration!);
              const count = docs.length;
              const expiring = docs.filter(d => d.computed_status !== 'valid').length;
              const percentage = totalTracked > 0 ? Math.round((count / totalTracked) * 100) : 0;
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{label}</span>
                    <div className="flex items-center space-x-2">
                      {expiring > 0 && (
                        <span className="text-[10px] font-bold text-amber-600">{expiring} expiring</span>
                      )}
                      <span className="text-xs font-black text-slate-500">{count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${expiring > 0 ? 'bg-amber-400' : color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Employee Table */}
      <Card noPadding>
        <div className="p-6 pb-4">
          <Heading level="h4" className="!text-sm mb-4">Document Tracker</Heading>

          {/* Filter Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {([
                { key: 'all', label: 'All' },
                { key: 'expiring_soon', label: 'Expiring Soon' },
                { key: 'expired', label: 'Expired' },
                { key: 'valid', label: 'Valid' },
              ] as { key: FilterTab; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    filter === tab.key
                      ? 'bg-white text-derivhr-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, department, or doc number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-300"
              />
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="px-6 py-3 bg-slate-50 border-y border-slate-100 grid grid-cols-12 gap-4 items-center">
          <span className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</span>
          <span className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contract Expiry</span>
          <span className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Immigration Doc</span>
          <span className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Immigration Expiry</span>
          <span className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
          <span className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {filteredEmployees.length === 0 && (
            <div className="p-12 text-center">
              <Text variant="muted" size="sm">No employees match your filter.</Text>
            </div>
          )}
          {filteredEmployees.map(emp => {
            const isExpanded = expandedId === emp.employee_id;
            const worst = getWorstStatus(emp);
            const sConfig = statusConfig[worst];

            return (
              <div key={emp.employee_id}>
                {/* Clickable row — entire row toggles expand */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : emp.employee_id)}
                  className="w-full px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {/* Employee */}
                  <div className="col-span-3 flex items-center space-x-3">
                    <div className="w-9 h-9 bg-derivhr-100 rounded-lg flex items-center justify-center text-derivhr-600 font-bold text-sm flex-shrink-0">
                      {emp.employee_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{emp.employee_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{emp.employee_position} &middot; {emp.employee_department}</p>
                    </div>
                  </div>

                  {/* Contract Expiry */}
                  <div className="col-span-2">
                    <span className="text-sm text-slate-600">{emp.contract.expiry_date}</span>
                    <p className={`text-xs ${getDaysColor(emp.contract.days_until_expiry)}`}>
                      {getDaysLabel(emp.contract.days_until_expiry)}
                    </p>
                  </div>

                  {/* Immigration Doc Type */}
                  <div className="col-span-2">
                    {emp.immigration ? (
                      <>
                        <span className="text-sm text-slate-600">{immigrationTypeLabels[emp.immigration.document_type] || emp.immigration.document_type}</span>
                        <p className="text-[10px] text-slate-400">{emp.immigration.document_number}</p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">N/A (local)</span>
                    )}
                  </div>

                  {/* Immigration Expiry */}
                  <div className="col-span-2">
                    {emp.immigration ? (
                      <>
                        <span className="text-sm text-slate-600">{emp.immigration.expiry_date}</span>
                        <p className={`text-xs ${getDaysColor(emp.immigration.days_until_expiry)}`}>
                          {getDaysLabel(emp.immigration.days_until_expiry)}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">&mdash;</span>
                    )}
                  </div>

                  {/* Worst Status */}
                  <div className="col-span-1">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${sConfig.className}`}>
                      {sConfig.label}
                    </span>
                  </div>

                  {/* Actions — stopPropagation so clicks don't toggle expand */}
                  <div className="col-span-2 flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => alert(`Reminder sent to ${emp.employee_name} regarding document renewals.`)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"
                      title="Send Reminder"
                    >
                      <Send size={14} />
                    </button>
                    <button
                      onClick={() => alert(`Edit documents for ${emp.employee_name}`)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => alert(`Mark documents as renewed for ${emp.employee_name}.`)}
                      className="p-1.5 rounded-lg hover:bg-jade-50 text-slate-400 hover:text-jade-500 transition-colors"
                      title="Mark as Renewed"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded Detail — contract + immigration side by side */}
                {isExpanded && (
                  <div className="px-6 pb-6 bg-slate-50/50 border-t border-slate-100">
                    <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Contract Details */}
                      <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="p-1.5 bg-derivhr-50 rounded-lg">
                            <Briefcase size={14} className="text-derivhr-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-700">Employment Contract</span>
                          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${statusConfig[emp.contract.computed_status].className}`}>
                            {statusConfig[emp.contract.computed_status].label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center space-x-1 mb-1">
                              <Hash size={12} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400">Contract No.</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800">{emp.contract.document_number}</p>
                          </div>
                          <div>
                            <div className="flex items-center space-x-1 mb-1">
                              <Calendar size={12} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400">Issue Date</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800">{emp.contract.issue_date}</p>
                          </div>
                          <div>
                            <div className="flex items-center space-x-1 mb-1">
                              <Calendar size={12} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400">Expiry Date</span>
                            </div>
                            <p className={`text-sm font-bold ${getDaysColor(emp.contract.days_until_expiry)}`}>{emp.contract.expiry_date}</p>
                          </div>
                          <div>
                            <div className="flex items-center space-x-1 mb-1">
                              <MapPin size={12} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400">Issued By</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800">{emp.contract.issuing_authority}</p>
                          </div>
                        </div>
                        {emp.contract.notes && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center space-x-1 mb-1">
                              <FileText size={12} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400">Notes</span>
                            </div>
                            <p className="text-sm text-slate-600">{emp.contract.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Immigration Document Details */}
                      <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="p-1.5 bg-blue-50 rounded-lg">
                            <MapPin size={14} className="text-blue-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-700">
                            {emp.immigration?.document_type === 'passport' ? 'Passport' : 'Immigration Document'}
                          </span>
                          {emp.immigration && (
                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${statusConfig[emp.immigration.computed_status].className}`}>
                              {statusConfig[emp.immigration.computed_status].label}
                            </span>
                          )}
                        </div>
                        {emp.immigration ? (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex items-center space-x-1 mb-1">
                                  <Hash size={12} className="text-slate-400" />
                                  <span className="text-[10px] font-bold text-slate-400">{immigrationTypeLabels[emp.immigration.document_type]} No.</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800">{emp.immigration.document_number}</p>
                              </div>
                              <div>
                                <div className="flex items-center space-x-1 mb-1">
                                  <Calendar size={12} className="text-slate-400" />
                                  <span className="text-[10px] font-bold text-slate-400">Issue Date</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800">{emp.immigration.issue_date}</p>
                              </div>
                              <div>
                                <div className="flex items-center space-x-1 mb-1">
                                  <Calendar size={12} className="text-slate-400" />
                                  <span className="text-[10px] font-bold text-slate-400">Expiry Date</span>
                                </div>
                                <p className={`text-sm font-bold ${getDaysColor(emp.immigration.days_until_expiry)}`}>{emp.immigration.expiry_date}</p>
                              </div>
                              <div>
                                <div className="flex items-center space-x-1 mb-1">
                                  <MapPin size={12} className="text-slate-400" />
                                  <span className="text-[10px] font-bold text-slate-400">Issued By</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800">{emp.immigration.issuing_authority}</p>
                              </div>
                            </div>
                            {emp.immigration.notes && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="flex items-center space-x-1 mb-1">
                                  <FileText size={12} className="text-slate-400" />
                                  <span className="text-[10px] font-bold text-slate-400">Notes</span>
                                </div>
                                <p className="text-sm text-slate-600">{emp.immigration.notes}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-24 text-slate-400">
                            <Text variant="muted" size="sm">No immigration document — local employee</Text>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
