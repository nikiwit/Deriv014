import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText,
  Upload,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  Plus,
  File,
  FileSignature,
  X
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: 'contract' | 'id' | 'certificate' | 'tax' | 'other';
  size: string;
  uploadedAt: string;
  status: 'verified' | 'pending' | 'rejected';
  signedAt?: string;
}

const docTypeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  contract: { label: 'Contract', color: 'text-blue-500', bgColor: 'bg-blue-50' },
  id: { label: 'ID Document', color: 'text-purple-500', bgColor: 'bg-purple-50' },
  certificate: { label: 'Certificate', color: 'text-amber-500', bgColor: 'bg-amber-50' },
  tax: { label: 'Tax Form', color: 'text-jade-500', bgColor: 'bg-jade-50' },
  other: { label: 'Other', color: 'text-slate-500', bgColor: 'bg-slate-50' },
};

export const MyDocuments: React.FC = () => {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [documents, setDocuments] = useState<Document[]>([
    { id: '1', name: 'Employment_Contract_2024.pdf', type: 'contract', size: '245 KB', uploadedAt: '2024-01-15', status: 'verified', signedAt: '2024-01-15' },
    { id: '2', name: 'NRIC_Front.jpg', type: 'id', size: '1.2 MB', uploadedAt: '2024-01-14', status: 'verified' },
    { id: '3', name: 'NRIC_Back.jpg', type: 'id', size: '1.1 MB', uploadedAt: '2024-01-14', status: 'verified' },
    { id: '4', name: 'Tax_Declaration_EA.pdf', type: 'tax', size: '89 KB', uploadedAt: '2024-02-01', status: 'pending' },
    { id: '5', name: 'Degree_Certificate.pdf', type: 'certificate', size: '2.4 MB', uploadedAt: '2024-01-16', status: 'verified' },
  ]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const newDoc: Document = {
        id: Date.now().toString(),
        name: file.name,
        type: 'other',
        size: `${(file.size / 1024).toFixed(0)} KB`,
        uploadedAt: new Date().toISOString().split('T')[0],
        status: 'pending',
      };
      setDocuments(prev => [newDoc, ...prev]);
    });
    setShowUploadModal(false);
  };

  const verifiedCount = documents.filter(d => d.status === 'verified').length;
  const pendingCount = documents.filter(d => d.status === 'pending').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">My Documents</h1>
          <p className="text-slate-500 font-medium">Upload and manage your employment documents</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-jade-500 text-white rounded-xl font-bold hover:bg-jade-600 transition-all shadow-lg shadow-jade-500/20"
        >
          <Upload size={18} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-slate-100 rounded-xl">
              <FileText className="text-slate-500" size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
          </div>
          <span className="text-3xl font-black text-slate-900">{documents.length}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-jade-50 rounded-xl">
              <CheckCircle2 className="text-jade-500" size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified</span>
          </div>
          <span className="text-3xl font-black text-jade-600">{verifiedCount}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Clock className="text-amber-500" size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
          </div>
          <span className="text-3xl font-black text-amber-600">{pendingCount}</span>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">All Documents</h2>
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="font-medium">Sort by:</span>
            <select className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-medium">
              <option>Upload Date</option>
              <option>Name</option>
              <option>Status</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {documents.map((doc) => {
            const config = docTypeConfig[doc.type];

            return (
              <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 ${config.bgColor} rounded-xl ${config.color}`}>
                    <File size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-bold text-slate-800 truncate">{doc.name}</span>
                      {doc.signedAt && (
                        <span className="flex items-center space-x-1 text-[10px] font-bold text-purple-500">
                          <FileSignature size={12} />
                          <span>Signed</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <span className={`font-bold ${config.color}`}>{config.label}</span>
                      <span>{doc.size}</span>
                      <span>Uploaded {doc.uploadedAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                      doc.status === 'verified' ? 'bg-jade-100 text-jade-700' :
                      doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button className="p-2 text-slate-400 hover:text-jade-500 hover:bg-jade-50 rounded-lg transition-all">
                      <Eye size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                      <Download size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
            <div className="h-1.5 bg-gradient-to-r from-jade-500 to-jade-400"></div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Upload Document</h3>
                <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                  dragActive ? 'border-jade-500 bg-jade-50' : 'border-slate-200 hover:border-jade-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 bg-jade-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="text-jade-500" size={28} />
                </div>
                <p className="font-bold text-slate-800 mb-2">Drag and drop your files here</p>
                <p className="text-sm text-slate-500 mb-4">or click to browse</p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-6 py-3 bg-jade-500 text-white rounded-xl font-bold cursor-pointer hover:bg-jade-600 transition-all"
                >
                  Choose Files
                </label>
                <p className="text-xs text-slate-400 mt-4">Supported: PDF, PNG, JPG, DOCX (Max 10MB each)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
