"""
Employee Contract endpoint.

Handles the SIGN_CONTRACT_REQUEST intent:
1. Load contract schema from docs/contract.schema.json
2. Fetch employee profile from Supabase users table
3. Extract job details via RAG (REQUIRED - fails if not found)
4. If profile fields are missing → ask in chat (with resumption support)
5. Create template file immediately when starting collection
6. Triple-update on each field: collection_state + users table + template file
7. Render a human-readable contract in markdown
8. Return with action="show_contract" so frontend shows Sign/Reject buttons
"""

import json
import os
import datetime
import re
import logging
from pathlib import Path
from typing import Optional

from flask import Blueprint, jsonify, request

from app.database import get_db
from app import rag
from app.document_generator import _get_jurisdiction_defaults
from app.utils.contract_state_manager import ContractStateManager

bp = Blueprint("employee_contract", __name__, url_prefix="/api/employee-chat")

logger = logging.getLogger(__name__)

_BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent  # project root
_SCHEMA_PATH = _BASE_DIR / "docs" / "contract.schema.json"


def _load_schema() -> dict:
    """Load the contract schema JSON."""
    with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _fetch_user_from_supabase(user_id: Optional[str] = None, email: Optional[str] = None) -> Optional[dict]:
    """Fetch user record from Supabase users table."""
    db = get_db()
    if user_id:
        result = db.table("users").select("*").eq("id", user_id).execute()
    elif email:
        result = db.table("users").select("*").eq("email", email).execute()
    else:
        return None
    return result.data[0] if result.data else None

def _fetch_user_from_supabase_employees(user_id: Optional[str] = None, email: Optional[str] = None) -> Optional[dict]:
    """Fetch user record from Supabase users table."""
    db = get_db()
    if user_id:
        result = db.table("employees").select("*").eq("id", user_id).execute()
    elif email:
        result = db.table("employees").select("*").eq("email", email).execute()
    else:
        return None
    return result.data[0] if result.data else None



# Map schema field keys → Supabase user column(s)
_FIELD_MAP = {
    "fullName": lambda u: f"{u.get('first_name', '')} {u.get('last_name', '')}".strip(),
    "nric": lambda u: u.get("nric", ""),
    "nationality": lambda u: u.get("nationality", ""),
    "dateOfBirth": lambda u: u.get("date_of_birth", ""),
    "bankName": lambda u: u.get("bank_name", ""),
    "accountHolder": lambda u: u.get("bank_account_holder", ""),
    "accountNumber": lambda u: u.get("bank_account_number", ""),
}

# Job-detail fields that can be inferred via LLM if missing
_JOB_FIELDS = {
    "position_title": "What is the employee's job title / position?",
    "department": "Which department does the employee belong to?",
    "start_date": "What is the employee's start date?",
}

# Friendly questions for missing personal fields
_PERSONAL_FIELD_QUESTIONS = {
    "fullName": "What is your full name (as per NRIC/Passport)?",
    "nric": "What is your NRIC number? (format: 950620-08-1234)",
    "nationality": "What is your nationality? (Malaysian / Non-Malaysian)",
    "dateOfBirth": "What is your date of birth?",
    "bankName": "What is your bank name?",
    "accountHolder": "What is the account holder name?",
    "accountNumber": "What is your bank account number?",
}


def process_contract_request(employee_context: Optional[dict] = None, session_id: Optional[str] = None) -> dict:
    """
    Core contract processing logic with resumption support and template creation.
    Called from the employee_chat route when intent is SIGN_CONTRACT_REQUEST.

    New Flow:
    1. Check for existing collection state (resumption)
    2. Set active_contract_negotiation = TRUE immediately
    3. Create template file at start
    4. Extract job details via RAG (REQUIRED - fail if not found)
    5. Check for missing personal fields
    6. Collect fields one by one with triple-update
    7. Finalize template to contract when complete

    Returns a dict with:
      - status: "contract_ready" | "missing_fields" | "resuming_collection" | "error"
      - response: markdown string for chat display
      - contract_data: structured data (when contract_ready)
      - missing_fields: list of {key, question} (when missing_fields)
      - action: "show_contract" (when contract_ready) so frontend renders buttons
    """
    # 0. Resolve the user from Supabase
    user_id = (employee_context or {}).get("id")
    email = (employee_context or {}).get("email")
    db_user = _fetch_user_from_supabase_employees(user_id=user_id, email=email)

    if not db_user or not user_id:
        return {
            "status": "error",
            "response": "Unable to identify your user profile. Please log in again.",
        }

    # Merge: DB data is authoritative, employee_context fills gaps
    merged = dict(db_user)
    if employee_context:
        for k, v in employee_context.items():
            if v and not merged.get(k):
                merged[k] = v

    # Initialize state manager
    state_manager = ContractStateManager(session_id, user_id)
    
    # 1. Check for existing collection state (resumption)
    existing_state = state_manager.get_state()
    if existing_state and existing_state.get("collected_data"):
        # Resume from existing state
        resume_result = state_manager.resume_collection()
        collected_data = resume_result.get("collected_data", {})
        missing_fields = resume_result.get("remaining_fields", [])
        
        # Merge collected data with user data
        merged.update(collected_data)
        
        if missing_fields:
            # Continue collection
            next_field = missing_fields[0]
            collected_count = resume_result.get("collected_count", 0)
            total_fields = collected_count + len(missing_fields)
            
            response_md = (
                f"Welcome back! Let's continue with your contract.\n\n"
                f"**Progress**: {collected_count}/{total_fields} fields collected\n\n"
                f"**{next_field.get('label', next_field['key'])}**: {next_field['question']}\n\n"
                f"_Type 'cancel' to exit._"
            )
            
            return {
                "status": "resuming_collection",
                "response": response_md,
                "missing_fields": missing_fields,
                "collecting_field": next_field["key"],
                "collected_count": collected_count,
                "total_fields": total_fields
            }
        else:
            # All fields collected during previous session - finalize
            logger.info(f"Resuming with all fields collected for user {user_id}")
            # Fall through to finalization

    # 2. Load schema
    try:
        schema = _load_schema()
    except FileNotFoundError:
        return {
            "status": "error",
            "response": "Contract schema not found. Please contact HR.",
        }

    # 3. Determine jurisdiction early
    nationality = (merged.get("nationality") or "").lower()
    jurisdiction = "SG" if "singapore" in nationality or "singaporean" in nationality else "MY"

    # 4. Extract job details via RAG (REQUIRED - strict mode)
    job_details = _extract_job_details_via_rag_strict(merged, session_id)
    
    if not job_details:
        # RAG extraction failed - cannot continue
        return {
            "status": "error",
            "error_type": "rag_extraction_failed",
            "response": (
                "⚠️ Unable to retrieve your employment details from onboarding documents.\n\n"
                "**Required Information:**\n"
                "- Job Position/Title\n"
                "- Department\n"
                "- Start Date\n\n"
                "Please contact HR to ensure your offer letter and employment records have been uploaded to the system."
            )
        }
    
    # Merge job details into user data
    merged.update(job_details)
    logger.info(f"Extracted job details via RAG for user {user_id}: {job_details}")

    # 5. Set active_contract_negotiation and create template immediately
    if not existing_state:
        init_result = state_manager.initialize_collection(jurisdiction, job_details)
        if init_result.get("status") == "error":
            return {
                "status": "error",
                "response": f"Failed to initialize contract collection: {init_result.get('error')}"
            }
        logger.info(f"Initialized contract collection for user {user_id}")

    # 6. Check for missing personal fields
    missing = []
    for section in schema.get("sections", []):
        for field in section.get("fields", []):
            key = field["key"]
            if not field.get("required", False):
                continue
            if field.get("type") == "checkbox":
                continue  # checkboxes are acknowledgements, not profile data
            
            # Resolve value from merged data
            resolver = _FIELD_MAP.get(key)
            value = resolver(merged) if resolver else merged.get(key, "")
            
            if not value or not str(value).strip():
                question = _PERSONAL_FIELD_QUESTIONS.get(key, f"Please provide your {field.get('label', key)}.")
                missing.append({
                    "key": key,
                    "label": field.get("label", key),
                    "question": question,
                    "schema": field
                })

    if missing:
        # Update collection state with missing fields
        collection_state = state_manager.get_state()
        if collection_state:
            collection_state["missing_fields"] = missing
            collection_state["collecting_field"] = missing[0]["key"]
            # Update in database
            db = get_db()
            db.table("chat_sessions").update({
                "contract_collection_state": json.dumps(collection_state)
            }).eq("id", session_id).execute()
        
        first = missing[0]
        total_fields = len(job_details) + len(missing)
        collected_count = len(job_details)
        
        response_md = (
            f"I've found your employment details! Now I need some personal information.\n\n"
            f"**Progress**: {collected_count}/{total_fields} fields collected\n\n"
            f"**{first['label']}**: {first['question']}\n\n"
            f"_Type 'cancel' to exit._"
        )
        
        return {
            "status": "missing_fields",
            "response": response_md,
            "missing_fields": missing,
            "collecting_field": first["key"],
            "collected_count": collected_count,
            "total_fields": total_fields
        }

    # 7. All fields present → finalize and render contract
    finalize_result = state_manager.finalize_collection()
    
    if finalize_result.get("status") == "error":
        return {
            "status": "error",
            "response": f"Failed to finalize contract: {finalize_result.get('error')}"
        }
    
    contract_md, contract_data = _render_contract(merged, schema)
    
    logger.info(f"Contract ready for user {user_id}")

    return {
        "status": "contract_ready",
        "response": contract_md,
        "contract_data": contract_data,
        "action": "show_contract",
    }


def _extract_job_details_via_rag_strict(user_data: dict, session_id: Optional[str] = None) -> Optional[dict]:
    """
    Extract job details from RAG (STRICT MODE - REQUIRED).
    Returns None if extraction fails or required fields are missing.
    
    This is a REQUIRED step - if RAG fails, the process cannot continue.
    
    Args:
        user_data: Current employee data (must include email)
        session_id: Session ID for RAG context
        
    Returns:
        dict with extracted job details or None if extraction failed
    """
    name = f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
    if not name:
        name = user_data.get("fullName", "")
    email = user_data.get("email", "")
    
    if not email:
        logger.error("Cannot extract job details: no email provided")
        return None
    
    extracted = {}
    
    try:
        # Build comprehensive query for all job details
        query = (
            f"Extract employment details for {name} ({email}) from onboarding documents, "
            f"offer letters, HR records, or employment agreements. "
            f"Please provide:\n"
            f"1. Job position/title\n"
            f"2. Department/team\n"
            f"3. Start date (employment commencement date)\n"
            f"4. Salary (if mentioned)\n\n"
            f"Format the response clearly with field names and values."
        )
        
        sid = session_id or f"contract_rag_{user_data.get('id', 'unknown')}"
        response_text, sources = rag.query(sid, query)
        
        if not response_text or len(response_text) < 20:
            logger.warning(f"RAG returned insufficient data for user {email}")
            return None
        
        logger.info(f"RAG response for {email}: {response_text[:200]}...")
        
        # Parse the RAG response to extract specific fields
        # Extract position/title
        position_patterns = [
            r'(?:position|title|role)[:\s]+([A-Za-z\s&\-]+?)(?:\n|$|,|\.|;)',
            r'as\s+(?:a\s+)?([A-Za-z\s&\-]+?(?:engineer|developer|manager|analyst|specialist|designer|consultant|director|lead|coordinator))',
            r'hired\s+as\s+([A-Za-z\s&\-]+?)(?:\n|$|,|\.|;)',
        ]
        for pattern in position_patterns:
            match = re.search(pattern, response_text, re.IGNORECASE)
            if match:
                extracted["position_title"] = match.group(1).strip()
                logger.info(f"Extracted position: {extracted['position_title']}")
                break
        
        # Extract department
        dept_patterns = [
            r'(?:department|team|division)[:\s]+([A-Za-z\s&\-]+?)(?:\n|$|,|\.|;)',
            r'(?:in|within|at)\s+the\s+([A-Za-z\s&\-]+?)\s+(?:department|team|division)',
        ]
        for pattern in dept_patterns:
            match = re.search(pattern, response_text, re.IGNORECASE)
            if match:
                dept = match.group(1).strip()
                # Filter out common false positives
                if dept.lower() not in ['the', 'this', 'our', 'company']:
                    extracted["department"] = dept
                    logger.info(f"Extracted department: {extracted['department']}")
                    break
        
        # Extract start date
        date_patterns = [
            r'start\s+date[:\s]+(\d{4}-\d{2}-\d{2})',
            r'start\s+date[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
            r'commence(?:ment)?[:\s]+(?:on\s+)?(\d{4}-\d{2}-\d{2})',
            r'commence(?:ment)?[:\s]+(?:on\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
            r'join(?:ing)?[:\s]+(?:on\s+)?(\d{4}-\d{2}-\d{2})',
            r'join(?:ing)?[:\s]+(?:on\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
            r'employment\s+begins[:\s]+(\d{4}-\d{2}-\d{2})',
            r'employment\s+begins[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
        ]
        for pattern in date_patterns:
            match = re.search(pattern, response_text, re.IGNORECASE)
            if match:
                extracted["start_date"] = match.group(1)
                logger.info(f"Extracted start_date: {extracted['start_date']}")
                break
        
        # Extract salary (optional)
        salary_patterns = [
            r'salary[:\s]+(?:RM|SGD|\$|MYR|S\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
            r'compensation[:\s]+(?:RM|SGD|\$|MYR|S\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
            r'earning[:\s]+(?:RM|SGD|\$|MYR|S\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
        ]
        for pattern in salary_patterns:
            match = re.search(pattern, response_text, re.IGNORECASE)
            if match:
                salary_str = match.group(1).replace(',', '')
                extracted["salary"] = salary_str
                logger.info(f"Extracted salary: {extracted['salary']}")
                break
        
        # Validate required fields are present
        required_fields = ["position_title", "department", "start_date"]
        missing_required = [f for f in required_fields if f not in extracted or not extracted[f]]
        
        if missing_required:
            logger.warning(f"RAG extraction incomplete for {email}. Missing: {missing_required}")
            return None
        
        logger.info(f"RAG extraction successful for {email}: {extracted}")
        return extracted
        
    except Exception as e:
        logger.error(f"RAG extraction error for {email}: {e}")
        return None


def _render_contract(user_data: dict, schema: dict) -> tuple[str, dict]:
    """
    Render the contract as human-readable markdown and return structured data.
    """
    # Determine jurisdiction
    nationality = (user_data.get("nationality") or "").lower()
    jurisdiction = "SG" if "singapore" in nationality or "singaporean" in nationality else "MY"
    defaults = _get_jurisdiction_defaults(jurisdiction)

    full_name = _FIELD_MAP["fullName"](user_data)
    nric = _FIELD_MAP["nric"](user_data)
    position = user_data.get("position_title", user_data.get("role", "Employee"))
    department = user_data.get("department", "")
    start_date = str(user_data.get("start_date", ""))
    salary = user_data.get("salary", "")

    # Build contract markdown
    md = f"""## Employment Contract

**{defaults['company_name']}**
{defaults['company_reg']}
{defaults['company_address']}

---

### Employee Details

| Field | Details |
|-------|---------|
| **Full Name** | {full_name} |
| **NRIC / ID** | {nric or '—'} |
| **Nationality** | {user_data.get('nationality', '—')} |
| **Position** | {position} |
| **Department** | {department} |
| **Start Date** | {start_date} |
{f'| **Salary** | {defaults["currency"]} {salary} |' if salary else ''}

---

### Terms & Conditions

| Term | Details |
|------|---------|
| **Probation** | {defaults['probation_months']} months |
| **Working Hours** | {defaults['work_hours']} |
| **Overtime** | {defaults['overtime_rate']} |
| **Notice Period** | {defaults['notice_period']} |
| **Governing Law** | {defaults['governing_law']} |

### Leave Entitlement

| Type | Entitlement |
|------|-------------|
| **Annual Leave** | {defaults['leave_annual']} |
| **Sick Leave** | {defaults['leave_sick']} |
| **Hospitalization** | {defaults['leave_hospitalization']} |
| **Maternity** | {defaults['leave_maternity']} |
| **Paternity** | {defaults['leave_paternity']} |

### Statutory Contributions

{defaults['statutory_contributions']}

### Medical Coverage

{defaults['medical_coverage']}

---

### Policy Acknowledgements

- [ ] I agree to the Employee Handbook
- [ ] I confirm the declaration above is true and correct

---

_Please review the contract above. Click **Sign** to accept or **Reject** to decline._
"""

    # Structured data for the signing pipeline
    contract_data = {
        "employee_name": full_name,
        "nric": nric,
        "nationality": user_data.get("nationality", ""),
        "position": position,
        "department": department,
        "start_date": start_date,
        "salary": salary,
        "jurisdiction": jurisdiction,
        "employee_id": user_data.get("id", ""),
        "email": user_data.get("email", ""),
        "company": defaults["company_name"],
    }

    return md, contract_data


# Legacy functions - now handled by ContractStateManager
# Kept for backward compatibility only

def _set_collection_state(session_id: str, collecting_field: str, missing_fields: list):
    """
    DEPRECATED: Use ContractStateManager instead.
    Store the current data collection state in the session.
    """
    logger.warning("_set_collection_state is deprecated, use ContractStateManager")
    db = get_db()
    collection_state = {
        "collecting_field": collecting_field,
        "missing_fields": missing_fields,
        "started_at": datetime.datetime.now().isoformat(),
        "collected_data": {}  # New field for compatibility
    }
    
    db.table("chat_sessions").update({
        "contract_collection_state": json.dumps(collection_state)
    }).eq("id", session_id).execute()


def _clear_collection_state(session_id: str):
    """DEPRECATED: Use ContractStateManager.clear_state() instead."""
    logger.warning("_clear_collection_state is deprecated, use ContractStateManager")
    db = get_db()
    db.table("chat_sessions").update({
        "contract_collection_state": None
    }).eq("id", session_id).execute()


def _get_collection_state(session_id: str) -> Optional[dict]:
    """DEPRECATED: Use ContractStateManager.get_state() instead."""
    logger.warning("_get_collection_state is deprecated, use ContractStateManager")
    db = get_db()
    result = db.table("chat_sessions").select("contract_collection_state").eq("id", session_id).execute()
    
    if result.data and result.data[0].get("contract_collection_state"):
        try:
            return json.loads(result.data[0]["contract_collection_state"])
        except json.JSONDecodeError:
            return None
    return None


def process_field_response(
    session_id: str,
    user_response: str,
    employee_context: dict
) -> dict:
    """
    Process user's response to a field collection question with triple-update logic.
    
    Updates:
    1. collection_state in chat_sessions
    2. users table
    3. template file
    
    Args:
        session_id: Active chat session ID
        user_response: User's answer to the field question
        employee_context: Current employee context
        
    Returns:
        dict with status and next action
    """
    user_id = (employee_context or {}).get("id")
    
    if not user_id:
        return {
            "status": "error",
            "response": "Unable to identify your user profile. Please log in again."
        }
    
    # Initialize state manager
    state_manager = ContractStateManager(session_id, user_id)
    
    # Get current collection state
    collection_state = state_manager.get_state()
    if not collection_state:
        # No active collection - process as normal contract request
        logger.info(f"No collection state found for session {session_id}, starting fresh")
        return process_contract_request(employee_context, session_id)
    
    collecting_field = collection_state.get("collecting_field")
    missing_fields = collection_state.get("missing_fields", [])
    collected_data = collection_state.get("collected_data", {})
    
    # Check for cancellation
    if user_response.lower().strip() in ["cancel", "exit", "quit", "stop"]:
        state_manager.clear_state()
        return {
            "status": "cancelled",
            "response": "Contract signing cancelled. You can restart by saying 'sign my contract' whenever you're ready."
        }
    
    # Get field schema for comprehensive validation
    current_field = next((f for f in missing_fields if f.get("key") == collecting_field), None)
    field_schema = current_field.get("schema", {}) if current_field else {}
    
    # Validate the response
    validation_result = _validate_field_comprehensive(collecting_field, user_response, field_schema)
    
    if not validation_result.get("valid"):
        # Ask again with validation error message
        error_msg = validation_result.get("error_message", "Invalid input")
        if current_field:
            return {
                "status": "invalid_response",
                "response": f"❌ {error_msg}\n\n**{current_field.get('label', collecting_field)}**: {current_field['question']}\n\n_Type 'cancel' to exit._"
            }
    
    validated_value = validation_result.get("validated_value")
    
    # Determine which section this field belongs to
    section_map = {
        "fullName": "personal_details",
        "nric": "personal_details",
        "nationality": "personal_details",
        "dateOfBirth": "personal_details",
        "bankName": "banking_details",
        "accountHolder": "banking_details",
        "accountNumber": "banking_details",
    }
    section = section_map.get(collecting_field, "personal_details")
    
    # TRIPLE UPDATE: collection_state + users table + template file
    update_result = state_manager.update_collected_field(
        field_key=collecting_field,
        value=validated_value,
        field_schema=field_schema,
        section=section
    )
    
    if update_result.get("status") == "error":
        logger.error(f"Failed to update field {collecting_field}: {update_result.get('error')}")
        return {
            "status": "error",
            "response": f"Failed to save your response. Please try again or contact support."
        }
    
    # Update employee context for immediate use
    if not employee_context:
        employee_context = {}
    employee_context[collecting_field] = validated_value
    
    # Calculate progress
    collected_count = update_result.get("collected_count", len(collected_data) + 1)
    remaining_count = update_result.get("remaining_fields", len(missing_fields) - 1)
    total_fields = collected_count + remaining_count
    
    # Check if there are more fields to collect
    remaining_fields = [f for f in missing_fields if f.get("key") != collecting_field]
    
    if remaining_fields:
        # Ask for the next field
        next_field = remaining_fields[0]
        
        # Update collection state with next field
        collection_state = state_manager.get_state()
        collection_state["collecting_field"] = next_field["key"]
        collection_state["missing_fields"] = remaining_fields
        
        db = get_db()
        db.table("chat_sessions").update({
            "contract_collection_state": json.dumps(collection_state)
        }).eq("id", session_id).execute()
        
        response_md = (
            f"✅ Got it!\n\n"
            f"**Progress**: {collected_count}/{total_fields} fields collected\n\n"
            f"**{next_field.get('label', next_field['key'])}**: {next_field['question']}\n\n"
            f"_Type 'cancel' to exit._"
        )
        
        return {
            "status": "missing_fields",
            "response": response_md,
            "missing_fields": remaining_fields,
            "collecting_field": next_field["key"],
            "collected_count": collected_count,
            "total_fields": total_fields
        }
    else:
        # All fields collected - process contract request to finalize
        logger.info(f"All fields collected for user {user_id}, finalizing contract")
        return process_contract_request(employee_context, session_id)


def _validate_field_comprehensive(field_key: str, value: str, field_schema: dict) -> dict:
    """
    Comprehensive validation against schema and field-specific rules.
    
    Args:
        field_key: Field key (e.g., "fullName", "nric")
        value: User input value
        field_schema: Schema definition for the field
        
    Returns:
        {
            "valid": bool,
            "validated_value": str (cleaned/formatted),
            "error_message": str (if invalid)
        }
    """
    value = value.strip()
    
    if not value:
        return {
            "valid": False,
            "error_message": "Please provide a value"
        }
    
    # Type-specific validation from schema
    field_type = field_schema.get("type", "text")
    
    if field_type == "text":
        min_length = field_schema.get("minLength")
        if min_length and len(value) < min_length:
            return {
                "valid": False,
                "error_message": f"Must be at least {min_length} characters"
            }
    
    # Pattern validation from schema
    if field_schema.get("pattern"):
        pattern = field_schema["pattern"]
        if not re.match(pattern, value):
            placeholder = field_schema.get("placeholder", "the required format")
            return {
                "valid": False,
                "error_message": f"Format must match: {placeholder}"
            }
    
    # Field-specific validation and formatting
    if field_key == "fullName":
        # Must be at least 2 words
        if len(value.split()) < 2:
            return {
                "valid": False,
                "error_message": "Full name must include at least first and last name (2 words minimum)"
            }
        return {"valid": True, "validated_value": value}
    
    elif field_key == "nric":
        # Format: 950620-08-1234
        nric_match = re.search(r'(\d{6})-?(\d{2})-?(\d{4})', value)
        if not nric_match:
            return {
                "valid": False,
                "error_message": "NRIC format should be: 950620-08-1234 (12 digits with dashes)"
            }
        # Format with dashes
        formatted_nric = f"{nric_match.group(1)}-{nric_match.group(2)}-{nric_match.group(3)}"
        return {"valid": True, "validated_value": formatted_nric}
    
    elif field_key == "nationality":
        # Accept Malaysian, Non-Malaysian, or country names
        lower = value.lower()
        if "malay" in lower or "malaysia" in lower:
            return {"valid": True, "validated_value": "Malaysian"}
        elif "non" in lower or "foreign" in lower or "expat" in lower:
            return {"valid": True, "validated_value": "Non-Malaysian"}
        elif len(value) >= 3:
            return {"valid": True, "validated_value": value.title()}
        else:
            return {
                "valid": False,
                "error_message": "Please specify Malaysian, Non-Malaysian, or your country name"
            }
    
    elif field_key == "dateOfBirth":
        # Try to extract and validate date
        date_patterns = [
            (r'(\d{4})-(\d{2})-(\d{2})', "%Y-%m-%d"),  # YYYY-MM-DD
            (r'(\d{1,2})/(\d{1,2})/(\d{4})', "%d/%m/%Y"),  # DD/MM/YYYY
            (r'(\d{1,2})-(\d{1,2})-(\d{4})', "%d-%m-%Y"),  # DD-MM-YYYY
        ]
        
        for pattern, date_format in date_patterns:
            match = re.search(pattern, value)
            if match:
                try:
                    # Validate it's a real date
                    date_str = match.group(0)
                    parsed_date = datetime.datetime.strptime(date_str, date_format)
                    
                    # Check if date is reasonable (between 1900 and today)
                    if parsed_date.year < 1900 or parsed_date > datetime.datetime.now():
                        return {
                            "valid": False,
                            "error_message": "Date of birth must be between 1900 and today"
                        }
                    
                    # Return in YYYY-MM-DD format
                    formatted_date = parsed_date.strftime("%Y-%m-%d")
                    return {"valid": True, "validated_value": formatted_date}
                except ValueError:
                    continue
        
        return {
            "valid": False,
            "error_message": "Please provide date in format: YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY"
        }
    
    elif field_key == "bankName":
        # Accept any reasonable bank name
        if len(value) < 3:
            return {
                "valid": False,
                "error_message": "Bank name must be at least 3 characters"
            }
        return {"valid": True, "validated_value": value}
    
    elif field_key == "accountHolder":
        # Must be at least 3 characters
        if len(value) < 3:
            return {
                "valid": False,
                "error_message": "Account holder name must be at least 3 characters"
            }
        return {"valid": True, "validated_value": value}
    
    elif field_key == "accountNumber":
        # Extract numbers and validate length
        numbers = re.findall(r'\d+', value)
        if not numbers:
            return {
                "valid": False,
                "error_message": "Account number must contain digits"
            }
        account_num = "".join(numbers)
        if len(account_num) < 8 or len(account_num) > 16:
            return {
                "valid": False,
                "error_message": "Account number must be between 8-16 digits"
            }
        return {"valid": True, "validated_value": account_num}
    
    # Default: accept non-empty input
    return {"valid": True, "validated_value": value}


def _parse_field_value(field_key: str, user_input: str) -> Optional[str]:
    """
    Legacy parse function - kept for backward compatibility.
    New code should use _validate_field_comprehensive instead.
    """
    result = _validate_field_comprehensive(field_key, user_input, {})
    return result.get("validated_value") if result.get("valid") else None




def _update_user_field(user_id: str, field_key: str, value: str):
    """
    DEPRECATED: This is now handled by ContractStateManager.update_collected_field()
    Kept for backward compatibility only.
    
    Update a specific field in the users table.
    """
    logger.warning("_update_user_field is deprecated, use ContractStateManager")
    db = get_db()
    
    # Map field keys to database columns
    db_field_map = {
        "fullName": None,  # Split into first_name and last_name
        "first_name": "first_name",
        "last_name": "last_name",
        "nric": "nric",
        "nationality": "nationality",
        "date_of_birth": "date_of_birth",
        "bank_name": "bank_name",
        "bank_account_holder": "bank_account_holder",
        "bank_account_number": "bank_account_number",
    }
    
    if field_key == "fullName":
        # Split full name into first and last
        parts = value.split(maxsplit=1)
        db.table("users").update({
            "first_name": parts[0],
            "last_name": parts[1] if len(parts) > 1 else ""
        }).eq("id", user_id).execute()
    else:
        db_field = db_field_map.get(field_key, field_key)
        if db_field:
            db.table("users").update({
                db_field: value
            }).eq("id", user_id).execute()


# REMOVED: _activate_contract_session
# This logic is now handled by ContractStateManager.initialize_collection()
# and ContractStateManager.finalize_collection()


@bp.route("/contract", methods=["POST"])
def contract_endpoint():
    """
    Direct contract endpoint (can be called standalone).
    POST /api/employee-chat/contract
    Body: { employee_context?, session_id? }
    """
    data = request.get_json() or {}
    employee_context = data.get("employee_context")
    session_id = data.get("session_id")

    result = process_contract_request(employee_context, session_id)
    return jsonify(result)
