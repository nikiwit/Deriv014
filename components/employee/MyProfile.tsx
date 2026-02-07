import React, { useState } from 'react';
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

interface ProfileData {
  phone: string;
  emergencyContact: string;
  emergencyPhone: string;
  address: string;
}

export const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    phone: '+60 12-345 6789',
    emergencyContact: 'Sarah Doe (Spouse)',
    emergencyPhone: '+60 12-987 6543',
    address: '123 Jalan Example, 50000 Kuala Lumpur, Malaysia',
  });

  const [editData, setEditData] = useState<ProfileData>({ ...profileData });

  const handleSave = () => {
    setProfileData({ ...editData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

  const infoSections = [
    {
      title: 'Personal Information',
      icon: <User size={18} />,
      fields: [
        { label: 'Full Name', value: `${user?.firstName} ${user?.lastName}`, editable: false },
        { label: 'Email', value: user?.email, editable: false, icon: <Mail size={14} /> },
        { label: 'Phone', value: profileData.phone, editable: true, key: 'phone', icon: <Phone size={14} /> },
        { label: 'Address', value: profileData.address, editable: true, key: 'address' },
      ],
    },
    {
      title: 'Employment Details',
      icon: <Building2 size={18} />,
      fields: [
        { label: 'Employee ID', value: user?.employeeId || 'EMP-2024-001', editable: false },
        { label: 'Department', value: user?.department, editable: false },
        { label: 'Start Date', value: user?.startDate || '2024-01-15', editable: false, icon: <Calendar size={14} /> },
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
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">My Profile</h1>
          <p className="text-slate-500 font-medium">View and update your personal information</p>
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
              className="flex items-center space-x-2 px-6 py-3 bg-jade-500 text-white rounded-xl font-bold hover:bg-jade-600 transition-all shadow-lg shadow-jade-500/20"
            >
              <Save size={18} />
              <span>Save Changes</span>
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
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 p-2 bg-derivhr-500 text-white rounded-xl shadow-lg hover:bg-derivhr-600 transition-all">
                  <Camera size={16} />
                </button>
              )}
            </div>

            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-slate-500 font-medium mb-4">{user?.department}</p>

            <div className="flex items-center justify-center space-x-2 text-sm">
              <span className={`px-3 py-1 rounded-full font-bold ${
                user?.onboardingComplete
                  ? 'bg-jade-100 text-jade-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {user?.onboardingComplete ? 'Active Employee' : 'Onboarding'}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {user?.startDate ? Math.floor((Date.now() - new Date(user.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0}
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
          {infoSections.map((section) => (
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
                        <input
                          type="text"
                          value={editData[field.key as keyof ProfileData] || ''}
                          onChange={(e) => setEditData({ ...editData, [field.key as string]: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 outline-none font-medium"
                        />
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

          {/* Bank Details (Read Only) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-xl text-slate-500 shadow-sm">
                  <CreditCard size={18} />
                </div>
                <h3 className="font-black text-slate-800">Bank Details</h3>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                Contact HR to update
              </span>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Bank Name
                  </label>
                  <p className="font-bold text-slate-800">Maybank</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Account Number
                  </label>
                  <p className="font-bold text-slate-800">**** **** 6789</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
