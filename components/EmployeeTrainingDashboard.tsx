import React, { useState } from 'react';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronUp,
  Circle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { EmployeeTrainingProgress, TrainingCategory } from '../types';
import {
  MOCK_TRAINING_COMPLETION_TREND,
  TRAINING_CATEGORY_CONFIG,
} from '../constants';
import { useTraining } from '../contexts/TrainingContext';
import { Card } from './design-system/Card';
import { Heading, Text } from './design-system/Typography';

type FilterTab = 'all' | 'in_progress' | 'completed' | 'overdue';

const statusConfig: Record<EmployeeTrainingProgress['status'], { label: string; className: string }> = {
  not_started: { label: 'Not Started', className: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  completed:   { label: 'Completed',   className: 'bg-jade-100 text-jade-700' },
  overdue:     { label: 'Overdue',     className: 'bg-red-100 text-red-700' },
};

export const EmployeeTrainingDashboard: React.FC = () => {
  const { getAllProgress } = useTraining();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const employees = getAllProgress();
  const totalEnrolled = employees.length;
  const completedCount = employees.filter(e => e.status === 'completed').length;
  const completionRate = Math.round((completedCount / totalEnrolled) * 100);
  const overdueCount = employees.filter(e => e.status === 'overdue').length;
  const avgProgress = Math.round(employees.reduce((sum, e) => sum + e.overallProgress, 0) / totalEnrolled);

  const filteredEmployees = employees.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.employeeName.toLowerCase().includes(q) || e.department.toLowerCase().includes(q) || e.role.toLowerCase().includes(q);
    }
    return true;
  });

  const getProgressBarColor = (progress: number, status: string) => {
    if (status === 'overdue') return 'bg-red-500';
    if (progress === 100) return 'bg-jade-500';
    if (progress >= 50) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const categoryOrder: TrainingCategory[] = ['it_systems', 'compliance', 'orientation', 'role_specific', 'soft_skills', 'security'];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <Heading level="h1" className="mb-2">Employee Training</Heading>
        <Text variant="muted" weight="medium">Track and manage employee training progress across your organization.</Text>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Text variant="muted" size="sm" weight="medium">Total Enrolled</Text>
              <Heading level="h3" className="mt-1 !text-2xl">{totalEnrolled}</Heading>
            </div>
            <div className="p-2 rounded-lg bg-derivhr-50 text-derivhr-500">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-jade-500">+2</span>
            <Text variant="muted" size="sm" className="!text-xs">new this month</Text>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Text variant="muted" size="sm" weight="medium">Completion Rate</Text>
              <Heading level="h3" className="mt-1 !text-2xl">{completionRate}%</Heading>
            </div>
            <div className="p-2 rounded-lg bg-jade-50 text-jade-500">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-jade-500">+5.2%</span>
            <Text variant="muted" size="sm" className="!text-xs">vs last month</Text>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Text variant="muted" size="sm" weight="medium">Overdue</Text>
              <Heading level="h3" className="mt-1 !text-2xl">{overdueCount}</Heading>
            </div>
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-red-600">+1</span>
            <Text variant="muted" size="sm" className="!text-xs">vs last month</Text>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Text variant="muted" size="sm" weight="medium">Avg Progress</Text>
              <Heading level="h3" className="mt-1 !text-2xl">{avgProgress}%</Heading>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
              <Clock size={20} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-jade-500">+8%</span>
            <Text variant="muted" size="sm" className="!text-xs">vs last month</Text>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion Trend Chart */}
        <Card noPadding className="lg:col-span-2">
          <div className="p-6 pb-2">
            <Heading level="h4" className="!text-sm mb-1">Training Completion Trend</Heading>
            <Text variant="muted" size="sm" className="!text-xs">Monthly breakdown of training progress</Text>
          </div>
          <div className="px-4 pb-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_TRAINING_COMPLETION_TREND} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="completed" name="Completed" fill="#00B67B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inProgress" name="In Progress" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" name="Overdue" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <Heading level="h4" className="!text-sm mb-1">By Category</Heading>
          <Text variant="muted" size="sm" className="!text-xs mb-5">Average completion per category</Text>
          <div className="space-y-4">
            {categoryOrder.map(catId => {
              const config = TRAINING_CATEGORY_CONFIG[catId];
              // Calculate avg completion across all employees for this category
              const avgCatProgress = Math.round(
                employees.reduce((sum, emp) => {
                  const catItems = emp.items.filter(i => i.category === catId);
                  if (catItems.length === 0) return sum;
                  const catCompleted = catItems.filter(i => i.status === 'completed').length;
                  return sum + (catCompleted / catItems.length) * 100;
                }, 0) / employees.length
              );
              return (
                <div key={catId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 ${config.color} rounded text-white`}>
                        {config.icon}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{config.label}</span>
                    </div>
                    <span className="text-xs font-black text-slate-500">{avgCatProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${avgCatProgress === 100 ? 'bg-jade-500' : config.color}`}
                      style={{ width: `${avgCatProgress}%` }}
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
          <Heading level="h4" className="!text-sm mb-4">Employee Progress</Heading>

          {/* Filter Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {([
                { key: 'all', label: 'All' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'completed', label: 'Completed' },
                { key: 'overdue', label: 'Overdue' },
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
                placeholder="Search employees..."
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
          <span className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</span>
          <span className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
          <span className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
          <span className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Activity</span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {filteredEmployees.length === 0 && (
            <div className="p-12 text-center">
              <Text variant="muted" size="sm">No employees match your filter.</Text>
            </div>
          )}
          {filteredEmployees.map(emp => {
            const isExpanded = expandedId === emp.employeeId;
            const sConfig = statusConfig[emp.status];
            return (
              <div key={emp.employeeId}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : emp.employeeId)}
                  className="w-full px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 transition-colors text-left"
                >
                  {/* Name */}
                  <div className="col-span-3 flex items-center space-x-3">
                    <div className="w-9 h-9 bg-derivhr-100 rounded-lg flex items-center justify-center text-derivhr-600 font-bold text-sm flex-shrink-0">
                      {emp.employeeName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{emp.employeeName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{emp.role}</p>
                    </div>
                  </div>

                  {/* Department */}
                  <div className="col-span-2">
                    <span className="text-sm text-slate-600">{emp.department}</span>
                  </div>

                  {/* Progress */}
                  <div className="col-span-3 flex items-center space-x-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(emp.overallProgress, emp.status)}`}
                        style={{ width: `${emp.overallProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-600 w-10 text-right">{emp.overallProgress}%</span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sConfig.className}`}>
                      {sConfig.label}
                    </span>
                  </div>

                  {/* Last Activity */}
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">{getRelativeTime(emp.lastActivityDate)}</span>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-6 pb-6 bg-slate-50/50 border-t border-slate-100">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryOrder.map(catId => {
                        const config = TRAINING_CATEGORY_CONFIG[catId];
                        const catItems = emp.items.filter(i => i.category === catId);
                        if (catItems.length === 0) return null;
                        const catCompleted = catItems.filter(i => i.status === 'completed').length;
                        const catProgress = Math.round((catCompleted / catItems.length) * 100);
                        return (
                          <div key={catId} className="bg-white rounded-xl border border-slate-100 p-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <div className={`p-1.5 ${config.color} rounded-lg text-white`}>
                                {config.icon}
                              </div>
                              <span className="text-xs font-bold text-slate-700">{config.label}</span>
                              <span className="text-[10px] font-black text-slate-400 ml-auto">{catCompleted}/{catItems.length}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                              <div
                                className={`h-full rounded-full ${catProgress === 100 ? 'bg-jade-500' : config.color}`}
                                style={{ width: `${catProgress}%` }}
                              />
                            </div>
                            <div className="space-y-1.5">
                              {catItems.map(item => (
                                <div key={item.id} className="flex items-center space-x-2">
                                  {item.status === 'completed' ? (
                                    <CheckCircle2 size={12} className="text-jade-500 flex-shrink-0" />
                                  ) : item.status === 'in_progress' ? (
                                    <Circle size={12} className="text-blue-400 flex-shrink-0" />
                                  ) : (
                                    <Circle size={12} className="text-slate-300 flex-shrink-0" />
                                  )}
                                  <span className={`text-xs truncate ${item.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                                    {item.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
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
