import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search,
  Filter,
  ChevronRight,
  User,
  Mail,
  Calendar,
  Briefcase
} from 'lucide-react';

interface EmployeeProgress {
  employee_id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  start_date: string;
  status: string;
  completed_tasks: number;
  total_tasks: number;
  progress_percentage: number;
  days_onboarding: number;
}

interface DashboardSummary {
  total: number;
  completed: number;
  in_progress: number;
  not_started: number;
  avg_progress: number;
}

const API_BASE = '';

export const OnboardingHRDashboard: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeProgress[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchEmployeeProgress();
  }, []);

  const fetchEmployeeProgress = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/multiagent/onboarding/hr/employees-progress`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
        setSummary(data.summary);
      }
    } catch (err) {
      console.warn('Failed to fetch employee progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || emp.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-jade-100 text-jade-700';
      case 'onboarding_active': return 'bg-blue-100 text-blue-700';
      case 'offer_accepted': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'onboarding_active': return 'Active';
      case 'offer_accepted': return 'Accepted';
      case 'offer_pending': return 'Pending';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jade-500 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Onboarding Dashboard</h1>
          <p className="text-slate-500 font-medium">Monitor employee onboarding progress</p>
        </div>
        <button
          onClick={fetchEmployeeProgress}
          className="px-4 py-2 bg-jade-500 text-white rounded-xl font-bold hover:bg-jade-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-slate-100 rounded-xl">
                <Users className="text-slate-600" size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">Total</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{summary.total}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-jade-100 rounded-xl">
                <CheckCircle2 className="text-jade-600" size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">Completed</span>
            </div>
            <p className="text-3xl font-black text-jade-600">{summary.completed}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <TrendingUp className="text-blue-600" size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">In Progress</span>
            </div>
            <p className="text-3xl font-black text-blue-600">{summary.in_progress}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Clock className="text-amber-600" size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">Not Started</span>
            </div>
            <p className="text-3xl font-black text-amber-600">{summary.not_started}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-xl">
                <TrendingUp className="text-purple-600" size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">Avg Progress</span>
            </div>
            <p className="text-3xl font-black text-purple-600">{summary.avg_progress}%</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-jade-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-jade-500"
        >
          <option value="all">All Status</option>
          <option value="offer_pending">Pending</option>
          <option value="offer_accepted">Accepted</option>
          <option value="onboarding_active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Days</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-jade-100 rounded-full flex items-center justify-center">
                        <User className="text-jade-600" size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-sm text-slate-500">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-700">{emp.department}</p>
                    <p className="text-sm text-slate-500">{emp.position}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Calendar size={16} />
                      <span>{emp.start_date ? new Date(emp.start_date).toLocaleDateString() : '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(emp.status)}`}>
                      {getStatusLabel(emp.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-jade-500 rounded-full transition-all duration-500"
                          style={{ width: `${emp.progress_percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-slate-700 w-12">
                        {emp.progress_percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {emp.completed_tasks}/{emp.total_tasks} tasks
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${emp.days_onboarding > 30 ? 'text-red-600' : 'text-slate-600'}`}>
                      {emp.days_onboarding} days
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                      <ChevronRight className="text-slate-400" size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="p-12 text-center">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">No employees found</p>
          </div>
        )}
      </div>
    </div>
  );
};
