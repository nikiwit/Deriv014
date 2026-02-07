import React, { useState } from 'react';
import { MOCK_KNOWLEDGE_DOCS } from '../constants';
import { KnowledgeDoc } from '../types';
import { addToKnowledgeBase } from '../services/geminiService';
import { 
    UploadCloud, 
    FileText, 
    FileSpreadsheet, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Search,
    BrainCircuit,
    ArrowRight
} from 'lucide-react';

export const KnowledgeBase: React.FC = () => {
    const [docs, setDocs] = useState<KnowledgeDoc[]>(MOCK_KNOWLEDGE_DOCS);
    const [isDragging, setIsDragging] = useState(false);
    const [search, setSearch] = useState('');

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // Simulate file upload
        const newDoc: KnowledgeDoc = {
            id: Date.now().toString(),
            name: 'New_Policy_Upload.pdf',
            type: 'PDF',
            size: '1.2 MB',
            uploadDate: new Date().toISOString().split('T')[0],
            status: 'Processing',
            summary: 'Analyzing content...'
        };
        setDocs([newDoc, ...docs]);
        
        // Simulate processing finish and RAG Indexing
        setTimeout(() => {
            // Add to the Gemini Service RAG context
            addToKnowledgeBase(newDoc.name, newDoc.type);
            
            setDocs(prev => prev.map(d => d.id === newDoc.id ? { ...d, status: 'Indexed', summary: 'Extracted content & embedded into Vector Store for Chat Agents.' } : d));
        }, 2500);
    };

    const getIcon = (type: string) => {
        if (type === 'Spreadsheet') return <FileSpreadsheet className="text-jade-600" size={20} />;
        return <FileText className="text-derivhr-500" size={20} />;
    };

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Knowledge Base (RAG)</h1>
                    <p className="text-slate-500 font-medium">
                        Upload company documents (PDF, Excel, Policies) to train your Private DerivHR Agent.
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-derivhr-600 bg-derivhr-50 px-3 py-1 rounded-full border border-derivhr-100 font-black uppercase tracking-widest">
                    <BrainCircuit size={14} />
                    <span>Vector Index Active</span>
                </div>
            </div>

            {/* Upload Area */}
            <div 
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer ${isDragging ? 'border-derivhr-500 bg-derivhr-50 scale-[0.99]' : 'border-slate-200 hover:border-derivhr-400 hover:bg-slate-50'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="bg-white p-5 rounded-2xl shadow-xl shadow-slate-200/50 mb-4 text-derivhr-500">
                    <UploadCloud size={40} />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Drag & Drop files here</h3>
                <p className="text-slate-500 text-sm mt-1 font-medium">or click to browse (PDF, DOCX, XLSX)</p>
                <p className="text-[10px] font-black text-slate-400 mt-6 uppercase tracking-widest">Maximum file size: 25MB • Secure Encryption</p>
            </div>

            {/* Document List */}
            <div className="flex-1 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center">
                        Indexed Documents
                        <span className="ml-2 bg-white text-derivhr-500 text-[10px] px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">{docs.length}</span>
                    </h3>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search knowledge..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-derivhr-500/20 focus:border-derivhr-500 font-medium"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).map(doc => (
                        <div key={doc.id} className="flex items-start p-4 bg-white border border-slate-50 rounded-2xl hover:border-derivhr-200 hover:shadow-md transition-all group">
                            <div className="p-3 bg-slate-50 rounded-xl mr-4 group-hover:bg-derivhr-50 transition-colors">
                                {getIcon(doc.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-black text-slate-800 text-sm tracking-tight">{doc.name}</h4>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{doc.uploadDate}</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 mt-1 mb-2 uppercase tracking-wide">{doc.size} • {doc.type}</p>
                                <div className="flex items-center text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-slate-600 font-medium leading-relaxed">
                                    <span className="font-black text-[10px] uppercase tracking-widest mr-2 text-derivhr-500">Summary</span>
                                    {doc.summary}
                                </div>
                            </div>
                            <div className="ml-4 flex flex-col items-end space-y-2">
                                {doc.status === 'Indexed' && (
                                    <span className="flex items-center text-[10px] font-black uppercase tracking-widest text-jade-600 bg-jade-50 px-2.5 py-1 rounded-lg">
                                        <CheckCircle2 size={12} className="mr-1" /> Indexed
                                    </span>
                                )}
                                {doc.status === 'Processing' && (
                                    <span className="flex items-center text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg animate-pulse">
                                        <Clock size={12} className="mr-1" /> Processing
                                    </span>
                                )}
                                {doc.status === 'Failed' && (
                                    <span className="flex items-center text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                                        <AlertCircle size={12} className="mr-1" /> Failed
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                    <button className="w-full py-3 bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white hover:border-derivhr-500 hover:text-derivhr-500 transition-all flex items-center justify-center shadow-sm">
                        Run Policy Gap Analysis <ArrowRight size={16} className="ml-2" />
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-tighter">
                        DerivHR Agent will read across all contracts to find inconsistencies.
                    </p>
                </div>
            </div>
        </div>
    );
};