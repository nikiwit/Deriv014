// Thin wrapper around the Flask backend API.
// All /api/* calls are proxied to Flask by Vite (dev) or served same-origin (prod).

const API_BASE = "/api";

// ── CHAT (RAG Q&A) ──────────────────────────────────────

export interface ChatSource {
  file: string;
  jurisdiction: string;
  score: number | null;
  snippet: string;
}

export interface ChatResponse {
  session_id: string;
  response: string;
  sources: ChatSource[];
}

export async function sendChatMessage(
  message: string,
  sessionId?: string | null,
  jurisdiction?: string | null,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId || null,
      jurisdiction: jurisdiction || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Chat failed: ${res.status}`);
  }
  return res.json();
}

// ── DOCUMENT GENERATION ──────────────────────────────────

export interface GenerateContractRequest {
  employee_name?: string;
  position?: string;
  department?: string;
  jurisdiction?: "MY" | "SG";
  start_date?: string;
  salary?: number;
  nric?: string;
  employee_address?: string;
  employee_id?: string;
}

export interface GenerateContractResponse {
  id: string;
  document_type: string;
  jurisdiction: string;
  employee_name: string;
  employee_id?: string;
  download_url: string;
}

export async function generateContractAPI(
  params: GenerateContractRequest,
): Promise<GenerateContractResponse> {
  const res = await fetch(`${API_BASE}/documents/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Generate failed: ${res.status}`);
  }
  return res.json();
}

export function downloadDocument(downloadUrl: string, filename?: string): void {
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename || "contract.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ── ONBOARDING ───────────────────────────────────────────

export interface CreateEmployeeRequest {
  email: string;
  full_name: string;
  jurisdiction: "MY" | "SG";
  position?: string;
  department?: string;
  start_date?: string;
  nric?: string;
  phone?: string;
  address?: string;
  bank_name?: string;
  bank_account?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
}

export interface EmployeeListItem {
  id: string;
  email: string;
  full_name: string;
  jurisdiction: string;
  position: string;
  department: string;
  status: string;
  created_at: string;
  progress: string;
}

export async function createEmployee(data: CreateEmployeeRequest): Promise<{
  id: string;
  email: string;
  full_name: string;
  jurisdiction: string;
  status: string;
  offer_letter_html?: string;
  offer_id?: string;
  pdf_path?: string;
}> {
  const res = await fetch(`${API_BASE}/onboarding/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Create employee failed: ${res.status}`);
  }
  return res.json();
}

export async function listEmployees(): Promise<{
  employees: EmployeeListItem[];
}> {
  const res = await fetch(`${API_BASE}/onboarding/employees`);
  if (!res.ok) throw new Error(`List employees failed: ${res.status}`);
  return res.json();
}

export async function getEmployeeChecklist(employeeId: string): Promise<any> {
  const res = await fetch(
    `${API_BASE}/onboarding/employees/${employeeId}/checklist`,
  );
  if (!res.ok) throw new Error(`Get checklist failed: ${res.status}`);
  return res.json();
}

export async function updateChecklistItem(
  employeeId: string,
  docId: number,
  submitted: boolean,
): Promise<any> {
  const res = await fetch(
    `${API_BASE}/onboarding/employees/${employeeId}/checklist/${docId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submitted }),
    },
  );
  if (!res.ok) throw new Error(`Update checklist failed: ${res.status}`);
  return res.json();
}

// ── AUTH ───────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department?: string;
  employee_id?: string;
  start_date?: string;
  onboarding_complete?: boolean;
  nationality?: string;
  nric?: string;
}

export async function fetchAuthUsers(role?: string): Promise<{
  users: AuthUser[];
}> {
  const url = role
    ? `${API_BASE}/auth/users?role=${role}`
    : `${API_BASE}/auth/users`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch users failed: ${res.status}`);
  return res.json();
}

export async function createAuthUser(
  email: string,
  first_name: string,
  last_name: string,
  role: string,
  department?: string,
  nationality?: string,
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      first_name,
      last_name,
      role,
      department,
      nationality,
    }),
  });
  if (!res.ok) throw new Error(`Create user failed: ${res.status}`);
  return res.json();
}
