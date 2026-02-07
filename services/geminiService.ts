// import { GoogleGenAI } from "@google/genai";
// import { OnboardingData, CandidateProfile } from "../types";
// import { AgentConfig } from "./agentRegistry";

// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// // --- RAG / Knowledge Base Memory ---
// let knowledgeBaseMemory: string[] = [];
// async function listGeminiModels(): Promise<string[]> {
//   const res = await fetch(
//     "https://generativelanguage.googleapis.com/v1beta/models",
//     {
//       headers: {
//         "x-goog-api-key": process.env.GEMINI_API_KEY!,
//       },
//     }
//   );

//   const data = await res.json();

//   return (data.models ?? [])
//     .filter((m: any) =>
//       m.supportedGenerationMethods?.includes("generateContent")
//     )
//     .map((m: any) => m.name); // FULL names
// }


// let cachedModels: string[] | null = null;

// async function getGeminiModels() {
//   if (!cachedModels) {
//     cachedModels = await listGeminiModels();
//     const models = await getGeminiModels();
//     console.log("AVAILABLE GEMINI MODELS:", models);
//   }
//   return cachedModels;
// }

// const models = await getGeminiModels();
// console.log("AVAILABLE GEMINI MODELS:", models);


// export const addToKnowledgeBase = (fileName: string, type: string) => {
//     // Simulating text extraction based on file content/type for the demo
//     let content = "";
//     if (fileName.includes("Policy")) {
//         content = `[Doc: ${fileName}] Standard company policy requires 2-factor authentication for all remote access. Remote work is capped at 3 days per week unless approved by VP.`;
//     } else if (fileName.includes("Budget")) {
//         content = `[Doc: ${fileName}] Q3 Hiring Budget: USD 150,000. Allocations: Engineering (60%), Sales (30%), Marketing (10%).`;
//     } else if (fileName.includes("Handbook")) {
//          content = `[Doc: ${fileName}] Employees are entitled to RM 1000 annual learning allowance. Mental health days are unlimited but require manager notice.`;
//     } else {
//         content = `[Doc: ${fileName}] Content indexed: General business data relevant to ${type}. Contains standard operating procedures for this module.`;
//     }
//     knowledgeBaseMemory.push(content);
// };

// export const getRAGContext = (): string => {
//     if (knowledgeBaseMemory.length === 0) return "";
//     return `\n\nRELEVANT KNOWLEDGE BASE CONTEXT (RAG):\n${knowledgeBaseMemory.join('\n')}\nUse this context to answer user queries if relevant.\n`;
// };

// /**
//  * Centralized function to chat with a specific agent.
//  * Handles RAG injection, Model Routing, and System Prompting.
//  */
// export const chatWithAgent = async (
//     query: string,
//     agent: AgentConfig
// ): Promise<{ response: string; modelUsed: string }> => {
    
//     // 1. Build System Instruction with RAG
//     let systemInstruction = agent.systemPrompt;
//     systemInstruction += getRAGContext();

//     // 2. Determine Routing
//     const routing = determineModelRouting(query);
//     let modelName = 'Local-Llama-3';

//     // 3. Execute
//     try {
//         if (agent.modelPreference === 'local' || (routing === 'local' && agent.modelPreference !== 'premium')) {
//              await new Promise(resolve => setTimeout(resolve, 600)); // Simulate local inference time
//              return {
//                  response: `I ${agent.modelPreference} ${routing} can handle this query using my local knowledge base. For specific calculations or complex legal advice, please use the provided tools or ask a more detailed question.`,
//                  modelUsed: 'Local-Llama-3'
//              };
//         } else {
//              modelName = 'Gemini-3-Pro';
//              const response = await ai.models.generateContent({
//                 //  model: 'gemini-3-pro-preview',
//                   model: 'gemini-2.5-flash',
//                  contents: `Role: ${systemInstruction}
                 
//                  User Query: ${query}
                 
//                  Answer concisely and professionally. If specific laws apply, cite them.`,
//              });
//              return {
//                  response: response.text || "I'm sorry, I couldn't process that request.",
//                  modelUsed: 'Gemini-3-Pro'
//              };
//         }
//     } catch (error) {
//         console.error("Agent Chat Error:", error);
//         return {
//             response: `Error connecting to the intelligence engine: ${error}, ${getGeminiModels()}`,
//             modelUsed: 'Error'
//         };
//     }
// };

// // Premium Model: Used for complex contract generation
// export const generateComplexContract = async (
//   details: string
// ): Promise<string> => {
//   try {
//     const response = await ai.models.generateContent({
//       model: 'gemini-3-pro-preview', // Using Pro for complex legal reasoning
//       contents: `
//         You are an advanced Global Legal AI Expert specializing in International Employment Law.
//         Create a detailed employment contract based on the following JSON parameters:
//         ${details}

//         STRICT REQUIREMENTS:
//         1. Format using Markdown.
//         2. Identify the specific Jurisdiction from the input and apply the correct local laws (e.g., Malaysia EA 1955, UK Employment Rights Act 1996, California Labor Code, UAE Federal Decree-Law No. 33).
//         3. Cite specific statutes for the chosen jurisdiction (e.g., "Section 60F" for Malaysia, "Section 1" statement for UK).
//         4. Ensure compliance with local minimum wage, working hours, and leave entitlements.
//         5. Add a "Global Compliance Note" at the end highlighting any cross-border considerations if applicable.
        
//         Structure: 
//            - Header & Parties
//            - Appointment & Jurisdiction
//            - Duties & Location (Remote/Hybrid clauses)
//            - Compensation (Currency specific)
//            - Working Hours (Local law compliant)
//            - Leave Entitlements (Annual, Sick, Public Holidays specific to region)
//            - Termination & Notice
//            - Governing Law
//            - [AI Legal Explainer]
//       `,
//       config: {
//         temperature: 0.2, // Low temperature for legal precision
//       }
//     });
//     return response.text || "Error generating contract.";
//   } catch (error) {
//     console.error("Gemini API Error:", error);
//     return "## Critical Error\nUnable to generate contract due to API connectivity issues.";
//   }
// };

// // Premium Model: Strategic Workforce Planning
// export const generateStrategicInsights = async (
//   marketData: string
// ): Promise<string> => {
//   try {
//     getGeminiModels() 
//     const response = await ai.models.generateContent({
//       model: 'gemini-3-pro-preview',
//       contents: `
//         Analyze the following workforce data and provided market trends in the context of the Global Job Market (with APAC/US/EU focus):
//         ${marketData}

//         Provide a "Global Strategic Workforce Plan" summary.
//         Include:
//         1. Predicted Skill Gaps (Bullet points) - focus on AI & Digital Transformation.
//         2. Regional Hiring Trends & Salary Benchmarks.
//         3. Compliance Risks (e.g., EU AI Act, Pay Transparency directives).
//         4. Recommendations for Global Mobility.
//       `,
//     });
//     return response.text || "No insights generated.";
//   } catch (error) {
//     return "Unable to generate strategic insights at this time.";
//   }
// };

// // Premium Model: Onboarding Analysis
// export const analyzeOnboarding = async (
//   data: OnboardingData
// ): Promise<string> => {
//     try {
//         const isExpat = data.nationality === 'Non-Malaysian';
        
//         // Inject specific Visa requirements if Non-Malaysian
//         const visaPrompt = isExpat ? `
//         5. **🛂 Visa & Immigration Strategy (ESD/MDEC)**:
//            - **Eligibility Check**: Based on RM${data.salary}, determine Employment Pass Category (I, II, or III).
//            - **Document Checklist**: List specific docs required (Passport all pages, Academic Certs, Cool-down period check).
//            - **Timeline**: Estimate processing time for Approval Stage 1 & 2.
//            - **Tax**: Mention Tax Clearance letter requirement if applicable for previous employment.
//         ` : '';

//         // Inject NRIC verification if Malaysian
//         const nricSection = data.nationality === 'Malaysian' && data.nric ? `
//         5. **🆔 Identity Verification (NRIC)**:
//            - **NRIC Provided**: ${data.nric}
//            - **Status**: ✅ FORMAT VERIFIED BY FRONTEND.
//            - **Statutory**: Confirm eligibility for EPF (KWSP) and SOCSO (PERKESO) based on citizenship.
//         ` : '';

//         const response = await ai.models.generateContent({
//             model: 'gemini-3-pro-preview',
//             contents: `
//                 Act as a Senior HR Onboarding Specialist & Global Mobility Expert. 
//                 Analyze the following new hire data and generate a comprehensive, modern Onboarding Journey.

//                 Employee Data:
//                 ${JSON.stringify(data)}

//                 Requirements:
//                 1. **🔍 Immediate Compliance & Statutories**: 
//                    - Identify statutory registrations (EPF/SOCSO/EIS/PCB).
//                    - Verify Minimum Wage compliance (Current MY Minimum Wage).
//                 2. **🚀 First 90 Days Roadmap**:
//                    - **Day 1**: Welcome & Logistics.
//                    - **Week 1**: Quick wins & "Buddy" assignment (Suggest a specific role to pair with).
//                    - **Month 1**: Key project & certification goal.
//                 3. **💻 IT & Logistics Provisioning**:
//                    - Recommend specific equipment based on Role (e.g., Mac vs Windows, GPU requirements).
//                 4. **🤝 Cultural Integration**:
//                    - One unique team bonding activity suggestion.
//                 ${visaPrompt}
//                 ${nricSection}
                
//                 STRICT FORMATTING:
//                 - Use clear Markdown headings.
//                 - Use emojis to make it engaging 🌟.
//                 - Keep sections concise but actionable.
//             `
//         });
//         return response.text || "Unable to generate onboarding plan.";
//     } catch (error) {
//         return "Error generating onboarding plan.";
//     }
// }

// export const reviewCandidateSubmission = async (
//     data: CandidateProfile
// ): Promise<string> => {
//     try {
//         const response = await ai.models.generateContent({
//             model: 'gemini-3-pro-preview',
//             contents: `
//               Act as a Payroll & Compliance Officer for a Global company (focus on Malaysia context).
//               Review the following new hire submission for errors, missing info, or compliance risks.

//               Candidate Data:
//               ${JSON.stringify(data)}

//               Tasks:
//               1. **Validate Data**: Check if Bank Account number looks valid for the Bank Name (general format check). Check if Tax ID/EPF looks plausible.
//               2. **Identify Risks**: E.g., if Emergency Contact is missing or same as candidate.
//               3. **Generate Welcome Kit**: Based on their profile, suggest 3 Slack channels to join and 1 fun fact about their department (simulated).
              
//               Output Format:
//               ## ✅ Submission Status: [Approved/Needs Review]
              
//               ### 🔍 Compliance Checks
//               - [Item]: [Status]
              
//               ### 🚀 Day 1 Recommendations
//               [List]
//             `
//         });
//         return response.text || "Submission received. Pending manual review.";
//     } catch (error) {
//         return "Error validating submission.";
//     }
// }

// // Hybrid Router Logic (Simulated)
// export const determineModelRouting = (query: string): 'local' | 'premium' => {
//   const complexKeywords = ['act', 'section', 'law', 'legal', 'compliance', 'dismissal', 'constructive', 'court', 'industrial', 'draft', 'contract', 'global', 'expatriate', 'visa'];
//   const isComplex = complexKeywords.some(keyword => query.toLowerCase().includes(keyword)) || query.length > 50;
//   return isComplex ? 'premium' : 'local';
// };


// geminiService.ts
import { GoogleGenAI } from "@google/genai";
import { OnboardingData, CandidateProfile } from "../types";
import { AgentConfig } from "./agentRegistry";
import fs from "fs/promises";

import removeMarkdown from "remove-markdown";

// After getting the response from Gemini:


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Backend RAG session tracking ---
const STORAGE_KEY_SESSION = "derivhr_rag_session_id";
let ragSessionId: string | null =
  typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_KEY_SESSION)
    : null;

/** Restore a previously-persisted RAG session (called from UI on mount). */
export function getRagSessionId(): string | null {
  return ragSessionId;
}

/** Reset the RAG session (new conversation). */
export function resetRagSession(): void {
  ragSessionId = null;
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }
}

/**
 * Query the backend RAG engine (LlamaIndex + md_files).
 * Returns { response, sources, session_id }.
 */
async function queryBackendRAG(
  message: string
): Promise<{ response: string; sources: any[]; session_id: string }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: ragSessionId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Backend RAG error (${res.status}): ${err}`);
  }

  const data = await res.json();
  // Persist session so follow-up messages keep conversation context
  ragSessionId = data.session_id;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY_SESSION, ragSessionId!);
  }
  return data;
}

// --- RAG / Knowledge Base Memory ---
let knowledgeBaseMemory: string[] = [];

export const addToKnowledgeBase = (fileName: string, type: string) => {
  // Simulating text extraction based on file content/type for the demo
  let content = "";
  if (fileName.includes("Policy")) {
    content = `[Doc: ${fileName}] Standard company policy requires 2-factor authentication for all remote access. Remote work is capped at 3 days per week unless approved by VP.`;
  } else if (fileName.includes("Budget")) {
    content = `[Doc: ${fileName}] Q3 Hiring Budget: USD 150,000. Allocations: Engineering (60%), Sales (30%), Marketing (10%).`;
  } else if (fileName.includes("Handbook")) {
    content = `[Doc: ${fileName}] Employees are entitled to RM 1000 annual learning allowance. Mental health days are unlimited but require manager notice.`;
  } else {
    content = `[Doc: ${fileName}] Content indexed: General business data relevant to ${type}. Contains standard operating procedures for this module.`;
  }
  knowledgeBaseMemory.push(content);
};

export const getRAGContext = (): string => {
  if (knowledgeBaseMemory.length === 0) return "";
  return `\n\nRELEVANT KNOWLEDGE BASE CONTEXT (RAG):\n${knowledgeBaseMemory.join(
    "\n"
  )}\nUse this context to answer user queries if relevant.\n`;
};

// ---------------------
// Gemini model discovery (REST) + caching
// ---------------------
async function listGeminiModels(): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("No GEMINI_API_KEY found in env; listGeminiModels will return []");
    return [];
  }

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models",
    {
      headers: {
        "x-goog-api-key": apiKey,
      },
    }
  );

  if (!res.ok) {
    console.error("listGeminiModels returned non-ok:", await res.text());
    return [];
  }

  const data = await res.json();

  return (data.models ?? [])
    .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m: any) => m.name); // FULL names like "models/gemini-1.5-flash"
}

let cachedModels: string[] | null = null;
export async function getGeminiModels(): Promise<string[]> {
  if (cachedModels) return cachedModels;
  cachedModels = await listGeminiModels();
  console.log("AVAILABLE GEMINI MODELS:", cachedModels);
  return cachedModels;
}

/**
 * Select a preferred model from the available list.
 * preferredCandidates: array of substrings in preference order, e.g. ['gemini-3-pro', 'gemini-1.5-pro', 'gemini-1.5-flash']
 * Falls back to the first available model.
 */
export function selectPreferredModel(
  availableModels: string[],
  preferredCandidates: string[]
): string | null {
  if (!availableModels || !availableModels.length) return null;

  for (const candidate of preferredCandidates) {
    const found = availableModels.find((m) => m.includes(candidate));
    if (found) return found;
  }
  // absolute fallback
  return availableModels[0];
}

// ---------------------
// Intent detection (M1, M2, M3) + Router
// ---------------------
export type Intent = "M1_POLICY_ENFORCE" | "M2_COMPLIANCE_MONITOR" | "M3_REGULATORY_FORECAST" | "DEFAULT";

// export const determineIntent = (query: string): Intent => {
//   const q = query.toLowerCase();

//   // M1: repeated policy / entitlement clarification signals
//   const m1Signals = ["policy", "entitle", "entitlement", "leave", "benefit", "policy question", "inconsistent answer"];
//   if (m1Signals.some((s) => q.includes(s))) return "M1_POLICY_ENFORCE";

//   // M2: employee compliance / missing documents
//   const m2Signals = ["missing", "bank", "tax", "epf", "socso", "compliance gap", "verify", "onboarding", "candidate submission", "validate"];
//   if (m2Signals.some((s) => q.includes(s))) return "M2_COMPLIANCE_MONITOR";

//   // M3: regulatory exposure / suspicious / visa / immigration risk
//   const m3Signals = ["visa", "immigration", "expiry", "renewal", "fraud", "suspicious", "exposure", "regulatory", "ai act", "pay transparency"];
//   if (m3Signals.some((s) => q.includes(s))) return "M3_REGULATORY_FORECAST";

//   return "DEFAULT";
// };


export const determineIntent = (query: string): Intent => {
  // Helper: normalize, remove punctuation, collapse whitespace
  const normalize = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")  // strip diacritics
      .replace(/[“”"‘’'`·••]/g, "")
      .replace(/[^\w\s]/g, " ")         // remove punctuation
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  // Correct a handful of common typos/variants to reduce false negatives
  const correctTypos = (s: string) => {
    const map: Record<string, string> = {
      "\\bemploye\\b": "employees",
      "\\bemployes\\b": "employees",
      "\\bemplyees\\b": "employees",
      "\\bpolicies\\b": "policy",
      "\\bhandbook\\b": "handbook",
      "\\bdoc\\b": "document",
      "\\bdocs\\b": "document",
      "\\bvisa\\b": "visa",
    };
    let out = s;
    for (const [pat, rep] of Object.entries(map)) {
      out = out.replace(new RegExp(pat, "g"), rep);
    }
    return out;
  };

  const qRaw = query || "";
  const q = correctTypos(normalize(qRaw));

  // 1) Specific: "show/list my employees" or "who are my employees" — don't map to M2 incorrectly.
  const employeeListPatterns = [
    /\b(show|list|display|give|retrieve|fetch)\b.*\b(employees|staff|team|members)\b/,
    /\b(who (are|is)|who's|who)\b.*\b(employees|staff|team|members)\b/,
    /\b(employees|staff|team|members)\b.*\b(list|show|display)\b/,
    /\b(my employees|my staff|employee list)\b/,
  ];
  if (employeeListPatterns.some((rx) => rx.test(q))) return "DEFAULT";

  // 2) Specific: "explain/summarize policy docs / handbook / section" -> M1
  const explainPolicyPatterns = [
    /\b(explain|explain the|summarize|summary|interpret|clarify|what does|what is|what's)\b.*\b(policy|handbook|document|doc|section|clause)\b/,
    /\b(policy|handbook|document|doc|section|clause)\b.*\b(explain|summarize|interpret|clarify)\b/,
    /\b(policy question\b|\binconsistent answer\b|\bpolicy clarification\b)/,
  ];
  if (explainPolicyPatterns.some((rx) => rx.test(q))) return "M1_POLICY_ENFORCE";

  // 3) M1: repeated policy / entitlement clarification signals (expanded)
  const m1Signals = [
    "policy",
    "entitle",
    "entitlement",
    "leave",
    "benefit",
    "policy question",
    "inconsistent answer",
    "eligibility",
    "entitled to",
    "what am i entitled",
    "clarify policy",
    "policy clarification",
    "handbook",
    "section",
    "clause",
  ];
  if (m1Signals.some((s) => q.includes(s))) return "M1_POLICY_ENFORCE";

  // 4) M2: employee compliance / missing documents (expanded)
  // But avoid false positives on simple "show employees" because we handled that above.
  const m2Signals = [
    "missing",
    "bank",
    "tax",
    "epf",
    "socso",
    "compliance gap",
    "verify",
    "onboarding",
    "candidate submission",
    "validate",
    "validate bank",
    "validate tax",
    "missing doc",
    "missing document",
    "documents required",
    "background check",
    "identity verification",
    "validate nric",
  ];
  if (m2Signals.some((s) => q.includes(s))) return "M2_COMPLIANCE_MONITOR";

  // 5) M3: regulatory exposure / suspicious / visa / immigration risk (expanded)
  const m3Signals = [
    "visa",
    "immigration",
    "expiry",
    "renewal",
    "fraud",
    "suspicious",
    "exposure",
    "regulatory",
    "ai act",
    "pay transparency",
    "visa expiry",
    "immigration status",
    "work permit",
    "employment pass",
    "rejected",
    "reject",
    "denied",
  ];
  if (m3Signals.some((s) => q.includes(s))) return "M3_REGULATORY_FORECAST";

  // 6) Fallback heuristics:
  // - short conversational queries -> local/default
  if (q.length < 40) return "DEFAULT";

  // - reasoning verbs -> premium
  const reasoningVerbs = [
    "analyze",
    "evaluate",
    "compare",
    "justify",
    "assess",
    "explain why",
    "break down",
    "step by step",
    "pros and cons",
    "forecast",
    "predict",
    "flag",
  ];
  if (reasoningVerbs.some((v) => q.includes(v))) return "M3_REGULATORY_FORECAST";

  // 7) Final default
  return "DEFAULT";
};


// Universal router: local-first, but escalate for certain intents or explicit reasoning requests
export const determineModelRouting = (query: string): "local" | "premium" => {
  const intent = determineIntent(query);

  // Local-first for M1 (policy clarification) — we have canonical KB answers
  if (intent === "M1_POLICY_ENFORCE") return "local";

  // M2 and M3 involve compliance/regulatory exposures — prefer premium processing
  if (intent === "M2_COMPLIANCE_MONITOR" || intent === "M3_REGULATORY_FORECAST") return "premium";

  // Default simple heuristic: short conversational queries -> local
  const q = query.trim().toLowerCase();
  if (q.length < 40) return "local";

  // Reasoning verbs -> premium
  const reasoningVerbs = ["analyze", "evaluate", "compare", "assess", "explain", "forecast", "predict", "flag"];
  if (reasoningVerbs.some((v) => q.includes(v))) return "premium";

  // fallback -> local
  return "local";
};

// ---------------------
// Utilities to read customer profile text file (for M3)
// ---------------------
export async function loadProfilesFromTxt(path = "./docs/profiles.txt"): Promise<string[]> {
  try {
    const raw = await fs.readFile(path, "utf8");
    // naive splitter: profiles separated by lines with --- or empty line blocks
    const blocks = raw.split(/\n-{3,}\n|(?:\r?\n){2,}/).map((b) => b.trim()).filter(Boolean);
    return blocks;
  } catch (err) {
    console.warn(`Could not read profiles from ${path}:`, err);
    return [];
  }
}

// ---------------------
// High-level analysis helpers for M1/M2/M3
// ---------------------
function canonicalPolicyAnswer(query: string, ragContext: string): string {
  // Basic canonicalization: prefer explicit KB lines that match keywords
  if (!ragContext) {
    return "No policy context found in the knowledge base. Please upload canonical policy documents named *Policy* or *Handbook* so I can provide a consistent answer.";
  }

  // Find the first relevant KB line that matches keywords in query
  const lower = query.toLowerCase();
  const matches = knowledgeBaseMemory.filter((line) => {
    const l = line.toLowerCase();
    return ["remote work", "2-factor", "learning allowance", "mental health", "remote"].some((k) => l.includes(k) && lower.includes(k));
  });

  if (matches.length) {
    return `Canonical policy response (from KB):\n\n${matches.join("\n\n")}\n\nIf you need official wording, reference the original policy doc in the KB.`;
  }

  // fallback: return entire KB as canonical answer
  return `Canonical policy response (full KB):\n\n${knowledgeBaseMemory.join("\n\n")}`;
}

function detectComplianceGapsFromCandidate(candidate: CandidateProfile): string[] {
  const gaps: string[] = [];

  // Simple heuristic checks
  if (!candidate.bankAccount || candidate.bankAccount.length < 8) gaps.push("Bank account: missing or seems too short");
  if (!candidate.taxId) gaps.push("Tax ID: missing");
  if (!candidate.epf) gaps.push("EPF: missing");
  if (!candidate.nric && candidate.nationality === "Malaysian") gaps.push("NRIC: missing for Malaysian national");
  if (!candidate.nationality) gaps.push("Nationality: missing");
  if (!candidate.emergencyContact) gaps.push("Emergency contact: missing");
  if (candidate.emergencyContact && candidate.emergencyContact === candidate.name) gaps.push("Emergency contact identical to candidate");

  return gaps;
}

// ---------------------
// Centralized function to chat with a specific agent.
// Handles RAG injection, Model Routing, System Prompting, plus M1/M2/M3 logic.
// ---------------------
export const chatWithAgent = async (
  query: string,
  agent: AgentConfig
): Promise<{ response: string; modelUsed: string }> => {
  // 1. Build System Instruction with RAG
  let systemInstruction = agent.systemPrompt || "You are a helpful assistant.";
  systemInstruction += getRAGContext();

  // 2. Determine intent + routing
  const intent = determineIntent(query);
  const routing = determineModelRouting(query);

  // 3. Local-first handling with special intent logic
  try {
    // If local preference or routing suggests local, query backend RAG (md_files via LlamaIndex)
    if (agent.modelPreference === "local" || (routing === "local" && agent.modelPreference !== "premium")) {
      try {
        let ragResult = await queryBackendRAG(query);


        const sourceCitation = ragResult.sources?.length
          ? `\n\n_Sources: ${ragResult.sources.map((s: any) => `${s.file} (${s.jurisdiction})`).join(", ")}_`
          : "";
        return {
          response: removeMarkdown(ragResult.response || "") + sourceCitation,
          modelUsed: "RAG-Local"
        };
      } catch (err) {
        console.warn("Backend RAG unavailable, falling back to Gemini:", err);
        // Fall through to premium handling below if backend is down
      }
    }

    // 4. Premium handling (Gemini)
    // Discover available models (cached)
    const availableModels = await getGeminiModels();
    if (!availableModels.length) {
      // Fall back to backend RAG if no Gemini models available
      try {
        const ragFallback = await queryBackendRAG(query);
        return { response: removeMarkdown(ragFallback.response || ""), modelUsed: "RAG-Local" };
      } catch (err) {
        return {
          response: "No Gemini models available and backend RAG is unreachable. Please check GEMINI_API_KEY and ensure the backend is running (python run.py).",
          modelUsed: "Error"
        };
      }
    }

    // Choose model smartly; prefer Pro/3 then flash
    const preferred = selectPreferredModel(availableModels, [
      // "gemini-2.5-flash",
      "gemini-2.0-flash",
    ])!;
    const modelUsed = preferred;

    // Special premium workflows for M1/M2/M3
    if (intent === "M1_POLICY_ENFORCE") {
      // Ask Gemini to produce a canonical policy response and a short "why this is authoritative" note
      const prompt = `
ROLE: Company Policy Assistant (Authoritative)
SYSTEM: ${systemInstruction}

TASK: A user asked:
"${query}"

INSTRUCTIONS:
1) Produce a canonical policy answer using the RELEVANT KNOWLEDGE BASE CONTEXT included above.
2) If you find contradictions across the KB lines, point them out clearly and propose a single consistent policy statement.
3) Return a short "confidence" label: [High | Medium | Low] depending on how fully the KB supports the assertion.
OUTPUT: JSON with fields: { "canonical_answer": "...", "contradictions": ["..."], "confidence": "High" }
`;
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: prompt
      });
      // response .text or .response depending on SDK; attempt common shapes
      const text = (response as any).text ?? (response as any).responseText ?? JSON.stringify(response);
      return { response: removeMarkdown(text) + `\n\n Model used: ${modelUsed}`, modelUsed };
    }

    if (intent === "M2_COMPLIANCE_MONITOR") {
      // If user didn't attach candidate, we instruct model to scan provided JSON or KB.
      // But if you have candidate data available to pass in, prefer using reviewCandidateSubmission
      const prompt = `
ROLE: Compliance Officer
SYSTEM: ${systemInstruction}

TASK: Use the KB and the following user query to find compliance gaps in employee onboarding and registrations.

USER QUERY: "${query}"

INSTRUCTIONS:
1) If a candidate payload is included in the query, evaluate and list missing statutory fields (EPF, SOCSO, TAX ID, NRIC where applicable) and rank risk (High/Medium/Low).
2) If no payload is included, summarize the top 5 compliance checks the organization should run automatically.
3) Output in bullet points with recommended remediation steps.
`;
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: prompt,
        config: { temperature: 0.0 }
      });
      const text = (response as any).text ?? (response as any).responseText ?? JSON.stringify(response);
      return { response: removeMarkdown(text), modelUsed };
    }

    if (intent === "M3_REGULATORY_FORECAST") {
      // Load text profiles to include as reference for the model
      const profiles = await loadProfilesFromTxt();
      const profileSummary = profiles.slice(0, 5).join("\n\n---\n\n"); // include up to first 5
      const prompt = `
ROLE: Regulatory Exposure Analyst
SYSTEM: ${systemInstruction}

TASK: You will analyze the following customer/profile data and flag any items that appear suspicious, inconsistent, or likely to cause regulatory exposure (e.g., visa expiry, missing paperwork, inconsistent employment history).

PROFILES:
${profileSummary || "No profile data found."}

USER QUERY: "${query}"

INSTRUCTIONS:
1) Summarize each profile briefly.
2) For each profile, list suspicious or inconsistent items and why (be specific).
3) For any visa/immigration entries, predict the likely failure points and suggest actions to reduce exposure.
4) Return results as Markdown, with a one-line summary per profile and a final "Next Steps" checklist.
`;
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: prompt,
        config: { temperature: 0.1 }
      });
      const text = (response as any).text ?? (response as any).responseText ?? JSON.stringify(response);
      return { response: removeMarkdown(text), modelUsed };
    }

    // Default premium behaviour: forward query to model with systemInstruction and RAG
    const defaultPrompt = `
ROLE: ${agent.name ?? "AI Assistant"}
SYSTEM: ${systemInstruction}

User Query: ${query}

Answer concisely and professionally. If specific laws apply, cite them.
`;
    const defaultResponse = await ai.models.generateContent({
      model: modelUsed,
      contents: defaultPrompt
    });
    const defaultText = (defaultResponse as any).text ?? (defaultResponse as any).responseText ?? JSON.stringify(defaultResponse);
    return { response: removeMarkdown(defaultText), modelUsed };
  } catch (error: any) {
    console.error("Agent Chat Error:", error);
    return {
      response: `Error connecting to the intelligence engine: ${String(error)}`,
      modelUsed: "Error"
    };
  }
};

// ---------------------
// Keep other exported functions but make them robust (use selectPreferredModel to avoid 404s)
// ---------------------

export const generateComplexContract = async (details: string): Promise<string> => {
  try {
    const available = await getGeminiModels();
    const model = selectPreferredModel(available, ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"]) ?? available[0];
    const response = await ai.models.generateContent({
      model,
      contents: `
        You are an advanced Global Legal AI Expert specializing in International Employment Law.
        Create a detailed employment contract based on the following JSON parameters:
        ${details}

        STRICT REQUIREMENTS:
        1. Format using Markdown.
        2. Identify the specific Jurisdiction from the input and apply the correct local laws (e.g., Malaysia EA 1955, UK Employment Rights Act 1996, California Labor Code, UAE Federal Decree-Law No. 33).
        3. Cite specific statutes for the chosen jurisdiction (e.g., "Section 60F" for Malaysia, "Section 1" statement for UK).
        4. Ensure compliance with local minimum wage, working hours, and leave entitlements.
        5. Add a "Global Compliance Note" at the end highlighting any cross-border considerations if applicable.
      `,
      config: { temperature: 0.2 }
    });
    return (response as any).text ?? JSON.stringify(response);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "## Critical Error\nUnable to generate contract due to API connectivity issues.";
  }
};

export const generateStrategicInsights = async (marketData: string): Promise<string> => {
  try {
    const available = await getGeminiModels();
    const model = selectPreferredModel(available, ["gemini-3-pro", "gemini-1.5-pro", "gemini-1.5-flash"]) ?? available[0];
    const response = await ai.models.generateContent({
      model,
      contents: `
        Analyze the following workforce data and provided market trends in the context of the Global Job Market (with APAC/US/EU focus):
        ${marketData}

        Provide a "Global Strategic Workforce Plan" summary.
        Include:
        1. Predicted Skill Gaps (Bullet points) - focus on AI & Digital Transformation.
        2. Regional Hiring Trends & Salary Benchmarks.
        3. Compliance Risks (e.g., EU AI Act, Pay Transparency directives).
        4. Recommendations for Global Mobility.
      `,
    });
    return (response as any).text ?? JSON.stringify(response);
  } catch (error) {
    return "Unable to generate strategic insights at this time.";
  }
};

// export const analyzeOnboarding = async (data: OnboardingData): Promise<string> => {
//   try {
//     const available = await getGeminiModels();
//     const model = selectPreferredModel(available, ["gemini-3-pro", "gemini-1.5-pro", "gemini-1.5-flash"]) ?? available[0];

//     const isExpat = data.nationality === "Non-Malaysian";
//     const visaPrompt = isExpat
//       ? `
//         5. **🛂 Visa & Immigration Strategy (ESD/MDEC)**:
//            - **Eligibility Check**: Based on RM${data.salary}, determine Employment Pass Category (I, II, or III).
//            - **Document Checklist**: List specific docs required (Passport all pages, Academic Certs, Cool-down period check).
//            - **Timeline**: Estimate processing time for Approval Stage 1 & 2.
//            - **Tax**: Mention Tax Clearance letter requirement if applicable for previous employment.
//         `
//       : "";

//     const nricSection =
//       data.nationality === "Malaysian" && (data as any).nric
//         ? `
//         5. **🆔 Identity Verification (NRIC)**:
//            - **NRIC Provided**: ${(data as any).nric}
//            - **Status**: ✅ FORMAT VERIFIED BY FRONTEND.
//            - **Statutory**: Confirm eligibility for EPF (KWSP) and SOCSO (PERKESO) based on citizenship.
//         `
//         : "";

//     const response = await ai.models.generateContent({
//       model,
//       contents: `
//         Act as a Senior HR Onboarding Specialist & Global Mobility Expert. 
//         Analyze the following new hire data and generate a comprehensive, modern Onboarding Journey.

//         Employee Data:
//         ${JSON.stringify(data)}

//         Requirements:
//         1. **🔍 Immediate Compliance & Statutories**: 
//            - Identify statutory registrations (EPF/SOCSO/EIS/PCB).
//            - Verify Minimum Wage compliance (Current MY Minimum Wage).
//         2. **🚀 First 90 Days Roadmap**:
//            - **Day 1**: Welcome & Logistics.
//            - **Week 1**: Quick wins & "Buddy" assignment (Suggest a specific role to pair with).
//            - **Month 1**: Key project & certification goal.
//         3. **💻 IT & Logistics Provisioning**:
//            - Recommend specific equipment based on Role (e.g., Mac vs Windows, GPU requirements).
//         4. **🤝 Cultural Integration**:
//            - One unique team bonding activity suggestion.
//         ${visaPrompt}
//         ${nricSection}
        
//         STRICT FORMATTING:
//         - Use clear Markdown headings.
//         - Use emojis to make it engaging 🌟.
//         - Keep sections concise but actionable.
//       `
//     });
//     return (response as any).text ?? JSON.stringify(response);
//   } catch (error) {
//     return "Error generating onboarding plan.";
//   }
// };



const ERROR_MSG = "Error generating onboarding plan.";

/** Simple client-side validation helper */
function validateOnboardingData(data: OnboardingData) {
  const errors: string[] = [];

  if (!data.fullName || data.fullName.trim().length < 3) {
    errors.push("Full name is required and must be at least 3 characters.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push("A valid email is required.");
  }

  if (!data.role || data.role.trim().length === 0) {
    errors.push("Role is required.");
  }

  if (!data.department || data.department.trim().length === 0) {
    errors.push("Department is required.");
  }

  // salary numeric check (allow commas, currency symbols)
  const salaryNumeric = Number(String(data.salary).replace(/[^\d.-]+/g, ""));
  if (Number.isNaN(salaryNumeric) || salaryNumeric <= 0) {
    errors.push("Salary must be a positive number.");
  }

  // startDate sanity check
  const startTs = Date.parse(data.startDate);
  if (Number.isNaN(startTs)) {
    errors.push("Start Date is invalid or not parseable.");
  } else {
    const startYear = new Date(startTs).getFullYear();
    const now = new Date();
    const maxFutureYears = 2; // tweak as needed
    if (startYear < 1900 || startYear > now.getFullYear() + maxFutureYears) {
      errors.push("Start Date year is not logical.");
    }
  }

  if (!["Malaysian", "Non-Malaysian"].includes(data.nationality)) {
    errors.push("Nationality must be 'Malaysian' or 'Non-Malaysian'.");
  }

  // optional NRIC basic format: 12 digits (no dashes/spaces)
  if (data.nationality === "Malaysian" && data.nric) {
    const nricDigits = String(data.nric).replace(/\D/g, "");
    if (!/^\d{12}$/.test(nricDigits)) {
      errors.push("NRIC must be 12 digits (numbers only).");
    }
  }

  return { ok: errors.length === 0, errors };
}

/** analyzeOnboarding with model selection, prompt assembly and validation.
 *  Returns a string (generated markdown) OR returns ERROR_MSG on unexpected failure.
 *  Throws Error on validation failure.
 */
export const analyzeOnboarding = async (data: OnboardingData): Promise<string> => {
  try {
    // 1) Validate fields (throws Error on validation problems)
    const { ok, errors } = validateOnboardingData(data);
    if (!ok) {
      throw new Error("Validation failed: " + errors.join(" ; "));
    }

    // 2) Model selection (assumes helper functions exist)
    const available = await getGeminiModels();
    const model =
      selectPreferredModel(
        available,
        ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-1.5-flash"]
      ) ?? available[0];

    // 3) Build visa/NRIC sections
    const salaryNumeric = Number(String(data.salary).replace(/[^\d.-]+/g, ""));

    const isExpat = data.nationality === "Non-Malaysian";
    const visaPrompt = isExpat
      ? `
        5. **🛂 Visa & Immigration Strategy (ESD/MDEC)**:
           - **Eligibility Check**: Based on RM${salaryNumeric}, determine Employment Pass Category (I, II, or III).
           - **Document Checklist**: List specific docs required (Passport all pages, Academic Certs, Cool-down period check).
           - **Timeline**: Estimate processing time for Approval Stage 1 & 2.
           - **Tax**: Mention Tax Clearance letter requirement if applicable for previous employment.
        `
      : "";

    const nricSection =
      data.nationality === "Malaysian" && (data as any).nric
        ? `
        5. **🆔 Identity Verification (NRIC)**:
           - **NRIC Provided**: ${(data as any).nric}
           - **Status**: ✅ FORMAT VERIFIED BY FRONTEND.
           - **Statutory**: Confirm eligibility for EPF (KWSP) and SOCSO (PERKESO) based on citizenship.
        `
        : "";

    // 4) Compose the prompt / content for the AI
    const prompt = `
        Act as a Senior HR Onboarding Specialist & Global Mobility Expert. 
        Analyze the following new hire data and generate a comprehensive, modern Onboarding Journey.

        Employee Data:
        ${JSON.stringify(data)}

        Requirements:
        1. **🔍 Immediate Compliance & Statutories**: 
           - Identify statutory registrations (EPF/SOCSO/EIS/PCB).
           - Verify Minimum Wage compliance (Current MY Minimum Wage).
        2. **🚀 First 90 Days Roadmap**:
           - **Day 1**: Welcome & Logistics.
           - **Week 1**: Quick wins & "Buddy" assignment (Suggest a specific role to pair with).
           - **Month 1**: Key project & certification goal.
        3. **💻 IT & Logistics Provisioning**:
           - Recommend specific equipment based on Role (e.g., Mac vs Windows, GPU requirements).
        4. **🤝 Cultural Integration**:
           - One unique team bonding activity suggestion.
        ${visaPrompt}
        ${nricSection}
        
        STRICT FORMATTING:
        - Use clear Markdown headings.
        - Use emojis to make it engaging 🌟.
        - Keep sections concise but actionable.
      `;

    // 5) Ask the AI to generate content
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    // 6) Return text content (fallback to JSON if needed)
    return (response as any).text ?? JSON.stringify(response);
  } catch (error) {
    // If validation error or other thrown Error: rethrow so callers can handle the message
    if (error instanceof Error && error.message?.startsWith("Validation failed")) {
      throw error;
    }

    // unexpected error when contacting AI or model failure: log and return sentinel string
    console.error("analyzeOnboarding error:", error);
    return ERROR_MSG;
  }
};


export const reviewCandidateSubmission = async (data: CandidateProfile): Promise<string> => {
  try {
    const available = await getGeminiModels();
    const model = selectPreferredModel(available, ["gemini-3-pro", "gemini-1.5-pro", "gemini-1.5-flash"]) ?? available[0];

    // Local quick checks (cheap)
    const gaps = detectComplianceGapsFromCandidate(data);
    if (gaps.length) {
      // Ask Gemini to expand and provide remediation
      const response = await ai.models.generateContent({
        model,
        contents: `
          Act as a Payroll & Compliance Officer for a Global company (focus on Malaysia context).
          Review the following new hire submission for errors, missing info, or compliance risks.

          Candidate Data:
          ${JSON.stringify(data)}

          Heuristic flags found locally:
          ${JSON.stringify(gaps)}

          Tasks:
          1. Provide detailed remediation steps for each flagged item.
          2. Suggest a Day 1 checklist to ensure compliance.
          3. Return a final Approval verdict: [Approved|Needs Review].
        `
      });
      return (response as any).text ?? JSON.stringify(response);
    }

    // No obvious gaps -> quick approval message
    return "✅ Submission looks complete based on local heuristics. Proceed to final verification.";
  } catch (error) {
    return "Error validating submission.";
  }
};

// ---------------------
// End of file
// ---------------------
