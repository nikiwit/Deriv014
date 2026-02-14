import React, { useState, useEffect } from 'react';
import { 
  Search, User, AlertCircle, CheckCircle, XCircle, 
  FileText, ChevronRight, ChevronLeft, MessageCircle,
  RefreshCw, Send, Clock, Shield, Building, ArrowLeft
} from 'lucide-react';
import HRChatAgent from './HRChatAgent';

type WorkflowStage = 'input' | 'checking' | 'not_found' | 'review' | 'accepted' | 'signing' | 'disputed' | 'completed' | 'already_onboarded';

interface EmployeeData {
  id: string;
  full_name: string;
  nric: string;
  passport_no: string;
  email: string;
  phone: string;
  address: string;
  jurisdiction: string;
  employment_type: string;
  status: string;
  offer_letter?: OfferLetter;
}

interface OfferLetter {
  position: string;
  department: string;
  start_date: string;
  salary: number;
  currency: string;
  employment_type: string;
  probation_months: number;
  reporting_to: string;
  work_location: string;
  medical_coverage: string;
  annual_leave_days: number;
}

interface ReviewItem {
  category: string;
  fields: { label: string; value: string }[];
}

const API_BASE = '/api/onboarding-workflow';

export const OnboardingJourney: React.FC = () => {
  const [stage, setStage] = useState<WorkflowStage>('input');
  const [loading, setLoading] = useState(false);
  
  const [nric, setNric] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [jurisdiction, setJurisdiction] = useState<'MY' | 'SG'>('MY');
  
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [disputeId, setDisputeId] = useState('');
  const [generatedDocs, setGeneratedDocs] = useState<{id: string; type: string; name: string; status: string}[]>([]);
  const [signingDocIndex, setSigningDocIndex] = useState(0);
  
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const checkNRIC = async () => {
    if (jurisdiction === 'MY' && !nric.trim()) {
      setError('Please enter your NRIC number');
      return;
    }
    if (jurisdiction === 'SG' && !passportNo.trim()) {
      setError('Please enter your Passport number');
      return;
    }

    setLoading(true);
    setError('');
    setStage('checking');

    try {
      const response = await fetch(`${API_BASE}/check-nric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nric: nric.toUpperCase(),
          passport_no: passportNo.toUpperCase(),
          jurisdiction,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.found) {
          setEmployee(data.employee);
          if (data.stage === 'already_onboarded') {
            setStage('already_onboarded');
          } else {
            setStage('review');
            await fetchReviewData(data.employee.id);
          }
        } else {
          setStage('not_found');
        }
      } else {
        setError(data.error || 'An error occurred');
        setStage('input');
      }
    } catch (err) {
      setError('Failed to verify. Please try again.');
      setStage('input');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewData = async (employeeId: string) => {
    try {
      const response = await fetch(`${API_BASE}/review-offer/${employeeId}`);
      const data = await response.json();
      if (data.success) {
        setReviewItems(data.review_items || []);
      }
    } catch (err) {
      console.error('Failed to fetch review data:', err);
    }
  };

  const notifyHR = async () => {
    if (!notifyMessage.trim()) {
      setError('Please provide additional information');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/notify-hr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nric: nric.toUpperCase(),
          passport_no: passportNo.toUpperCase(),
          jurisdiction,
          message: notifyMessage,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage(data.message);
      }
    } catch (err) {
      setError('Failed to notify HR. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const acceptOffer = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employee.id }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage(data.message);
        
        const docsResponse = await fetch(`${API_BASE}/generate-documents/${employee.id}`, {
          method: 'POST',
        });
        const docsData = await docsResponse.json();
        
        if (docsData.success && docsData.documents) {
          const docs = docsData.documents.map((doc: any) => ({
            id: doc.contract_id || doc.id,
            type: doc.document_type,
            name: doc.document_name || doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            status: 'pending'
          }));
          setGeneratedDocs(docs);
          setStage('signing');
        } else {
          setStage('accepted');
        }
      } else {
        setError(data.error || 'Failed to accept offer');
      }
    } catch (err) {
      setError('Failed to accept offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const disputeOffer = async () => {
    if (!employee) return;
    if (!disputeReason.trim()) {
      setError('Please select a reason for dispute');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/dispute-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          dispute_reason: disputeReason,
          dispute_details: disputeDetails,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDisputeId(data.dispute_id);
        setStage('disputed');
        setShowChat(true);
      } else {
        setError(data.error || 'Failed to submit dispute');
      }
    } catch (err) {
      setError('Failed to submit dispute. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetWorkflow = () => {
    setStage('input');
    setNric('');
    setPassportNo('');
    setEmployee(null);
    setReviewItems([]);
    setError('');
    setSuccessMessage('');
    setDisputeReason('');
    setDisputeDetails('');
    setNotifyMessage('');
    setShowChat(false);
    setDisputeId('');
    setGeneratedDocs([]);
    setSigningDocIndex(0);
  };

  const renderInputStage = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome to Onboarding</h2>
          <p className="text-gray-500 mt-2">Enter your ID to begin your onboarding journey</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jurisdiction</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setJurisdiction('MY')}
                className={`p-4 border-2 rounded-lg text-center transition ${
                  jurisdiction === 'MY' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">🇲🇾</span>
                <p className="mt-1 font-medium">Malaysia</p>
              </button>
              <button
                onClick={() => setJurisdiction('SG')}
                className={`p-4 border-2 rounded-lg text-center transition ${
                  jurisdiction === 'SG' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">🇸🇬</span>
                <p className="mt-1 font-medium">Singapore</p>
              </button>
            </div>
          </div>

          {jurisdiction === 'MY' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NRIC Number
              </label>
              <input
                type="text"
                value={nric}
                onChange={(e) => setNric(e.target.value.toUpperCase())}
                placeholder="e.g., 900101-01-1234"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={14}
              />
              <p className="text-xs text-gray-500 mt-1">Enter your 12-digit NRIC number</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passport Number
              </label>
              <input
                type="text"
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value.toUpperCase())}
                placeholder="e.g., A1234567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Enter your passport number</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            onClick={checkNRIC}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotFoundStage = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Record Not Found</h2>
          <p className="text-gray-500 mt-2">
            We couldn't find an onboarding record for {jurisdiction === 'MY' ? `NRIC: ${nric}` : `Passport: ${passportNo}`}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">Possible reasons:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Your onboarding hasn't been initiated yet</li>
            <li>• There might be a typo in your ID number</li>
            <li>• Your record may be under a different ID</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional information (optional)
            </label>
            <textarea
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              placeholder="Please provide your name, email, or any additional information..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={notifyHR}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Notify HR
          </button>

          <button
            onClick={resetWorkflow}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Try Again
          </button>
        </div>

        {successMessage && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderReviewStage = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <h2 className="text-2xl font-bold">Review Your Offer</h2>
          <p className="text-blue-100 mt-1">Please review the details below carefully</p>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{employee?.full_name}</h3>
              <p className="text-gray-500">{employee?.offer_letter?.position} • {employee?.offer_letter?.department}</p>
            </div>
          </div>

          <div className="flex border-b mb-6">
            {reviewItems.map((item, index) => (
              <button
                key={item.category}
                onClick={() => setActiveCategory(index)}
                className={`px-4 py-3 font-medium text-sm transition ${
                  activeCategory === index
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.category}
              </button>
            ))}
          </div>

          {reviewItems[activeCategory] && (
            <div className="space-y-4">
              {reviewItems[activeCategory].fields.map((field) => (
                <div key={field.label} className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-500">{field.label}</span>
                  <span className="font-medium text-gray-900">{field.value || '-'}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="mt-8 flex gap-4">
            <button
              onClick={acceptOffer}
              disabled={loading}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Accept Offer
            </button>
            <button
              onClick={() => setDisputeReason('select')}
              disabled={loading}
              className="flex-1 py-3 border-2 border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Dispute
            </button>
          </div>
        </div>
      </div>

      {disputeReason === 'select' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold mb-4">Submit a Dispute</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Dispute</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="select">Select a reason...</option>
                  <option value="incorrect_personal">Incorrect Personal Information</option>
                  <option value="incorrect_compensation">Incorrect Compensation Details</option>
                  <option value="incorrect_position">Incorrect Position/Department</option>
                  <option value="incorrect_start_date">Incorrect Start Date</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                <textarea
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  placeholder="Please provide more details about your concern..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDisputeReason('')}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={disputeOffer}
                  disabled={loading || disputeReason === 'select'}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Submit Dispute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAcceptedStage = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Offer Accepted!</h2>
        <p className="text-gray-500 mb-6">
          Your documents are being generated. You will receive an email with your contract shortly.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-3">What happens next?</h3>
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-700">1</span>
              </div>
              <p className="text-sm text-blue-700">Your employment contract and documents are being generated</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-700">2</span>
              </div>
              <p className="text-sm text-blue-700">You'll receive an email to review and sign your documents</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-700">3</span>
              </div>
              <p className="text-sm text-blue-700">Complete your onboarding profile before your start date</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>This usually takes 5-10 minutes</span>
        </div>
      </div>
    </div>
  );

  const renderDisputedStage = () => {
    if (showChat && disputeId && employee) {
      return (
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowChat(false)}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dispute summary
          </button>
          <HRChatAgent
            disputeId={disputeId}
            employeeId={employee.id}
            employeeName={employee.full_name}
            disputeReason={disputeReason || 'other'}
            disputeDetails={disputeDetails}
            onResolved={() => {
              setShowChat(false);
              fetchReviewData(employee.id);
            }}
          />
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <MessageCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Dispute Submitted</h2>
            <p className="text-gray-500 mt-2">
              An HR representative will review your concern and contact you shortly.
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-orange-900 mb-2">Your dispute has been recorded</h3>
            <p className="text-sm text-orange-700">
              Our HR team has been notified and will reach out to you via email or phone within 1-2 business days to resolve your concerns.
            </p>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm text-gray-500 text-center mb-4">
              Want to discuss this immediately?
            </p>
            <button
              onClick={() => setShowChat(true)}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Chat with HR Agent
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSigningStage = () => {
    const currentDoc = generatedDocs[signingDocIndex];
    const allSigned = generatedDocs.every(d => d.status === 'signed');
    
    if (allSigned) {
      return (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Documents Signed!</h2>
            <p className="text-gray-500 mb-6">
              Congratulations! You have successfully completed your onboarding.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-green-900 mb-2">What's next?</h3>
              <p className="text-sm text-green-700">
                You will receive a welcome email with your employee ID and login credentials within 24 hours.
              </p>
            </div>
            <button
              onClick={() => setStage('completed')}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              View My Profile
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
            <h2 className="text-2xl font-bold">Sign Your Documents</h2>
            <p className="text-green-100 mt-1">Please review and sign each document</p>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">
                  Document {signingDocIndex + 1} of {generatedDocs.length}
                </span>
                <span className="text-sm text-gray-500">
                  {generatedDocs.filter(d => d.status === 'signed').length} signed
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${((signingDocIndex + 1) / generatedDocs.length) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="border rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{currentDoc?.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{currentDoc?.type?.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded p-4 text-sm text-gray-600">
                <p>Please review this document carefully. By signing, you acknowledge and agree to the terms outlined.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                View Full Document
              </button>
              <button
                onClick={async () => {
                  const updatedDocs = [...generatedDocs];
                  updatedDocs[signingDocIndex].status = 'signed';
                  setGeneratedDocs(updatedDocs);
                  
                  if (signingDocIndex < generatedDocs.length - 1) {
                    setSigningDocIndex(signingDocIndex + 1);
                  }
                }}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Sign Document
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="font-medium text-gray-700 mb-3">Documents to sign:</h4>
          <div className="space-y-2">
            {generatedDocs.map((doc, index) => (
              <div 
                key={doc.id} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  doc.status === 'signed' ? 'bg-green-50 border-green-200' : 
                  index === signingDocIndex ? 'bg-blue-50 border-blue-300' :
                  'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className={`w-5 h-5 ${doc.status === 'signed' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={doc.status === 'signed' ? 'text-green-700' : 'text-gray-700'}>{doc.name}</span>
                </div>
                {doc.status === 'signed' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <span className="text-sm text-gray-400">Pending</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  const renderCompletedStage = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Onboarding Complete!</h2>
        <p className="text-gray-500 mb-6">
          Welcome to the team, {employee?.full_name}!
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-blue-900 mb-3">What happens next?</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-700">1</span>
              </div>
              <p className="text-sm text-blue-700">You'll receive your login credentials via email</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-700">2</span>
              </div>
              <p className="text-sm text-blue-700">Complete your profile setup on your first day</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-700">3</span>
              </div>
              <p className="text-sm text-blue-700">Attend orientation with your team</p>
            </div>
          </div>
        </div>
        
        <button
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          View My Profile
        </button>
      </div>
    </div>
  );

  const renderAlreadyOnboardedStage = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Already Onboarded</h2>
        <p className="text-gray-500 mt-2">
          Welcome back, {employee?.full_name}! You have already completed your onboarding.
        </p>

        <div className="mt-6 space-y-3">
          <button
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            View My Profile
          </button>
          <button
            onClick={resetWorkflow}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Check Another ID
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-xl mx-auto mb-8">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <React.Fragment key={step}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                (stage === 'input' || stage === 'checking') && step === 1 ? 'bg-blue-600 text-white' :
                stage === 'not_found' && step <= 1 ? 'bg-blue-600 text-white' :
                (stage === 'review') && step <= 2 ? 'bg-blue-600 text-white' :
                (stage === 'accepted') && step <= 4 ? 'bg-blue-600 text-white' :
                (stage === 'signing') && step <= 4 ? 'bg-blue-600 text-white' :
                (stage === 'completed') && step <= 5 ? 'bg-blue-600 text-white' :
                (stage === 'disputed') && step <= 3 ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 5 && <div className="w-12 h-1 bg-gray-200 rounded" />}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500 px-2">
          <span>Verify</span>
          <span>Review</span>
          <span>Decide</span>
          <span>Sign</span>
          <span>Done</span>
        </div>
      </div>

      {stage === 'input' && renderInputStage()}
      {stage === 'checking' && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}
      {stage === 'not_found' && renderNotFoundStage()}
      {stage === 'review' && renderReviewStage()}
      {stage === 'accepted' && renderAcceptedStage()}
      {stage === 'signing' && renderSigningStage()}
      {stage === 'disputed' && renderDisputedStage()}
      {stage === 'completed' && renderCompletedStage()}
      {stage === 'already_onboarded' && renderAlreadyOnboardedStage()}
    </div>
  );
};

export default OnboardingJourney;