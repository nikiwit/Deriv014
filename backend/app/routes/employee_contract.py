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
    "fullName": lambda u: (
        u.get("full_name")
        or f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()
        or ""
    ),
    "nric": lambda u: u.get("nric", ""),
    "nationality": lambda u: u.get("nationality", "") or u.get("jurisdiction", ""),
    "dateOfBirth": lambda u: u.get("date_of_birth", ""),
    "bankName": lambda u: u.get("bank_name", ""),
    "accountHolder": lambda u: u.get("bank_account_holder", ""),
    "accountNumber": lambda u: u.get("bank_account_number", "") or u.get("bank_account", ""),
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
    Core contract processing logic.
    Called from the employee_chat route when intent is SIGN_CONTRACT_REQUEST.

    Flow:
    1. Fetch employee from DB, merge with employee_context
    2. Extract job details directly from merged data (no RAG)
    3. Set active_contract_negotiation, create template
    4. Render contract immediately with all available data
    5. Return with action="show_contract" so frontend shows Sign/Reject buttons

    Returns a dict with:
      - status: "contract_ready" | "error"
      - response: markdown string for chat display
      - contract_data: structured data (when contract_ready)
      - action: "show_contract" (when contract_ready)
    """
    # 0. Resolve the user from Supabase
    user_id = (employee_context or {}).get("id")
    email = (employee_context or {}).get("email")

    if not user_id:
        return {
            "status": "error",
            "response": "Unable to identify your user profile. Please log in again.",
        }

    # 0a. Check if contract already signed
    existing_contract = _check_already_signed(user_id)
    if existing_contract:
        signed_at = existing_contract.get("employee_signed_at") or existing_contract.get("created_at")
        return {
            "status": "already_signed",
            "response": (
                f"You have already signed your employment contract on **{signed_at}**.\n\n"
                "You can download a copy from **My Documents** in the sidebar.\n\n"
                "If you have questions about your contract, please contact HR."
            ),
            "contract": existing_contract,
        }

    db_user = _fetch_user_from_supabase_employees(user_id=user_id, email=email)

    if not db_user:
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

    logger.info(f"Merged employee data for contract: {list(merged.keys())}")

    # Initialize state manager
    state_manager = ContractStateManager(session_id, user_id)

    # 1. Load schema
    try:
        schema = _load_schema()
    except FileNotFoundError:
        return {
            "status": "error",
            "response": "Contract schema not found. Please contact HR.",
        }

    # 2. Determine jurisdiction early
    nationality = (merged.get("nationality") or merged.get("jurisdiction") or "").lower()
    jurisdiction = "SG" if "singapore" in nationality or "singaporean" in nationality or nationality == "sg" else "MY"

    # 3. Extract job details directly from merged employee data (no RAG needed)
    job_details = _extract_job_details_from_merged(merged)

    if not job_details:
        return {
            "status": "error",
            "error_type": "missing_job_details",
            "response": (
                "Unable to find your employment details in our records.\n\n"
                "**Required Information:**\n"
                "- Job Position/Title\n"
                "- Department\n"
                "- Start Date\n\n"
                "Please contact HR to ensure your employment records are up to date."
            )
        }

    # Merge job details into user data
    merged.update(job_details)
    logger.info(f"Job details for user {user_id}: {job_details}")

    # 4. Set active_contract_negotiation and create template
    existing_state = state_manager.get_state()
    if not existing_state:
        init_result = state_manager.initialize_collection(jurisdiction, job_details)
        if init_result.get("status") == "error":
            return {
                "status": "error",
                "response": f"Failed to initialize contract collection: {init_result.get('error')}"
            }

    # 5. Skip field collection — render contract directly with all available data.
    #    Missing optional fields (nric, bank details, etc.) show as '—' in the contract.
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


def _extract_job_details_from_merged(merged_data: dict) -> Optional[dict]:
    """
    Extract job details directly from merged employee data (DB + context).
    No RAG call needed — all details are already present in the merged variables.

    Args:
        merged_data: Merged dict from employees table + employee_context

    Returns:
        dict with job details, or None if required fields are missing
    """
    extracted = {}

    # Position: try multiple key names used across the codebase
    position = (
        merged_data.get("position_title")
        or merged_data.get("role")
        or merged_data.get("position")
        or ""
    )
    if position:
        extracted["position_title"] = str(position).strip()

    # Department
    department = merged_data.get("department", "")
    if department:
        extracted["department"] = str(department).strip()

    # Start date
    start_date = merged_data.get("start_date", "")
    if start_date:
        extracted["start_date"] = str(start_date).strip()

    # Salary (optional)
    salary = merged_data.get("salary", "")
    if salary:
        extracted["salary"] = str(salary).strip()

    # Validate required fields
    required_fields = ["position_title", "department", "start_date"]
    missing = [f for f in required_fields if not extracted.get(f)]

    if missing:
        logger.warning(
            f"Merged data missing required job fields: {missing}. "
            f"Available keys: {list(merged_data.keys())}"
        )
        return None

    logger.info(f"Job details extracted from merged data: {extracted}")
    return extracted


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
    nationality = _FIELD_MAP["nationality"](user_data)
    position = (
        user_data.get("position_title")
        or user_data.get("position")
        or user_data.get("role")
        or "Employee"
    )
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
| **Nationality** | {nationality or '—'} |
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
        "nationality": nationality,
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


@bp.route("/sign-contract", methods=["POST"])
def sign_contract_endpoint():
    """
    Sign contract: generates PDF, stores in contracts table.
    POST /api/employee-chat/sign-contract
    Body: { employee_id, contract_data, session_id? }
    """
    data = request.get_json() or {}
    employee_id = data.get("employee_id")
    contract_data = data.get("contract_data", {})
    session_id = data.get("session_id")

    if not employee_id:
        return jsonify({"status": "error", "response": "employee_id is required"}), 400

    result = sign_and_store_contract(employee_id, contract_data, session_id)

    status_code = 200
    if result.get("status") == "error":
        status_code = 500
    elif result.get("status") == "already_signed":
        status_code = 409

    return jsonify(result), status_code


# ── Contract signing + PDF generation + DB storage ───────────────

_TEMP_DIR = Path(__file__).resolve().parent.parent.parent / "temp_data"
_TEMP_DIR.mkdir(parents=True, exist_ok=True)


def _check_already_signed(employee_id: str) -> Optional[dict]:
    """
    Check if this employee already has a signed/active contract.
    Returns the contract row if found, None otherwise.
    """
    db = get_db()
    try:
        result = db.table("contracts") \
            .select("*") \
            .eq("employee_id", employee_id) \
            .in_("status", ["active", "signed"]) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        if result.data:
            return result.data[0]
    except Exception as e:
        logger.warning(f"Error checking existing contract for {employee_id}: {e}")
    return None


def sign_and_store_contract(employee_id: str, contract_data: dict, session_id: Optional[str] = None) -> dict:
    """
    Finalize contract signing:
    1. Check for existing signed contract (prevent double-sign)
    2. Insert a row into the contracts table
    3. Generate the contract PDF via _generate_contract_pdf
    4. Store PDF path back into the contracts row

    Args:
        employee_id: UUID of the employee
        contract_data: Structured contract data from process_contract_request
        session_id: Optional chat session ID

    Returns:
        dict with status and details
    """
    # 0. Prevent double-sign
    existing = _check_already_signed(employee_id)
    if existing:
        signed_at = existing.get("employee_signed_at") or existing.get("created_at")
        return {
            "status": "already_signed",
            "response": (
                f"You have already signed your contract on **{signed_at}**.\n\n"
                "If you need a copy, check **My Documents** in the sidebar."
            ),
            "contract": existing
        }

    db = get_db()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    jurisdiction = contract_data.get("jurisdiction", "MY")

    # 1. Build PDF data dict (keys expected by _generate_contract_pdf in documents.py)
    defaults = _get_jurisdiction_defaults(jurisdiction)
    pdf_data = {
        "fullName": contract_data.get("employee_name", ""),
        "nric": contract_data.get("nric", ""),
        "passportNo": "",
        "nationality": contract_data.get("nationality", ""),
        "dateOfBirth": "",
        "gender": "",
        "maritalStatus": "",
        "race": "",
        "religion": "",
        "address1": "",
        "address2": "",
        "postcode": "",
        "city": "",
        "state": "",
        "country": "Malaysia" if jurisdiction == "MY" else "Singapore",
        "personalEmail": "",
        "workEmail": contract_data.get("email", ""),
        "mobile": "",
        "altNumber": "",
        "emergencyName": "",
        "emergencyRelationship": "",
        "emergencyMobile": "",
        "emergencyAltNumber": "",
        "jobTitle": contract_data.get("position", ""),
        "department": contract_data.get("department", ""),
        "reportingTo": "",
        "startDate": contract_data.get("start_date", ""),
        "employmentType": "Full-Time Permanent",
        "probationPeriod": f"{defaults['probation_months']} months",
        "workModel": "",
        "workLocation": "",
        "monthlySalary": str(contract_data.get("salary", "")),
        "currency": defaults.get("currency", "MYR"),
        "bankName": "",
        "accountHolder": contract_data.get("employee_name", ""),
        "accountNumber": "",
        "bankBranch": "",
        "taxResident": True,
        "acknowledgeHandbook": True,
        "acknowledgeIT": True,
        "acknowledgePrivacy": True,
        "acknowledgeConfidentiality": True,
        "finalDeclaration": True,
        "signatureDate": datetime.datetime.now().strftime("%Y-%m-%d"),
        "completedAt": now_iso,
        "id": employee_id,
    }

    # 2. Generate PDF
    from app.routes.documents import _generate_contract_pdf

    pdf_path = _TEMP_DIR / f"{employee_id}_contract.pdf"
    try:
        _generate_contract_pdf(pdf_data, pdf_path)
        logger.info(f"Contract PDF generated at {pdf_path}")
    except Exception as e:
        logger.error(f"PDF generation failed for {employee_id}: {e}")
        return {
            "status": "error",
            "response": f"Contract signed but PDF generation failed: {e}"
        }

    # 3. Also store JSON snapshot
    json_path = _TEMP_DIR / f"{employee_id}_contract.json"
    try:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump({
                **contract_data,
                "consent_confirmed_at": now_iso,
                "consent_given_by": employee_id,
                "completedAt": now_iso,
            }, f, ensure_ascii=False, indent=2, default=str)
    except Exception as e:
        logger.warning(f"JSON snapshot failed for {employee_id}: {e}")

    # 4. Parse salary safely
    salary_val = None
    try:
        raw = str(contract_data.get("salary", "")).replace(",", "")
        if raw:
            salary_val = float(raw)
    except (ValueError, TypeError):
        pass

    # 5. Insert into contracts table
    contract_row = {
        "employee_id": employee_id,
        "employee_name": contract_data.get("employee_name", ""),
        "email": contract_data.get("email", ""),
        "position": contract_data.get("position", ""),
        "department": contract_data.get("department", ""),
        "start_date": contract_data.get("start_date") or None,
        "salary": salary_val,
        "currency": defaults.get("currency", "MYR"),
        "jurisdiction": jurisdiction,
        "nric": contract_data.get("nric", ""),
        "nationality": contract_data.get("nationality", ""),
        "company": contract_data.get("company", defaults.get("company_name", "")),
        "contract_data": json.dumps(contract_data, default=str),
        "status": "active",
        "employee_signed_at": now_iso,
        "pdf_path": str(pdf_path),
        "json_path": str(json_path),
        "probation_months": defaults.get("probation_months", 3),
        "notice_period": defaults.get("notice_period", "1 month"),
        "work_hours": defaults.get("work_hours", ""),
        "governing_law": defaults.get("governing_law", ""),
    }

    try:
        insert_result = db.table("contracts").insert(contract_row).execute()
        contract_id = insert_result.data[0]["id"] if insert_result.data else None
        logger.info(f"Contract stored in DB for {employee_id}, id={contract_id}")
    except Exception as e:
        logger.error(f"DB insert failed for contract {employee_id}: {e}")
        # PDF is already generated, so partial success
        return {
            "status": "signed_pdf_only",
            "response": (
                "Your contract has been signed and the PDF generated, "
                "but we could not save it to the database. Please contact HR."
            ),
            "pdf_path": str(pdf_path),
        }

    return {
        "status": "ok",
        "response": (
            f"Your contract has been signed successfully!\n\n"
            f"**Signed at:** {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
            f"A PDF copy has been generated. You can download it from **My Documents**."
        ),
        "contract_id": contract_id,
        "pdf_path": str(pdf_path),
    }
