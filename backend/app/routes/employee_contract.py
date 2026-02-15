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
    if email:
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

    logger.info(f"Merged employee data for contract: {merged} {list(merged.keys())}")
    

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
    #    Missing optional fields (nric, bank details, etc.) show as '' in the contract.
    finalize_result = state_manager.finalize_collection()

    if finalize_result.get("status") == "error":
        return {
            "status": "error",
            "response": f"Failed to finalize contract: {finalize_result.get('error')}"
        }

    # Build the three arguments _render_contract expects from merged flat data
    user_data, job_data, company_data = _build_render_args(merged, jurisdiction)

    contract_md, contract_data = _render_contract(user_data, job_data, company_data)

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
        or merged_data.get("position")
        or merged_data.get("role")

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


# def _render_contract(user_data: dict, schema: dict) -> tuple[str, dict]:
#     """
#     Render the contract as human-readable markdown and return structured data.
#     """
#     # Determine jurisdiction
#     nationality = (user_data.get("nationality") or "").lower()
#     jurisdiction = "SG" if "singapore" in nationality or "singaporean" in nationality else "MY"
#     defaults = _get_jurisdiction_defaults(jurisdiction)

#     full_name = _FIELD_MAP["fullName"](user_data)
#     nric = _FIELD_MAP["nric"](user_data)
#     nationality = _FIELD_MAP["nationality"](user_data)
#     position = (
#         user_data.get("position_title")
#         or user_data.get("position")
#         or user_data.get("role")
#         or "Employee"
#     )
#     department = user_data.get("department", "")
#     start_date = str(user_data.get("start_date", ""))
#     salary = user_data.get("salary", "")

#     # Build contract markdown
#     md = f"""## Employment Contract

# **{defaults['company_name']}**
# {defaults['company_reg']}
# {defaults['company_address']}

# ---

# ### Employee Details

# | Field | Details |
# |-------|---------|
# | **Full Name** | {full_name} |
# | **NRIC / ID** | {nric or '—'} |
# | **Nationality** | {nationality or '—'} |
# | **Position** | {position} |
# | **Department** | {department} |
# | **Start Date** | {start_date} |
# {f'| **Salary** | {defaults["currency"]} {salary} |' if salary else ''}

# ---

# ### Terms & Conditions

# | Term | Details |
# |------|---------|
# | **Probation** | {defaults['probation_months']} months |
# | **Working Hours** | {defaults['work_hours']} |
# | **Overtime** | {defaults['overtime_rate']} |
# | **Notice Period** | {defaults['notice_period']} |
# | **Governing Law** | {defaults['governing_law']} |

# ### Leave Entitlement

# | Type | Entitlement |
# |------|-------------|
# | **Annual Leave** | {defaults['leave_annual']} |
# | **Sick Leave** | {defaults['leave_sick']} |
# | **Hospitalization** | {defaults['leave_hospitalization']} |
# | **Maternity** | {defaults['leave_maternity']} |
# | **Paternity** | {defaults['leave_paternity']} |

# ### Statutory Contributions

# {defaults['statutory_contributions']}

# ### Medical Coverage

# {defaults['medical_coverage']}

# ---

# ### Policy Acknowledgements

# - [ ] I agree to the Employee Handbook
# - [ ] I confirm the declaration above is true and correct

# ---

# _Please review the contract above. Click **Sign** to accept or **Reject** to decline._
# """

#     # Structured data for the signing pipeline
#     contract_data = {
#         "employee_name": full_name,
#         "nric": nric,
#         "nationality": nationality,
#         "position": position,
#         "department": department,
#         "start_date": start_date,
#         "salary": salary,
#         "jurisdiction": jurisdiction,
#         "employee_id": user_data.get("id", ""),
#         "email": user_data.get("email", ""),
#         "company": defaults["company_name"],
#     }

#     return md, contract_data

def _enrich_job_data_from_rag(position: str, jurisdiction: str, user_id: str) -> dict:
    """
    Fetch detailed job information from RAG based on position.
    Always returns a consistent structure with defaults if RAG fails.
    
    Args:
        position: Job title/position
        jurisdiction: "MY" or "SG"
        user_id: Employee ID for logging
        
    Returns:
        dict with job details matching the structure needed by _render_contract
    """
    # Initialize with defaults that match the required structure
    job_enrichment = {
        "role_summary": "",
        "responsibilities": [],
        "compensation": {
            "salary_band_min": 0,
            "salary_band_max": 0,
            "annual_wage_supplement_months": 0,
            "bonus_policy": {"max_months": 0},
        },
        "benefits": {
            "retirement": {
                "epf": {"employer_percent": 13, "employee_percent": 11},
                "cpf": {"employer_percent": 17, "employee_percent": 20},
            },
            "medical_insurance": {"annual_limit": 50000 if jurisdiction == "MY" else 80000},
            "learning_allowance_per_year": 0,
            "professional_development_budget_per_year": 0,
            "dental_coverage_per_year": 0,
            "wellness_allowance_per_year": 0,
            "flexible_hours": False,
        },
        "work_model": {
            "type": "Office",
            "office_days_per_week": 5,
            "remote_days_per_week": 0,
        },
        "leave_policy": {
            "annual_leave_days": 12 if jurisdiction == "MY" else 14,
            "sick_leave_days": 14,
        },
        "career_path": [],
        "probation_period_months": 3,
        "notice_period_months": 1,
    }
    
    if not position or position.strip() == "":
        logger.warning(f"No position provided for user {user_id}, returning defaults")
        return job_enrichment
    
    try:
        # Try to get HR agent and analyze JD from RAG
        from app.hr_agent import get_hr_agent
        hr_agent = get_hr_agent()
        
        if hr_agent:
            jd_analysis = hr_agent.analyze_jd_from_rag(position, jurisdiction)
            
            # Transform JDAnalysis to job_data structure
            job_enrichment.update({
                "role_summary": f"Position: {jd_analysis.position}. {jd_analysis.work_model} work model.",
                "responsibilities": jd_analysis.responsibilities or [],
                "compensation": {
                    "salary_band_min": int(jd_analysis.salary_range[0]) if jd_analysis.salary_range else 0,
                    "salary_band_max": int(jd_analysis.salary_range[1]) if jd_analysis.salary_range else 0,
                    "annual_wage_supplement_months": 1 if jurisdiction == "SG" else 0,
                    "bonus_policy": {"max_months": 2},
                },
                "work_model": {
                    "type": jd_analysis.work_model or "Office",
                    "office_days_per_week": 5 if "hybrid" in (jd_analysis.work_model or "").lower() else (5 if "office" in (jd_analysis.work_model or "").lower() else 0),
                    "remote_days_per_week": 2 if "hybrid" in (jd_analysis.work_model or "").lower() else (5 if "remote" in (jd_analysis.work_model or "").lower() else 0),
                },
                "career_path": _generate_career_path(position, jd_analysis),
            })
            
            logger.info(f"Enriched job data from RAG for position '{position}': {len(jd_analysis.responsibilities)} responsibilities")
        else:
            logger.warning(f"HR agent not available for user {user_id}, using defaults")
            
    except Exception as e:
        logger.warning(f"Failed to enrich job data from RAG for user {user_id}: {e}")
    
    # Always return consistent structure
    return job_enrichment


def _generate_career_path(position: str, jd_analysis) -> list:
    """Generate a career path based on position and JD analysis."""
    position_lower = position.lower()
    
    # Career paths by position type
    if "engineer" in position_lower or "developer" in position_lower:
        return [
            "Junior Engineer → Mid-Level Engineer → Senior Engineer",
            "Senior Engineer → Lead Engineer → Principal Engineer",
            "Principal Engineer → Engineering Manager / Architect"
        ]
    elif "manager" in position_lower:
        return [
            "Manager → Senior Manager → Director",
            "Director → VP / Head of Department"
        ]
    elif "analyst" in position_lower:
        return [
            "Junior Analyst → Analyst → Senior Analyst",
            "Senior Analyst → Lead Analyst → Manager"
        ]
    elif "designer" in position_lower:
        return [
            "Junior Designer → Designer → Senior Designer",
            "Senior Designer → Lead Designer → Design Manager"
        ]
    else:
        return [
            f"{position} → Senior {position}",
            f"Senior {position} → Lead / Manager"
        ]


def _build_render_args(merged: dict, jurisdiction: str) -> tuple[dict, dict, dict]:
    """
    Transform flat merged employee data into the three dicts _render_contract expects.

    Args:
        merged: Flat dict from employees table + employee_context + job_details
        jurisdiction: "MY" or "SG"

    Returns:
        (user_data, job_data, company_data)
    """
    defaults = _get_jurisdiction_defaults(jurisdiction)

    # -- user_data: personal / banking / identification -----------------
    full_name = (
        merged.get("full_name")
        or f"{merged.get('first_name', '')} {merged.get('last_name', '')}".strip()
        or ""
    )
    user_data = {
        "fullName": full_name,
        "full_name": full_name,
        "nric": merged.get("nric", ""),
        "nationality": merged.get("nationality", ""),
        "salary": merged.get("salary", ""),
        "offered_salary": merged.get("salary", ""),
        "start_date": str(merged.get("start_date", "")),
        "email": merged.get("email", ""),
        "id": merged.get("id", ""),
        "date_of_birth": merged.get("date_of_birth", ""),
        "bank_name": merged.get("bank_name", ""),
        "bank_account_holder": merged.get("bank_account_holder", ""),
        "bank_account_number": merged.get("bank_account_number", ""),
    }

    # -- job_data: position, compensation, benefits, leave, etc. --------
    position = (
        merged.get("position_title")
        or merged.get("position")
        or merged.get("role")

        or ""
    ) 
    logger.info(f"POSITION IS: {position}")
    department = merged.get("department", "")
    employment_type = merged.get("employment_type", "Full-time")
    reporting_to = merged.get("reporting_to", "")
    role_summary = merged.get("role_summary", "")
    user_id = merged.get("id", "")

    currency_map = {"MY": "MYR", "SG": "SGD"}
    currency = currency_map.get(jurisdiction, "MYR")

    # Base job_data structure from merged employee data
    job_data = {
        "jurisdiction": jurisdiction,
        "currency": currency,
        "job_name": position,
        "job_code": merged.get("job_code", ""),
        "department": department,
        "employment_type": employment_type,
        "reporting_to": reporting_to,
        "role_summary": role_summary,
        "work_model": merged.get("work_model", {
            "type": "Office",
            "office_days_per_week": 5,
            "remote_days_per_week": 0,
        }),
        "responsibilities": merged.get("responsibilities", []),
        "compensation": merged.get("compensation", {
            "salary_band_min": 0,
            "salary_band_max": 0,
            "annual_wage_supplement_months": 0,
            "bonus_policy": {"max_months": 0},
        }),
        "benefits": merged.get("benefits", {
            "retirement": {
                "epf": {"employer_percent": 13, "employee_percent": 11},
                "cpf": {"employer_percent": 17, "employee_percent": 20},
            },
            "medical_insurance": {"annual_limit": 50000 if jurisdiction == "MY" else 80000},
            "learning_allowance_per_year": 0,
            "professional_development_budget_per_year": 0,
            "dental_coverage_per_year": 0,
            "wellness_allowance_per_year": 0,
            "flexible_hours": False,
        }),
        "leave_policy": merged.get("leave_policy", {
            "annual_leave_days": 12,
            "sick_leave_days": 14,
        }),
        "probation_period_months": merged.get("probation_period_months", 3),
        "notice_period_months": merged.get("notice_period_months", 1),
        "career_path": merged.get("career_path", []),
    }
    
    # Enrich with RAG data if position is available and critical data is missing
    if position and (
        not job_data["responsibilities"]
        or not job_data["role_summary"]
        or job_data["compensation"]["salary_band_min"] == 0
    ):
        try:
            rag_enrichment = _enrich_job_data_from_rag(position, jurisdiction, user_id)
            
            # Merge RAG data into job_data, keeping existing (non-empty) values
            if not job_data["role_summary"] and rag_enrichment.get("role_summary"):
                job_data["role_summary"] = rag_enrichment["role_summary"]
            
            if not job_data["responsibilities"] and rag_enrichment.get("responsibilities"):
                job_data["responsibilities"] = rag_enrichment["responsibilities"]
            
            if not job_data["career_path"] and rag_enrichment.get("career_path"):
                job_data["career_path"] = rag_enrichment["career_path"]
            
            # Merge compensation if defaults are being used
            if job_data["compensation"]["salary_band_min"] == 0:
                rag_comp = rag_enrichment.get("compensation", {})
                if rag_comp.get("salary_band_min", 0) > 0:
                    job_data["compensation"]["salary_band_min"] = rag_comp["salary_band_min"]
                    job_data["compensation"]["salary_band_max"] = rag_comp["salary_band_max"]
                if rag_comp.get("bonus_policy", {}).get("max_months", 0) > 0:
                    job_data["compensation"]["bonus_policy"]["max_months"] = rag_comp["bonus_policy"]["max_months"]
            
            # Merge work_model if default is being used
            if job_data["work_model"].get("type") == "Office" and rag_enrichment.get("work_model", {}).get("type"):
                job_data["work_model"] = rag_enrichment["work_model"]
                        
            logger.info(f"Job data enriched from RAG for position '{position}'")
        except Exception as e:
            logger.warning(f"Failed to enrich job data from RAG: {e}")
            # Continue with base defaults

    # -- company_data ---------------------------------------------------
    company_data = {
        "name": defaults["company_name"],
        "registration_number": defaults["company_reg"],
        "address": defaults["company_address"],
        "jurisdiction": jurisdiction,
        "currency": currency,
    }

    return user_data, job_data, company_data


def _render_contract(user_data: dict, job_data: dict, company_data: dict) -> tuple[str, dict]:
    """
    Render jurisdiction-compliant employment contract using job-specific details.
    
    Args:
        user_data: Candidate information (name, offered_salary, start_date, etc.)
        job_data: Normalized job description (from your unified schema)
        company_data: Company registry details (name, registration, address)
    
    Returns:
        Tuple of (markdown_contract, structured_contract_data)
    """
    # Extract jurisdiction from job data (more reliable than nationality inference)
    jurisdiction = job_data.get("jurisdiction", company_data.get("jurisdiction", "MY"))
    currency = job_data.get("currency", company_data.get("currency", "MYR"))
    
    # Employee details — use empty string for missing values
    full_name = user_data.get("fullName") or user_data.get("full_name", "")
    nric = user_data.get("nric", "")
    nationality = user_data.get("nationality", "")
    _offered_salary_raw = user_data.get("salary") or user_data.get("offered_salary", "")
    # Convert to numeric for formatting, keep raw for fallback
    try:
        offered_salary = float(str(_offered_salary_raw).replace(",", "").replace("RM", "").replace("SGD", "").strip()) if _offered_salary_raw else 0
    except (ValueError, TypeError):
        offered_salary = _offered_salary_raw  # keep original if conversion fails
    start_date = user_data.get("start_date", "")
    
    # Job-specific details
    position = job_data.get("job_name", "")
    job_code = job_data.get("job_code", "")
    department = job_data.get("department", "")
    employment_type = job_data.get("employment_type", "Full-time")
    reporting_to = job_data.get("reporting_to", "")
    role_summary = job_data.get("role_summary", "")
    
    # Work model details
    work_model = job_data.get("work_model", {})
    work_type = work_model.get("type", "Office").title()
    office_days = work_model.get("office_days_per_week", 5)
    remote_days = work_model.get("remote_days_per_week", 0)
    work_schedule = f"{work_type} ({office_days} office / {remote_days} remote days per week)"
    
    # Compensation details
    comp = job_data.get("compensation", {})
    offered_salary = float(comp.get('salary_band_max', 1)) + float(comp.get('salary_band_max', 1)) / 2

    salary_band = f"{currency} {comp.get('salary_band_min', 0):,} – {currency} {comp.get('salary_band_max', 0):,}"
    aws_months = comp.get("annual_wage_supplement_months") or 0
    bonus = comp.get("bonus_policy", {})
    bonus_months = bonus.get("max_months", 0)
    
    # Benefits extraction with jurisdiction awareness
    benefits = job_data.get("benefits", {})
    retirement = benefits.get("retirement", {})
    epf = retirement.get("epf")
    cpf = retirement.get("cpf")
    
    # Leave policy
    leave = job_data.get("leave_policy", {})
    annual_leave = leave.get("annual_leave_days", 12)
    sick_leave = leave.get("sick_leave_days", 14)
    
    # Build jurisdiction-specific statutory section
    if jurisdiction == "MY":
        statutory_section = f""", ### Statutory Contributions (Malaysia)

| Contribution | Employer | Employee | Notes |
|--------------|----------|----------|-------|
| **EPF** | {epf['employer_percent'] if epf else 13}% | {epf['employee_percent'] if epf else 11}% | Mandatory retirement savings |
| **SOCSO** | Yes | Yes | Employment injury & invalidity scheme |
| **EIS** | Yes | Yes | Employment insurance system |"""
    else:  # SG
        statutory_section = f"""### Statutory Contributions (Singapore)

| Contribution | Employer | Employee | Notes |
|--------------|----------|----------|-------|
| **CPF** | {cpf['employer_percent'] if cpf else 17}% | {cpf['employee_percent'] if cpf else 20}% | Applies to Ordinary Wages |
| **SDL** | 0.25% | — | Skills Development Levy (employer-paid) |"""

    # Build contract markdown with job-specific details
    md = f"""## EMPLOYMENT CONTRACT 

**{company_data.get('name', '')}**  
{company_data.get('registration_number', '')}  
{company_data.get('address', '')}  

---

### 1. EMPLOYEE DETAILS 

| Field | Details |
|-------|---------|
| **Full Name** | {full_name} |
| **NRIC/Passport** | {nric} |
| **Nationality** | {nationality} |
| **Position** | {position} ({job_code}) |
| **Department** | {department} |
| **Employment Type** | {employment_type} |
| **Reporting To** | {reporting_to} |
| **Start Date** | {start_date} |
| **Work Model** | {work_schedule} |

---

### 2. ROLE & RESPONSIBILITIES

**Role Summary**  
{role_summary}

**Key Responsibilities**  
{chr(10).join([f"- {resp}" for resp in job_data.get('responsibilities', [])])}

---

### 3. COMPENSATION PACKAGE

| Component | Details |
|-----------|---------|
| **Monthly Salary** | {currency} {offered_salary:,} |
| **Salary Band** | {salary_band} |
| **Payment Frequency** | Monthly (by 7th of following month) |
| **Annual Wage Supplement** | {f"{aws_months} months" if aws_months else "Not applicable"} |
| **Performance Bonus** | Up to {bonus_months} months' salary (discretionary) |

---

### 4. BENEFITS & ALLOWANCES

| Benefit | Details |
|---------|---------|
| **Medical Insurance** | {benefits.get('medical_insurance', {}).get('annual_limit', 0):,} {currency} annual limit{', includes dependents' if benefits.get('medical_insurance', {}).get('includes_dependents') else ''}{', outpatient covered' if benefits.get('medical_insurance', {}).get('outpatient_included') else ''} |
| **Learning Allowance** | {benefits.get('learning_allowance_per_year', 0):,} {currency}/year |
| **Professional Development** | {benefits.get('professional_development_budget_per_year', 0):,} {currency}/year |
| **Dental Coverage** | {f"{benefits.get('dental_coverage_per_year', 0):,} {currency}/year" if benefits.get('dental_coverage_per_year') else "Not applicable"} |
| **Wellness Allowance** | {f"{benefits.get('wellness_allowance_per_year', 0):,} {currency}/year" if benefits.get('wellness_allowance_per_year') else "Not applicable"} |
| **Flexible Hours** | {"Yes" if benefits.get('flexible_hours') else "No"} |

{statutory_section}

---

### 5. LEAVE ENTITLEMENT

| Leave Type | Entitlement | Conditions |
|------------|-------------|------------|
| **Annual Leave** | {annual_leave} days/year | Accrued pro-rata during first year |
| **Sick Leave** | {sick_leave} days/year | MC required for >2 consecutive days |
| **Hospitalization Leave** | 60 days/year | As per Employment Act |
| **Maternity Leave** | 98 days | For eligible female employees |
| **Paternity Leave** | 7 days | For eligible fathers |

---

### 6. PROBATION & NOTICE PERIOD

| Period | Duration | Notice Required |
|--------|----------|-----------------|
| **Probation** | {job_data.get('probation_period_months', 3)} months | 1 week by either party |
| **Post-Probation** | — | {job_data.get('notice_period_months', 1)} month(s) or salary in lieu |

---

### 7. CAREER DEVELOPMENT PATH

{chr(10).join([f"- **{level}**" for level in job_data.get('career_path', [])])}

---

### 8. GOVERNING TERMS

- **Governing Law**: Laws of {jurisdiction}
- **Confidentiality**: As per Company Confidentiality Agreement
- **IP Assignment**: All work product assigned to Company per IP Agreement
- **Policy Compliance**: Employee Handbook (provided separately)

---

### ACKNOWLEDGEMENTS

I, **{full_name}**, acknowledge that I have:

- [ ] Read and understood all terms of this employment contract
- [ ] Received and reviewed the Employee Handbook
- [ ] Disclosed all material facts in my employment application
- [ ] Understand that employment is contingent on satisfactory background checks

---

**Signature**: _________________________  
**Date**: _________________________  

**For and on behalf of {company_data['name']}**  
_________________________  
**Date**: _________________________  

---
*This contract is generated electronically and is legally binding upon digital signature.*
"""

    # Structured data aligned with new_contract.schema.json data_model
    contract_data = {
        "employee": {
            "fullName": full_name or "",
            "nric": nric or "",
            "nationality": nationality or "",
            "startDate": start_date or "",
            "offered_salary": str(_offered_salary_raw) if _offered_salary_raw else "",
            "email": user_data.get("email", ""),
            "employee_id": user_data.get("id", ""),
        },
        "job": {
            "job_code": job_code or "",
            "job_name": position or "",
            "department": department or "",
            "employment_type": employment_type or "",
            "role_summary": role_summary or "",
            "reporting_to": reporting_to or "",
            "work_model": {
                "type": work_model.get("type", ""),
                "office_days_per_week": work_model.get("office_days_per_week", 0),
                "remote_days_per_week": work_model.get("remote_days_per_week", 0),
            },
            "responsibilities": job_data.get("responsibilities", []),
            "compensation": {
                "salary_band_min": comp.get("salary_band_min", 0),
                "salary_band_max": comp.get("salary_band_max", 0),
                "annual_wage_supplement_months": aws_months,
                "bonus_policy": {
                    "max_months": bonus_months,
                },
            },
            "benefits": {
                "retirement": {
                    "epf": {
                        "employer_percent": epf["employer_percent"] if epf else 13,
                        "employee_percent": epf["employee_percent"] if epf else 11,
                    },
                    "cpf": {
                        "employer_percent": cpf["employer_percent"] if cpf else 17,
                        "employee_percent": cpf["employee_percent"] if cpf else 20,
                    },
                },
                "medical_insurance": {
                    "annual_limit": benefits.get("medical_insurance", {}).get("annual_limit", 0),
                },
                "learning_allowance_per_year": benefits.get("learning_allowance_per_year", 0),
                "professional_development_budget_per_year": benefits.get("professional_development_budget_per_year", 0),
                "dental_coverage_per_year": benefits.get("dental_coverage_per_year", 0),
                "wellness_allowance_per_year": benefits.get("wellness_allowance_per_year", 0),
                "flexible_hours": benefits.get("flexible_hours", False),
            },
            "leave_policy": {
                "annual_leave_days": annual_leave,
                "sick_leave_days": sick_leave,
            },
            "probation_period_months": job_data.get("probation_period_months", 3),
            "career_path": job_data.get("career_path", []),
        },
        "company": {
            "name": company_data.get("name", ""),
            "jurisdiction": jurisdiction,
            "currency": currency,
            "registration_number": company_data.get("registration_number", ""),
            "address": company_data.get("address", ""),
        },
        "metadata": {
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "contract_version": "2.1",
            "job_data_version": job_data.get("metadata", {}).get("version", "1.0"),
        },
    }

    return md, contract_data


from pathlib import Path
from fpdf import FPDF
import re

def _safe_text(text):
    """Sanitize text for FPDF (remove unsupported characters)"""
    if not isinstance(text, str):
        text = str(text)
    # Remove characters that may cause encoding issues
    return re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text).strip()

def _format_currency(amount, currency="MYR"):
    """Format numeric values as currency"""
    try:
        value = float(amount)
        return f"{currency} {value:,.2f}"
    except (ValueError, TypeError):
        return str(amount)

def _draw_table(pdf, headers, rows, col_widths=None, line_height=8):
    """Draw a bordered table with automatic column sizing if widths not provided"""
    if col_widths is None:
        usable_width = pdf.w - pdf.l_margin - pdf.r_margin
        col_widths = [usable_width / len(headers)] * len(headers)
    
    # Header row
    pdf.set_font("Arial", "B", 10)
    pdf.set_fill_color(240, 240, 240)
    for i, (header, width) in enumerate(zip(headers, col_widths)):
        pdf.cell(width, line_height, _safe_text(header), border=1, fill=True)
    pdf.ln(line_height)
    
    # Data rows
    pdf.set_font("Arial", "", 10)
    pdf.set_fill_color(255, 255, 255)
    for row in rows:
        max_lines = 1
        cell_contents = []
        
        # Determine row height based on multi-line content
        for i, (cell, width) in enumerate(zip(row, col_widths)):
            content = _safe_text(cell)
            # Estimate lines needed
            lines = pdf.get_string_width(content) / (width - 2)
            lines = max(1, int(lines) + 1)
            max_lines = max(max_lines, lines)
            cell_contents.append(content)
        
        row_height = line_height * max_lines
        
        # Draw cells for this row
        y_before = pdf.get_y()
        for i, (content, width) in enumerate(zip(cell_contents, col_widths)):
            pdf.set_xy(pdf.l_margin + sum(col_widths[:i]), y_before)
            pdf.multi_cell(width, line_height, content, border=1, fill=False)
        
        pdf.set_y(y_before + row_height)

def _generate_contract_pdf(contract_data: dict, out_path: Path):
    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_left_margin(20)
    pdf.set_right_margin(20)
    pdf.add_page()
    
    # Helper to safely get nested values
    def get_val(path, default=""):
        keys = path.split(".") if isinstance(path, str) else [path]
        val = contract_data
        for key in keys:
            if isinstance(val, dict):
                val = val.get(key)
            else:
                return default
        return _safe_text(val) if val is not None else _safe_text(default)
    
    # Geometry helpers
    usable_width = pdf.w - pdf.l_margin - pdf.r_margin
    line_height = 7
    section_gap = 8
    
    # ===== TITLE BLOCK =====
    pdf.set_font("Arial", "B", 18)
    pdf.cell(0, 12, "EMPLOYMENT CONTRACT", ln=True, align="C")
    pdf.ln(4)
    
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, get_val("company_info.name", "Deriv Solutions Sdn Bhd"), ln=True, align="C")
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 6, get_val("company_info.registration_number", ""), ln=True, align="C")
    pdf.cell(0, 6, get_val("company_info.address", ""), ln=True, align="C")
    pdf.ln(10)
    
    # ===== SECTION 1: EMPLOYEE DETAILS =====
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "1. EMPLOYEE DETAILS", ln=True)
    pdf.ln(3)
    
    pdf.set_font("Arial", "", 11)
    details = [
        ("Full Name", get_val("employee_details.full_name")),
        ("NRIC/Passport", get_val("employee_details.nric")),
        ("Nationality", get_val("employee_details.nationality")),
        ("Position", f"{get_val('role_details.position')} ({get_val('role_details.job_code')})"),
        ("Department", get_val("role_details.department")),
        ("Employment Type", get_val("role_details.employment_type")),
        ("Reporting To", get_val("role_details.reporting_to")),
        ("Start Date", get_val("employee_details.start_date")),
        ("Work Model", get_val("role_details.work_schedule")),
    ]
    
    for label, value in details:
        pdf.set_font("Arial", "B", 11)
        pdf.cell(45, line_height, f"{label}:", ln=False)
        pdf.set_font("Arial", "", 11)
        pdf.cell(0, line_height, value, ln=True)
    pdf.ln(section_gap)
    
    # ===== SECTION 2: ROLE & RESPONSIBILITIES =====
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "2. ROLE & RESPONSIBILITIES", ln=True)
    pdf.ln(3)
    
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, line_height, "Role Summary", ln=True)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, line_height, get_val("role_details.role_summary", "Not specified"), ln=True)
    pdf.ln(4)
    
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, line_height, "Key Responsibilities", ln=True)
    pdf.set_font("Arial", "", 11)
    responsibilities = get_val("role_details.responsibilities", [])
    if isinstance(responsibilities, list) and responsibilities:
        for resp in responsibilities:
            pdf.cell(5, line_height, "•", ln=False)
            pdf.multi_cell(0, line_height, _safe_text(resp), ln=True)
    else:
        pdf.cell(0, line_height, "Responsibilities to be defined during onboarding", ln=True)
    pdf.ln(section_gap)
    
    # ===== SECTION 3: COMPENSATION PACKAGE =====
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "3. COMPENSATION PACKAGE", ln=True)
    pdf.ln(4)
    
    comp = [
        ["Component", "Details"],
        ["Monthly Salary", _format_currency(get_val("compensation.monthly_salary", 0), get_val("currency", "MYR"))],
        ["Salary Band", get_val("compensation.salary_band", "Not disclosed")],
        ["Payment Frequency", "Monthly (by 7th of following month)"],
        ["Annual Wage Supplement", f"{get_val('compensation.aws_months', 0)} months" if float(get_val('compensation.aws_months', 0)) > 0 else "Not applicable"],
        ["Performance Bonus", f"Up to {get_val('compensation.bonus_months', 0)} months' salary (discretionary)"],
    ]
    _draw_table(pdf, comp[0], comp[1:], col_widths=[60, usable_width-60])
    pdf.ln(section_gap)
    
    # ===== SECTION 4: BENEFITS & STATUTORY =====
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "4. BENEFITS & ALLOWANCES", ln=True)
    pdf.ln(4)
    
    benefits_rows = [
        ["Medical Insurance", f"{get_val('benefits.medical_limit', '0')} {get_val('currency', 'MYR')} annual limit" + 
         (" (includes dependents)" if get_val('benefits.includes_dependents') == "True" else "") +
         (" (outpatient covered)" if get_val('benefits.outpatient_covered') == "True" else "")],
        ["Learning Allowance", f"{_format_currency(get_val('benefits.learning_allowance', 0), get_val('currency', 'MYR'))}/year"],
        ["Professional Development", f"{_format_currency(get_val('benefits.prof_dev_budget', 0), get_val('currency', 'MYR'))}/year"],
        ["Dental Coverage", f"{_format_currency(get_val('benefits.dental_coverage', 0), get_val('currency', 'MYR'))}/year" if float(get_val('benefits.dental_coverage', 0)) > 0 else "Not applicable"],
        ["Wellness Allowance", f"{_format_currency(get_val('benefits.wellness_allowance', 0), get_val('currency', 'MYR'))}/year" if float(get_val('benefits.wellness_allowance', 0)) > 0 else "Not applicable"],
        ["Flexible Hours", "Yes" if get_val('benefits.flexible_hours') == "True" else "No"],
    ]
    _draw_table(pdf, ["Benefit", "Details"], benefits_rows, col_widths=[60, usable_width-60])
    pdf.ln(6)
    
    # Statutory Contributions (jurisdiction-specific)
    jurisdiction = get_val("jurisdiction", "MY")
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 10, f"Statutory Contributions ({'Malaysia' if jurisdiction == 'MY' else 'Singapore'})", ln=True)
    pdf.ln(3)
    
    if jurisdiction == "MY":
        statutory_rows = [
            ["EPF", f"{get_val('statutory.epf_employer', '13')}%", f"{get_val('statutory.epf_employee', '11')}%", "Mandatory retirement savings"],
            ["SOCSO", "Yes", "Yes", "Employment injury & invalidity scheme"],
            ["EIS", "Yes", "Yes", "Employment insurance system"],
        ]
        headers = ["Contribution", "Employer", "Employee", "Notes"]
        col_widths = [50, 30, 30, usable_width-110]
    else:  # SG
        statutory_rows = [
            ["CPF", f"{get_val('statutory.cpf_employer', '17')}%", f"{get_val('statutory.cpf_employee', '20')}%", "Applies to Ordinary Wages"],
            ["SDL", "0.25%", "—", "Skills Development Levy (employer-paid)"],
        ]
        headers = ["Contribution", "Employer", "Employee", "Notes"]
        col_widths = [50, 30, 30, usable_width-110]
    
    _draw_table(pdf, headers, statutory_rows, col_widths=col_widths)
    pdf.ln(section_gap)
    
    # ===== SECTION 5: LEAVE ENTITLEMENT =====
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "5. LEAVE ENTITLEMENT", ln=True)
    pdf.ln(4)
    
    leave_rows = [
        ["Annual Leave", f"{get_val('leave.annual_days', '12')} days/year", "Accrued pro-rata during first year"],
        ["Sick Leave", f"{get_val('leave.sick_days', '14')} days/year", "MC required for >2 consecutive days"],
        ["Hospitalization Leave", "60 days/year", "As per Employment Act"],
        ["Maternity Leave", "98 days", "For eligible female employees"],
        ["Paternity Leave", "7 days", "For eligible fathers"],
    ]
    _draw_table(pdf, ["Leave Type", "Entitlement", "Conditions"], leave_rows, col_widths=[55, 50, usable_width-105])
    pdf.ln(section_gap)
    
    # ===== SECTION 6: PROBATION & NOTICE =====
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "6. PROBATION & NOTICE PERIOD", ln=True)
    pdf.ln(4)
    
    probation_rows = [
        ["Probation Period", f"{get_val('probation.duration_months', '3')} months", "1 week by either party"],
        ["Post-Probation", "—", f"{get_val('probation.notice_months', '1')} month(s) or salary in lieu"],
    ]
    _draw_table(pdf, ["Period", "Duration", "Notice Required"], probation_rows, col_widths=[50, 50, usable_width-100])
    pdf.ln(section_gap)
    
    # ===== SECTION 7: CAREER DEVELOPMENT =====
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "7. CAREER DEVELOPMENT PATH", ln=True)
    pdf.ln(4)
    
    pdf.set_font("Arial", "", 11)
    career_path = get_val("career_path", [])
    if isinstance(career_path, list) and career_path:
        for level in career_path:
            pdf.cell(5, line_height, "→", ln=False)
            pdf.cell(0, line_height, _safe_text(level), ln=True)
    else:
        pdf.cell(0, line_height, "Career progression path to be discussed during performance reviews", ln=True)
    pdf.ln(section_gap)
    
    # ===== SECTION 8: GOVERNING TERMS =====
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "8. GOVERNING TERMS", ln=True)
    pdf.ln(4)
    
    terms = [
        f"Governing Law: Laws of {jurisdiction}",
        "Confidentiality: As per Company Confidentiality Agreement",
        "IP Assignment: All work product assigned to Company per IP Agreement",
        "Policy Compliance: Employee Handbook (provided separately)"
    ]
    pdf.set_font("Arial", "", 11)
    for term in terms:
        pdf.cell(5, line_height, "•", ln=False)
        pdf.multi_cell(0, line_height, term, ln=True)
    pdf.ln(section_gap)
    
    # ===== SECTION 9: ACKNOWLEDGEMENTS =====
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "9. ACKNOWLEDGEMENTS", ln=True)
    pdf.ln(4)
    
    pdf.set_font("Arial", "", 11)
    acknowledgements = get_val("acknowledgements", [])
    if not acknowledgements or not isinstance(acknowledgements, list):
        acknowledgements = [
            "Read and understood all terms of this employment contract",
            "Received and reviewed the Employee Handbook",
            "Disclosed all material facts in my employment application",
            "Understand that employment is contingent on satisfactory background checks"
        ]
    
    for ack in acknowledgements:
        pdf.cell(8, line_height, "[ ]", ln=False)
        pdf.multi_cell(0, line_height, _safe_text(ack), ln=True)
    pdf.ln(10)
    
    # ===== SIGNATURE BLOCKS =====
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, "SIGNATURES", ln=True, align="C")
    pdf.ln(8)
    
    # Employee signature block
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, line_height, f"Employee: {get_val('employee_details.full_name', '_________________________')}", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.cell(0, line_height, "Signature: _________________________", ln=True)
    pdf.cell(0, line_height, "Date: _________________________", ln=True)
    pdf.ln(12)
    
    # Company signature block
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, line_height, f"For and on behalf of {get_val('company_info.name', 'Company Name')}", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.cell(0, line_height, "Authorized Signatory: _________________________", ln=True)
    pdf.cell(0, line_height, "Name & Title: _________________________", ln=True)
    pdf.cell(0, line_height, "Date: _________________________", ln=True)
    pdf.ln(15)
    
    # Footer disclaimer
    pdf.set_font("Arial", "I", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, "*This contract is generated electronically and is legally binding upon digital signature.*", ln=True, align="C")
    
    # Output PDF
    pdf.output(str(out_path))
    
    
    
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

    # Support both nested (new) and flat (legacy) contract_data structures
    employee_sec = contract_data.get("employee", {})
    job_sec = contract_data.get("job", {})
    company_sec = contract_data.get("company", {})

    jurisdiction = (
        company_sec.get("jurisdiction")
        or contract_data.get("jurisdiction", "MY")
    )

    # 1. Build PDF data dict (keys expected by _generate_contract_pdf in documents.py)
    defaults = _get_jurisdiction_defaults(jurisdiction)

    # Extract from nested or fall back to flat keys
    full_name = employee_sec.get("fullName") or contract_data.get("employee_name", "")
    nric_val = employee_sec.get("nric") or contract_data.get("nric", "")
    nationality_val = employee_sec.get("nationality") or contract_data.get("nationality", "")
    email_val = employee_sec.get("email") or contract_data.get("email", "")
    start_date_val = employee_sec.get("startDate") or contract_data.get("start_date", "")
    salary_val_str = str(employee_sec.get("offered_salary") or contract_data.get("salary", ""))
    position_val = job_sec.get("job_name") or contract_data.get("position", "")
    department_val = job_sec.get("department") or contract_data.get("department", "")
    reporting_to_val = job_sec.get("reporting_to") or contract_data.get("reporting_to", "")
    work_model_sec = job_sec.get("work_model", {})
    probation_months = job_sec.get("probation_period_months") or defaults.get("probation_months", 3)

    pdf_data = {
        "fullName": full_name,
        "nric": nric_val,
        "passportNo": "",
        "nationality": nationality_val,
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
        "workEmail": email_val,
        "mobile": "",
        "altNumber": "",
        "emergencyName": "",
        "emergencyRelationship": "",
        "emergencyMobile": "",
        "emergencyAltNumber": "",
        "jobTitle": position_val,
        "department": department_val,
        "reportingTo": reporting_to_val,
        "startDate": start_date_val,
        "employmentType": job_sec.get("employment_type", "Full-Time Permanent"),
        "probationPeriod": f"{probation_months} months",
        "workModel": f"{work_model_sec.get('type', '')} ({work_model_sec.get('office_days_per_week', 0)} office / {work_model_sec.get('remote_days_per_week', 0)} remote)" if work_model_sec.get("type") else "",
        "workLocation": "",
        "monthlySalary": salary_val_str,
        "currency": company_sec.get("currency") or defaults.get("currency", "MYR"),
        "bankName": "",
        "accountHolder": full_name,
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
        "employee_name": full_name,
        "email": email_val,
        "position": position_val,
        "department": department_val,
        "start_date": start_date_val or None,
        "salary": salary_val,
        "currency": company_sec.get("currency") or defaults.get("currency", "MYR"),
        "jurisdiction": jurisdiction,
        "nric": nric_val,
        "nationality": nationality_val,
        "company": company_sec.get("name") or defaults.get("company_name", ""),
        "contract_data": json.dumps(contract_data, default=str),
        "status": "active",
        "employee_signed_at": now_iso,
        "pdf_path": str(pdf_path),
        "json_path": str(json_path),
        "probation_months": probation_months,
        "notice_period": defaults.get("notice_period", "1 month"),
        "work_hours": defaults.get("work_hours", ""),
        "governing_law": defaults.get("governing_law", ""),
    }

    try:
        insert_result = db.table("contracts").insert(contract_row).execute()
        contract_id = insert_result.data[0]["id"] if insert_result.data else None
        logger.info(f"Contract stored in DB for {employee_id}, id={contract_id}")

        # Auto-assign training based on department
        try:
            from app.routes.training import _assign_training_to_employee

            training_result = _assign_training_to_employee(employee_id, department_val)
            logger.info(
                f"Auto-assigned {training_result['template']} training "
                f"({training_result['training_count']} items) to {employee_id}"
            )
        except Exception as te:
            logger.error(f"Failed to auto-assign training to {employee_id}: {te}")

        # Auto-create document tracking record for the contract
        try:
            import uuid as _uuid
            if start_date_val:
                start_dt = datetime.datetime.strptime(start_date_val, "%Y-%m-%d").date()
                contract_expiry = (start_dt + datetime.timedelta(days=730)).isoformat()
            else:
                contract_expiry = (datetime.date.today() + datetime.timedelta(days=730)).isoformat()

            db.table("employee_documents").insert({
                "id": str(_uuid.uuid4()),
                "employee_id": employee_id,
                "document_type": "contract",
                "document_number": f"CTR-{employee_id[:8].upper()}",
                "issue_date": datetime.date.today().isoformat(),
                "expiry_date": contract_expiry,
                "status": "valid",
                "jurisdiction": jurisdiction,
                "issuing_authority": company_sec.get("name") or "Deriv",
                "notes": f"Auto-created on contract signing for {full_name}",
            }).execute()
            logger.info(f"Document tracking created for contract of {employee_id}")
        except Exception as de:
            logger.error(f"Failed to create document tracking for {employee_id}: {de}")

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
