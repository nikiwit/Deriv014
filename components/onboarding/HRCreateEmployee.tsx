import React, { useState } from 'react';
import { 
  UserPlus, Sparkles, AlertCircle, RefreshCw, ArrowLeft,
  Briefcase, Mail, Phone, Calendar, DollarSign, MapPin, Users
} from 'lucide-react';

const API_BASE = '/api/onboarding-workflow';

interface HRCreateEmployeeProps {
  onBack?: () => void;
  onSuccess?: (employee: any) => void;
}

export const HRCreateEmployee: React.FC<HRCreateEmployeeProps> = ({ onBack, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jurisdiction, setJurisdiction] = useState<'MY' | 'SG'>('MY');
  
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    nric: '',
    passport_no: '',
    position: '',
    department: '',
    start_date: '',
    salary: '',
    employment_type: 'full_time',
    probation_months: '3',
    reporting_to: '',
    work_location: '',
    medical_coverage: 'Standard',
    annual_leave_days: '14',
    bonus_details: '',
  });

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { setError('Full name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    if (!form.position.trim()) { setError('Position is required'); return; }
    if (jurisdiction === 'MY' && !form.nric.trim()) { setError('NRIC is required for Malaysia'); return; }
    if (jurisdiction === 'SG' && !form.passport_no.trim()) { setError('Passport is required for Singapore'); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/create-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          salary: parseFloat(form.salary) || 0,
          annual_leave_days: parseInt(form.annual_leave_days) || 14,
          probation_months: parseInt(form.probation_months) || 3,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess(`Employee "${form.full_name}" created successfully!`);
        onSuccess?.(data);
      } else {
        setError(data.error || 'Failed to create employee');
      }
    } catch {
      setError('Failed to create employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <UserPlus className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create New Employee</h2>
            <p className="text-sm text-gray-500">Fill in employee details to generate offer letter</p>
          </div>
        </div>

        {/* Jurisdiction */}
        <div className="mb-6">
          <label className={labelClass}>Jurisdiction</label>
          <div className="grid grid-cols-2 gap-3">
            {[['MY', 'Malaysia', '🇲🇾'], ['SG', 'Singapore', '🇸🇬']].map(([code, name, flag]) => (
              <button
                key={code}
                onClick={() => { setJurisdiction(code as 'MY' | 'SG'); setForm({...form, nric: '', passport_no: ''}); }}
                className={`p-3 border-2 rounded-lg text-center transition ${
                  jurisdiction === code ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{flag}</span>
                <p className="mt-1 font-medium">{name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Personal Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Full Name *</label>
            <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className={inputClass} placeholder="John Doe" />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputClass} placeholder="john@company.com" />
          </div>
          <div>
            <label className={labelClass}>{jurisdiction === 'MY' ? 'NRIC *' : 'Passport *'}</label>
            <input 
              type="text" 
              value={jurisdiction === 'MY' ? form.nric : form.passport_no} 
              onChange={e => setForm({...form, [jurisdiction === 'MY' ? 'nric' : 'passport_no']: e.target.value.toUpperCase()})} 
              className={inputClass} 
              placeholder={jurisdiction === 'MY' ? '901015-10-1234' : 'E12345678'} 
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputClass} placeholder="+60 12-345 6789" />
          </div>
        </div>

        {/* Employment */}
        <div className="border-t pt-4 mb-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Employment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Position *</label>
              <input type="text" value={form.position} onChange={e => setForm({...form, position: e.target.value})} className={inputClass} placeholder="Software Engineer" />
            </div>
            <div>
              <label className={labelClass}>Department *</label>
              <input type="text" value={form.department} onChange={e => setForm({...form, department: e.target.value})} className={inputClass} placeholder="Technology" />
            </div>
            <div>
              <label className={labelClass}>Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Salary ({jurisdiction === 'MY' ? 'MYR' : 'SGD'})</label>
              <input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} className={inputClass} placeholder="5000" />
            </div>
            <div>
              <label className={labelClass}>Reporting To</label>
              <input type="text" value={form.reporting_to} onChange={e => setForm({...form, reporting_to: e.target.value})} className={inputClass} placeholder="Manager Name" />
            </div>
            <div>
              <label className={labelClass}>Work Location</label>
              <input type="text" value={form.work_location} onChange={e => setForm({...form, work_location: e.target.value})} className={inputClass} placeholder="Kuala Lumpur" />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 mb-4">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 mb-4">
            <Sparkles className="w-5 h-5" /> {success}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
          {loading ? 'Creating...' : 'Create Employee & Generate Offer Letter'}
        </button>
      </div>
    </div>
  );
};

export default HRCreateEmployee;
