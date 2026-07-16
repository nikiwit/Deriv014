import React, { useState } from 'react';
import { FileText, Search, Globe, Linkedin, Sparkles, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './design-system/Button';
import { Card } from './design-system/Card';
import { Input } from './design-system/Input';
import { Typography } from './design-system/Typography';

interface JDAnalysis {
  position: string;
  department: string;
  jurisdiction: string;
  salary_range: [number, number];
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  work_model: string;
  reporting_to: string;
  confidence_score: number;
  sources: Array<{ type: string; confidence?: number; url?: string; query?: string }>;
}

interface ContractGenerationResult {
  id: string;
  document_type: string;
  jurisdiction: string;
  employee_name: string;
  position: string;
  department: string;
  salary: number;
  download_url: string;
}

type SourceType = 'text' | 'linkedin' | 'web' | 'rag';

export const HRAgent: React.FC = () => {
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [jdText, setJdText] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [webQuery, setWebQuery] = useState('');
  const [ragPosition, setRagPosition] = useState('');
  const [jurisdiction, setJurisdiction] = useState<'MY' | 'SG'>('MY');
  
  const [employeeName, setEmployeeName] = useState('');
  const [nric, setNric] = useState('');
  const [employeeAddress, setEmployeeAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [contractResult, setContractResult] = useState<ContractGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate'>('analyze');

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/hr-agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: sourceType,
          data: {
            text: jdText,
            url: linkedinUrl,
            query: webQuery,
            position: ragPosition,
          },
          jurisdiction,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContract = async () => {
    if (!analysis) {
      setError('Please analyze a job description first');
      return;
    }

    setLoading(true);
    setError(null);
    setContractResult(null);

    try {
      const response = await fetch('/api/hr-agent/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_name: employeeName,
          nric,
          employee_address: employeeAddress,
          start_date: startDate,
          jd_source: sourceType,
          jd_data: {
            text: jdText,
            url: linkedinUrl,
            query: webQuery,
            position: ragPosition,
          },
          jurisdiction,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Contract generation failed');
      }

      const data = await response.json();
      setContractResult(data);
      setActiveTab('generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Contract generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!contractResult) return;

    try {
      const response = await fetch(contractResult.download_url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract_${contractResult.jurisdiction.toLowerCase()}_${contractResult.employee_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'text':
        return <FileText size={20} />;
      case 'linkedin':
        return <Linkedin size={20} />;
      case 'web':
        return <Globe size={20} />;
      case 'rag':
        return <Sparkles size={20} />;
    }
  };

  const getSourceLabel = (type: SourceType) => {
    switch (type) {
      case 'text':
        return 'Paste JD Text';
      case 'linkedin':
        return 'LinkedIn URL';
      case 'web':
        return 'Web Search';
      case 'rag':
        return 'Knowledge Base (RAG)';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <Typography variant="h1" className="mb-2">
          HR Agent - Job Description Analyzer
        </Typography>
        <Typography variant="body" className="text-slate-400">
          Analyze job descriptions from multiple sources and generate employment contracts automatically
        </Typography>
      </div>

      {/* Source Selection */}
      <Card className="p-6">
        <Typography variant="h3" className="mb-4">
          Select Job Description Source
        </Typography>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['text', 'linkedin', 'web', 'rag'] as SourceType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSourceType(type)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                sourceType === type
                  ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-400'
              }`}
            >
              {getSourceIcon(type)}
              <span className="mt-2 text-sm font-medium">{getSourceLabel(type)}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Input Section */}
      <Card className="p-6">
        <Typography variant="h3" className="mb-4">
          {getSourceLabel(sourceType)}
        </Typography>

        {sourceType === 'text' && (
          <div className="space-y-4">
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the job description text here..."
              className="w-full h-64 p-4 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        )}

        {sourceType === 'linkedin' && (
          <div className="space-y-4">
            <Input
              label="LinkedIn Job URL"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/..."
              type="url"
            />
          </div>
        )}

        {sourceType === 'web' && (
          <div className="space-y-4">
            <Input
              label="Search Query"
              value={webQuery}
              onChange={(e) => setWebQuery(e.target.value)}
              placeholder="e.g., Full Stack Developer job description Malaysia"
              type="text"
            />
          </div>
        )}

        {sourceType === 'rag' && (
          <div className="space-y-4">
            <Input
              label="Position Title"
              value={ragPosition}
              onChange={(e) => setRagPosition(e.target.value)}
              placeholder="e.g., Full Stack Developer"
              type="text"
            />
          </div>
        )}

        {/* Jurisdiction Selection */}
        <div className="mt-6">
          <Typography variant="label" className="mb-2 block">
            Jurisdiction
          </Typography>
          <div className="flex gap-4">
            {(['MY', 'SG'] as const).map((j) => (
              <button
                key={j}
                onClick={() => setJurisdiction(j)}
                className={`px-6 py-3 rounded-xl border-2 transition-all ${
                  jurisdiction === j
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-400'
                }`}
              >
                {j === 'MY' ? 'Malaysia' : 'Singapore'}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full mt-6"
          variant="primary"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Analyze Job Description
            </>
          )}
        </Button>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-500/50 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <Typography variant="body" className="text-red-400">
              {error}
            </Typography>
          </div>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3">
              Analysis Results
            </Typography>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <Typography variant="body" className="text-green-500">
                Confidence: {(analysis.confidence_score * 100).toFixed(0)}%
              </Typography>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Typography variant="label" className="mb-1 block text-slate-400">
                  Position
                </Typography>
                <Typography variant="body" className="text-white">
                  {analysis.position}
                </Typography>
              </div>

              <div>
                <Typography variant="label" className="mb-1 block text-slate-400">
                  Department
                </Typography>
                <Typography variant="body" className="text-white">
                  {analysis.department}
                </Typography>
              </div>

              <div>
                <Typography variant="label" className="mb-1 block text-slate-400">
                  Jurisdiction
                </Typography>
                <Typography variant="body" className="text-white">
                  {analysis.jurisdiction === 'MY' ? 'Malaysia' : 'Singapore'}
                </Typography>
              </div>

              <div>
                <Typography variant="label" className="mb-1 block text-slate-400">
                  Salary Range
                </Typography>
                <Typography variant="body" className="text-white">
                  {analysis.jurisdiction === 'MY' ? 'RM' : 'SGD'} {analysis.salary_range[0].toLocaleString()} - {analysis.salary_range[1].toLocaleString()}/month
                </Typography>
              </div>

              <div>
                <Typography variant="label" className="mb-1 block text-slate-400">
                  Work Model
                </Typography>
                <Typography variant="body" className="text-white">
                  {analysis.work_model}
                </Typography>
              </div>

              <div>
                <Typography variant="label" className="mb-1 block text-slate-400">
                  Reports To
                </Typography>
                <Typography variant="body" className="text-white">
                  {analysis.reporting_to}
                </Typography>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Typography variant="label" className="mb-2 block text-slate-400">
                  Responsibilities
                </Typography>
                <ul className="space-y-1">
                  {analysis.responsibilities.map((resp, idx) => (
                    <li key={idx} className="text-white text-sm flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Typography variant="label" className="mb-2 block text-slate-400">
                  Qualifications
                </Typography>
                <ul className="space-y-1">
                  {analysis.qualifications.map((qual, idx) => (
                    <li key={idx} className="text-white text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>{qual}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Typography variant="label" className="mb-2 block text-slate-400">
                  Benefits
                </Typography>
                <ul className="space-y-1">
                  {analysis.benefits.map((benefit, idx) => (
                    <li key={idx} className="text-white text-sm flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">★</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Sources */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <Typography variant="label" className="mb-2 block text-slate-400">
              Data Sources
            </Typography>
            <div className="flex flex-wrap gap-2">
              {analysis.sources.map((source, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm"
                >
                  {source.type}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Contract Generation Form */}
      {analysis && (
        <Card className="p-6">
          <Typography variant="h3" className="mb-4">
            Generate Employment Contract
          </Typography>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Employee Name"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="John Doe"
              type="text"
            />

            <Input
              label="NRIC / Passport"
              value={nric}
              onChange={(e) => setNric(e.target.value)}
              placeholder="123456-12-1234"
              type="text"
            />

            <Input
              label="Employee Address"
              value={employeeAddress}
              onChange={(e) => setEmployeeAddress(e.target.value)}
              placeholder="123 Main St, City"
              type="text"
            />

            <Input
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
            />
          </div>

          <Button
            onClick={handleGenerateContract}
            disabled={loading || !employeeName || !startDate}
            className="w-full mt-6"
            variant="primary"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Contract...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Contract
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Contract Result */}
      {contractResult && (
        <Card className="p-6 border-green-500/50 bg-green-500/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <Typography variant="h3">
                Contract Generated Successfully
              </Typography>
            </div>
            <Button
              onClick={handleDownload}
              variant="primary"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <Typography variant="label" className="text-slate-400">
                Document ID
              </Typography>
              <Typography variant="body" className="text-white">
                {contractResult.id}
              </Typography>
            </div>

            <div>
              <Typography variant="label" className="text-slate-400">
                Employee Name
              </Typography>
              <Typography variant="body" className="text-white">
                {contractResult.employee_name}
              </Typography>
            </div>

            <div>
              <Typography variant="label" className="text-slate-400">
                Position
              </Typography>
              <Typography variant="body" className="text-white">
                {contractResult.position}
              </Typography>
            </div>

            <div>
              <Typography variant="label" className="text-slate-400">
                Department
              </Typography>
              <Typography variant="body" className="text-white">
                {contractResult.department}
              </Typography>
            </div>

            <div>
              <Typography variant="label" className="text-slate-400">
                Jurisdiction
              </Typography>
              <Typography variant="body" className="text-white">
                {contractResult.jurisdiction === 'MY' ? 'Malaysia' : 'Singapore'}
              </Typography>
            </div>

            <div>
              <Typography variant="label" className="text-slate-400">
                Monthly Salary
              </Typography>
              <Typography variant="body" className="text-white">
                {contractResult.jurisdiction === 'MY' ? 'RM' : 'SGD'} {contractResult.salary.toLocaleString()}
              </Typography>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
