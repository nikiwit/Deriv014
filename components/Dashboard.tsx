import React from 'react';
import {
  Users,
  AlertTriangle,
  BrainCircuit,
  Activity,
  Zap,
  UserPlus,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Briefcase,
  Mail,
  Calendar,
  Globe,
  CreditCard,
  Fingerprint,
  ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_HIRING_DATA } from '../constants';
import { StatCardProps, ViewState } from '../types';
import { Card } from './design-system/Card';
import { Button } from './design-system/Button';
import { Heading, Text } from './design-system/Typography';
import { Badge } from './design-system/Badge';

interface DashboardProps {
  onNavigate?: (view: ViewState) => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, trendUp, icon }) => (
  <Card className="hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div>
        <Text variant="muted" size="sm" weight="medium">{title}</Text>
        <Heading level="h3" className="mt-1 !text-2xl">{value}</Heading>
      </div>
      <div className={`p-2 rounded-lg ${trendUp ? 'bg-jade-50 text-jade-500' : 'bg-red-50 text-red-600'}`}>
        {icon}
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <span className={`text-xs font-bold ${trendUp ? 'text-jade-500' : 'text-red-600'}`}>
        {trend}
      </span>
      <Text variant="muted" size="sm" className="!text-xs">vs last month</Text>
    </div>
  </Card>
);

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Heading level="h1" className="mb-2">Executive Overview</Heading>
          <Text variant="muted" weight="medium">AI-driven insights into your workforce health.</Text>
        </div>
        <div className="flex items-center space-x-3">
           <Button
             onClick={() => onNavigate?.('new_employee')}
             leftIcon={<UserPlus size={18} />}
             rightIcon={<Sparkles size={14} className="opacity-70" />}
           >
             New Employee
           </Button>
           <Badge variant="success" className="px-3 py-1 text-xs uppercase tracking-wider gap-2">
             <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
             System Live
           </Badge>
        </div>
      </div>

      {/* Compact New Employee Onboarding Section */}
      <Card noPadding className="border-slate-100 bg-slate-50/50">
        <div className="p-[5px]">
          <div className="flex flex-col lg:flex-row items-center gap-4 bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
            <div className="flex-1 flex items-center gap-4">
              <div className="p-2 bg-derivhr-50 rounded-lg">
                <Sparkles className="text-derivhr-500" size={16} />
              </div>
              <div className="space-y-0.5">
                <Heading level="h4" className="!text-sm font-bold">Start New Employee Journey</Heading>
                <Text size="sm" className="!text-xs text-slate-500">AI-powered compliance and document automation.</Text>
              </div>
            </div>

            <div className="flex items-center gap-4 border-l border-slate-100 pl-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-jade-600" />
                  <span className="text-slate-600 text-[10px] font-bold uppercase">Compliance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-600" />
                  <span className="text-slate-600 text-[10px] font-bold uppercase">Auto-Doc</span>
                </div>
                <Button
                  onClick={() => onNavigate?.('new_employee')}
                  size="sm"
                  className="h-8 text-xs font-bold"
                  rightIcon={<ArrowRight size={14} />}
                >
                  Onboard
                </Button>
            </div>
          </div>
        </div>
      </Card>

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
          icon={<ShieldCheck size={20} />} 
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
        <Card className="lg:col-span-1 flex flex-col h-full">
          <Heading level="h3" className="mb-6 flex items-center">
              <Zap className="mr-2 text-derivhr-500 fill-current" size={20} />
              Insights
          </Heading>
          <div className="space-y-4 flex-1">
            <div className="p-5 rounded-lg bg-amber-50 border border-amber-100 hover:border-amber-300 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Compliance</span>
                    <span className="text-xs text-amber-600 font-semibold">Just now</span>
                </div>
                <Text size="sm" weight="medium" className="leading-relaxed !text-slate-800">
                    Based on Q3 hiring plans, you will exceed your foreign worker quota by <strong className="text-amber-900">5 pax</strong> in October. 
                </Text>
                <button className="mt-3 text-sm font-bold text-amber-800 group-hover:underline">Start Visa Applications</button>
            </div>

            <div className="p-5 rounded-lg bg-red-50 border border-red-100 hover:border-red-200 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-red-800 uppercase tracking-widest">Wellbeing</span>
                    <span className="text-xs text-red-600 font-semibold">2h ago</span>
                </div>
                <Text size="sm" weight="medium" className="leading-relaxed !text-slate-800">
                    <strong className="text-slate-900">Ali Bin Ahmad</strong> hasn't taken annual leave in 8 months. Burnout risk elevated.
                </Text>
                <button className="mt-3 text-sm font-bold text-red-800 group-hover:underline">Draft "Take a Break" Email</button>
            </div>

             <div className="p-5 rounded-lg bg-jade-50 border border-jade-100 hover:border-jade-200 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-jade-800 uppercase tracking-widest">Onboarding</span>
                    <span className="text-xs text-jade-600 font-semibold">Automated</span>
                </div>
                <Text size="sm" weight="medium" className="leading-relaxed !text-slate-800">
                    Offer accepted by <strong className="text-slate-900">Sarah Lee</strong>.
                </Text>
                <ul className="mt-3 space-y-2 text-sm text-jade-800 font-bold">
                    <li className="flex items-center"><CheckIcon /> Contract generated & sent</li>
                    <li className="flex items-center"><CheckIcon /> Laptop ordered (MacBook Pro)</li>
                    <li className="flex items-center"><CheckIcon /> Slack/Email provisioned</li>
                </ul>
            </div>
          </div>
        </Card>

        {/* Main Chart Section */}
        <Card className="lg:col-span-2 h-full">
          <Heading level="h3" className="mb-6 flex items-center">
            <Activity className="mr-2 text-derivhr-500" size={20} />
            Hiring Velocity
          </Heading>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_HIRING_DATA}>
                <defs>
                  <linearGradient id="colorExternal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF444F" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#FF444F" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInternal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B67B" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#00B67B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#64748b" tick={{fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}
                  itemStyle={{ color: '#0f172a', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="external" stroke="#FF444F" strokeWidth={3} fillOpacity={1} fill="url(#colorExternal)" />
                <Area type="monotone" dataKey="internal" stroke="#00B67B" strokeWidth={3} fillOpacity={1} fill="url(#colorInternal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>
    </div>
  );
};

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
