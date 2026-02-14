import React, { useState, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  XCircle,
  Copy,
  Check
} from 'lucide-react';
import { getOfferLetter, acceptOfferLetter, rejectOfferLetter } from '../../services/api';

export const StandaloneOfferView: React.FC = () => {
  // Extract employeeId from URL path: /offer/{employeeId}
  const pathMatch = window.location.pathname.match(/^\/offer\/([a-f0-9-]+)$/i);
  const employeeId = pathMatch?.[1] || null;
  
  const [offerData, setOfferData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionComplete, setActionComplete] = useState<'accepted' | 'rejected' | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadOfferData();
  }, [employeeId]);

  const loadOfferData = async () => {
    if (!employeeId) {
      setError('Invalid offer link');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getOfferLetter(employeeId);
      setOfferData(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading offer:', err);
      setError(err.message || 'Failed to load offer letter');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!employeeId) return;
    
    setActionLoading(true);
    try {
      await acceptOfferLetter(employeeId);
      setActionComplete('accepted');
    } catch (err: any) {
      console.error('Error accepting offer:', err);
      alert(`Failed to accept offer: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!employeeId || !rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setActionLoading(true);
    try {
      await rejectOfferLetter(employeeId, rejectReason);
      setActionComplete('rejected');
      setShowRejectDialog(false);
    } catch (err: any) {
      console.error('Error rejecting offer:', err);
      alert(`Failed to reject offer: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Loading Offer Letter...</h2>
          <p className="text-sm text-slate-600">Please wait while we retrieve your offer details.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Offer</h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <p className="text-xs text-slate-500">
            Please check the link or contact HR for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Accepted state
  if (actionComplete === 'accepted') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="text-jade-500 mx-auto mb-4" size={64} />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Offer Accepted!</h2>
          <p className="text-sm text-slate-600 mb-6">
            Congratulations! You have successfully accepted the offer. Your employee account has been created.
          </p>
          <div className="bg-jade-50 border border-jade-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-jade-800">
              <strong>Next Steps:</strong>
            </p>
            <ul className="text-sm text-jade-700 mt-2 space-y-1 text-left">
              <li>• HR will contact you with onboarding details</li>
              <li>• You will receive login credentials via email</li>
              <li>• Complete your onboarding checklist before your start date</li>
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            You can close this page now.
          </p>
        </div>
      </div>
    );
  }

  // Rejected state
  if (actionComplete === 'rejected') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="text-orange-500 mx-auto mb-4" size={64} />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Offer Declined</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your response has been recorded. HR has been notified and will contact you if needed.
          </p>
          <p className="text-xs text-slate-500">
            Thank you for your time. You can close this page now.
          </p>
        </div>
      </div>
    );
  }

  // Main offer display
  const offer = offerData?.offer_data || {};

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-jade-500 to-jade-600 px-8 py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">
                  Employment Offer Letter
                </h1>
                <p className="text-white/80 text-sm font-medium mt-1">
                  Please review and respond to your offer
                </p>
              </div>
            </div>
          </div>

          {/* Offer Details */}
          <div className="p-8 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {offer.full_name}
              </h2>
              <p className="text-slate-600">{offer.email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                  Personal Information
                </h3>
                <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                  <div>
                    <label className="text-xs text-slate-500">Full Name</label>
                    <p className="text-sm font-bold text-slate-900">{offer.full_name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Email</label>
                    <p className="text-sm font-bold text-slate-900">{offer.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Nationality</label>
                    <p className="text-sm font-bold text-slate-900">{offer.nationality}</p>
                  </div>
                  {offer.date_of_birth && (
                    <div>
                      <label className="text-xs text-slate-500">Date of Birth</label>
                      <p className="text-sm font-bold text-slate-900">{offer.date_of_birth}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Employment Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                  Employment Details
                </h3>
                <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                  <div>
                    <label className="text-xs text-slate-500">Position</label>
                    <p className="text-sm font-bold text-slate-900">{offer.position_title}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Department</label>
                    <p className="text-sm font-bold text-slate-900">{offer.department}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Start Date</label>
                    <p className="text-sm font-bold text-slate-900">{offer.start_date}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Monthly Salary</label>
                    <p className="text-sm font-bold text-slate-900">{offer.salary} MYR</p>
                  </div>
                </div>
              </div>

              {/* Work Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                  Work Details
                </h3>
                <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                  {offer.work_location && (
                    <div>
                      <label className="text-xs text-slate-500">Work Location</label>
                      <p className="text-sm font-bold text-slate-900">{offer.work_location}</p>
                    </div>
                  )}
                  {offer.work_hours && (
                    <div>
                      <label className="text-xs text-slate-500">Work Hours</label>
                      <p className="text-sm font-bold text-slate-900">{offer.work_hours}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-500">Annual Leave</label>
                    <p className="text-sm font-bold text-slate-900">{offer.leave_annual_days || 14} days</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Sick Leave</label>
                    <p className="text-sm font-bold text-slate-900">{offer.leave_sick_days || 14} days</p>
                  </div>
                </div>
              </div>

              {/* Banking Details */}
              {offer.bank_name && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                    Banking Details
                  </h3>
                  <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                    <div>
                      <label className="text-xs text-slate-500">Bank Name</label>
                      <p className="text-sm font-bold text-slate-900">{offer.bank_name}</p>
                    </div>
                    {offer.bank_account_holder && (
                      <div>
                        <label className="text-xs text-slate-500">Account Holder</label>
                        <p className="text-sm font-bold text-slate-900">{offer.bank_account_holder}</p>
                      </div>
                    )}
                    {offer.bank_account_number && (
                      <div>
                        <label className="text-xs text-slate-500">Account Number</label>
                        <p className="text-sm font-bold text-slate-900">{offer.bank_account_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={actionLoading}
              className="px-6 py-3 border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              <XCircle size={18} />
              <span>Decline Offer</span>
            </button>

            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="px-8 py-3 bg-gradient-to-r from-jade-500 to-jade-600 text-white rounded-xl font-bold shadow-lg shadow-jade-500/25 hover:shadow-xl transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {actionLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Accept Offer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !actionLoading && setShowRejectDialog(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Decline Offer
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for declining this offer. This will help us improve our process.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter your reason here..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
              rows={4}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowRejectDialog(false)}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
