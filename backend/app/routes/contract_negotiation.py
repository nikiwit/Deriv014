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
        modification["field"] = "position"
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
    
    # If we couldn't parse it, use RAG as fallback
    if not modification["field"] or not modification["new_value"]:
        try:
            query = (
                f"Extract the contract field name and new value from this modification request: '{message}'. "
                f"Identify what contract field the employee wants to change and what they want to change it to."
            )
            rag_response, _ = rag.query(session_id, query)
            # Store RAG response for context
            modification["rag_context"] = rag_response
        except Exception:
            pass
    
    return modification


def _apply_modifications(current_contract: dict, modification: dict) -> dict:
    """
    Apply the requested modification to the contract.
    
    Args:
        current_contract: Current contract data
        modification: Modification request with field and new_value
        
    Returns:
        Modified contract dictionary
    """
    proposed = current_contract.copy()
    
    field = modification.get("field")
    new_value = modification.get("new_value")
    
    if field and new_value:
        proposed[field] = new_value
        proposed["last_modified"] = datetime.datetime.now().isoformat()
    
    return proposed


def _check_compliance(proposed_contract: dict, employee_context: dict, modification: dict) -> dict:
    """
    Use policy_agent to validate the proposed changes.
    
    Args:
        proposed_contract: Contract with proposed modifications
        employee_context: Employee profile data
        modification: The modification request details
        
    Returns:
        dict with compliant flag, issues, and recommendations
    """
    jurisdiction = proposed_contract.get("jurisdiction", "MY")
    
    # Prepare employee data for policy check
    employee_data = {
        **proposed_contract,
        "jurisdiction": jurisdiction,
        "modification_type": modification.get("field"),
        "modification_value": modification.get("new_value")
    }
    
    # Call policy_agent's verify_compliance method
    try:
        result = policy_agent._verify_compliance(
            payload={
                "action_type": "contract_modification",
                "employee_data": employee_data
            },
            context={"jurisdiction": jurisdiction}
        )
        
        compliance_data = result.get("data", {})
        
        # Add field-specific validation
        field = modification.get("field")
        if field == "salary":
            salary_validation = _validate_salary_change(
                proposed_contract.get("salary"),
                jurisdiction
            )
            if not salary_validation["valid"]:
                compliance_data["compliant"] = False
                compliance_data["issues"] = compliance_data.get("issues", []) + salary_validation["issues"]
                compliance_data["risk_level"] = "high"
        
        elif field == "start_date":
            date_validation = _validate_start_date(proposed_contract.get("start_date"))
            if not date_validation["valid"]:
                compliance_data["compliant"] = False
                compliance_data["issues"] = compliance_data.get("issues", []) + date_validation["issues"]
        
        return compliance_data
        
    except Exception as e:
        # Fallback if policy agent fails
        return {
            "compliant": False,
            "issues": [f"Compliance check failed: {str(e)}"],
            "risk_level": "high",
            "recommendations": ["Please contact HR for manual review"]
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


def _generate_approval_response(modification: dict, updated_contract: dict) -> str:
    """Generate markdown response for approved modification."""
    field = modification.get("field", "contract")
    new_value = modification.get("new_value", "")
    
    field_display = field.replace('_', ' ').title()
    
    # Build updated contract summary
    summary_items = []
    if updated_contract.get("employee_name"):
        summary_items.append(f"- **Employee:** {updated_contract['employee_name']}")
    if updated_contract.get("position"):
        summary_items.append(f"- **Position:** {updated_contract['position']}")
    if updated_contract.get("department"):
        summary_items.append(f"- **Department:** {updated_contract['department']}")
    if updated_contract.get("start_date"):
        summary_items.append(f"- **Start Date:** {updated_contract['start_date']}")
    if updated_contract.get("salary"):
        currency = "RM" if updated_contract.get("jurisdiction") == "MY" else "SGD"
        summary_items.append(f"- **Salary:** {currency} {updated_contract['salary']}")
    
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
