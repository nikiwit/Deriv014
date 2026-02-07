import React from 'react';
import {
  Users,
  AlertTriangle,
  BrainCircuit,
  Activity,
  Zap,
  CalendarClock,
  UserPlus,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Briefcase,
  Mail,
  Calendar,
  Building2,
  Globe,
  CreditCard,
  Fingerprint
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_HIRING_DATA } from '../constants';
import { StatCardProps, ViewState } from '../types';

interface DashboardProps {
  onNavigate?: (view: ViewState) => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, trendUp, icon }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
        {icon}
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <span className={`text-xs font-bold ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
        {trend}
      </span>
      <span className="text-slate-400 text-xs">vs last month</span>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Executive Overview</h1>
          <p className="text-slate-500 font-medium">AI-driven insights into your workforce health.</p>
        </div>
        <div className="flex items-center space-x-3">
           {/* New Employee Button */}
           <button
             onClick={() => onNavigate?.('new_employee')}
             className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-derivhr-500 to-derivhr-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-derivhr-500/25 hover:shadow-xl hover:shadow-derivhr-500/30 hover:scale-[1.02] transition-all duration-200 group"
           >
             <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
             <span>New Employee</span>
             <Sparkles size={14} className="opacity-70 group-hover:opacity-100" />
           </button>
           <span className="px-3 py-1 bg-jade-50 text-jade-600 border border-jade-100 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm">
             <span className="w-1.5 h-1.5 bg-jade-500 rounded-full mr-2 animate-pulse"></span>
             System Live
           </span>
        </div>
      </div>

      {/* Prominent New Employee Onboarding Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-derivhr-500 via-derivhr-600 to-indigo-600 shadow-2xl shadow-derivhr-500/30">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative z-10 p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Sparkles className="text-white" size={20} />
                </div>
                <span className="text-white/90 text-xs font-black uppercase tracking-widest">AI-Powered Onboarding</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight">
                Start New Employee Journey
              </h2>
              <p className="text-white/80 text-base font-medium max-w-xl mb-6">
                Create a personalized, compliant onboarding experience in minutes. Our AI handles compliance checks, document generation, and task automation.
              </p>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
                  <CheckCircle2 size={16} className="text-jade-300" />
                  <span className="text-white text-sm font-bold">Auto Compliance</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
                  <Clock size={16} className="text-amber-300" />
                  <span className="text-white text-sm font-bold">Save 2+ Hours</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
                  <Briefcase size={16} className="text-blue-300" />
                  <span className="text-white text-sm font-bold">Smart Workflows</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate?.('new_employee')}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-derivhr-600 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 group"
              >
                <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                <span>Start Onboarding</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Form Preview Card */}
            <div className="lg:w-96 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Fingerprint size={16} className="text-white" />
                </div>
                <span className="text-white font-bold text-sm">Quick Start Form</span>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white/10 rounded-xl p-3 flex items-center space-x-3">
                  <Mail size={16} className="text-white/60" />
                  <span className="text-white/70 text-sm">Employee Email</span>
                </div>
                <div className="bg-white/10 rounded-xl p-3 flex items-center space-x-3">
                  <Briefcase size={16} className="text-white/60" />
                  <span className="text-white/70 text-sm">Role & Department</span>
                </div>
                <div className="bg-white/10 rounded-xl p-3 flex items-center space-x-3">
                  <Calendar size={16} className="text-white/60" />
                  <span className="text-white/70 text-sm">Start Date</span>
                </div>
                <div className="bg-white/10 rounded-xl p-3 flex items-center space-x-3">
                  <Globe size={16} className="text-white/60" />
                  <span className="text-white/70 text-sm">Nationality</span>
                </div>
                <div className="bg-white/10 rounded-xl p-3 flex items-center space-x-3">
                  <CreditCard size={16} className="text-white/60" />
                  <span className="text-white/70 text-sm">Salary (MYR)</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 font-medium">AI will generate:</span>
                  <span className="text-white font-bold">Compliance Plan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Workforce" 
          value="1,248" 
          trend="+12%" 
          trendUp={true} 
          icon={<Users size={20} />} 
        />
        <StatCard 
          title="Compliance Score" 
          value="98.2%" 
          trend="+0.4%" 
          trendUp={true} 
          icon={<ShieldCheckIcon size={20} />} 
        />
        <StatCard 
          title="Retention Risk" 
          value="High" 
          trend="+2.1%" 
          trendUp={false} 
          icon={<AlertTriangle size={20} />} 
        />
        <StatCard 
          title="AI Automation" 
          value="450 hrs" 
          trend="Saved this mo." 
          trendUp={true} 
          icon={<BrainCircuit size={20} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Predictive Alerts */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center tracking-tight">
              <Zap className="mr-2 text-derivhr-500 fill-current" size={20} />
              Mind-Blowing Predictions
          </h3>
          <div className="space-y-4 flex-1">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 cursor-pointer hover:border-amber-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Compliance Alert</span>
                    <span className="text-[10px] text-amber-500 font-bold">Just now</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    Based on Q3 hiring plans, you will exceed your foreign worker quota by <strong>5 pax</strong> in October. 
                </p>
                <button className="mt-2 text-xs font-bold text-amber-700 underline">Start Visa Applications</button>
            </div>

            <div className="bg-derivhr-50 p-4 rounded-lg border border-derivhr-100 cursor-pointer hover:border-derivhr-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-derivhr-700 uppercase tracking-wider">Proactive HR</span>
                    <span className="text-[10px] text-derivhr-500 font-bold">2h ago</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    <strong>Ali Bin Ahmad</strong> hasn't taken annual leave in 8 months. Burnout risk elevated.
                </p>
                <button className="mt-2 text-xs font-bold text-derivhr-700 underline">Draft "Take a Break" Email</button>
            </div>

             <div className="bg-jade-50 p-4 rounded-lg border border-jade-100 cursor-pointer hover:border-jade-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-jade-700 uppercase tracking-wider">Invisible Onboarding</span>
                    <span className="text-[10px] text-jade-500 font-bold">Automated</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    Offer accepted by <strong>Sarah Lee</strong>.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-jade-800 font-bold">
                    <li className="flex items-center"><CheckIcon /> Contract generated & sent</li>
                    <li className="flex items-center"><CheckIcon /> Laptop ordered (MacBook Pro)</li>
                    <li className="flex items-center"><CheckIcon /> Slack/Email provisioned</li>
                </ul>
            </div>
          </div>
        </div>

        {/* Main Chart Section */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center tracking-tight">
            <Activity className="mr-2 text-derivhr-500" size={20} />
            Hiring Velocity & Internal Mobility
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_HIRING_DATA}>
                <defs>
                  <linearGradient id="colorExternal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF444F" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#FF444F" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInternal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B67B" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00B67B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#94a3b8" tick={{fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#f1f5f9', color: '#0f172a', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', border: 'none' }}
                  itemStyle={{ color: '#0f172a', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="external" stroke="#FF444F" strokeWidth={3} fillOpacity={1} fill="url(#colorExternal)" />
                <Area type="monotone" dataKey="internal" stroke="#00B67B" strokeWidth={3} fillOpacity={1} fill="url(#colorInternal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

// Simple Icon component wrapper to fix specific Lucide import in StatCard
const ShieldCheckIcon: React.FC<{size: number}> = ({size}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
