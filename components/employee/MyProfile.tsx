// import React, { useEffect, useMemo, useState } from 'react';
// import { useAuth } from '../../contexts/AuthContext';
// import {
//   User,
//   Mail,
//   Phone,
//   Building2,
//   Calendar,
//   CreditCard,
//   Shield,
//   Edit3,
//   Save,
//   X,
//   Camera,
//   AlertCircle
// } from 'lucide-react';

// interface StoredOnboardingProfile {
//   id?: string;
//   fullName?: string;
//   email?: string;
//   role?: string;
//   department?: string;
//   startDate?: string;
//   nationality?: 'Malaysian' | 'Non-Malaysian';
//   salary?: string;
//   nric?: string;
//   status?: string;
//   createdAt?: string;
//   aiPlan?: string;
//   // allow other fields (phone/address etc)
//   phone?: string;
//   emergencyContact?: string;
//   emergencyPhone?: string;
//   address?: string;
//   [k: string]: any;
// }

// interface ProfileData {
//   phone: string;
//   emergencyContact: string;
//   emergencyPhone: string;
//   address: string;
// }

// export const MyProfile: React.FC = () => {
//   const { user: authUser } = useAuth();
//   const [isEditing, setIsEditing] = useState(false);
//   const [profileSource, setProfileSource] = useState<'local' | 'auth' | 'none'>('none');
//   const [onboardingProfile, setOnboardingProfile] = useState<StoredOnboardingProfile | null>(null);

//   // editable contact/profile data (persisted to localStorage merged into onboardingProfile)
//   const [profileData, setProfileData] = useState<ProfileData>({
//     phone: '+60 12-345 6789',
//     emergencyContact: 'Sarah Doe (Spouse)',
//     emergencyPhone: '+60 12-987 6543',
//     address: '123 Jalan Example, 50000 Kuala Lumpur, Malaysia',
//   });

//   // local edit buffer while editing
//   const [editData, setEditData] = useState<ProfileData>({ ...profileData });

//   // helper: ensure onboarding profile has an id and createdAt
//   const ensureId = (p: StoredOnboardingProfile) => {
//     if (!p) return p;
//     if (!p.id) {
//       try {
//         // prefer crypto.randomUUID when available
//         // @ts-ignore
//         p.id = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
//       } catch {
//         p.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
//       }
//     }
//     if (!p.createdAt) p.createdAt = new Date().toISOString();
//     return p;
//   };

//   // load onboardingProfile from localStorage on mount; fallback to auth user
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem('onboardingProfile');
//       if (raw) {
//         const parsed = JSON.parse(raw) as StoredOnboardingProfile;
//         const withId = ensureId(parsed);
//         // persist back if id or createdAt were added
//         localStorage.setItem('onboardingProfile', JSON.stringify(withId));
//         setOnboardingProfile(withId);
//         // copy any contact fields present into profileData
//         setProfileData(prev => ({
//           ...prev,
//           phone: withId.phone ?? prev.phone,
//           emergencyContact: withId.emergencyContact ?? prev.emergencyContact,
//           emergencyPhone: withId.emergencyPhone ?? prev.emergencyPhone,
//           address: withId.address ?? prev.address
//         }));
//         setProfileSource('local');
//         setEditData({
//           phone: withId.phone ?? profileData.phone,
//           emergencyContact: withId.emergencyContact ?? profileData.emergencyContact,
//           emergencyPhone: withId.emergencyPhone ?? profileData.emergencyPhone,
//           address: withId.address ?? profileData.address
//         });
//         return;
//       }
//     } catch (e) {
//       console.warn('Failed to parse onboardingProfile from localStorage', e);
//     }

//     // fallback to auth context user
//     if (authUser) {
//       // map auth user fields into onboarding-shaped profile
//       const fallback: StoredOnboardingProfile = {
//         id: authUser.id ?? undefined,
//         fullName: [authUser.firstName, authUser.lastName].filter(Boolean).join(' ').trim() || undefined,
//         email: authUser.email,
//         role: typeof authUser.role === 'string' ? (authUser.role as string) : undefined,
//         department: authUser.department,
//         startDate: authUser.startDate,
//         nationality: authUser.nationality,
//         nric: (authUser as any).nric ?? undefined,
//       };
//       setOnboardingProfile(fallback);
//       setProfileSource('auth');
//       // do not write to localStorage automatically
//     } else {
//       setProfileSource('none');
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [authUser]);

//   // keep editData synced when profileData changes (non-edit mode)
//   useEffect(() => {
//     setEditData({ ...profileData });
//   }, [profileData]);

//   // derive display user fields (first/last name, email, etc) using onboardingProfile if present, otherwise authUser
//   const displayUser = useMemo(() => {
//     const src = onboardingProfile ?? (authUser ? {
//       id: authUser.id,
//       fullName: [authUser.firstName, authUser.lastName].filter(Boolean).join(' '),
//       email: authUser.email,
//       role: typeof authUser.role === 'string' ? authUser.role : '',
//       department: authUser.department,
//       startDate: authUser.startDate,
//       nationality: (authUser as any).nationality
//     } : null);

//     if (!src) return null;

//     // split fullName
//     const nameParts = (src.fullName || '').trim().split(/\s+/).filter(Boolean);
//     const firstName = nameParts[0] || '';
//     const lastName = nameParts.slice(1).join(' ') || '';

//     return {
//       id: src.id,
//       fullName: src.fullName || `${firstName} ${lastName}`.trim(),
//       firstName,
//       lastName,
//       email: src.email || '',
//       role: src.role || '',
//       department: src.department || '',
//       startDate: src.startDate || '',
//       nationality: src.nationality || 'Malaysian',
//       nric: src.nric || undefined,
//       onboardingComplete: src.status === 'completed' || src.status === 'active' || Boolean(src.onboardingComplete)
//     };
//   }, [onboardingProfile, authUser]);

//   const handleSave = () => {
//     // Merge edited contact fields back into onboardingProfile (and persist to localStorage)
//     const updatedProfile: StoredOnboardingProfile = {
//       ...(onboardingProfile ?? {}),
//       phone: editData.phone,
//       emergencyContact: editData.emergencyContact,
//       emergencyPhone: editData.emergencyPhone,
//       address: editData.address
//     };

//     ensureId(updatedProfile);
//     try {
//       localStorage.setItem('onboardingProfile', JSON.stringify(updatedProfile));
//       setOnboardingProfile(updatedProfile);
//       setProfileData({ ...editData });
//       setIsEditing(false);
//       setProfileSource('local');
//     } catch (e) {
//       console.error('Failed to save profile to localStorage', e);
//       alert('Failed to save profile locally.');
//     }
//   };

//   const handleCancel = () => {
//     // revert changes
//     setEditData({ ...profileData });
//     setIsEditing(false);
//   };

//   // helper: pretty days employed
//   const daysEmployed = useMemo(() => {
//     const sd = displayUser?.startDate;
//     if (!sd) return 0;
//     const start = new Date(sd).getTime();
//     if (Number.isNaN(start)) return 0;
//     return Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
//   }, [displayUser?.startDate]);

//   return (
//     <div className="space-y-8 animate-fade-in">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">My Profile</h1>
//           <p className="text-slate-500 font-medium">View and update your personal information</p>
//         </div>

//         {!isEditing ? (
//           <button
//             onClick={() => setIsEditing(true)}
//             className="flex items-center space-x-2 px-6 py-3 bg-derivhr-500 text-white rounded-xl font-bold hover:bg-derivhr-600 transition-all shadow-lg shadow-derivhr-500/20"
//           >
//             <Edit3 size={18} />
//             <span>Edit Profile</span>
//           </button>
//         ) : (
//           <div className="flex items-center space-x-3">
//             <button
//               onClick={handleCancel}
//               className="flex items-center space-x-2 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
//             >
//               <X size={18} />
//               <span>Cancel</span>
//             </button>
//             <button
//               onClick={handleSave}
//               className="flex items-center space-x-2 px-6 py-3 bg-jade-500 text-white rounded-xl font-bold hover:bg-jade-600 transition-all shadow-lg shadow-jade-500/20"
//             >
//               <Save size={18} />
//               <span>Save Changes</span>
//             </button>
//           </div>
//         )}
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Profile Card */}
//         <div className="lg:col-span-1">
//           <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 text-center">
//             {/* Avatar */}
//             <div className="relative inline-block mb-4">
//               <div className="w-28 h-28 bg-gradient-to-br from-jade-500 to-jade-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl">
//                 {displayUser?.firstName?.[0] ?? 'U'}{displayUser?.lastName?.[0] ?? ''}
//               </div>
//               {isEditing && (
//                 <button className="absolute bottom-0 right-0 p-2 bg-derivhr-500 text-white rounded-xl shadow-lg hover:bg-derivhr-600 transition-all">
//                   <Camera size={16} />
//                 </button>
//               )}
//             </div>

//             <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">
//               {displayUser?.firstName} {displayUser?.lastName}
//             </h2>
//             <p className="text-slate-500 font-medium mb-4">{displayUser?.department || '—'}</p>

//             <div className="flex items-center justify-center space-x-2 text-sm">
//               <span className={`px-3 py-1 rounded-full font-bold ${
//                 displayUser?.onboardingComplete
//                   ? 'bg-jade-100 text-jade-700'
//                   : 'bg-amber-100 text-amber-700'
//               }`}>
//                 {displayUser?.onboardingComplete ? 'Active Employee' : 'Onboarding'}
//               </span>
//             </div>

//             {/* Quick Stats */}
//             <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
//               <div>
//                 <p className="text-2xl font-black text-slate-900">
//                   {daysEmployed}
//                 </p>
//                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days Employed</p>
//               </div>
//               <div>
//                 <p className="text-2xl font-black text-slate-900">8</p>
//                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leave Days Left</p>
//               </div>
//             </div>
//           </div>

//           {/* Security Card */}
//           <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 mt-6">
//             <div className="flex items-center space-x-3 mb-4">
//               <div className="p-2 bg-purple-50 rounded-xl">
//                 <Shield className="text-purple-500" size={20} />
//               </div>
//               <h3 className="font-black text-slate-800">Security</h3>
//             </div>

//             <div className="space-y-3">
//               <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
//                 <p className="font-bold text-slate-800 text-sm">Change Password</p>
//                 <p className="text-xs text-slate-500">Last changed 30 days ago</p>
//               </button>
//               <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
//                 <p className="font-bold text-slate-800 text-sm">Two-Factor Authentication</p>
//                 <p className="text-xs text-jade-600 font-bold">Enabled</p>
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Info Sections */}
//         <div className="lg:col-span-2 space-y-6">
//           {[
//             {
//               title: 'Personal Information',
//               icon: <User size={18} />,
//               fields: [
//                 { label: 'Full Name', value: displayUser?.fullName || '—', editable: false },
//                 { label: 'Email', value: displayUser?.email || '—', editable: false, icon: <Mail size={14} /> },
//                 { label: 'Phone', value: profileData.phone, editable: true, key: 'phone', icon: <Phone size={14} /> },
//                 { label: 'Address', value: profileData.address, editable: true, key: 'address' },
//               ],
//             },
//             {
//               title: 'Employment Details',
//               icon: <Building2 size={18} />,
//               fields: [
//                 { label: 'Employee ID', value: displayUser?.id || '—', editable: false },
//                 { label: 'Department', value: displayUser?.department || '—', editable: false },
//                 { label: 'Start Date', value: displayUser?.startDate || '—', editable: false, icon: <Calendar size={14} /> },
//                 { label: 'Employment Type', value: 'Full-time', editable: false },
//               ],
//             },
//             {
//               title: 'Emergency Contact',
//               icon: <AlertCircle size={18} />,
//               fields: [
//                 { label: 'Contact Person', value: profileData.emergencyContact, editable: true, key: 'emergencyContact' },
//                 { label: 'Contact Number', value: profileData.emergencyPhone, editable: true, key: 'emergencyPhone', icon: <Phone size={14} /> },
//               ],
//             },
//           ].map((section) => (
//             <div key={section.title} className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
//               <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center space-x-3">
//                 <div className="p-2 bg-white rounded-xl text-slate-500 shadow-sm">
//                   {section.icon}
//                 </div>
//                 <h3 className="font-black text-slate-800">{section.title}</h3>
//               </div>

//               <div className="p-6">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   {section.fields.map((field) => (
//                     <div key={field.label}>
//                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
//                         {field.label}
//                       </label>
//                       {isEditing && field.editable ? (
//                         <input
//                           type="text"
//                           value={editData[field.key as keyof ProfileData] || ''}
//                           onChange={(e) => setEditData({ ...editData, [field.key as string]: e.target.value })}
//                           className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-medium"
//                         />
//                       ) : (
//                         <div className="flex items-center space-x-2">
//                           {field.icon && <span className="text-slate-400">{field.icon}</span>}
//                           <p className="font-bold text-slate-800">{field.value}</p>
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           ))}

//           {/* Bank Details (Read Only) */}
//           <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
//             <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
//               <div className="flex items-center space-x-3">
//                 <div className="p-2 bg-white rounded-xl text-slate-500 shadow-sm">
//                   <CreditCard size={18} />
//                 </div>
//                 <h3 className="font-black text-slate-800">Bank Details</h3>
//               </div>
//               <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
//                 Contact HR to update
//               </span>
//             </div>

//             <div className="p-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
//                     Bank Name
//                   </label>
//                   <p className="font-bold text-slate-800">Maybank</p>
//                 </div>
//                 <div>
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
//                     Account Number
//                   </label>
//                   <p className="font-bold text-slate-800">**** **** 6789</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div> 
//     </div>
//   );
// };

// export default MyProfile;



import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  CreditCard,
  Shield,
  Edit3,
  Save,
  X,
  Camera,
  AlertCircle
} from 'lucide-react';

interface StoredOnboardingProfile {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
  department?: string;
  startDate?: string;
  nationality?: 'Malaysian' | 'Non-Malaysian';
  salary?: string;
  nric?: string;
  status?: string;
  createdAt?: string;
  aiPlan?: string;
  // allow other fields (phone/address etc)
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  bankName?: string;
  accountNumber?: string;
  changeLog?: Array<{ field: string; oldValue: any; newValue: any; at: string }>;
  [k: string]: any;
}

interface ProfileData {
  phone: string;
  emergencyContact: string;
  emergencyPhone: string;
  address: string;
  bankName?: string;
  accountNumber?: string;
}


const KNOWN_BANKS = [
  // 🇲🇾 Malaysia
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

  // 🇸🇬 Singapore
  'DBS',
  'POSB',
  'OCBC',
  'UOB',
  'Standard Chartered Singapore',
  'HSBC Singapore',
  'Citibank Singapore'
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/berhad|bank|malaysia|singapore|bhd|limited|ltd/g, '')
    .replace(/[^a-z]/g, '')
    .trim();

const similarity = (a: string, b: string) => {
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / Math.max(a.length, b.length);
};

type ValidationError = { field: keyof ProfileData | 'bankName' | 'accountNumber'; message: string };

export const MyProfile: React.FC = () => {
  const { user: authUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileSource, setProfileSource] = useState<'local' | 'auth' | 'none'>('none');
  const [onboardingProfile, setOnboardingProfile] = useState<StoredOnboardingProfile | null>(null);

  // editable contact/profile data (persisted to localStorage merged into onboardingProfile)
  const [profileData, setProfileData] = useState<ProfileData>({
    phone: '+60 12-345 6789',
    emergencyContact: 'Sarah Doe (Spouse)',
    emergencyPhone: '+60 12-987 6543',
    address: '123 Jalan Example, 50000 Kuala Lumpur, Malaysia',
    bankName: 'Maybank',
    accountNumber: '******6789'
  });

  // local edit buffer while editing
  const [editData, setEditData] = useState<ProfileData>({ ...profileData });

  // validation state
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // helper: ensure onboarding profile has an id and createdAt
  const ensureId = (p: StoredOnboardingProfile) => {
    if (!p) return p;
    if (!p.id) {
      try {
        // prefer crypto.randomUUID when available
        // @ts-ignore
        p.id = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      } catch {
        p.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
    }
    if (!p.createdAt) p.createdAt = new Date().toISOString();
    return p;
  };

  // load onboardingProfile from localStorage on mount; fallback to auth user
  useEffect(() => {
    try {
      const raw = localStorage.getItem('onboardingProfile');
      if (raw) {
        const parsed = JSON.parse(raw) as StoredOnboardingProfile;
        const withId = ensureId(parsed);
        // persist back if id or createdAt were added
        localStorage.setItem('onboardingProfile', JSON.stringify(withId));
        setOnboardingProfile(withId);
        // copy any contact fields present into profileData
        setProfileData(prev => ({
          ...prev,
          phone: withId.phone ?? prev.phone,
          emergencyContact: withId.emergencyContact ?? prev.emergencyContact,
          emergencyPhone: withId.emergencyPhone ?? prev.emergencyPhone,
          address: withId.address ?? prev.address,
          bankName: withId.bankName ?? prev.bankName,
          accountNumber: withId.accountNumber ?? prev.accountNumber
        }));
        setProfileSource('local');
        setEditData({
          phone: withId.phone ?? profileData.phone,
          emergencyContact: withId.emergencyContact ?? profileData.emergencyContact,
          emergencyPhone: withId.emergencyPhone ?? profileData.emergencyPhone,
          address: withId.address ?? profileData.address,
          bankName: withId.bankName ?? profileData.bankName,
          accountNumber: withId.accountNumber ?? profileData.accountNumber
        });
        return;
      }
    } catch (e) {
      console.warn('Failed to parse onboardingProfile from localStorage', e);
    }

    // fallback to auth context user
    if (authUser) {
      // map auth user fields into onboarding-shaped profile
      const fallback: StoredOnboardingProfile = {
        id: authUser.id ?? undefined,
        fullName: [authUser.firstName, authUser.lastName].filter(Boolean).join(' ').trim() || undefined,
        email: authUser.email,
        role: typeof authUser.role === 'string' ? (authUser.role as string) : undefined,
        department: authUser.department,
        startDate: authUser.startDate,
        nationality: authUser.nationality,
        nric: (authUser as any).nric ?? undefined,
      };
      setOnboardingProfile(fallback);
      setProfileSource('auth');
      // do not write to localStorage automatically
    } else {
      setProfileSource('none');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  // keep editData synced when profileData changes (non-edit mode)
  useEffect(() => {
    setEditData({ ...profileData });
  }, [profileData]);

  // derive display user fields (first/last name, email, etc) using onboardingProfile if present, otherwise authUser
  const displayUser = useMemo(() => {
    const src = onboardingProfile ?? (authUser ? {
      id: authUser.id,
      fullName: [authUser.firstName, authUser.lastName].filter(Boolean).join(' '),
      email: authUser.email,
      role: typeof authUser.role === 'string' ? authUser.role : '',
      department: authUser.department,
      startDate: authUser.startDate,
      nationality: (authUser as any).nationality
    } : null);

    if (!src) return null;

    // split fullName
    const nameParts = (src.fullName || '').trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      id: src.id,
      fullName: src.fullName || `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      email: src.email || '',
      role: src.role || '',
      department: src.department || '',
      startDate: src.startDate || '',
      nationality: src.nationality || 'Malaysian',
      nric: src.nric || undefined,
      onboardingComplete: src.status === 'completed' || src.status === 'active' || Boolean(src.onboardingComplete)
    };
  }, [onboardingProfile, authUser]);

  const handleSave = () => {
    // run validation one last time before saving
    const validation = runAllValidations(editData, profileData);
    setErrors(validation);
    if (validation.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    // Merge edited contact fields back into onboardingProfile (and persist to localStorage)
    const updatedProfile: StoredOnboardingProfile = {
      ...(onboardingProfile ?? {}),
      phone: editData.phone,
      emergencyContact: editData.emergencyContact,
      emergencyPhone: editData.emergencyPhone,
      address: editData.address,
      bankName: editData.bankName,
      accountNumber: editData.accountNumber
    };

    ensureId(updatedProfile);

    try {
      // Add change log entries for audit (so HR can review but doesn't have to manually chase emails)
      const changes: StoredOnboardingProfile['changeLog'] = updatedProfile.changeLog ?? [];
      (Object.keys(editData) as Array<keyof ProfileData>).forEach((k) => {
        const oldVal = (profileData as any)[k];
        const newVal = (editData as any)[k];
        if ((oldVal ?? '') !== (newVal ?? '')) {
          changes.push({ field: String(k), oldValue: oldVal, newValue: newVal, at: new Date().toISOString() });
        }
      });
      updatedProfile.changeLog = changes;

      localStorage.setItem('onboardingProfile', JSON.stringify(updatedProfile));
      setOnboardingProfile(updatedProfile);
      setProfileData({ ...editData });
      setIsEditing(false);
      setProfileSource('local');
    } catch (e) {
      console.error('Failed to save profile to localStorage', e);
      alert('Failed to save profile locally.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // revert changes
    setEditData({ ...profileData });
    setErrors([]);
    setIsEditing(false);
  };

  // helper: pretty days employed
  const daysEmployed = useMemo(() => {
    const sd = displayUser?.startDate;
    if (!sd) return 0;
    const start = new Date(sd).getTime();
    if (Number.isNaN(start)) return 0;
    return Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
  }, [displayUser?.startDate]);

  // validations: lightweight, deterministic, explainable (no external API calls)
  const phoneDigits = (s: string) => (s || '').replace(/[^0-9]/g, '');

  const validatePhone = (value?: string) => {
    if (!value || value.trim().length === 0) return 'Phone is required.';
    const digits = phoneDigits(value);
    if (digits.length < 7 || digits.length > 15) return 'Phone must have between 7 and 15 digits.';
    if (!/^\+?[0-9\s\-()]+$/.test(value)) return 'Phone contains invalid characters.';
    return '';
  };

  const validateEmergencyContact = (value?: string) => {
    if (!value || value.trim().length === 0) return 'Emergency contact is required.';
    if (value.trim().length < 3) return 'Emergency contact looks too short.';
    if (value.trim().toUpperCase() === value.trim() && /[A-Z]/.test(value)) return 'Emergency contact should not be ALL CAPS.';
    return '';
  };

  const validateAddress = (value?: string) => {
    if (!value || value.trim().length === 0) return 'Address is required.';
    if (value.trim().length < 10) return 'Address looks too short.';
    // simple geographic hint: require at least one word that looks like a street or locality
    const streetKeywords = ['jalan', 'lorong', 'road', 'street', 'avenue', 'jalan\.', 'blok', 'block', 'no', 'lot', 'taman', 'kampung', 'village'];
    const re = new RegExp(streetKeywords.join('|'), 'i');
    if (!re.test(value) && !/\d{3,}/.test(value)) {
      return 'Address should include a street or area name (e.g. Jalan, Lorong, Road) or a postal/house number.';
    }

    // grammar-ish checks: sentence case and no excessive punctuation
    if (/[^\x00-\x7F]/.test(value) && value.length < 20) {
      // allow unicode but enforce length
      return '';
    }
    if (/\.{3,}|!!!+|\?\?+/.test(value)) return 'Please avoid excessive punctuation.';
    if (/ {2,}/.test(value)) return 'Please remove repeated spaces.';
    return '';
  };

  const validateAccountNumber = (value?: string) => {
    if (!value || value.trim().length === 0) return 'Account number is required.';
    const digits = (value || '').replace(/\s+/g, '');
    if (!/^\d{6,20}$/.test(digits)) return 'Account number should be 6–20 digits (numbers only).';
    // we intentionally do not rely on a single-country checksum — this is a generic check
    return '';
  };
  
  const validateBankName = (value?: string) => {
  if (!value || value.trim().length === 0) {
    return 'Bank name is required.';
  }

  const raw = value.trim();
  if (raw.length < 2) {
    return 'Bank name looks too short.';
  }

  const norm = normalize(raw);

  const bestMatch = KNOWN_BANKS
    .map(bank => ({
      bank,
      score: similarity(norm, normalize(bank))
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (!bestMatch || bestMatch.score < 0.45) {
    return 'Bank name does not match any supported Malaysian or Singapore bank.';
  }

  return '';
};


  const runAllValidations = (candidate: ProfileData, original: ProfileData) => {
    const out: ValidationError[] = [];
    const phoneErr = validatePhone(candidate.phone);
    if (phoneErr) out.push({ field: 'phone', message: phoneErr });

    const emergNameErr = validateEmergencyContact(candidate.emergencyContact);
    if (emergNameErr) out.push({ field: 'emergencyContact', message: emergNameErr });

    const emergPhoneErr = validatePhone(candidate.emergencyPhone);
    if (emergPhoneErr) out.push({ field: 'emergencyPhone', message: emergPhoneErr });

    if (phoneDigits(candidate.phone) && phoneDigits(candidate.emergencyPhone) && phoneDigits(candidate.phone) === phoneDigits(candidate.emergencyPhone)) {
      out.push({ field: 'emergencyPhone', message: 'Emergency phone should be different from your main phone.' });
    }

    const addrErr = validateAddress(candidate.address);
    if (addrErr) out.push({ field: 'address', message: addrErr });

    // bank validations only if user actually changed bank fields (so we don't force re-entering masked values)
    if ((candidate.bankName ?? '') !== (original.bankName ?? '') || (candidate.accountNumber ?? '') !== (original.accountNumber ?? '')) {
      const bn = (candidate.bankName || '').trim();
      if (bn.length < 2) out.push({ field: 'bankName', message: 'Bank name looks too short.' });
      const bankNameErr = validateBankName(candidate.bankName);
      if (bankNameErr) out.push({ field: 'bankName', message: bankNameErr });
      const accErr = validateAccountNumber(candidate.accountNumber);
      if (accErr) out.push({ field: 'accountNumber', message: accErr });
    }

    return out;
  };

  // run lightweight live validation while editing
  useEffect(() => {
    if (!isEditing) return;
    const v = runAllValidations(editData, profileData);
    setErrors(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editData, isEditing]);

  const getError = (field: string) => errors.find(e => e.field === field)?.message || '';

  // UI helper to show a small error component
  const FieldError: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <p className="text-xs text-rose-600 mt-2 font-medium">{children}</p>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">My Profile</h1>
          <p className="text-slate-500 font-medium">View and update your personal information — validated locally to avoid HR tickets.</p>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-derivhr-500 text-white rounded-xl font-bold hover:bg-derivhr-600 transition-all shadow-lg shadow-derivhr-500/20"
          >
            <Edit3 size={18} />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="flex items-center space-x-2 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              <X size={18} />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={errors.length > 0 || isSaving}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all ${errors.length > 0 || isSaving ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-jade-500 text-white hover:bg-jade-600 shadow-lg shadow-jade-500/20'}`}
            >
              <Save size={18} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 text-center">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <div className="w-28 h-28 bg-gradient-to-br from-jade-500 to-jade-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl">
                {displayUser?.firstName?.[0] ?? 'U'}{displayUser?.lastName?.[0] ?? ''}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 p-2 bg-derivhr-500 text-white rounded-xl shadow-lg hover:bg-derivhr-600 transition-all">
                  <Camera size={16} />
                </button>
              )}
            </div>

            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">
              {displayUser?.firstName} {displayUser?.lastName}
            </h2>
            <p className="text-slate-500 font-medium mb-4">{displayUser?.department || '—'}</p>

            <div className="flex items-center justify-center space-x-2 text-sm">
              <span className={`px-3 py-1 rounded-full font-bold ${
                displayUser?.onboardingComplete
                  ? 'bg-jade-100 text-jade-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {displayUser?.onboardingComplete ? 'Active Employee' : 'Onboarding'}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {daysEmployed}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days Employed</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">8</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leave Days Left</p>
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 mt-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-50 rounded-xl">
                <Shield className="text-purple-500" size={20} />
              </div>
              <h3 className="font-black text-slate-800">Security</h3>
            </div>

            <div className="space-y-3">
              <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
                <p className="font-bold text-slate-800 text-sm">Change Password</p>
                <p className="text-xs text-slate-500">Last changed 30 days ago</p>
              </button>
              <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
                <p className="font-bold text-slate-800 text-sm">Two-Factor Authentication</p>
                <p className="text-xs text-jade-600 font-bold">Enabled</p>
              </button>
            </div>
          </div>
        </div>

        {/* Info Sections */}
        <div className="lg:col-span-2 space-y-6">
          {[
            {
              title: 'Personal Information',
              icon: <User size={18} />,
              fields: [
                { label: 'Full Name', value: displayUser?.fullName || '—', editable: false },
                { label: 'Email', value: displayUser?.email || '—', editable: false, icon: <Mail size={14} /> },
                { label: 'Phone', value: profileData.phone, editable: true, key: 'phone', icon: <Phone size={14} /> },
                { label: 'Address', value: profileData.address, editable: true, key: 'address' },
              ],
            },
            {
              title: 'Employment Details',
              icon: <Building2 size={18} />,
              fields: [
                { label: 'Employee ID', value: displayUser?.id || '—', editable: false },
                { label: 'Department', value: displayUser?.department || '—', editable: false },
                { label: 'Start Date', value: displayUser?.startDate || '—', editable: false, icon: <Calendar size={14} /> },
                { label: 'Employment Type', value: 'Full-time', editable: false },
              ],
            },
            {
              title: 'Emergency Contact',
              icon: <AlertCircle size={18} />,
              fields: [
                { label: 'Contact Person', value: profileData.emergencyContact, editable: true, key: 'emergencyContact' },
                { label: 'Contact Number', value: profileData.emergencyPhone, editable: true, key: 'emergencyPhone', icon: <Phone size={14} /> },
              ],
            },
          ].map((section) => (
            <div key={section.title} className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center space-x-3">
                <div className="p-2 bg-white rounded-xl text-slate-500 shadow-sm">
                  {section.icon}
                </div>
                <h3 className="font-black text-slate-800">{section.title}</h3>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {section.fields.map((field) => (
                    <div key={field.label}>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        {field.label}
                      </label>
                      {isEditing && field.editable ? (
                        <>
                          <input
                            type="text"
                            value={editData[field.key as keyof ProfileData] || ''}
                            onChange={(e) => setEditData({ ...editData, [field.key as string]: e.target.value })}
                            className={`w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-medium ${getError(field.key as string) ? 'border-rose-300' : 'border-slate-200'}`}
                          />
                          {getError(field.key as string) && <FieldError>{getError(field.key as string)}</FieldError>}
                        </>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {field.icon && <span className="text-slate-400">{field.icon}</span>}
                          <p className="font-bold text-slate-800">{field.value}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Bank Details (now editable with validation + audit trail) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-xl text-slate-500 shadow-sm">
                  <CreditCard size={18} />
                </div>
                <h3 className="font-black text-slate-800">Bank Details</h3>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                Changes are validated and recorded (no HR ticket needed)
              </span>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Bank Name
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editData.bankName || ''}
                        onChange={(e) => setEditData({ ...editData, bankName: e.target.value })}
                        className={`w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-medium ${getError('bankName') ? 'border-rose-300' : 'border-slate-200'}`}
                      />
                      {getError('bankName') && <FieldError>{getError('bankName')}</FieldError>}
                    </>
                  ) : (
                    <p className="font-bold text-slate-800">{profileData.bankName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Account Number
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editData.accountNumber || ''}
                        onChange={(e) => setEditData({ ...editData, accountNumber: e.target.value })}
                        className={`w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-medium ${getError('accountNumber') ? 'border-rose-300' : 'border-slate-200'}`}
                      />
                      {getError('accountNumber') && <FieldError>{getError('accountNumber')}</FieldError>}
                    </>
                  ) : (
                    <p className="font-bold text-slate-800">{profileData.accountNumber}</p>
                  )}
                </div>
              </div>

              {/* change log preview */}
              {onboardingProfile?.changeLog && onboardingProfile.changeLog.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl text-sm">
                  <strong className="block text-slate-700">Recent changes</strong>
                  <ul className="mt-2 text-slate-600 text-xs list-inside list-disc">
                    {onboardingProfile.changeLog.slice(-5).reverse().map((c, i) => (
                      <li key={i}>{c.field} updated on {new Date(c.at).toLocaleString()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;

