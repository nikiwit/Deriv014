import React, { useEffect, useMemo, useState } from 'react';
import { X, FileSignature } from 'lucide-react';
import { SignaturePad } from '../design-system/SignaturePad';

/**
 * ContractForm
 *
 * A schema-driven, highly-flexible onboarding/contract form component.
 * The UI is not hard-coded for specific fields — it renders based on an external JSON schema
 * (passed as a prop or loaded from a URL). It includes:
 * - Sections and fields rendered from JSON
 * - Built-in validators (required, regex, email, phone, date, number, bank whitelist)
 * - Conditional visibility (dependsOn)
 * - Custom widget injection (custom renderers via props)
 * - Change-audit (small local change log)
 * - Live validation and final submit validation
 * - Export/preview utilities
 *
 * Example schema (JSON):
 * {
 *   "title": "Employee Onboarding Contract",
 *   "sections": [
 *     {
 *       "id": "personal",
 *       "title": "Personal Details",
 *       "fields": [
 *         { "key": "fullName", "label": "Full name", "type": "text", "required": true },
 *         { "key": "nric", "label": "NRIC No", "type": "nric" },
 *         { "key": "nationality", "label": "Nationality", "type": "select", "options": ["Malaysian","Non-Malaysian"] }
 *       ]
 *     }
 *   ]
 * }
 */

// --- Types ---
export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'textarea'
  | 'bank'
  | 'nric'
  | 'signature'
  | 'custom';

export interface FieldSchema {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select
  pattern?: string; // regex string
  min?: number;
  max?: number;
  dependsOn?: { key: string; value?: any } | { key: string; predicate: { op: 'in' | 'eq' | 'ne'; values: any[] } };
  readOnly?: boolean;
}

export interface SectionSchema {
  id: string;
  title?: string;
  description?: string;
  fields: FieldSchema[];
}

export interface FormSchema {
  title?: string;
  subtitle?: string;
  sections: SectionSchema[];
}

export interface ContractFormProps {
  schema?: FormSchema;
  schemaUrl?: string; // optional remote JSON schema
  defaultData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onClose?: () => void;
  customWidgets?: Record<string, React.FC<any>>; // keyed by FieldType or custom widget name
}

// Known banks (MY + SG) for bank validation
const KNOWN_BANKS = [
  'Maybank',
  'CIMB',
  'Public Bank',
  'RHB',
  'Hong Leong Bank',
  'AmBank',
  'UOB Malaysia',
  'OCBC Bank Malaysia',
  'HSBC Malaysia',
  'Standard Chartered Malaysia',
  'Bank Rakyat',
  'Bank Islam',
  'Affin Bank',
  'Alliance Bank',
  'BSN',
  // Singapore
  'DBS',
  'POSB',
  'OCBC',
  'UOB',
  'Standard Chartered Singapore',
  'HSBC Singapore',
  'Citibank Singapore',
];

// --- Helpers / Validators ---
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/berhad|bank|malaysia|singapore|bhd|limited|ltd|sgp/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();

const similarity = (a: string, b: string) => {
  if (!a || !b) return 0;
  // simple longest-prefix similarity / char match
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / Math.max(a.length, b.length);
};

const validateEmail = (v?: string) => {
  if (!v) return '';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(v) ? '' : 'Invalid email address.';
};

const validatePhone = (v?: string) => {
  if (!v) return '';
  const digits = (v || '').replace(/[^0-9]/g, '');
  if (digits.length < 7 || digits.length > 15) return 'Phone must have 7–15 digits.';
  if (!/^\+?[0-9\s\-()]+$/.test(v)) return 'Phone contains invalid characters.';
  return '';
};

const validateNumber = (v?: any, min?: number, max?: number) => {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(String(v).replace(/,/g, ''));
  if (Number.isNaN(n)) return 'Must be a number.';
  if (min !== undefined && n < min) return `Must be ≥ ${min}.`;
  if (max !== undefined && n > max) return `Must be ≤ ${max}.`;
  return '';
};

const validateBankName = (v?: string) => {
  if (!v || v.trim().length === 0) return 'Bank name is required.';
  if (v.trim().length < 2) return 'Bank name looks too short.';
  const norm = normalize(v);
  const best = KNOWN_BANKS.map(b => ({ b, score: similarity(norm, normalize(b)) })).sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 0.45) return 'Unknown bank — please choose a Malaysian or Singapore bank.';
  return '';
};

const validateNRIC = (v?: string) => {
  if (!v) return '';
  // Basic MY NRIC format check YYYYMMDD-##-#### or 6-2-4
  const re1 = /^\d{6}-\d{2}-\d{4}$/;
  if (re1.test(v)) return '';
  return 'NRIC should be in the format 950620-08-1234';
};

// Evaluate dependency
const checkDepends = (depends: FieldSchema['dependsOn'], data: Record<string, any>) => {
  if (!depends) return true;
  if ('key' in depends && 'value' in (depends as any)) {
    return data[(depends as any).key] === (depends as any).value;
  }
  if ('key' in depends && 'predicate' in (depends as any)) {
    const p = (depends as any).predicate;
    const val = data[(depends as any).key];
    if (p.op === 'in') return p.values.includes(val);
    if (p.op === 'eq') return p.values[0] === val;
    if (p.op === 'ne') return p.values[0] !== val;
  }
  return true;
};

// --- Components ---
const DefaultField: React.FC<{
  schema: FieldSchema;
  value: any;
  onChange: (v: any) => void;
  error?: string;
}> = ({ schema, value, onChange, error }) => {
  const { type = 'text', placeholder, options } = schema;

  switch (type) {
    case 'signature':
      return (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <SignaturePad 
            onSave={onChange} 
            onClear={() => onChange(null)} 
          />
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>
      );
    case 'textarea':
      return (
        <>
          <textarea
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-jade-400 outline-none ${error ? 'border-rose-300' : 'border-slate-200'}`}
          />
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </>
      );

    case 'select':
      return (
        <>
          <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-jade-400 outline-none ${error ? 'border-rose-300' : 'border-slate-200'}`}
          >
            <option value="">Select...</option>
            {options?.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </>
      );

    case 'checkbox':
      return (
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">{schema.label}</span>
        </label>
      );

    case 'date':
      return (
        <>
          <input
            type="date"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            className={`w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-jade-400 outline-none ${error ? 'border-rose-300' : 'border-slate-200'}`}
          />
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </>
      );

    default:
      return (
        <>
          <input
            type={type === 'number' ? 'number' : 'text'}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-jade-400 outline-none ${error ? 'border-rose-300' : 'border-slate-200'}`}
          />
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </>
      );
  }
};


import schema from '../../docs/contract.schema.json';

{/* <ContractForm
  schema={schema}
  onSubmit={(data) => console.log(data)}
  onClose={() => setOpen(false)}
/> */}



export const ContractForm: React.FC<ContractFormProps> = ({
  schema: schemaProp,   // 👈 rename here
  schemaUrl,
  defaultData = {},
  onSubmit,
  onClose,
  customWidgets = {}
}) => {

  const [schema, setSchema] = useState<FormSchema | null>(schemaProp ?? null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({ ...defaultData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [changeLog, setChangeLog] = useState<Array<{ key: string; oldValue: any; newValue: any; at: string }>>([]);

  // Fetch schema if schemaUrl provided
  useEffect(() => {
    if (!schemaUrl) return;
    let alive = true;
    setLoadingSchema(true);
    fetch(schemaUrl)
      .then(r => r.json())
      .then((json: FormSchema) => {
        if (!alive) return;
        setSchema(json);
        // initialize form data with defaults (if fields have default values) - not required here
      })
      .catch(err => {
        console.error('Failed to load schema', err);
      })
      .finally(() => setLoadingSchema(false));
    return () => { alive = false; };
  }, [schemaUrl]);

  // When external schema prop changes, update local schema
  useEffect(() => {
    if (schemaProp) setSchema(schemaProp);
  }, [schemaProp]);

  // update change log when formData changes
  const setField = (key: string, value: any) => {
    setFormData(prev => {
      const old = prev[key];
      if ((old ?? '') !== (value ?? '')) {
        setChangeLog(cl => [...cl, { key, oldValue: old, newValue: value, at: new Date().toISOString() }]);
      }
      return { ...prev, [key]: value };
    });
  };

  const validateField = (field: FieldSchema, value: any, data: Record<string, any>): string => {
    if (field.required && (value === undefined || value === null || value === '')) return 'This field is required.';
    if (field.pattern) {
      const re = new RegExp(field.pattern);
      if (!re.test(String(value ?? ''))) return 'Invalid format.';
    }
    switch (field.type) {
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      case 'number':
        return validateNumber(value, field.min, field.max);
      case 'bank':
        return validateBankName(value);
      case 'nric':
        return validateNRIC(value);
      default:
        return '';
    }
  };

  // Validate visible fields
  const runValidation = (data: Record<string, any>) => {
    const errs: Record<string, string> = {};
    if (!schema) return errs;
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        if (!checkDepends(field.dependsOn, data)) return; // skip hidden fields
        const err = validateField(field, data[field.key], data);
        if (err) errs[field.key] = err;
      });
    });
    return errs;
  };

  useEffect(() => {
    setErrors(runValidation(formData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, schema]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = runValidation(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Scroll to top to show validation summary
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // final data (include small audit)
    const payload = { ...formData, _changeLog: changeLog };
    onSubmit(payload);
  };

  if (!schema) {
    return (
      <div className="p-6">
        <div className="text-sm text-slate-600">{loadingSchema ? 'Loading form...' : 'No form schema available.'}</div>
        <div className="mt-4">
          <button onClick={onClose} className="px-3 py-2 bg-slate-100 rounded">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{schema.title ?? 'Dynamic Contract Form'}</h2>
            {schema.subtitle && <p className="text-xs text-slate-500">{schema.subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* validation summary */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded">
              <strong className="text-sm text-rose-700">Please fix the following issues:</strong>
              <ul className="mt-2 list-disc list-inside text-xs text-rose-700">
                {Object.entries(errors).map(([k, v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
              </ul>
            </div>
          )}

          {schema.sections.map(section => (
            <section key={section.id} className="bg-white rounded-lg border border-slate-100 shadow-sm p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-black text-slate-800">{section.title}</h3>
                  {section.description && <p className="text-xs text-slate-500">{section.description}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map(field => {
                  const visible = checkDepends(field.dependsOn, formData);
                  if (!visible) return null;
                  const Widget = (customWidgets && (customWidgets[field.type || 'text'])) || DefaultField;
                  return (
                    <div key={field.key}>
                      {field.type !== 'checkbox' && (
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-0.5">*</span>}
                        </label>
                      )}

                      <Widget
                        schema={field}
                        value={formData[field.key]}
                        onChange={v => setField(field.key, v)}
                        error={errors[field.key]}
                      />

                      {/* small helper for readonly */}
                      {field.readOnly && <p className="text-xs text-slate-400 mt-1">(Read-only)</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Footer */}
          <div className="pt-4 border-t flex justify-between items-center">
            <div className="text-xs text-slate-500">Changes recorded locally. HR will only be notified for flagged changes.</div>
            <div className="flex items-center space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-3 text-base font-bold text-white rounded-xl bg-gradient-to-r from-emerald-600 to-jade-600 shadow-lg">Submit & Complete</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractForm;
