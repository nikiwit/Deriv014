"""
Employee Chat endpoint.

Classifies employee queries via IntentClassifier, then either:
- returns a predefined response (SMALL_TALK, BOT_CAPABILITIES, PROFILE_QUERY, REQUEST_HR_TALK)
- routes through the AgentOrchestrator + RAG for LLM-backed answers
  (POLICY_RESEARCH, COMPLIANCE, DOCUMENT, EMPLOYEE_SUPPORT)
"""

import json
import uuid
import datetime

from flask import Blueprint, jsonify, request

from app import rag
from app.database import get_db
from app.agents.intent import IntentClassifier
from app.agents.prompts import AgentType
from app.agents.orchestrator import get_orchestrator

bp = Blueprint("employee_chat", __name__, url_prefix="/api/employee-chat")
import logging
logger = logging.getLogger(__name__)

# ── Predefined responses (no LLM call) ──────────────────────────

SMALL_TALK_RESPONSES = {
    "greeting": "Hello! How can I help you with your onboarding today?",
    "thanks": "You're welcome! Let me know if there's anything else I can help with.",
    "goodbye": "Goodbye! Feel free to come back anytime if you have more questions. Have a great day!",
    "sorry": "No worries at all! How can I assist you?",
    "default": "I'm here to help with your onboarding! Feel free to ask me about your profile, documents, contract signing, or anything HR-related.",
}

BOT_CAPABILITIES_RESPONSE = (
    "I'm your **DerivHR Onboarding Assistant**. Here's what I can help you with:\n\n"
    "| Capability | Description |\n"
    "|---|---|\n"
    "| **Profile Queries** | View your personal details, salary, role, department, and employment info |\n"
    "| **Contract Signing** | Guide you through the contract and offer letter signing process |\n"
    "| **Document Upload** | Help you understand how to upload required onboarding documents |\n"
    "| **HR Contact** | Provide information on how to reach HR for support |\n"
    "| **Onboarding Status** | Check your onboarding progress and next steps |\n"
    "| **Company Policies** | Answer questions about workplace policies and procedures |\n\n"
    "Just ask me a question and I'll do my best to help!"
)

HR_TALK_RESPONSE = (
    "I understand you'd like to speak with HR. Here are your options:\n\n"
    "1. **HR Support Email:** Send an email to hr@derivhr.com for general inquiries\n"
    "2. **Schedule a Meeting:** Contact your HR manager directly to set up a call\n"
    "3. **Urgent Issues:** For confidential or urgent matters, use the internal HR ticketing system\n\n"
    "Would you like me to help you with anything else in the meantime?"
)


def _classify_small_talk(message: str) -> str:
    """Return the sub-category for small-talk so we pick the right canned reply."""
    lower = message.lower().strip()
    import re
    if re.search(r"\b(hi|hello|hey|good\s*(morning|afternoon|evening))\b", lower):
        return "greeting"
    if re.search(r"\b(thanks|thank\s*you|thx|appreciate)\b", lower):
        return "thanks"
    if re.search(r"\b(bye|goodbye|see\s*you|talk\s*later)\b", lower):
        return "goodbye"
    if re.search(r"\b(sorry|my\s*bad)\b", lower):
        return "sorry"
    return "default"


def _is_contract_modification_request(message: str) -> bool:
    """Detect if user wants to modify contract terms."""
    import re
    keywords = [
        r'\b(change|modify|update|adjust|negotiate|revise|alter)\b',
        r'\b(different|another|increase|decrease|reduce|raise)\b.*\b(salary|start date|position|department|leave|probation)\b',
        r'\b(can i|could i|would it be possible)\b.*\b(change|modify|get)\b'
    ]
    return any(re.search(pattern, message, re.IGNORECASE) for pattern in keywords)


def _is_contract_relevant(message: str) -> bool:
    """Check if a message is relevant to contract review / negotiation context."""
    import re
    contract_keywords = [
        r'\b(contract|agreement|terms|sign|signing|reject|decline|accept)\b',
        r'\b(salary|pay|compensation|wage|bonus|allowance)\b',
        r'\b(start date|commencement|join|joining)\b',
        r'\b(position|role|title|department|team|division)\b',
        r'\b(probation|notice period|leave|annual leave|sick leave)\b',
        r'\b(working hours|overtime|benefits|insurance|medical)\b',
        r'\b(clause|section|paragraph|provision|entitlement)\b',
        r'\b(change|modify|update|adjust|negotiate|revise)\b',
        r'\b(ready|proceed|agree|disagree|question|clarify|explain)\b',
        r'\b(epf|socso|eis|cpf|contribution|deduction|tax)\b',
        r'\b(bank|account|nric|passport)\b',
    ]
    return any(re.search(p, message, re.IGNORECASE) for p in contract_keywords)


CONTRACT_OFF_TOPIC_RESPONSE = (
    "You're currently in **contract negotiation mode**. "
    "I can only assist with questions related to your contract right now.\n\n"
    "Here's what I can help with:\n"
    "- **Review** your contract details (salary, position, start date, etc.)\n"
    "- **Request changes** to contract terms (e.g. \"change my salary to 6000\")\n"
    "- **Sign** or **reject** the contract\n\n"
    "If you'd like to discuss something else, please start a **New Chat** first."
)


# from datetime import datetime
from typing import Any, Dict, List, Optional


def _iso_to_readable(ts: Optional[str]) -> str:
    if not ts:
        return ""
    try:
        # handle ISO timestamps like "2026-02-15T02:03:00.446954"
        dt = datetime.fromisoformat(ts)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return ts


def _safe(obj: Dict[str, Any], *keys, default=""):
    """Traverse nested dicts safely. Example: _safe(contract, 'personal_details', 'fullName')"""
    cur = obj
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k, default)
    return default if cur is None else cur


def _summarize_modification_history(history: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    if not history:
        return {"total": 0, "approved": 0, "rejected": 0, "last": None}
    total = len(history)
    approved = sum(1 for h in history if h.get("approved") is True)
    rejected = sum(1 for h in history if h.get("approved") is False)
    last = history[-1]  # assume chronological
    # build short last-summary
    last_summary = None
    try:
        mod = last.get("modification", {})
        last_summary = {
            "timestamp": last.get("timestamp"),
            "field": mod.get("field"),
            "new_value": mod.get("new_value"),
            "raw_request": mod.get("raw_request"),
            "approved": last.get("approved"),
            "rejection_reason": last.get("rejection_reason") or last.get("rejection_reasons") or [],
        }
    except Exception:
        last_summary = {"raw": str(last)}
    return {"total": total, "approved": approved, "rejected": rejected, "last": last_summary}


def _build_contract_summary_md(contract_data: Dict[str, Any]) -> str:
    """
    Build a full markdown contract summary from contract JSON data.
    
    Supports both:
    - NEW schema structure: { employee: {...}, job: {...}, company: {...} }
    - LEGACY flat structure: { personal_details: {...}, employment_details: {...} }
    """
    # Detect structure type: new schema vs legacy flat
    employee_sec = contract_data.get("employee", {}) or {}
    job_sec = contract_data.get("job", {}) or {}
    company_sec = contract_data.get("company", {}) or {}
    is_new_schema = bool(employee_sec.get("fullName") or job_sec.get("job_name"))

    # Top-level fields
    employee_id = (
        employee_sec.get("employee_id")
        or contract_data.get("employee_id")
        or contract_data.get("employeeId")
        or ""
    )
    status = contract_data.get("status", "")
    jurisdiction = (
        company_sec.get("jurisdiction")
        or contract_data.get("jurisdiction")
        or contract_data.get("jurisdiction_code", "MY")
    )
    created_at = _iso_to_readable(contract_data.get("created_at") or contract_data.get("createdAt"))
    last_updated = _iso_to_readable(contract_data.get("last_updated") or contract_data.get("lastUpdated"))
    finalized_at = _iso_to_readable(contract_data.get("finalized_at") or contract_data.get("finalizedAt"))

    # Legacy nested objects (for backwards compatibility)
    personal = contract_data.get("personal_details", {}) or {}
    banking = contract_data.get("banking_details", {}) or contract_data.get("bank_details", {}) or {}
    employment = contract_data.get("employment_details", {}) or {}

    # personal fields — try new schema first, then legacy
    employee_name = (
        employee_sec.get("fullName")
        or personal.get("fullName")
        or personal.get("full_name")
        or contract_data.get("employee_name")
        or contract_data.get("full_name")
        or ""
    )
    email = employee_sec.get("email") or personal.get("email") or contract_data.get("email") or ""
    nationality = employee_sec.get("nationality") or personal.get("nationality") or contract_data.get("nationality") or ""
    nric = employee_sec.get("nric") or personal.get("nric") or contract_data.get("nric") or ""
    dob = personal.get("dateOfBirth") or personal.get("date_of_birth") or contract_data.get("date_of_birth") or ""

    # banking
    bank_name = banking.get("bankName") or banking.get("bank_name") or ""
    bank_holder = banking.get("accountHolder") or banking.get("account_holder") or banking.get("bank_account_holder") or ""
    bank_account = banking.get("accountNumber") or banking.get("account_number") or banking.get("bank_account_number") or ""

    # employment — try new schema (job_sec) first, then legacy (employment)
    position = (
        job_sec.get("job_name")
        or employment.get("position_title")
        or employment.get("position")
        or ""
    )
    department = job_sec.get("department") or employment.get("department") or ""
    start_date = (
        employee_sec.get("startDate")
        or employment.get("start_date")
        or ""
    )
    salary = (
        employee_sec.get("offered_salary")
        or employment.get("salary")
        or ""
    )
    employment_type = job_sec.get("employment_type") or employment.get("employment_type") or ""
    reporting_to = job_sec.get("reporting_to") or employment.get("reporting_to") or ""
    role_summary = job_sec.get("role_summary") or ""

    # Work model (new schema)
    work_model = job_sec.get("work_model", {}) or {}
    work_type = work_model.get("type", "")
    office_days = work_model.get("office_days_per_week", "")
    remote_days = work_model.get("remote_days_per_week", "")
    # Legacy fallback
    work_location = employment.get("work_location") or contract_data.get("work_location") or ""
    work_hours = employment.get("work_hours") or contract_data.get("work_hours") or ""

    # Leave (new schema path: job.leave_policy, legacy: employment_details)
    leave_policy = job_sec.get("leave_policy", {}) or {}
    annual_leave = (
        leave_policy.get("annual_leave_days")
        or employment.get("annual_leave")
        or employment.get("leave_annual_days")
        or _safe(contract_data, "leave_annual_days")
    )
    sick_leave = (
        leave_policy.get("sick_leave_days")
        or employment.get("sick_leave")
        or employment.get("leave_sick_days")
        or _safe(contract_data, "leave_sick_days")
    )
    probation = (
        job_sec.get("probation_period_months")
        or employment.get("probation_months")
        or contract_data.get("probation_months")
        or ""
    )

    # Compensation (new schema) - ensure numeric values for :, formatting
    def _to_num(v, default=0):
        """Convert value to number, return default if not possible."""
        if v is None or v == "":
            return default
        try:
            return float(v)
        except (ValueError, TypeError):
            return default

    compensation = job_sec.get("compensation", {}) or {}
    salary_band_min = _to_num(compensation.get("salary_band_min"))
    salary_band_max = _to_num(compensation.get("salary_band_max"))
    bonus_months = _to_num((compensation.get("bonus_policy") or {}).get("max_months"))

    # Benefits (new schema) - ensure numeric values for :, formatting
    benefits = job_sec.get("benefits", {}) or {}
    medical_insurance = benefits.get("medical_insurance", {}) or {}
    medical_limit = _to_num(medical_insurance.get("annual_limit"))
    learning_allowance = _to_num(benefits.get("learning_allowance_per_year"))
    prof_dev = _to_num(benefits.get("professional_development_budget_per_year"))
    dental_coverage = _to_num(benefits.get("dental_coverage_per_year"))
    wellness_allowance = _to_num(benefits.get("wellness_allowance_per_year"))
    flexible_hours = benefits.get("flexible_hours", "")
    # Legacy fallback
    medical_coverage = contract_data.get("medical_coverage") or _safe(contract_data, "medicalCoverage") or ""

    # Responsibilities and career path (new schema)
    responsibilities = job_sec.get("responsibilities", []) or []
    career_path = job_sec.get("career_path", []) or []

    # modification history summary
    modification_history = contract_data.get("modification_history") or contract_data.get("modifications") or []
    mod_summary = _summarize_modification_history(modification_history)

    # currency by jurisdiction (simple mapping)
    currency_map = {"MY": "RM", "SG": "SGD", "SGP": "SGD", "US": "USD"}
    currency = (
        company_sec.get("currency")
        or currency_map.get((jurisdiction or "").upper(), "RM" if (jurisdiction or "").upper() == "MY" else "USD")
    )

    # Build markdown
    lines: List[str] = []
    lines.append("# Employment Contract Summary\n")

    lines.append(f"- **Employee ID:** `{employee_id}`")
    if status:
        lines.append(f"- **Status:** **{status}**")
    if jurisdiction:
        lines.append(f"- **Jurisdiction:** {jurisdiction}")
    if created_at:
        lines.append(f"- **Created at:** {created_at}")
    if finalized_at:
        lines.append(f"- **Finalized at:** {finalized_at}")
    if last_updated:
        lines.append(f"- **Last updated:** {last_updated}")

    lines.append("")  # blank

    # Personal details
    lines.append("## Personal details")
    lines.append(f"- **Name:** {employee_name or 'Not specified'}")
    lines.append(f"- **Email:** {email or 'Not specified'}")
    lines.append(f"- **Nationality:** {nationality or 'Not specified'}")
    lines.append(f"- **NRIC / ID:** {nric or 'Not specified'}")
    if dob:
        lines.append(f"- **Date of birth:** {dob}")

    lines.append("")  # blank

    # Employment details
    lines.append("## Employment details")
    lines.append(f"- **Position:** {position or 'Not specified'}")
    lines.append(f"- **Department:** {department or 'Not specified'}")
    if employment_type:
        lines.append(f"- **Employment type:** {employment_type}")
    if reporting_to:
        lines.append(f"- **Reporting to:** {reporting_to}")
    lines.append(f"- **Start date:** {start_date or 'Not specified'}")
    if salary:
        lines.append(f"- **Salary:** {currency} {salary}")
    if work_type:
        work_schedule = f"{work_type}"
        if office_days or remote_days:
            work_schedule += f" ({office_days} office / {remote_days} remote days per week)"
        lines.append(f"- **Work model:** {work_schedule}")
    elif work_location:
        lines.append(f"- **Work location:** {work_location}")
    if work_hours:
        lines.append(f"- **Work hours:** {work_hours}")
    if annual_leave:
        lines.append(f"- **Annual leave:** {annual_leave} days")
    if sick_leave:
        lines.append(f"- **Sick leave:** {sick_leave} days")
    if probation:
        lines.append(f"- **Probation:** {probation} months")

    lines.append("")  # blank

    # Role & Responsibilities (new schema)
    if role_summary or responsibilities:
        lines.append("## Role & Responsibilities")
        if role_summary:
            lines.append(f"{role_summary}")
            lines.append("")
        if responsibilities:
            for resp in responsibilities:
                lines.append(f"- {resp}")
        lines.append("")

    # Compensation details (new schema)
    if salary_band_min or salary_band_max or bonus_months:
        lines.append("## Compensation")
        if salary:
            lines.append(f"- **Monthly salary:** {currency} {salary}")
        if salary_band_min and salary_band_max:
            lines.append(f"- **Salary band:** {currency} {salary_band_min:,} – {currency} {salary_band_max:,}")
        if bonus_months:
            lines.append(f"- **Performance bonus:** Up to {bonus_months} months (discretionary)")
        lines.append("")

    # Benefits (new schema)
    has_benefits = medical_limit or learning_allowance or prof_dev or dental_coverage or wellness_allowance
    if has_benefits or medical_coverage:
        lines.append("## Benefits & Allowances")
        if medical_limit:
            lines.append(f"- **Medical insurance:** {currency} {medical_limit:,} annual limit")
        elif medical_coverage:
            lines.append(f"- **Medical coverage:** {medical_coverage}")
        if learning_allowance:
            lines.append(f"- **Learning allowance:** {currency} {learning_allowance:,}/year")
        if prof_dev:
            lines.append(f"- **Professional development:** {currency} {prof_dev:,}/year")
        if dental_coverage:
            lines.append(f"- **Dental coverage:** {currency} {dental_coverage:,}/year")
        if wellness_allowance:
            lines.append(f"- **Wellness allowance:** {currency} {wellness_allowance:,}/year")
        if flexible_hours is not None and flexible_hours != "":
            lines.append(f"- **Flexible hours:** {'Yes' if flexible_hours else 'No'}")
        lines.append("")

    # Banking
    if bank_name or bank_holder or bank_account:
        lines.append("## Banking details")
        if bank_name:
            lines.append(f"- **Bank:** {bank_name}")
        if bank_holder:
            lines.append(f"- **Account holder:** {bank_holder}")
        if bank_account:
            lines.append(f"- **Account number:** {bank_account}")
        lines.append("")

    # Career path (new schema)
    if career_path:
        lines.append("## Career Development Path")
        for level in career_path:
            lines.append(f"- **{level}**")
        lines.append("")

    # Modification history summary
    lines.append("## Modification history")
    lines.append(f"- **Total requests:** {mod_summary['total']}")
    lines.append(f"- **Approved:** {mod_summary['approved']}")
    lines.append(f"- **Rejected:** {mod_summary['rejected']}")
    if mod_summary["last"]:
        last = mod_summary["last"]
        last_ts = _iso_to_readable(last.get("timestamp"))
        lines.append(f"- **Last request:** {last_ts or 'unknown'}")
        if last.get("raw_request"):
            lines.append(f"  - Request: {last.get('raw_request')}")
        if last.get("field"):
            lines.append(f"  - Field: {last.get('field')}")
        if last.get("new_value") is not None:
            lines.append(f"  - Proposed new value: {last.get('new_value')}")
        lines.append(f"  - Approved: {last.get('approved')}")
        if last.get("rejection_reason"):
            # show up to 3 rejection reasons in short form
            reasons = last.get("rejection_reason") or []
            lines.append(f"  - Rejection reason(s): {', '.join(r[:200] for r in reasons[:3])}")
    lines.append("")

    # Raw / debug section (optional short)
    lines.append("---")
    lines.append("_You can request changes or click **Sign Contract** when ready._")

    return "\n".join(lines)

def _respond_in_contract_context(message: str, contract_json_path):
    """
    Respond to questions about the contract without modifications.
    Returns either a string (simple answer) or a dict with
    status/action/contract_data to trigger the full contract display.
    """
    import json
    from pathlib import Path

    if isinstance(contract_json_path, str):
        contract_json_path = Path(contract_json_path)

    if contract_json_path.exists():
        try:
            with open(contract_json_path, encoding="utf-8") as f:
                contract_data = json.load(f)

            message_lower = message.lower()

            # Support both legacy (employment_details) and new schema (employee/job)
            emp = contract_data.get("employment_details", {}) or {}
            employee_sec = contract_data.get("employee", {}) or {}
            job_sec = contract_data.get("job", {}) or {}
            company_sec = contract_data.get("company", {}) or {}

            if "salary" in message_lower or "pay" in message_lower:
                salary = (
                    employee_sec.get("offered_salary")
                    or emp.get("salary")
                    or contract_data.get("salary")
                    or "not specified"
                )
                currency = company_sec.get("currency") or ("RM" if contract_data.get("jurisdiction") == "MY" else "SGD")
                return f"Your contract salary is **{currency} {salary}**.\n\nIf you'd like to negotiate this, please let me know what you'd like to change it to."

            elif "start date" in message_lower or "when do i start" in message_lower:
                start_date = (
                    employee_sec.get("startDate")
                    or emp.get("start_date")
                    or contract_data.get("start_date")
                    or "not specified"
                )
                return f"Your contract start date is **{start_date}**.\n\nIf you'd like to change this, please let me know your preferred start date."

            elif "position" in message_lower or "role" in message_lower or "title" in message_lower:
                position = (
                    job_sec.get("job_name")
                    or emp.get("position_title")
                    or contract_data.get("position")
                    or "not specified"
                )
                return f"Your position is **{position}**.\n\nIf you'd like to discuss this, please let me know."

            elif "department" in message_lower:
                department = (
                    job_sec.get("department")
                    or emp.get("department")
                    or contract_data.get("department")
                    or "not specified"
                )
                return f"Your department is **{department}**.\n\nIf you'd like to change this, please let me know."

            elif "sign" in message_lower or "ready" in message_lower:
                return "Great! You can sign your contract by clicking the **Sign Contract** button below, or I can help you with any changes you'd like to make first."

            elif "show" in message_lower or "see" in message_lower or "view" in message_lower or "display" in message_lower:
                # Return full contract display with Sign/Reject buttons
                summary_md = _build_contract_summary_md(contract_data)
                return {
                    "show_contract": True,
                    "response": summary_md,
                    "contract_data": contract_data,
                }

            else:
                # General response — show the full contract
                summary_md = _build_contract_summary_md(contract_data)
                return summary_md

        except Exception as e:
            return f"I'm having trouble reading your contract file. Error: {str(e)}\n\nPlease contact HR for assistance."

    return "Your contract is being prepared. Please let me know if you have any questions about the contract signing process."


def _build_profile_response(employee_context: dict | None) -> str:
    """
    Build a markdown profile table from Supabase users table.
    Fetches fresh data from database instead of relying on employee_context.
    """
    # Get user ID from context
    user_id = None
    email = None
    
    if employee_context:
        user_id = employee_context.get("id")
        email = employee_context.get("email")
    
    # Fetch from Supabase users table
    db = get_db()
    user_data = None
    
    try:
        if user_id:
            result = db.table("users").select("*").eq("id", user_id).execute()
            if result.data:
                user_data = result.data[0]
        elif email:
            result = db.table("users").select("*").eq("email", email).execute()
            if result.data:
                user_data = result.data[0]
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        return (
            "I'm having trouble accessing your profile right now. "
            "Please try again or contact HR for assistance."
        )
    
    if not user_data:
        return (
            "I don't have your profile on file yet. "
            "Please complete the onboarding application form first, "
            "and I'll be able to answer questions about your details."
        )
    
    # Build full name
    full_name = f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
    if not full_name:
        full_name = user_data.get('full_name', 'N/A')
    
    # Build profile table
    rows = [
        ("Full Name", full_name),
        ("Email", user_data.get("email", "N/A")),
        ("Role / Position", user_data.get("role") or user_data.get("position_title", "N/A")),
        ("Department", user_data.get("department", "N/A")),
        ("Start Date", user_data.get("start_date", "N/A")),
        ("Nationality", user_data.get("nationality", "N/A")),
    ]
    # Add optional fields if present
    if user_data.get("nric"):
        rows.append(("NRIC", user_data["nric"]))
    if user_data.get("date_of_birth"):
        rows.append(("Date of Birth", user_data["date_of_birth"]))
    if user_data.get("bank_name"):
        rows.append(("Bank Name", user_data["bank_name"]))
    
    # Add onboarding status
    onboarding_complete = user_data.get("onboarding_complete", False)
    status = "Completed" if onboarding_complete else "In Progress"
    rows.append(("Onboarding Status", status))
    
    # Build markdown table
    table = "Here's your profile information from our system:\n\n| Field | Details |\n|---|---|\n"
    for label, value in rows:
        table += f"| **{label}** | {value or 'N/A'} |\n"
    
    table += "\n_Profile data retrieved from Supabase users table._\n\nLet me know if you need help with anything else!"
    return table


# ── Session / message helpers (reuse chat.py pattern) ────────────

def _ensure_session(session_id, jurisdiction=None):
    if not session_id:
        session_id = str(uuid.uuid4())
    db = get_db()
    existing = db.table("chat_sessions").select("id").eq("id", session_id).execute()
    if not existing.data:
        db.table("chat_sessions").insert({
            "id": session_id,
            "jurisdiction": jurisdiction,
            "updated_at": datetime.datetime.now().isoformat(),
        }).execute()
    return session_id


def _save_message(session_id, role, content, sources=None):
    db = get_db()
    db.table("chat_messages").insert({
        "session_id": session_id,
        "role": role,
        "content": content,
        "sources": json.dumps(sources) if sources else None,
    }).execute()
    db.table("chat_sessions").update({
        "updated_at": datetime.datetime.now().isoformat(),
    }).eq("id", session_id).execute()


# ── Main endpoint ────────────────────────────────────────────────

@bp.route("", methods=["POST"])
def employee_chat():
    """
    Employee chat endpoint with backend intent classification.

    Accepts JSON: { message, session_id?, employee_context? }
    Returns JSON: { response, intent, confidence, sources?, agent_used?, session_id }
    """
    data = request.get_json()
    if not data or not data.get("message"):
        return jsonify({"error": "Message is required"}), 400

    message = data["message"]
    employee_context = data.get("employee_context")
    session_id = _ensure_session(data.get("session_id"))

    _save_message(session_id, "user", message)

    # 0. Check for active contract session - bypass intent classification if active
    db = get_db()
    session_data = db.table("chat_sessions").select("active_contract_negotiation, contract_employee_id, contract_collection_state")\
        .eq("id", session_id).execute()
    
    # 0a. Check if we're collecting contract fields
    if session_data.data and session_data.data[0].get("contract_collection_state"):
        # User is responding to a field collection question
        from app.routes.employee_contract import process_field_response
        import json as json_module
        
        try:
            # Parse collection state to show progress
            collection_state_str = session_data.data[0].get("contract_collection_state")
            collection_state = json_module.loads(collection_state_str) if collection_state_str else {}
            collected_count = len(collection_state.get("collected_data", {}))
            missing_count = len(collection_state.get("missing_fields", []))
            total_fields = collected_count + missing_count
            
            # Check if this is a resumption
            resume_count = collection_state.get("resume_count", 0)
            is_resuming = resume_count > 0
            
            result = process_field_response(
                session_id=session_id,
                user_response=message,
                employee_context=employee_context or {}
            )
            
            # Enhance response with progress indicators
            response_text = result["response"]
            
            # Add progress bar visualization if collecting
            if result.get("status") in ["missing_fields", "resuming_collection"]:
                progress_collected = result.get("collected_count", collected_count)
                progress_total = result.get("total_fields", total_fields)
                if progress_total > 0:
                    progress_percent = int((progress_collected / progress_total) * 100)
                    progress_bar = "█" * (progress_percent // 10) + "░" * (10 - progress_percent // 10)
                    response_text = f"📊 Progress: [{progress_bar}] {progress_percent}%\n\n{response_text}"
            
            _save_message(session_id, "assistant", response_text)
            
            return jsonify({
                "session_id": session_id,
                "response": response_text,
                "intent": "contract_data_collection",
                "agent_used": "contract_agent",
                "collection_progress": {
                    "collected": result.get("collected_count", collected_count),
                    "total": result.get("total_fields", total_fields),
                    "is_resuming": is_resuming
                },
                **{k: v for k, v in result.items() if k not in ("response",)}
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_msg = f"Error processing your response: {str(e)}"
            _save_message(session_id, "assistant", error_msg)
            return jsonify({"error": error_msg}), 500
    
    if session_data.data and session_data.data[0].get("active_contract_negotiation"):
        # Session is in contract negotiation mode - bypass intent classification
        from pathlib import Path
        user_id = employee_context.get("id") if employee_context else None
        if not user_id:
            user_id = session_data.data[0].get("contract_employee_id")
        
        if user_id:
            contract_json_path = Path(__file__).resolve().parent.parent.parent / "temp_data" / f"{user_id}_contract.json"
            
            # Check for modification keywords
            if _is_contract_modification_request(message):
                # Route to negotiation handler
                from app.routes.contract_negotiation import handle_contract_negotiation
                try:
                    result = handle_contract_negotiation(
                        message=message,
                        employee_context=employee_context or {},
                        session_id=session_id,
                        contract_json_path=contract_json_path
                    )
                    _save_message(session_id, "assistant", result["response"])

                    payload = {
                        "session_id": session_id,
                        "response": result["response"],
                        "intent": "contract_negotiation",
                        "agent_used": "contract_negotiation",
                        **{k: v for k, v in result.items() if k not in ("response",)}
                    }
                    # When modification is accepted, also provide contract_data
                    # so the frontend can re-display the contract with Sign/Reject
                    if result.get("status") == "modification_accepted" and result.get("updated_contract"):
                        payload["contract_data"] = result["updated_contract"]

                    return jsonify(payload)
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    error_msg = f"Contract negotiation error: {str(e)}"
                    _save_message(session_id, "assistant", error_msg)
                    return jsonify({"error": error_msg}), 500
            else:
                # In negotiation mode — only allow contract-relevant messages
                if not _is_contract_relevant(message):
                    _save_message(session_id, "assistant", CONTRACT_OFF_TOPIC_RESPONSE)
                    return jsonify({
                        "session_id": session_id,
                        "response": CONTRACT_OFF_TOPIC_RESPONSE,
                        "intent": "contract_off_topic",
                        "agent_used": "contract_agent"
                    })

                # Respond in contract context without modifying
                ctx_result = _respond_in_contract_context(message, contract_json_path)

                # _respond_in_contract_context returns a dict when it wants
                # the frontend to re-display the full contract with Sign/Reject
                if isinstance(ctx_result, dict) and ctx_result.get("show_contract"):
                    _save_message(session_id, "assistant", ctx_result["response"])
                    return jsonify({
                        "session_id": session_id,
                        "response": ctx_result["response"],
                        "status": "contract_ready",
                        "action": "show_contract",
                        "contract_data": ctx_result["contract_data"],
                        "intent": "contract_context",
                        "agent_used": "contract_agent"
                    })

                response_text = ctx_result if isinstance(ctx_result, str) else ctx_result.get("response", "")
                _save_message(session_id, "assistant", response_text)
                return jsonify({
                    "session_id": session_id,
                    "response": response_text,
                    "intent": "contract_context",
                    "agent_used": "contract_agent"
                })

    # 1. Classify intent
    agent_type, confidence = IntentClassifier.classify(message)
    intent_name = agent_type.value

    # 2. Handle predefined-response intents (NO LLM)
    if agent_type == AgentType.SMALL_TALK:
        sub = _classify_small_talk(message)
        response_text = SMALL_TALK_RESPONSES.get(sub, SMALL_TALK_RESPONSES["default"])
        _save_message(session_id, "assistant", response_text)
        return jsonify({
            "session_id": session_id,
            "response": response_text,
            "intent": intent_name,
            "confidence": confidence,
            "agent_used": "predefined",
        })

    if agent_type == AgentType.BOT_CAPABILITIES:
        _save_message(session_id, "assistant", BOT_CAPABILITIES_RESPONSE)
        return jsonify({
            "session_id": session_id,
            "response": BOT_CAPABILITIES_RESPONSE,
            "intent": intent_name,
            "confidence": confidence,
            "agent_used": "predefined",
        })

    if agent_type == AgentType.PROFILE_QUERY:
        response_text = _build_profile_response(employee_context)
        _save_message(session_id, "assistant", response_text)
        return jsonify({
            "session_id": session_id,
            "response": response_text,
            "intent": intent_name,
            "confidence": confidence,
            "agent_used": "predefined",
        })

    if agent_type == AgentType.REQUEST_HR_TALK:
        _save_message(session_id, "assistant", HR_TALK_RESPONSE)
        return jsonify({
            "session_id": session_id,
            "response": HR_TALK_RESPONSE,
            "intent": intent_name,
            "confidence": confidence,
            "agent_used": "predefined",
        })

    # 3. Contract signing intent → dedicated handler
    if agent_type == AgentType.SIGN_CONTRACT_REQUEST:
        from app.routes.employee_contract import process_contract_request

        try:
            result = process_contract_request(employee_context, session_id)
            logger.info("Start processing contract request")
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"Contract error: {str(e)}"}), 500

        _save_message(session_id, "assistant", result["response"])
        return jsonify({
            "session_id": session_id,
            "response": result["response"],
            "intent": intent_name,
            "confidence": confidence,
            "agent_used": "contract_agent",
            **{k: v for k, v in result.items() if k not in ("response",)},
        })

    # 4. LLM-backed intents → route through orchestrator + RAG
    try:
        orchestrator = get_orchestrator()
        engine = rag.get_chat_engine(session_id)

        result = orchestrator.process_query(
            session_id=session_id,
            query=message,
            rag_engine=engine,
            jurisdiction=data.get("jurisdiction"),
            employee_context=employee_context,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Agent error: {str(e)}"}), 500

    _save_message(session_id, "assistant", result["response"], result.get("sources"))

    return jsonify({
        "session_id": session_id,
        "response": result["response"],
        "intent": intent_name,
        "confidence": confidence,
        "sources": result.get("sources", []),
        "agent_used": result.get("agent_used", intent_name),
        "routing_reason": result.get("routing_reason", ""),
    })
