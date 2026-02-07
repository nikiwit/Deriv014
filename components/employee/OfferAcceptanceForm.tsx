import React, { useState } from 'react';
import { X } from 'lucide-react';

interface OfferAcceptanceFormProps {
  defaultData: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onClose: () => void;
}

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}> = ({ label, value, onChange, type = 'text', required, placeholder }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-jade-400 focus:border-jade-400 outline-none"
    />
  </div>
);

export const OfferAcceptanceForm: React.FC<OfferAcceptanceFormProps> = ({
  defaultData,
  onSubmit,
  onClose,
}) => {
  const [form, setForm] = useState<Record<string, any>>({ ...defaultData });
  const set = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accepted) {
      alert('Please confirm your offer acceptance before submitting.');
      return;
    }
    onSubmit({ ...form, completedAt: new Date().toISOString() });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-900">Offer Acceptance Form</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* CANDIDATE INFORMATION */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">
              Candidate Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name" value={form.fullName} onChange={v => set('fullName', v)} required />
              <Field label="NRIC / Passport No" value={form.nricPassport} onChange={v => set('nricPassport', v)} required />
              <Field label="Email" type="email" value={form.email} onChange={v => set('email', v)} required />
              <Field label="Mobile" value={form.mobile} onChange={v => set('mobile', v)} required placeholder="+60xx-xxx-xxxx" />
            </div>
          </section>

          {/* OFFER DETAILS */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">
              Offer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Company" value={form.company} onChange={v => set('company', v)} required />
              <Field label="Position" value={form.position} onChange={v => set('position', v)} required />
              <Field label="Department" value={form.department} onChange={v => set('department', v)} required />
              <Field label="Reporting To" value={form.reportingTo} onChange={v => set('reportingTo', v)} required />
              <Field label="Start Date" type="date" value={form.startDate} onChange={v => set('startDate', v)} required />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Employment Type<span className="text-red-400 ml-0.5">*</span></label>
                <select
                  value={form.employmentType}
                  onChange={e => set('employmentType', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-jade-400 focus:border-jade-400 outline-none"
                >
                  <option value="Permanent">Permanent</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>
              <Field label="Probation Period" value={form.probationPeriod} onChange={v => set('probationPeriod', v)} />
              <Field label="Monthly Salary (MYR)" value={form.monthlySalary} onChange={v => set('monthlySalary', v)} required />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Benefits Summary</label>
              <textarea
                value={form.benefits}
                onChange={e => set('benefits', e.target.value)}
                rows={2}
                placeholder="e.g. Medical, Dental, Annual Leave, etc."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-jade-400 focus:border-jade-400 outline-none"
              />
            </div>
          </section>

          {/* OFFER ACCEPTANCE */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">
              Offer Acceptance
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 mb-3">
              <p>
                I, <strong>{form.fullName || '______'}</strong>, hereby accept the offer of employment
                with <strong>{form.company || '______'}</strong> under the terms and conditions outlined
                in the offer letter.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600 list-disc list-inside">
                <li>The position responsibilities and reporting structure</li>
                <li>The compensation and benefits package</li>
                <li>The probation period and terms of employment</li>
                <li>The company policies referenced in the offer letter</li>
              </ul>
            </div>
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.accepted || false}
                onChange={e => set('accepted', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-jade-600 focus:ring-jade-500"
              />
              <span className="text-sm font-medium text-slate-700">
                I confirm that I have read, understood, and accept the offer of employment.<span className="text-red-400 ml-0.5">*</span>
              </span>
            </label>
            <div className="mt-3">
              <Field label="Acceptance Date" type="date" value={form.acceptanceDate} onChange={v => set('acceptanceDate', v)} required />
            </div>
          </section>

          {/* EMERGENCY CONTACT */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">
              Emergency Contact Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Emergency Contact Name" value={form.emergencyName} onChange={v => set('emergencyName', v)} required />
              <Field label="Relationship" value={form.emergencyRelationship} onChange={v => set('emergencyRelationship', v)} required />
              <Field label="Mobile Number" value={form.emergencyMobile} onChange={v => set('emergencyMobile', v)} required placeholder="+60xx-xxx-xxxx" />
              <Field label="Alternative Number" value={form.emergencyAltNumber} onChange={v => set('emergencyAltNumber', v)} placeholder="Optional" />
            </div>
          </section>

          {/* CONFLICTS OF INTEREST */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">
              Declaration of Conflicts of Interest
            </h3>
            <label className="flex items-start space-x-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={form.noConflicts || false}
                onChange={e => {
                  set('noConflicts', e.target.checked);
                  if (e.target.checked) set('conflictDetails', '');
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-jade-600 focus:ring-jade-500"
              />
              <span className="text-sm text-slate-700">
                I have <strong>NO</strong> conflicts of interest
              </span>
            </label>
            {!form.noConflicts && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Conflict Details</label>
                <textarea
                  value={form.conflictDetails}
                  onChange={e => set('conflictDetails', e.target.value)}
                  rows={3}
                  placeholder="Describe any potential conflicts of interest..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-jade-400 focus:border-jade-400 outline-none"
                />
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
              I understand that I must disclose any conflicts of interest that arise during my employment.
            </p>
          </section>

          {/* Submit */}
          <div className="pt-4 border-t flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-semibold text-white bg-jade-600 hover:bg-jade-700 rounded-lg"
            >
              Submit & Complete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfferAcceptanceForm;
