"""
Contract Negotiation Handler

Processes contract modification requests during active contract sessions.
Uses policy_agent.py to validate changes against company compliance rules.
"""

import json
import datetime
import re
from pathlib import Path
from typing import Optional, Dict, Any
from flask import Blueprint
import logging 
logger = logging.getLogger(__name__)

from app.database import get_db
from app.agents.policy_agent import PolicyAgent
from app import rag

bp = Blueprint("contract_negotiation", __name__, url_prefix="/api/contract-negotiation")

# Initialize policy agent
policy_agent = PolicyAgent()


def handle_contract_negotiation(
    message: str,
    employee_context: dict,
    session_id: str,
    contract_json_path: Path
) -> dict:
    """
    Main negotiation handler.
    
    1. Check if working with finalized contract (not template)
    2. Parse modification request from message
    3. Load current contract JSON
    4. Apply requested changes
    5. Validate via policy_agent
    6. Update JSON if compliant, reject if not
    
    Args:
        message: User's modification request
        employee_context: Employee profile data
        session_id: Active chat session ID
        contract_json_path: Path to the user's contract JSON file
        
    Returns:
        dict with status, response, and contract data
    """
    
    # 0. Ensure we're working with finalized contract, not template
    if isinstance(contract_json_path, Path):
        if contract_json_path.name.endswith("_contract_template.json"):
            return {
                "status": "error",
                "error_type": "contract_not_ready",
                "response": (
                    "⏳ Your contract is still being prepared.\n\n"
                    "Please complete all required fields first before requesting modifications."
                )
            }
    
    # 1. Parse the modification request using LLM/RAG
    modification = _parse_modification_request(message, session_id)
    
    # 2. Load current contract
    if not contract_json_path.exists():
        return {
            "status": "error",
            "response": "Contract file not found. Please restart the contract signing process."
        }
    
    with open(contract_json_path, "r", encoding="utf-8") as f:
        current_contract = json.load(f)
    
    # 3. Apply proposed changes
    proposed_contract = _apply_modifications(current_contract.copy(), modification)
    
    # 4. Validate with policy_agent
    compliance_result = _check_compliance(proposed_contract, employee_context, modification)
    
    # 5. Accept or reject
    if compliance_result["compliant"]:
        # Update JSON with modification history
        if "modification_history" not in proposed_contract:
            proposed_contract["modification_history"] = []
            
        proposed_contract["modification_history"].append({
            "timestamp": datetime.datetime.now().isoformat(),
            "modification": modification,
            "approved": True,
            "compliance_notes": compliance_result.get("recommendations", [])
        })
        
        with open(contract_json_path, "w", encoding="utf-8") as f:
            json.dump(proposed_contract, f, indent=2)
        logger.info(f"Path is {contract_json_path}")
        print()
        
        response_md = _generate_approval_response(modification, proposed_contract)
        
        return {
            "status": "modification_accepted",
            "response": response_md,
            "updated_contract": proposed_contract,
            "compliance_notes": compliance_result.get("recommendations", [])
        }
    else:
        # Reject with reason - still log in history
        if "modification_history" not in current_contract:
            current_contract["modification_history"] = []
            
        current_contract["modification_history"].append({
            "timestamp": datetime.datetime.now().isoformat(),
            "modification": modification,
            "approved": False,
            "rejection_reason": compliance_result.get("issues", [])
        })
        
        with open(contract_json_path, "w", encoding="utf-8") as f:
            json.dump(current_contract, f, indent=2)
        
        response_md = _generate_rejection_response(modification, compliance_result)
        
        return {
            "status": "modification_rejected",
            "response": response_md,
            "rejection_reasons": compliance_result.get("issues", []),
            "risk_level": compliance_result.get("risk_level", "high")
        }


def _parse_modification_request(message: str, session_id: str) -> Dict[str, Any]:
    """
    Use RAG and pattern matching to parse what the user wants to change.
    
    Args:
        message: User's request message
        session_id: Session ID for RAG context
        
    Returns:
        dict with field, new_value, and raw_request
    """
    message_lower = message.lower()
    
    modification = {
        "field": None,
        "new_value": None,
        "raw_request": message
    }
    
    # Detect field changes with pattern matching
    if re.search(r'\b(salary|pay|compensation|wage)\b', message_lower):
        modification["field"] = "salary"
        # Extract number (handle various formats: 5000, 5,000, $5000, RM5000)
        numbers = re.findall(r'[\$RM]*\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', message)
        if numbers:
            # Remove commas from number
            modification["new_value"] = numbers[0].replace(',', '')
    
    elif re.search(r'\b(start date|start_date|starting date|commencement|join date)\b', message_lower):
        modification["field"] = "start_date"
        # Extract date patterns (YYYY-MM-DD, DD/MM/YYYY, etc.)
        date_patterns = [
            r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
            r'\d{1,2}/\d{1,2}/\d{4}',  # DD/MM/YYYY
            r'\d{1,2}-\d{1,2}-\d{4}',  # DD-MM-YYYY
        ]
        for pattern in date_patterns:
            dates = re.findall(pattern, message)
            if dates:
                modification["new_value"] = dates[0]
                break
        
        # Also check for relative dates like "next week", "next month"
        if not modification["new_value"]:
            if "next week" in message_lower:
                from datetime import timedelta
                next_week = (datetime.datetime.now() + timedelta(weeks=1)).strftime("%Y-%m-%d")
                modification["new_value"] = next_week
            elif "next month" in message_lower:
                from datetime import timedelta
                next_month = (datetime.datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
                modification["new_value"] = next_month
    
    elif re.search(r'\b(position|role|title|job title)\b', message_lower):
        modification["field"] = "position_title"
        # Extract quoted text or text after "to"
        quoted = re.findall(r'"([^"]+)"', message)
        if quoted:
            modification["new_value"] = quoted[0]
        else:
            # Try to extract text after "to" or "as"
            to_match = re.search(r'\b(?:to|as)\s+([A-Z][A-Za-z\s]+?)(?:\.|$|,)', message)
            if to_match:
                modification["new_value"] = to_match.group(1).strip()
    
    elif re.search(r'\b(department|dept|division|team)\b', message_lower):
        modification["field"] = "department"
        # Extract quoted text or text after "to"
        quoted = re.findall(r'"([^"]+)"', message)
        if quoted:
            modification["new_value"] = quoted[0]
        else:
            # Try to extract text after "to"
            to_match = re.search(r'\bto\s+([A-Z][A-Za-z\s]+?)(?:\.|$|,)', message)
            if to_match:
                modification["new_value"] = to_match.group(1).strip()
    
    elif re.search(r'\b(probation|probationary period)\b', message_lower):
        modification["field"] = "probation_months"
        # Extract numbers (months)
        numbers = re.findall(r'(\d+)\s*(?:month|months)', message_lower)
        if numbers:
            modification["new_value"] = numbers[0]
    
    elif re.search(r'\b(annual leave|annual leaves|vacation days|leave days)\b', message_lower):
        modification["field"] = "annual_leave"
        # Extract numbers (days)
        numbers = re.findall(r'(\d+)\s*(?:day|days)', message_lower)
        if numbers:
            modification["new_value"] = numbers[0]
    
    elif re.search(r'\b(sick leave|sick leaves|medical leave)\b', message_lower):
        modification["field"] = "sick_leave"
        # Extract numbers (days)
        numbers = re.findall(r'(\d+)\s*(?:day|days)', message_lower)
        if numbers:
            modification["new_value"] = numbers[0]

    # ── Personal data fields ──────────────────────────────────────
    elif re.search(r'\b(full\s*name|my\s*name|employee\s*name)\b', message_lower):
        modification["field"] = "full_name"
        quoted = re.findall(r'"([^"]+)"', message)
        if quoted:
            modification["new_value"] = quoted[0]
        else:
            to_match = re.search(r'\b(?:to|as|is)\s+([A-Z][A-Za-z\s]+?)(?:\.|$|,)', message)
            if to_match:
                modification["new_value"] = to_match.group(1).strip()

    elif re.search(r'\b(email|e-mail|mail\s*address)\b', message_lower):
        modification["field"] = "email"
        email_match = re.findall(r'[\w.+-]+@[\w-]+\.[\w.]+', message)
        if email_match:
            modification["new_value"] = email_match[0]

    elif re.search(r'\b(nric|ic\s*number|identity\s*card)\b', message_lower):
        modification["field"] = "nric"
        nric_match = re.findall(r'\d{6}-\d{2}-\d{4}', message)
        if nric_match:
            modification["new_value"] = nric_match[0]
        else:
            # Try plain digits format
            nric_match = re.findall(r'\b(\d{12})\b', message)
            if nric_match:
                modification["new_value"] = nric_match[0]

    elif re.search(r'\b(nationality|citizen|citizenship)\b', message_lower):
        modification["field"] = "nationality"
        quoted = re.findall(r'"([^"]+)"', message)
        if quoted:
            modification["new_value"] = quoted[0]
        else:
            to_match = re.search(r'\b(?:to|is|as)\s+([A-Z][A-Za-z\s]+?)(?:\.|$|,)', message)
            if to_match:
                modification["new_value"] = to_match.group(1).strip()

    elif re.search(r'\b(date\s*of\s*birth|dob|birthday|birth\s*date)\b', message_lower):
        modification["field"] = "date_of_birth"
        date_patterns = [
            r'\d{4}-\d{2}-\d{2}',
            r'\d{1,2}/\d{1,2}/\d{4}',
            r'\d{1,2}-\d{1,2}-\d{4}',
        ]
        for pattern in date_patterns:
            dates = re.findall(pattern, message)
            if dates:
                modification["new_value"] = dates[0]
                break

    elif re.search(r'\b(bank\s*name|bank)\b', message_lower) and not re.search(r'\b(account|number|holder)\b', message_lower):
        modification["field"] = "bank_name"
        quoted = re.findall(r'"([^"]+)"', message)
        if quoted:
            modification["new_value"] = quoted[0]
        else:
            to_match = re.search(r'\b(?:to|is|as)\s+([A-Z][A-Za-z\s]+?)(?:\.|$|,)', message)
            if to_match:
                modification["new_value"] = to_match.group(1).strip()

    elif re.search(r'\b(account\s*holder|holder\s*name|account\s*name)\b', message_lower):
        modification["field"] = "bank_account_holder"
        quoted = re.findall(r'"([^"]+)"', message)
        if quoted:
            modification["new_value"] = quoted[0]
        else:
            to_match = re.search(r'\b(?:to|is|as)\s+([A-Z][A-Za-z\s]+?)(?:\.|$|,)', message)
            if to_match:
                modification["new_value"] = to_match.group(1).strip()

    elif re.search(r'\b(account\s*number|bank\s*account)\b', message_lower):
        modification["field"] = "bank_account_number"
        numbers = re.findall(r'\b(\d{8,20})\b', message)
        if numbers:
            modification["new_value"] = numbers[0]

    elif re.search(r'\b(work\s*location|office\s*location|workplace|work\s*site)\b', message_lower):
        modification["field"] = "work_location"
        quoted = re.findall(r'"([^"]+)"', message)
        if quoted:
            modification["new_value"] = quoted[0]
        else:
            to_match = re.search(r'\b(?:to|at|is)\s+([A-Z][A-Za-z\s,]+?)(?:\.|$)', message)
            if to_match:
                modification["new_value"] = to_match.group(1).strip()

    elif re.search(r'\b(work\s*hours|working\s*hours|work\s*schedule|work\s*time)\b', message_lower):
        modification["field"] = "work_hours"
        quoted = re.findall(r'"([^"]+)"', message)
        if quoted:
            modification["new_value"] = quoted[0]
        else:
            time_match = re.search(r'(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?\s*(?:to|-)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)', message)
            if time_match:
                modification["new_value"] = time_match.group(1).strip()

    # If we couldn't parse it, use RAG as fallback and try to extract from RAG response
    if not modification["field"] or not modification["new_value"]:
        try:
            query = (
                f"Extract the contract field name and new value from this modification request: '{message}'. "
                f"Respond ONLY in this exact format:\n"
                f"Field: <field_name>\n"
                f"Value: <new_value>\n"
                f"Example: Field: annual_leave\\nValue: 8"
            )
            rag_response, _ = rag.query(session_id, query)
            modification["rag_context"] = rag_response
            
            # Try to extract field and value from RAG response
            field_match = re.search(r'(?:Field|Contract Field)[:\s]+([^\n]+)', rag_response, re.IGNORECASE)
            value_match = re.search(r'(?:Value|New Value)[:\s]+([^\n]+)', rag_response, re.IGNORECASE)
            
            if field_match:
                field_name = field_match.group(1).strip().lower()
                # Clean up field name - remove common words and convert to snake_case
                field_name = re.sub(r'\s+', '_', field_name)
                field_name = field_name.replace('contract_', '').replace('of_', '').replace('the_', '')
                modification["field"] = field_name
                
            if value_match:
                value = value_match.group(1).strip()
                # Extract just the number/value if it has extra words
                number_match = re.search(r'(\d+)', value)
                if number_match:
                    modification["new_value"] = number_match.group(1)
                else:
                    modification["new_value"] = value
                    
        except Exception as e:
            logger.warning(f"RAG extraction failed: {e}")
    
    return modification


def _apply_modifications(current_contract: dict, modification: dict) -> dict:
    """
    Apply the requested modification to the contract.
    Handles both flat and nested contract structures.
    
    Args:
        current_contract: Current contract data
        modification: Modification request with field and new_value
        
    Returns:
        Modified contract dictionary
    """
    import copy
    proposed = copy.deepcopy(current_contract)
    
    field = modification.get("field")
    new_value = modification.get("new_value")
    
    if not field or new_value is None:
        logger.warning(f"Cannot apply modification - field: {field}, new_value: {new_value}")
        return proposed
    
    # Map of field names to their location in the nested structure
    field_mapping = {
        # Employment details
        "salary": ("employment_details", "salary"),
        "start_date": ("employment_details", "start_date"),
        "position_title": ("employment_details", "position_title"),
        "position": ("employment_details", "position_title"),
        "department": ("employment_details", "department"),
        "probation_months": ("employment_details", "probation_months"),
        "annual_leave": ("employment_details", "annual_leave"),
        "sick_leave": ("employment_details", "sick_leave"),
        "work_location": ("employment_details", "work_location"),
        "work_hours": ("employment_details", "work_hours"),
        # Personal details
        "full_name": ("personal_details", "fullName"),
        "email": ("personal_details", "email"),
        "nric": ("personal_details", "nric"),
        "nationality": ("personal_details", "nationality"),
        "date_of_birth": ("personal_details", "date_of_birth"),
        "bank_name": ("personal_details", "bank_name"),
        "bank_account_holder": ("personal_details", "bank_account_holder"),
        "bank_account_number": ("personal_details", "bank_account_number"),
    }
    
    # Flat-key aliases so both nested and top-level stay in sync
    flat_aliases = {
        "salary": "salary",
        "start_date": "start_date",
        "position_title": "position",
        "position": "position",
        "department": "department",
        "full_name": "employee_name",
        "email": "email",
        "nric": "nric",
        "nationality": "nationality",
        "date_of_birth": "date_of_birth",
        "work_location": "work_location",
        "work_hours": "work_hours",
        "annual_leave": "annual_leave",
        "sick_leave": "sick_leave",
        "probation_months": "probation_months",
        "bank_name": "bank_name",
        "bank_account_holder": "bank_account_holder",
        "bank_account_number": "bank_account_number",
    }

    # Check if field is in the mapping
    if field in field_mapping:
        parent_key, child_key = field_mapping[field]
        if parent_key not in proposed:
            proposed[parent_key] = {}
        proposed[parent_key][child_key] = new_value
        logger.info(f"Applied modification: {parent_key}.{child_key} = {new_value}")
        # Also update the flat top-level key if it exists or should exist
        if field in flat_aliases:
            proposed[flat_aliases[field]] = new_value
    else:
        # Try to set it directly (for flat fields or unknown fields)
        proposed[field] = new_value
        logger.info(f"Applied modification: {field} = {new_value}")

    proposed["last_updated"] = datetime.datetime.now().isoformat()

    return proposed


def _check_compliance(proposed_contract: dict, employee_context: dict, modification: dict) -> dict:
    """
    Validate proposed contract changes via RAG policy lookup + policy_agent.

    Each modification is checked in two stages:
    1. RAG query against policy documents for jurisdiction-specific rules
    2. Policy agent structural/statutory validation

    Args:
        proposed_contract: Contract with proposed modifications
        employee_context: Employee profile data
        modification: The modification request details

    Returns:
        dict with compliant flag, issues, and recommendations
    """
    jurisdiction = proposed_contract.get("jurisdiction", "MY")
    field = modification.get("field", "unknown")
    new_value = modification.get("new_value", "")

    # Prepare employee data for policy check
    employee_data = {
        **proposed_contract,
        "jurisdiction": jurisdiction,
        "modification_type": field,
        "modification_value": new_value
    }

    # ── Stage 1: RAG policy document lookup ──────────────────────
    rag_issues = []
    rag_recommendations = []
    try:
        rag_query = (
            f"Check company policy and employment law compliance for modifying "
            f"the '{field}' field to '{new_value}' in a {jurisdiction} employment contract. "
            f"Is this change allowed? Are there any restrictions, limits, or approval "
            f"requirements? Cite relevant policy sections or statutory references."
        )
        rag_response, rag_sources = rag.query(
            f"compliance_check_{field}", rag_query
        )

        if rag_response:
            # Check for denial / restriction language in RAG response
            import re as _re
            denial_patterns = [
                r'\bnot\s+(?:allowed|permitted|compliant|acceptable)\b',
                r'\bprohibited\b',
                r'\bviolat(?:es?|ion)\b',
                r'\bexceeds?\s+(?:the\s+)?(?:maximum|limit|cap)\b',
                r'\bbelow\s+(?:the\s+)?minimum\b',
                r'\brequires?\s+(?:HR|management|director)\s+approval\b',
            ]
            for pattern in denial_patterns:
                if _re.search(pattern, rag_response, _re.IGNORECASE):
                    rag_issues.append(f"Policy check: {rag_response[:300]}")
                    break

            # Extract recommendations from RAG
            if "recommend" in rag_response.lower() or "suggest" in rag_response.lower():
                rag_recommendations.append(rag_response[:300])

    except Exception as e:
        # RAG failure is non-blocking — fall through to policy agent
        import logging
        logging.getLogger(__name__).warning(f"RAG compliance check failed: {e}")

    # ── Stage 2: Policy agent structural validation ──────────────
    try:
        result = policy_agent._verify_compliance(
            payload={
                "action_type": "contract_modification",
                "employee_data": employee_data
            },
            context={"jurisdiction": jurisdiction}
        )

        compliance_data = result.get("data", {})

        # Merge RAG issues into policy agent results
        existing_issues = compliance_data.get("issues", [])
        compliance_data["issues"] = existing_issues + rag_issues
        existing_recs = compliance_data.get("recommendations", [])
        compliance_data["recommendations"] = existing_recs + rag_recommendations

        # If RAG found issues, mark as non-compliant
        if rag_issues:
            compliance_data["compliant"] = False
            compliance_data["risk_level"] = "high"

        # Add field-specific validation
        if field == "salary":
            # Try to get salary from nested structure first
            salary = (
                proposed_contract.get("employment_details", {}).get("salary") or
                proposed_contract.get("salary")
            )
            salary_validation = _validate_salary_change(salary, jurisdiction)
            if not salary_validation["valid"]:
                compliance_data["compliant"] = False
                compliance_data["issues"] = compliance_data.get("issues", []) + salary_validation["issues"]
                compliance_data["risk_level"] = "high"

        elif field == "start_date":
            # Try to get start_date from nested structure first
            start_date = (
                proposed_contract.get("employment_details", {}).get("start_date") or
                proposed_contract.get("start_date")
            )
            date_validation = _validate_start_date(start_date)
            if not date_validation["valid"]:
                compliance_data["compliant"] = False
                compliance_data["issues"] = compliance_data.get("issues", []) + date_validation["issues"]
        
        elif field == "annual_leave":
            # Try to get annual_leave from nested structure first
            annual_leave = (
                proposed_contract.get("employment_details", {}).get("annual_leave") or
                proposed_contract.get("annual_leave")
            )
            leave_validation = _validate_annual_leave(annual_leave, jurisdiction)
            if not leave_validation["valid"]:
                compliance_data["compliant"] = False
                compliance_data["issues"] = compliance_data.get("issues", []) + leave_validation["issues"]
                compliance_data["risk_level"] = "high"
        
        elif field == "sick_leave":
            # Try to get sick_leave from nested structure first
            sick_leave = (
                proposed_contract.get("employment_details", {}).get("sick_leave") or
                proposed_contract.get("sick_leave")
            )
            leave_validation = _validate_sick_leave(sick_leave, jurisdiction)
            if not leave_validation["valid"]:
                compliance_data["compliant"] = False
                compliance_data["issues"] = compliance_data.get("issues", []) + leave_validation["issues"]
                compliance_data["risk_level"] = "high"

        return compliance_data

    except Exception as e:
        # Fallback if policy agent fails
        all_issues = rag_issues + [f"Compliance check failed: {str(e)}"]
        return {
            "compliant": False,
            "issues": all_issues,
            "risk_level": "high",
            "recommendations": rag_recommendations + ["Please contact HR for manual review"]
        }


def _validate_salary_change(salary: str, jurisdiction: str) -> dict:
    """Validate salary against minimum wage and statutory requirements."""
    issues = []
    
    try:
        salary_value = float(str(salary).replace(',', '').replace('$', '').replace('RM', ''))
        
        if jurisdiction == "MY":
            if salary_value < 1500:
                issues.append(f"Salary RM{salary_value} is below Malaysia minimum wage (RM1,500)")
        elif jurisdiction == "SG":
            if salary_value < 1400:
                issues.append(f"Salary SGD{salary_value} is below Singapore minimum wage guideline")
        
        # Check for unreasonably high salaries (potential typo)
        if salary_value > 50000:
            issues.append(f"Salary {salary_value} is unusually high. Please verify this is correct.")
        
    except (ValueError, TypeError):
        issues.append("Invalid salary format. Please provide a numeric value.")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues
    }


def _validate_start_date(start_date: str) -> dict:
    """Validate start date is in the future and reasonable."""
    issues = []
    
    try:
        from datetime import datetime, timedelta
        
        # Parse the date
        date_obj = None
        for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]:
            try:
                date_obj = datetime.strptime(start_date, fmt)
                break
            except ValueError:
                continue
        
        if not date_obj:
            issues.append("Invalid date format. Please use YYYY-MM-DD format.")
            return {"valid": False, "issues": issues}
        
        # Check if date is in the past
        if date_obj.date() < datetime.now().date():
            issues.append("Start date cannot be in the past")
        
        # Check if date is too far in the future (more than 1 year)
        one_year_from_now = datetime.now() + timedelta(days=365)
        if date_obj > one_year_from_now:
            issues.append("Start date is more than 1 year in the future. Please confirm this is correct.")
        
    except Exception as e:
        issues.append(f"Date validation error: {str(e)}")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues
    }


def _validate_annual_leave(days: str, jurisdiction: str) -> dict:
    """Validate annual leave days against statutory minimums."""
    issues = []
    
    try:
        days_value = int(str(days))
        
        if jurisdiction == "MY":
            # Malaysia: Minimum 8 days for employees with less than 2 years, 
            # 12 days for 2-5 years, 16 days for 5+ years
            if days_value < 8:
                issues.append(f"Annual leave of {days_value} days is below Malaysia minimum (8 days for new employees)")
        elif jurisdiction == "SG":
            # Singapore: Minimum 7 days for first year
            if days_value < 7:
                issues.append(f"Annual leave of {days_value} days is below Singapore minimum (7 days)")
        
        # Check for unreasonably high values
        if days_value > 50:
            issues.append(f"Annual leave of {days_value} days is unusually high. Please verify this is correct.")
        
    except (ValueError, TypeError):
        issues.append("Invalid annual leave format. Please provide a numeric value.")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues
    }


def _validate_sick_leave(days: str, jurisdiction: str) -> dict:
    """Validate sick leave days against statutory minimums."""
    issues = []
    
    try:
        days_value = int(str(days))
        
        if jurisdiction == "MY":
            # Malaysia: Minimum 14 days sick leave per year
            if days_value < 14:
                issues.append(f"Sick leave of {days_value} days is below Malaysia minimum (14 days)")
        elif jurisdiction == "SG":
            # Singapore: Typically 14 days outpatient + 60 days hospitalization
            if days_value < 14:
                issues.append(f"Sick leave of {days_value} days is below Singapore guideline (14 days)")
        
        # Check for unreasonably high values
        if days_value > 100:
            issues.append(f"Sick leave of {days_value} days is unusually high. Please verify this is correct.")
        
    except (ValueError, TypeError):
        issues.append("Invalid sick leave format. Please provide a numeric value.")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues
    }


def _generate_approval_response(modification: dict, updated_contract: dict) -> str:
    """Generate markdown response for approved modification."""
    field = modification.get("field", "contract")
    new_value = modification.get("new_value", "")
    
    field_display = field.replace('_', ' ').title()
    
    # Extract values from nested structure
    employment_details = updated_contract.get("employment_details", {})
    personal_details = updated_contract.get("personal_details", {})
    
    # Build updated contract summary
    summary_items = []

    # ── Personal Details ──
    employee_name = (
        updated_contract.get("employee_name") or
        personal_details.get("fullName") or
        updated_contract.get("full_name")
    )
    if employee_name:
        summary_items.append(f"- **Employee:** {employee_name}")

    email = personal_details.get("email") or updated_contract.get("email")
    if email:
        summary_items.append(f"- **Email:** {email}")

    nationality = personal_details.get("nationality") or updated_contract.get("nationality")
    if nationality:
        summary_items.append(f"- **Nationality:** {nationality}")

    nric = personal_details.get("nric") or updated_contract.get("nric")
    if nric:
        summary_items.append(f"- **NRIC:** {nric}")

    dob = personal_details.get("date_of_birth") or updated_contract.get("date_of_birth")
    if dob:
        summary_items.append(f"- **Date of Birth:** {dob}")

    # ── Employment Details ──
    position = employment_details.get("position_title") or updated_contract.get("position")
    if position:
        summary_items.append(f"- **Position:** {position}")

    department = employment_details.get("department") or updated_contract.get("department")
    if department:
        summary_items.append(f"- **Department:** {department}")

    start_date = employment_details.get("start_date") or updated_contract.get("start_date")
    if start_date:
        summary_items.append(f"- **Start Date:** {start_date}")

    salary = employment_details.get("salary") or updated_contract.get("salary")
    if salary:
        currency = "RM" if updated_contract.get("jurisdiction") == "MY" else "SGD"
        summary_items.append(f"- **Salary:** {currency} {salary}")

    work_location = employment_details.get("work_location") or updated_contract.get("work_location")
    if work_location:
        summary_items.append(f"- **Work Location:** {work_location}")

    work_hours = employment_details.get("work_hours") or updated_contract.get("work_hours")
    if work_hours:
        summary_items.append(f"- **Work Hours:** {work_hours}")

    annual_leave = employment_details.get("annual_leave")
    if annual_leave:
        summary_items.append(f"- **Annual Leave:** {annual_leave} days")

    sick_leave = employment_details.get("sick_leave")
    if sick_leave:
        summary_items.append(f"- **Sick Leave:** {sick_leave} days")

    probation = employment_details.get("probation_months")
    if probation:
        summary_items.append(f"- **Probation Period:** {probation} months")

    # ── Banking Details ──
    bank_name = personal_details.get("bank_name") or updated_contract.get("bank_name")
    if bank_name:
        summary_items.append(f"- **Bank:** {bank_name}")

    bank_holder = personal_details.get("bank_account_holder") or updated_contract.get("bank_account_holder")
    if bank_holder:
        summary_items.append(f"- **Account Holder:** {bank_holder}")

    bank_account = personal_details.get("bank_account_number") or updated_contract.get("bank_account_number")
    if bank_account:
        summary_items.append(f"- **Account Number:** {bank_account}")

    summary_md = "\n".join(summary_items) if summary_items else "_(No details available)_"
    
    return f"""## Contract Modification Approved ✅

Your requested change has been approved and applied to your contract.

**Modified Field:** {field_display}  
**New Value:** {new_value}

### Updated Contract Summary

{summary_md}

---

You can continue to request changes or proceed to sign your contract by saying **"I'm ready to sign"** or clicking the **Sign Contract** button.
"""


def _generate_rejection_response(modification: dict, compliance_result: dict) -> str:
    """Generate markdown response for rejected modification."""
    field = modification.get("field", "contract")
    new_value = modification.get("new_value", "")
    issues = compliance_result.get("issues", ["Policy violation detected"])
    risk = compliance_result.get("risk_level", "high")
    recommendations = compliance_result.get("recommendations", ["Please contact HR for alternative options."])
    
    field_display = field.replace('_', ' ').title()
    
    # Format issues as bullet points
    issues_md = "\n".join(f"- {issue}" for issue in issues)
    
    # Format recommendations
    recs_md = "\n".join(f"- {rec}" for rec in recommendations) if recommendations else "- Please contact HR for guidance."
    
    return f"""## Contract Modification Rejected ❌

Your requested change cannot be approved due to policy compliance issues.

**Modified Field:** {field_display}  
**Requested Value:** {new_value}  
**Risk Level:** `{risk.upper()}`

### Reasons for Rejection

{issues_md}

### Recommendations

{recs_md}

---

If you believe this is an error or need to discuss this further, please contact HR directly.

You can also try a different modification or proceed to sign the current contract.
"""
