import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ContractFormProps {
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

const Checkbox: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
}> = ({ label, checked, onChange, required }) => (
  <label className="flex items-start space-x-2 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      required={required}
      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-jade-600 focus:ring-jade-500"
    />
    <span className="text-sm text-slate-700">{label}</span>
  </label>
);

export const ContractForm: React.FC<ContractFormProps> = ({
  defaultData,
  onSubmit,
  onClose,
}) => {
  const [form, setForm] = useState<Record<string, any>>({ ...defaultData });
  const set = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.finalDeclaration) {
      alert('Please confirm the final declaration before submitting.');
      return;
    }
    if (
      !form.acknowledgeHandbook ||
      !form.acknowledgeIT ||
      !form.acknowledgePrivacy ||
      !form.acknowledgeConfidentiality
    ) {
      alert('Please acknowledge all company policies before submitting.');
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
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Employee Onboarding Contract Form</h2>
            <p className="text-xs text-slate-500">Deriv Solutions Sdn Bhd</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* SECTION 1: PERSONAL & IDENTIFICATION */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">
              Section 1: Personal & Identification Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name (as per NRIC/Passport)" value={form.fullName} onChange={v => set('fullName', v)} required />
              <Field label="NRIC No" value={form.nric} onChange={v => set('nric', v)} placeholder="e.g. 950620-08-1234" />
              <Field label="Passport No (for non-Malaysians)" value={form.passportNo} onChange={v => set('passportNo', v)} placeholder="N/A if Malaysian" />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nationality<span className="text-red-400 ml-0.5">*</span></label>
                <select
                  value={form.nationality}
                  onChange={e => set('nationality', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-jade-400 focus:border-jade-400 outline-none"
                >
                  <option value="Malaysian">Malaysian</option>
                  <option value="Non-Malaysian">Non-Malaysian</option>
                </select>
              </div>
              <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} required />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Gender<span className="text-red-400 ml-0.5">*</span></label>
                <select
                  value={form.gender}
                  onChange={e => set('gender', e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-jade-400 focus:border-jade-400 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Marital Status</label>
                <select
                  value={form.maritalStatus}
                  onChange={e => set('maritalStatus', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-jade-400 focus:border-jade-400 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <Field label="Race" value={form.race} onChange={v => set('race', v)} />
              <Field label="Religion" value={form.religion} onChange={v => set('religion', v)} />
            </div>

            {/* Address */}
            <h4 className="text-xs font-semibold text-slate-600 uppercase mt-5 mb-2">Residential Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Address Line 1" value={form.address1} onChange={v => set('address1', v)} required />
              <Field label="Address Line 2" value={form.address2} onChange={v => set('address2', v)} />
              <Field label="Postcode" value={form.postcode} onChange={v => set('postcode', v)} required />
              <Field label="City" value={form.city} onChange={v => set('city', v)} required />
              <Field label="State" value={form.state} onChange={v => set('state', v)} required />
              <Field label="Country" value={form.country} onChange={v => set('country', v)} required />
            </div>

            {/* Contact */}
            <h4 className="text-xs font-semibold text-slate-600 uppercase mt-5 mb-2">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Personal Email" type="email" value={form.personalEmail} onChange={v => set('personalEmail', v)} />
              <Field label="Work Email" type="email" value={form.workEmail} onChange={v => set('workEmail', v)} required />
              <Field label="Mobile Number" value={form.mobile} onChange={v => set('mobile', v)} required placeholder="+60xx-xxx-xxxx" />
              <Field label="Alternative Number" value={form.altNumber} onChange={v => set('altNumber', v)} />
            </div>

            {/* Emergency Contact */}
            <h4 className="text-xs font-semibold text-slate-600 uppercase mt-5 mb-2">Emergency Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Name" value={form.emergencyName} onChange={v => set('emergencyName', v)} required />
              <Field label="Relationship" value={form.emergencyRelationship} onChange={v => set('emergencyRelationship', v)} required />
              <Field label="Mobile Number" value={form.emergencyMobile} onChange={v => set('emergencyMobile', v)} required />
              <Field label="Alternative Number" value={form.emergencyAltNumber} onChange={v => set('emergencyAltNumber', v)} />
            </div>
          </section>

          {/* SECTION 2: EMPLOYMENT & BANK */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">
              Section 2: Employment & Bank Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Job Title" value={form.jobTitle} onChange={v => set('jobTitle', v)} required />
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
                  <option value="Full-Time Permanent">Full-Time Permanent</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-Time">Part-Time</option>
                </select>
              </div>
              <Field label="Work Location" value={form.workLocation} onChange={v => set('workLocation', v)} />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Work Model</label>
                <select
                  value={form.workModel}
                  onChange={e => set('workModel', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-jade-400 focus:border-jade-400 outline-none"
                >
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
              <Field label="Probation Period" value={form.probationPeriod} onChange={v => set('probationPeriod', v)} />
            </div>

            <h4 className="text-xs font-semibold text-slate-600 uppercase mt-5 mb-2">Banking Details (for Salary Credit)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Bank Name" value={form.bankName} onChange={v => set('bankName', v)} required />
              <Field label="Account Holder Name" value={form.accountHolder} onChange={v => set('accountHolder', v)} required />
              <Field label="Account Number" value={form.accountNumber} onChange={v => set('accountNumber', v)} required />
              <Field label="Bank Branch" value={form.bankBranch} onChange={v => set('bankBranch', v)} />
            </div>
          </section>

          {/* SECTION 3: STATUTORY REGISTRATIONS */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">
              Section 3: Statutory Registrations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="EPF Number" value={form.epfNumber} onChange={v => set('epfNumber', v)} placeholder="Leave empty if new registration needed" />
              <Field label="SOCSO Number" value={form.socsoNumber} onChange={v => set('socsoNumber', v)} placeholder="Leave empty if new registration needed" />
              <Field label="EIS Number" value={form.eisNumber} onChange={v => set('eisNumber', v)} placeholder="Leave empty if new registration needed" />
              <Field label="Income Tax Number" value={form.taxNumber} onChange={v => set('taxNumber', v)} placeholder="Leave empty if new registration needed" />
            </div>
            <div className="mt-3">
              <Checkbox
                label="I am a Malaysian Tax Resident"
                checked={form.taxResident ?? true}
                onChange={v => set('taxResident', v)}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              I authorize Deriv Solutions Sdn Bhd to register me with EPF, SOCSO, EIS and to deduct Monthly Tax Deduction (PCB) from my salary as required by law.
            </p>
          </section>

          {/* SECTION 4: POLICY ACKNOWLEDGEMENTS */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">
              Section 4: Policy Acknowledgements
            </h3>
            <div className="space-y-3 bg-slate-50 rounded-lg p-4">
              <Checkbox
                label="I have read and agree to the Employee Handbook (employment relationship, working hours, leave, code of conduct, disciplinary procedures)"
                checked={form.acknowledgeHandbook || false}
                onChange={v => set('acknowledgeHandbook', v)}
                required
              />
              <Checkbox
                label="I have read and agree to the IT & Data Security Policy (acceptable use, password management, data handling, remote work security)"
                checked={form.acknowledgeIT || false}
                onChange={v => set('acknowledgeIT', v)}
                required
              />
              <Checkbox
                label="I consent to the Data Privacy Policy (PDPA) for collection and processing of my personal data for employment purposes"
                checked={form.acknowledgePrivacy || false}
                onChange={v => set('acknowledgePrivacy', v)}
                required
              />
              <Checkbox
                label="I agree to the Confidentiality & Code of Conduct policy (protect confidential info, maintain professional behavior, disclose conflicts)"
                checked={form.acknowledgeConfidentiality || false}
                onChange={v => set('acknowledgeConfidentiality', v)}
                required
              />
            </div>
          </section>

          {/* FINAL DECLARATION */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b pb-2">
              Final Declaration
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 mb-3">
              <p>I declare that:</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600 list-disc list-inside">
                <li>All information provided in this form is true, accurate, and complete</li>
                <li>I have read and understood all policies and acknowledge my obligations</li>
                <li>I will notify HR immediately of any changes to my personal information</li>
                <li>I understand that providing false information may result in termination</li>
              </ul>
            </div>
            <Checkbox
              label="I confirm the above declaration"
              checked={form.finalDeclaration || false}
              onChange={v => set('finalDeclaration', v)}
              required
            />
            <div className="mt-3">
              <Field label="Signature Date" type="date" value={form.signatureDate} onChange={v => set('signatureDate', v)} required />
            </div>
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
                class="
                  px-6 py-3
                  text-base font-bold
                  text-white
                  rounded-xl
                  bg-gradient-to-r from-emerald-600 to-jade-600
                  shadow-lg shadow-emerald-500/30
                  hover:from-emerald-700 hover:to-jade-700
                  hover:shadow-xl hover:scale-[1.02]
                  focus:outline-none focus:ring-2 focus:ring-emerald-400
                  transition-all
                "
              >
                Submit & Complete
              </button>

          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractForm;
