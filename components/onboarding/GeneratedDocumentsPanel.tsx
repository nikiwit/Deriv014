import React, { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    Calendar,
    CheckCircle2,
    Clock,
    X,
    Loader2,
    AlertCircle
} from 'lucide-react';

interface GeneratedDocument {
    id: string;
    document_type: string;
    file_path: string;
    created_at: string;
    status: string;
    download_url: string;
}

interface GeneratedDocumentsPanelProps {
    employeeId: string;
    employeeName: string;
    onClose: () => void;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    'employment_contract': 'Employment Contract',
    'offer_letter': 'Offer Letter',
    'compliance_checklist': 'Compliance Checklist',
    'policy_data_it_policy': 'Data & IT Policy',
    'policy_employee_handbook': 'Employee Handbook',
    'policy_leave_policy': 'Leave Policy',
    'policy_job_description': 'Job Description'
};

const DOCUMENT_TYPE_ICONS: Record<string, string> = {
    'employment_contract': '📄',
    'offer_letter': '✉️',
    'compliance_checklist': '✅',
    'policy_data_it_policy': '🔒',
    'policy_employee_handbook': '📖',
    'policy_leave_policy': '🏖️',
    'policy_job_description': '💼'
};

export const GeneratedDocumentsPanel: React.FC<GeneratedDocumentsPanelProps> = ({
    employeeId,
    employeeName,
    onClose
}) => {
    const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);

    useEffect(() => {
        fetchDocuments();
    }, [employeeId]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`http://localhost:5001/api/onboarding/employees/${employeeId}/documents`);
            if (!response.ok) {
                throw new Error(`Failed to fetch documents: ${response.status}`);
            }
            const data = await response.json();
            setDocuments(data.documents || []);
        } catch (err: any) {
            console.error('Error fetching documents:', err);
            setError(err.message || 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (document: GeneratedDocument) => {
        try {
            setDownloading(document.id);
            const response = await fetch(`http://localhost:5001${document.download_url}`);
            if (!response.ok) {
                throw new Error(`Failed to download document: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const documentType = DOCUMENT_TYPE_LABELS[document.document_type] || document.document_type;
            a.download = `${employeeName.replace(/\s+/g, '_')}_${documentType.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            console.error('Error downloading document:', err);
            alert('Failed to download document. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                    <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="animate-spin text-derivhr-500" size={48} />
                        <p className="text-slate-600 font-bold">Loading generated documents...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-derivhr-500 to-derivhr-600 px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <FileText className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Generated Documents</h2>
                            <p className="text-white/80 text-sm font-medium">{employeeName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X className="text-white" size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <AlertCircle className="text-red-500" size={48} />
                            <p className="text-red-600 font-bold text-center">{error}</p>
                            <button
                                onClick={fetchDocuments}
                                className="px-6 py-2 bg-derivhr-500 text-white rounded-xl font-bold hover:bg-derivhr-600 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <FileText className="text-slate-300" size={48} />
                            <p className="text-slate-500 font-bold">No documents generated yet</p>
                            <p className="text-slate-400 text-sm">Documents will be automatically generated during onboarding</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all hover:border-derivhr-300"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="text-3xl">
                                                {DOCUMENT_TYPE_ICONS[doc.document_type] || '📄'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-sm">
                                                    {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                                                </h3>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    {doc.status === 'generated' ? (
                                                        <span className="flex items-center text-xs text-jade-600 font-bold">
                                                            <CheckCircle2 size={12} className="mr-1" />
                                                            Ready
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center text-xs text-amber-600 font-bold">
                                                            <Clock size={12} className="mr-1" />
                                                            Processing
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2 text-xs text-slate-500 mb-4">
                                        <Calendar size={12} />
                                        <span>{formatDate(doc.created_at)}</span>
                                    </div>

                                    <button
                                        onClick={() => handleDownload(doc)}
                                        disabled={downloading === doc.id || doc.status !== 'generated'}
                                        className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-derivhr-500 hover:bg-derivhr-50 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {downloading === doc.id ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Downloading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download size={16} />
                                                <span>Download PDF</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">
                        {documents.length} document{documents.length !== 1 ? 's' : ''} available
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
