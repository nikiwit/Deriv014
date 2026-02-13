// geminiService.ts — Backend RAG based chat service
import { OnboardingData, CandidateProfile } from "../types";
import { AgentConfig } from "./agentRegistry";

// ---------------------
// Backend RAG session tracking
// ---------------------
const STORAGE_KEY_SESSION = "derivhr_rag_session_id";
let ragSessionId: string | null =
  typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_KEY_SESSION)
    : null;

export function getRagSessionId(): string | null {
  return ragSessionId;
}

export function resetRagSession(): void {
  ragSessionId = null;
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }
}

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
  ragSessionId = data.session_id;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY_SESSION, ragSessionId!);
  }
  return data;
}

// ---------------------
// RAG / Knowledge Base Memory
// ---------------------
let knowledgeBaseMemory: string[] = [];

export const addToKnowledgeBase = (fileName: string, type: string) => {
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
// Intent detection (M1, M2, M3) + Router
// ---------------------
export type Intent = "M1_POLICY_ENFORCE" | "M2_COMPLIANCE_MONITOR" | "M3_REGULATORY_FORECAST" | "DEFAULT";

export const determineIntent = (query: string): Intent => {
  const normalize = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/["""'''`·••]/g, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

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

  const employeeListPatterns = [
    /\b(show|list|display|give|retrieve|fetch)\b.*\b(employees|staff|team|members)\b/,
    /\b(who (are|is)|who's|who)\b.*\b(employees|staff|team|members)\b/,
    /\b(employees|staff|team|members)\b.*\b(list|show|display)\b/,
    /\b(my employees|my staff|employee list)\b/,
  ];
  if (employeeListPatterns.some((rx) => rx.test(q))) return "DEFAULT";

  const explainPolicyPatterns = [
    /\b(explain|explain the|summarize|summary|interpret|clarify|what does|what is|what's)\b.*\b(policy|handbook|document|doc|section|clause)\b/,
    /\b(policy|handbook|document|doc|section|clause)\b.*\b(explain|summarize|interpret|clarify)\b/,
    /\b(policy question\b|\binconsistent answer\b|\bpolicy clarification\b)/,
  ];
  if (explainPolicyPatterns.some((rx) => rx.test(q))) return "M1_POLICY_ENFORCE";

  const m1Signals = [
    "policy", "entitle", "entitlement", "leave", "benefit",
    "policy question", "inconsistent answer", "eligibility",
    "entitled to", "what am i entitled", "clarify policy",
    "policy clarification", "handbook", "section", "clause",
  ];
  if (m1Signals.some((s) => q.includes(s))) return "M1_POLICY_ENFORCE";

  const m2Signals = [
    "missing", "bank", "tax", "epf", "socso", "compliance gap",
    "verify", "onboarding", "candidate submission", "validate",
    "validate bank", "validate tax", "missing doc", "missing document",
    "documents required", "background check", "identity verification",
    "validate nric",
  ];
  if (m2Signals.some((s) => q.includes(s))) return "M2_COMPLIANCE_MONITOR";

  const m3Signals = [
    "visa", "immigration", "expiry", "renewal", "fraud", "suspicious",
    "exposure", "regulatory", "ai act", "pay transparency", "visa expiry",
    "immigration status", "work permit", "employment pass", "rejected",
    "reject", "denied",
  ];
  if (m3Signals.some((s) => q.includes(s))) return "M3_REGULATORY_FORECAST";

  if (q.length < 40) return "DEFAULT";

  const reasoningVerbs = [
    "analyze", "evaluate", "compare", "justify", "assess",
    "explain why", "break down", "step by step", "pros and cons",
    "forecast", "predict", "flag",
  ];
  if (reasoningVerbs.some((v) => q.includes(v))) return "M3_REGULATORY_FORECAST";

  return "DEFAULT";
};

export const determineModelRouting = (query: string): "local" | "premium" => {
  const intent = determineIntent(query);

  if (intent === "M1_POLICY_ENFORCE") return "local";
  if (intent === "M2_COMPLIANCE_MONITOR" || intent === "M3_REGULATORY_FORECAST") return "premium";

  const q = query.trim().toLowerCase();
  if (q.length < 40) return "local";

  const reasoningVerbs = ["analyze", "evaluate", "compare", "assess", "explain", "forecast", "predict", "flag"];
  if (reasoningVerbs.some((v) => q.includes(v))) return "premium";

  return "local";
};

// ---------------------
// Utilities
// ---------------------
export async function loadProfilesFromTxt(path = "./docs/profiles.txt"): Promise<string[]> {
  try {
    const res = await fetch(path);
    const raw = await res.text();
    const blocks = raw.split(/\n-{3,}\n|(?:\r?\n){2,}/).map((b) => b.trim()).filter(Boolean);
    return blocks;
  } catch (err) {
    console.warn(`Could not read profiles from ${path}:`, err);
    return [];
  }
}

function canonicalPolicyAnswer(query: string, ragContext: string): string {
  if (!ragContext) {
    return "No policy context found in the knowledge base. Please upload canonical policy documents named *Policy* or *Handbook* so I can provide a consistent answer.";
  }

  const lower = query.toLowerCase();
  const matches = knowledgeBaseMemory.filter((line) => {
    const l = line.toLowerCase();
    return ["remote work", "2-factor", "learning allowance", "mental health", "remote"].some((k) => l.includes(k) && lower.includes(k));
  });

  if (matches.length) {
    return `Canonical policy response (from KB):\n\n${matches.join("\n\n")}\n\nIf you need official wording, reference the original policy doc in the KB.`;
  }

  return `Canonical policy response (full KB):\n\n${knowledgeBaseMemory.join("\n\n")}`;
}

function detectComplianceGapsFromCandidate(candidate: CandidateProfile): string[] {
  const gaps: string[] = [];
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
// Employee Agent
// ---------------------

/**
 * Generate response with backend RAG fallback.
 * Routes queries to backend RAG for HR knowledge base responses.
 */
export const generateWithRetry = async (
    content: any, 
    geminiConfig?: { preferredModels?: string[], model?: string, config?: any },
    openRouterConfig?: { preferredModels?: string[] }
): Promise<{ text: string; modelUsed: string }> => {
    // Extract user query from content
    let userQuery = "";
    if (typeof content === 'string') {
        userQuery = content;
    } else if (Array.isArray(content)) {
        const lastUserMsg = content.filter((c: any) => c.role === 'user').pop();
        if (lastUserMsg && lastUserMsg.parts && lastUserMsg.parts[0]) {
            userQuery = lastUserMsg.parts[0].text;
        }
    }
    
    if (!userQuery) {
        throw new Error("No user query found in content");
    }
    
    try {
        const ragResult = await queryBackendRAG(userQuery);
        const sourceCitation = ragResult.sources?.length
            ? `\n\n_Sources: ${ragResult.sources.map((s: any) => `${s.file} (${s.jurisdiction})`).join(", ")}_`
            : "";
        return {
            text: (ragResult.response || "") + sourceCitation,
            modelUsed: "RAG-Backend"
        };
    } catch (ragErr) {
        console.error("Backend RAG failed:", ragErr);
        throw ragErr;
    }
}

/**
 * Specialized chat function for the Employee Assistant.
 */
export const chatWithEmployeeAgent = async (
  query: string,
  systemPrompt: string
): Promise<{ response: string; modelUsed: string }> => {
  try {
    let context = systemPrompt;
    if (query.toLowerCase().includes('job') || query.toLowerCase().includes('role') || query.toLowerCase().includes('benefit')) {
      context += "\n\nREFER TO JOB DESCRIPTION (JD) STANDARDS:\n- Full Stack Developer: RM 5.5k-8.5k, Hybrid (3/2), Engineering Lead reporting.\n- DevOps: RM 6.5k-10k, Hybrid (2/3).\n- Benefits: RM 50k Medical, RM 1.5k L&D, 2-month Bonus cap.";
    }

    const { text } = await generateWithRetry(
      `${context}\n\nUser Question: ${query}\n\nAnswer concisely.`,
      { preferredModels: ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"] },
      { preferredModels: ["deepseek/deepseek-chat", "google/nemotron-3-8b-base"] }
    );
    return { response: text, modelUsed: "Employee Agent" };
  } catch (error) {
    console.error("Employee Agent Error:", error);
    throw error;
  }
};

// ---------------------
// Main agent chat
// ---------------------
export const chatWithAgent = async (
  query: string,
  agent: AgentConfig
): Promise<{ response: string; modelUsed: string }> => {
  let systemInstruction = agent.systemPrompt || "You are a helpful assistant.";
  systemInstruction += getRAGContext();

  const intent = determineIntent(query);
  const routing = determineModelRouting(query);

  try {
    // Local-first: query backend RAG
    if (agent.modelPreference === "local" || (routing === "local" && agent.modelPreference !== "premium")) {
      try {
        const ragResult = await queryBackendRAG(query);
        const sourceCitation = ragResult.sources?.length
          ? `\n\n_Sources: ${ragResult.sources.map((s: any) => `${s.file} (${s.jurisdiction})`).join(", ")}_`
          : "";
        return {
          response: (ragResult.response || "") + sourceCitation,
          modelUsed: "RAG-Local"
        };
      } catch (err) {
        console.warn("Backend RAG unavailable, falling back to OpenAI:", err);
      }
    }

    // Premium handling via OpenAI
    if (intent === "M1_POLICY_ENFORCE") {
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
      const { text } = await generateWithRetry(prompt);
      return { response: text, modelUsed: "RAG-Backend" };
    }

    if (intent === "M2_COMPLIANCE_MONITOR") {
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
      const { text } = await generateWithRetry(prompt);
      return { response: text, modelUsed: "RAG-Backend" };
    }

    if (intent === "M3_REGULATORY_FORECAST") {
      const profiles = await loadProfilesFromTxt();
      const profileSummary = profiles.slice(0, 5).join("\n\n---\n\n");
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
      const { text } = await generateWithRetry(prompt);
      return { response: text, modelUsed: "RAG-Backend" };
    }

    // Default premium: forward to backend RAG
    const defaultPrompt = `User Query: ${query}\n\nAnswer concisely and professionally. If specific laws apply, cite them.`;
    const { text } = await generateWithRetry(defaultPrompt);
    return { response: text, modelUsed: "RAG-Backend" };
  } catch (error: any) {
    console.error("Agent Chat Error:", error);
    return {
      response: `Error connecting to the intelligence engine: ${String(error)}`,
      modelUsed: "Error"
    };
  }
};

// ---------------------
// Contract Generation
// ---------------------
export const generateComplexContract = async (details: string): Promise<string> => {
  try {
    const { text } = await generateWithRetry(`
You are an advanced Global Legal AI Expert specializing in International Employment Law.
Create a detailed employment contract based on the following JSON parameters:
${details}

STRICT REQUIREMENTS:
1. Format using Markdown.
2. Identify the specific Jurisdiction from the input and apply the correct local laws (e.g., Malaysia EA 1955, UK Employment Rights Act 1996, California Labor Code, UAE Federal Decree-Law No. 33).
3. Cite specific statutes for the chosen jurisdiction (e.g., "Section 60F" for Malaysia, "Section 1" statement for UK).
4. Ensure compliance with local minimum wage, working hours, and leave entitlements.
5. Add a "Global Compliance Note" at the end highlighting any cross-border considerations if applicable.
    `);
    return text;
  } catch (error) {
    console.error("Backend RAG Error:", error);
    return "## Critical Error\nUnable to generate contract due to backend connectivity issues.";
  }
};

// ---------------------
// Strategic Insights
// ---------------------
export const generateStrategicInsights = async (marketData: string): Promise<string> => {
  try {
    const { text } = await generateWithRetry(`
Analyze the following workforce data and provided market trends in the context of the Global Job Market (with APAC/US/EU focus):
${marketData}

Provide a "Global Strategic Workforce Plan" summary.
Include:
1. Predicted Skill Gaps (Bullet points) - focus on AI & Digital Transformation.
2. Regional Hiring Trends & Salary Benchmarks.
3. Compliance Risks (e.g., EU AI Act, Pay Transparency directives).
4. Recommendations for Global Mobility.
`);
    return text;
  } catch (error) {
    return "Unable to generate strategic insights at this time.";
  }
};

// ---------------------
// Onboarding Analysis
// ---------------------
const ERROR_MSG = "Error generating onboarding plan.";

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

  const salaryNumeric = Number(String(data.salary).replace(/[^\d.-]+/g, ""));
  if (Number.isNaN(salaryNumeric) || salaryNumeric <= 0) {
    errors.push("Salary must be a positive number.");
  }

  const startTs = Date.parse(data.startDate);
  if (Number.isNaN(startTs)) {
    errors.push("Start Date is invalid or not parseable.");
  } else {
    const startYear = new Date(startTs).getFullYear();
    const now = new Date();
    const maxFutureYears = 2;
    if (startYear < 1900 || startYear > now.getFullYear() + maxFutureYears) {
      errors.push("Start Date year is not logical.");
    }
  }

  if (!["Malaysian", "Non-Malaysian"].includes(data.nationality)) {
    errors.push("Nationality must be 'Malaysian' or 'Non-Malaysian'.");
  }

  if (data.nationality === "Malaysian" && data.nric) {
    const nricDigits = String(data.nric).replace(/\D/g, "");
    if (!/^\d{12}$/.test(nricDigits)) {
      errors.push("NRIC must be 12 digits (numbers only).");
    }
  }

  return { ok: errors.length === 0, errors };
}

export const analyzeOnboarding = async (data: OnboardingData): Promise<string> => {
  try {
    const { ok, errors } = validateOnboardingData(data);
    if (!ok) {
      throw new Error("Validation failed: " + errors.join(" ; "));
    }

    const salaryNumeric = Number(String(data.salary).replace(/[^\d.-]+/g, ""));

    const isExpat = data.nationality === "Non-Malaysian";
    const visaPrompt = isExpat
      ? `
5. **Visa & Immigration Strategy (ESD/MDEC)**:
   - **Eligibility Check**: Based on RM${salaryNumeric}, determine Employment Pass Category (I, II, or III).
   - **Document Checklist**: List specific docs required (Passport all pages, Academic Certs, Cool-down period check).
   - **Timeline**: Estimate processing time for Approval Stage 1 & 2.
   - **Tax**: Mention Tax Clearance letter requirement if applicable for previous employment.
`
      : "";

    const nricSection =
      data.nationality === "Malaysian" && (data as any).nric
        ? `
5. **Identity Verification (NRIC)**:
   - **NRIC Provided**: ${(data as any).nric}
   - **Status**: FORMAT VERIFIED BY FRONTEND.
   - **Statutory**: Confirm eligibility for EPF (KWSP) and SOCSO (PERKESO) based on citizenship.
`
        : "";

    const prompt = `
Act as a Senior HR Onboarding Specialist & Global Mobility Expert.
Analyze the following new hire data and generate a comprehensive, modern Onboarding Journey.
Refer to standard Job Descriptions (JD) for ${data.role} if applicable.

Employee Data:
${JSON.stringify(data)}

Requirements:
1. **Immediate Compliance & Statutories**:
   - Identify statutory registrations (EPF/SOCSO/EIS/PCB).
   - Verify Minimum Wage compliance (Current MY Minimum Wage).
2. **First 90 Days Roadmap**:
   - **Day 1**: Welcome & Logistics.
   - **Week 1**: Quick wins & "Buddy" assignment (Suggest a specific role to pair with).
   - **Month 1**: Key project & certification goal.
3. **IT & Logistics Provisioning**:
   - Recommend specific equipment based on Role (e.g., Mac vs Windows, GPU requirements).
4. **Cultural Integration**:
   - One unique team bonding activity suggestion.
${visaPrompt}
${nricSection}

STRICT FORMATTING:
- Use clear Markdown headings.
- Keep sections concise but actionable.
`;

    const { text } = await generateWithRetry(prompt);
    return text;
  } catch (error) {
    if (error instanceof Error && error.message?.startsWith("Validation failed")) {
      throw error;
    }
    console.error("analyzeOnboarding error:", error);
    return ERROR_MSG;
  }
};

// ---------------------
// Resume Parsing (Vision)
// ---------------------
export const parseResume = async (file: File): Promise<Partial<OnboardingData>> => {
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

    const prompt = `
Extract the following candidate information from this resume.
Return the result as a raw JSON object (no markdown code blocks) with these keys:
- fullName (string)
- email (string)
- role (string, infer the most likely job title applied for or current title)
- department (string, infer a likely department e.g. Engineering, Sales, Marketing)
- nric (string, if Malaysian NRIC format is found)
- nationality (string, 'Malaysian' or 'Non-Malaysian' - infer from address/NRIC/Universities)
- salary (string, only if explicitly mentioned, else empty string)

If a field cannot be found, leave it as an empty string.
Image data: ${base64Data.substring(0, 100)}...
    `;

    const { text } = await generateWithRetry(prompt);
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn("Failed to parse resume JSON:", jsonStr);
      return {};
    }
  } catch (error) {
    console.error("Error parsing resume:", error);
    throw new Error("Failed to extract data from resume.");
  }
};

// ---------------------
// Candidate Submission Review
// ---------------------
export const reviewCandidateSubmission = async (data: CandidateProfile): Promise<string> => {
  try {
    const gaps = detectComplianceGapsFromCandidate(data);
    if (gaps.length) {
      const { text } = await generateWithRetry(`
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
      `);
      return text;
    }

    return "Submission looks complete based on local heuristics. Proceed to final verification.";
  } catch (error) {
    return "Error validating submission.";
  }
};
