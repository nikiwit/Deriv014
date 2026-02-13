import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Lock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:5001'; // keep if you want to open generation links

type DocRecord = {
  id?: string;
  title?: string;
  url?: string;        // direct link to a generated PDF or file
  storedAt?: string;   // ISO date string when stored
  [k: string]: any;
};

/**
 * Helpers to find documents.
 * Currently implemented to read from localStorage.
 * Adapt these to call your backend endpoints if needed.
 */
function getOnboardingDoc(): DocRecord | null {
  try {
    // Example: look for a stored "onboardingDoc" entry first
    const rawDoc = localStorage.getItem('onboardingDoc');
    if (rawDoc) return JSON.parse(rawDoc) as DocRecord;

    // Fallback: if you already store onboardingProfile, return a minimal doc placeholder
    const rawProfile = localStorage.getItem('onboardingProfile');
    if (rawProfile) {
      const p = JSON.parse(rawProfile);
      return {
        id: p.id || p?.email || undefined,
        title: p.fullName ? `${p.fullName} — Application` : 'Onboarding Application',
        // If you have a server-side generation endpoint that uses profile.id, you can optionally set url:
        // url: `${API_BASE}/api/generate-app-comprehensive-pdf/${encodeURIComponent(p.id)}`
        storedAt: p.createdAt || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('getOnboardingDoc error', e);
  }
  return null;
}

function getOfferDoc(): DocRecord | null {
  try {
    const raw = localStorage.getItem('offerDoc') || localStorage.getItem('offerAcceptanceDoc') || localStorage.getItem('offerAcceptanceData');
    if (raw) {
      const parsed = JSON.parse(raw);
      // If it's the offer form object, build a doc record around it
      return {
        id: parsed.id || parsed.nricPassport || parsed.email,
        title: parsed.fullName ? `${parsed.fullName} — Offer Acceptance` : 'Offer Acceptance',
        // url: parsed.pdfUrl || undefined, // if you store a generated PDF url
        storedAt: parsed.completedAt || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('getOfferDoc error', e);
  }
  return null;
}

function getContractDoc(): DocRecord | null {
  try {
    const raw = localStorage.getItem('contractDoc') || localStorage.getItem('contractData');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: parsed.id || parsed.nric || parsed.taxNumber,
        title: parsed.fullName ? `${parsed.fullName} — Employment Contract` : 'Employment Contract',
        // url: parsed.pdfUrl || undefined,
        storedAt: parsed.completedAt || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('getContractDoc error', e);
  }
  return null;
}

/**
 * Simple card UI for a document slot.
 * If `doc` is null -> renders an empty element (per your request).
 */
const DocCard: React.FC<{
  label: string;
  doc: DocRecord | null;
  onDownload?: (doc: DocRecord) => void;
}> = ({ label, doc, onDownload }) => {
  // If not present, render a default empty element (nothing inside)
  if (!doc) return <div />;

  return (
    <div className="rounded-2xl border p-5 bg-white shadow-sm flex flex-col justify-between">
      <div className="flex items-start space-x-3">
        <div className="p-3 rounded-lg bg-amber-50">
          <FileText size={20} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">{label}</h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-jade-50 text-jade-700 text-xs font-semibold">
              <CheckCircle2 size={12} /> <span className="ml-1">Found</span>
            </span>
          </div>

          <p className="text-sm font-semibold text-slate-900 mt-2 truncate">{doc.title || '—'}</p>
          <p className="text-xs text-slate-500">{doc.storedAt ? new Date(doc.storedAt).toLocaleString() : '—'}</p>

          <div className="mt-3 flex items-center gap-2">
            {doc.url ? (
              <button
                onClick={() => onDownload?.(doc)}
                className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold"
              >
                <Download size={14} />
                <span className="ml-1.5">Open PDF</span>
              </button>
            ) : (
              <div className="text-xs text-slate-400 italic">No PDF URL available</div>
            )}
            <button
              onClick={() => {
                // small convenience: copy doc id to clipboard if present
                if (doc.id) void navigator.clipboard?.writeText(String(doc.id));
              }}
              className="inline-flex items-center px-3 py-2 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium"
            >
              <XCircle size={14} />
              <span className="ml-1.5">Copy ID</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MyDocumentsViewer: React.FC = () => {
  const [onboardingDoc, setOnboardingDoc] = useState<DocRecord | null>(null);
  const [offerDoc, setOfferDoc] = useState<DocRecord | null>(null);
  const [contractDoc, setContractDoc] = useState<DocRecord | null>(null);

  useEffect(() => {
    setOnboardingDoc(getOnboardingDoc());
    setOfferDoc(getOfferDoc());
    setContractDoc(getContractDoc());
  }, []);

  // download/open handler: if doc.url exists open in new tab, otherwise do nothing
  const handleOpen = (doc: DocRecord) => {
    if (doc.url) {
      window.open(doc.url, '_blank', 'noopener');
      return;
    }
    // optional: if you have a server-side generator, you can open it by id:
    if (doc.id) {
      // example: window.open(`${API_BASE}/api/generate-by-id/${encodeURIComponent(doc.id)}`, '_blank')
      console.warn('No doc.url available; implement server generation if desired for id:', doc.id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">My Documents</h1>
          <p className="text-sm text-slate-500 mt-1">Documents discovered in storage / app state.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DocCard label="Onboarding Application" doc={onboardingDoc} onDownload={handleOpen} />
        <DocCard label="Offer Acceptance" doc={offerDoc} onDownload={handleOpen} />
        <DocCard label="Contract Document" doc={contractDoc} onDownload={handleOpen} />
      </div>

      {/* If you want a compact debug area */}
      <div className="text-xs text-slate-400">
        Tip: change the `get*Doc` helpers to point at your actual localStorage keys or backend endpoints.
      </div>
    </div>
  );
};

export default MyDocumentsViewer;

