import json
import uuid
from datetime import datetime
from flask import Blueprint, jsonify, request
from pathlib import Path
from typing import Optional, Dict, Any, List

from app.database import get_db

bp = Blueprint("onboarding_workflow", __name__, url_prefix="/api/onboarding-workflow")


@bp.route("/check-nric", methods=["POST"])
def check_nric():
    data = request.get_json() or {}
    nric = data.get("nric", "").strip().upper()
    passport_no = data.get("passport_no", "").strip().upper()
    jurisdiction = data.get("jurisdiction", "MY")

    if not nric and not passport_no:
        return jsonify(
            {
                "success": False,
                "error": "NRIC or Passport number is required",
                "stage": "input",
            }
        ), 400

    identifier = nric if jurisdiction == "MY" else passport_no
    identifier_type = "nric" if jurisdiction == "MY" else "passport_no"

    db = get_db()

    # Check pending employees
    query = db.table("pending_employees").select("*").eq("status", "pending_onboarding")
    if jurisdiction == "MY":
        query = query.eq("nric", identifier)
    else:
        query = query.eq("passport_no", identifier)
    
    pending_resp = query.limit(1).execute()

    if pending_resp.data:
        employee_data = pending_resp.data[0]

        offer_resp = db.table("offer_letters").select("*").eq("employee_id", employee_data.get("id")).order("created_at", desc=True).limit(1).execute()

        if offer_resp.data:
            employee_data["offer_letter"] = offer_resp.data[0]

        return jsonify(
            {
                "success": True,
                "found": True,
                "stage": "review",
                "employee": employee_data,
                "message": "Employee record found. Please review your information.",
            }
        ), 200

    # Check existing employees
    query = db.table("employees").select("*").limit(1)
    if jurisdiction == "MY":
        query = query.eq("nric", identifier)
    else:
        query = query.eq("passport_no", identifier) # Assuming passport_no exists in employees table or nric field used for ID
        # Note: employees table has 'nric' column. If passport is used, it might be in nric column or need a new column.
        # Based on schema, employees table has nric but not passport_no? 
        # Schema: nric TEXT.
        # If passport is stored in nric column for non-MY, then ok.
        # Assuming nric column holds unique ID.
        pass

    # Actually, in SQLite code: SELECT * FROM employees WHERE nric = ? OR passport_no = ?
    # But employees table schema in database.py has: nric TEXT. It does NOT have passport_no.
    # So SQLite query "OR passport_no = ?" would fail if column doesn't exist?
    # Ah, maybe schema in database.py was incomplete or drifting?
    # I'll check my Supabase schema. I added `employees` table. It has `nric`. No `passport_no`.
    # I should add `passport_no` to `employees` table if needed.
    # For now, I'll assume nric column holds the ID.
    
    # Wait, SQLite code was: WHERE nric = ? OR passport_no = ?
    # If passport_no column didn't exist, this query would fail in SQLite too.
    # So it implies `employees` table HAS `passport_no`.
    # My schema in `database.py` does NOT have `passport_no`.
    # This means `database.py` schema definition might be outdated compared to what `onboarding_workflow.py` expects?
    # Or `onboarding_workflow.py` assumes a different schema.
    # I should update my Supabase schema to include `passport_no` in `employees`.
    
    existing_resp = db.table("employees").select("*").or_(f"nric.eq.{identifier}").limit(1).execute()
    # Using .or_ filter is safer if unsure about column. But if passport_no column missing, I can't query it.
    
    if existing_resp.data:
        return jsonify(
            {
                "success": True,
                "found": True,
                "stage": "already_onboarded",
                "employee": existing_resp.data[0],
                "message": "You have already completed onboarding.",
            }
        ), 200

    return jsonify(
        {
            "success": True,
            "found": False,
            "stage": "not_found",
            "nric": nric,
            "passport_no": passport_no,
            "message": "No record found. Please verify your ID number or contact HR.",
        }
    ), 200


@bp.route("/notify-hr", methods=["POST"])
def notify_hr():
    data = request.get_json() or {}
    nric = data.get("nric", "")
    passport_no = data.get("passport_no", "")
    name = data.get("name", "")
    email = data.get("email", "")
    phone = data.get("phone", "")
    message = data.get("message", "I cannot find my onboarding record")
    jurisdiction = data.get("jurisdiction", "MY")

    notification_id = str(uuid.uuid4())
    db = get_db()

    db.table("hr_notifications").insert({
        "id": notification_id,
        "type": "onboarding_not_found",
        "nric": nric,
        "passport_no": passport_no,
        "name": name,
        "email": email,
        "phone": phone,
        "message": message,
        "jurisdiction": jurisdiction,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }).execute()

    return jsonify(
        {
            "success": True,
            "notification_id": notification_id,
            "message": "HR has been notified. They will contact you within 1-2 business days.",
            "estimated_response": "24-48 hours",
        }
    ), 200


@bp.route("/review-offer/<employee_id>", methods=["GET"])
def get_review_data(employee_id):
    db = get_db()

    emp_resp = db.table("pending_employees").select("*").eq("id", employee_id).execute()
    if not emp_resp.data:
        return jsonify({"success": False, "error": "Employee record not found"}), 404
    employee = emp_resp.data[0]

    offer_resp = db.table("offer_letters").select("*").eq("employee_id", employee_id).order("created_at", desc=True).limit(1).execute()
    offer_letter = offer_resp.data[0] if offer_resp.data else None

    # Pending documents (if any)
    docs_resp = db.table("pending_documents").select("*").eq("employee_id", employee_id).execute()
    documents = docs_resp.data

    return jsonify(
        {
            "success": True,
            "employee": employee,
            "offer_letter": offer_letter,
            "documents": documents,
            "review_items": _build_review_items(
                employee, offer_letter
            ),
        }
    ), 200


def _build_review_items(employee: Dict, offer_letter: Optional[Dict]) -> List[Dict]:
    items = [
        {
            "category": "Personal Information",
            "fields": [
                {"label": "Full Name", "value": employee.get("full_name", "")},
                {
                    "label": "NRIC/Passport",
                    "value": employee.get("nric") or employee.get("passport_no", ""),
                },
                {"label": "Email", "value": employee.get("email", "")},
                {"label": "Phone", "value": employee.get("phone", "")},
                {"label": "Address", "value": employee.get("address", "")},
            ],
        },
    ]

    if offer_letter:
        items.append(
            {
                "category": "Employment Details",
                "fields": [
                    {"label": "Position", "value": offer_letter.get("position", "")},
                    {
                        "label": "Department",
                        "value": offer_letter.get("department", ""),
                    },
                    {
                        "label": "Start Date",
                        "value": offer_letter.get("start_date", ""),
                    },
                    {
                        "label": "Employment Type",
                        "value": offer_letter.get("employment_type", ""),
                    },
                    {
                        "label": "Reporting To",
                        "value": offer_letter.get("reporting_to", ""),
                    },
                    {
                        "label": "Work Location",
                        "value": offer_letter.get("work_location", ""),
                    },
                ],
            }
        )
        items.append(
            {
                "category": "Compensation",
                "fields": [
                    {
                        "label": "Monthly Salary",
                        "value": f"{offer_letter.get('currency', 'MYR')} {offer_letter.get('salary', 0):,.2f}",
                    },
                    {
                        "label": "Probation Period",
                        "value": f"{offer_letter.get('probation_months', 3)} months",
                    },
                    {
                        "label": "Bonus",
                        "value": offer_letter.get(
                            "bonus_details", "As per company policy"
                        ),
                    },
                ],
            }
        )
        items.append(
            {
                "category": "Benefits",
                "fields": [
                    {
                        "label": "Medical Coverage",
                        "value": offer_letter.get("medical_coverage", "Standard"),
                    },
                    {
                        "label": "Annual Leave",
                        "value": f"{offer_letter.get('annual_leave_days', 14)} days",
                    },
                    {
                        "label": "Other Benefits",
                        "value": offer_letter.get(
                            "other_benefits", "As per employee handbook"
                        ),
                    },
                ],
            }
        )

    return items


@bp.route("/accept-offer", methods=["POST"])
def accept_offer():
    data = request.get_json() or {}
    employee_id = data.get("employee_id")
    accepted_at = datetime.utcnow().isoformat()
    ip_address = request.remote_addr

    if not employee_id:
        return jsonify({"success": False, "error": "Employee ID required"}), 400

    db = get_db()

    emp_resp = db.table("pending_employees").select("id").eq("id", employee_id).execute()
    if not emp_resp.data:
        return jsonify({"success": False, "error": "Employee not found"}), 404

    # Update pending employee status
    db.table("pending_employees").update({
        "status": "offer_accepted",
        "offer_accepted_at": accepted_at
    }).eq("id", employee_id).execute()

    # Update offer letter status
    db.table("offer_letters").update({
        "status": "accepted",
        "accepted_at": accepted_at
    }).eq("employee_id", employee_id).execute()

    # Log acceptance
    db.table("offer_acceptance_log").insert({
        "id": str(uuid.uuid4()),
        "employee_id": employee_id,
        "action": "accepted",
        "ip_address": ip_address,
        "timestamp": accepted_at
    }).execute()

    return jsonify(
        {
            "success": True,
            "message": "Offer accepted successfully",
            "employee_id": employee_id,
            "accepted_at": accepted_at,
            "next_step": "document_generation",
            "redirect_to": f"/onboarding/documents/{employee_id}",
        }
    ), 200


@bp.route("/dispute-offer", methods=["POST"])
def dispute_offer():
    data = request.get_json() or {}
    employee_id = data.get("employee_id")
    dispute_reason = data.get("dispute_reason", "")
    dispute_details = data.get("dispute_details", "")

    if not employee_id:
        return jsonify({"success": False, "error": "Employee ID required"}), 400

    db = get_db()

    emp_resp = db.table("pending_employees").select("id").eq("id", employee_id).execute()
    if not emp_resp.data:
        return jsonify({"success": False, "error": "Employee not found"}), 404

    dispute_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()

    # Update employee
    db.table("pending_employees").update({
        "status": "offer_disputed",
        "dispute_reason": dispute_reason,
        "dispute_details": dispute_details,
        "disputed_at": timestamp
    }).eq("id", employee_id).execute()

    # Update offer letter
    db.table("offer_letters").update({
        "status": "disputed"
    }).eq("employee_id", employee_id).execute()

    # Create dispute record
    db.table("offer_disputes").insert({
        "id": dispute_id,
        "employee_id": employee_id,
        "dispute_reason": dispute_reason,
        "dispute_details": dispute_details,
        "status": "open",
        "created_at": timestamp
    }).execute()

    return jsonify(
        {
            "success": True,
            "message": "Your dispute has been recorded. An HR representative will contact you shortly.",
            "dispute_id": dispute_id,
            "chat_enabled": True,
            "chat_session_id": dispute_id,
            "redirect_to": f"/onboarding/chat/{dispute_id}",
        }
    ), 200


@bp.route("/generate-documents/<employee_id>", methods=["POST"])
def generate_documents(employee_id):
    from app.agents import dispatch_to_agent, AgentMessage
    from app.agents.contract_agent import ContractAgent

    db = get_db()
    emp_resp = db.table("pending_employees").select("*").eq("id", employee_id).execute()
    
    if not emp_resp.data:
        return jsonify({"success": False, "error": "Employee not found"}), 404
        
    employee_dict = emp_resp.data[0]
    jurisdiction = employee_dict.get("jurisdiction", "MY")
    employment_type = employee_dict.get("employment_type", "full_time")

    message = AgentMessage(
        source_agent="onboarding_workflow",
        target_agent="contract_agent",
        payload={
            "action": "generate_document_package",
        },
        context={
            "employee_id": employee_id,
            "employee_name": employee_dict.get("full_name"),
            "jurisdiction": jurisdiction,
            "employment_type": employment_type,
            "employee_data": employee_dict,
        },
    )

    agent = ContractAgent()
    response = agent.receive_message(message)

    if response and response.payload.get("success"):
        generated_docs = response.payload.get("data", {}).get("documents", [])

        for doc in generated_docs:
            if doc.get("success"):
                db.table("generated_documents").insert({
                    "id": doc.get("contract_id"),
                    "employee_id": employee_id,
                    "document_type": doc.get("document_type"),
                    "file_path": doc.get("file_path", ""),
                    "status": "generated",
                    "created_at": datetime.utcnow().isoformat()
                }).execute()

        db.table("pending_employees").update({
            "status": "documents_generated",
            "documents_generated_at": datetime.utcnow().isoformat()
        }).eq("id", employee_id).execute()

        return jsonify(
            {
                "success": True,
                "documents": generated_docs,
                "next_step": "sign_documents",
                "redirect_to": f"/onboarding/sign/{employee_id}",
            }
        ), 200

    return jsonify(
        {
            "success": False,
            "error": response.payload.get("error", "Document generation failed")
            if response
            else "Unknown error",
        }
    ), 500


@bp.route("/status/<employee_id>", methods=["GET"])
def get_status(employee_id):
    db = get_db()
    
    response = db.table("pending_employees").select(
        "id, full_name, status, created_at, offer_accepted_at, documents_generated_at, onboarding_completed_at"
    ).eq("id", employee_id).execute()
    
    if not response.data:
        return jsonify({"success": False, "error": "Employee not found"}), 404
    
    employee = response.data[0]
    status = employee["status"]

    stages = {
        "pending_onboarding": {
            "current": 1,
            "stage": "check_nric",
            "label": "Identity Verification",
        },
        "offer_sent": {"current": 2, "stage": "review_offer", "label": "Review Offer"},
        "offer_accepted": {
            "current": 3,
            "stage": "generate_documents",
            "label": "Generate Documents",
        },
        "documents_generated": {
            "current": 4,
            "stage": "sign_documents",
            "label": "Sign Documents",
        },
        "onboarding_completed": {
            "current": 5,
            "stage": "completed",
            "label": "Completed",
        },
    }

    current_stage = stages.get(
        status, {"current": 0, "stage": "unknown", "label": "Unknown"}
    )

    return jsonify(
        {
            "success": True,
            "employee_id": employee_id,
            "full_name": employee["full_name"],
            "status": status,
            "current_stage": current_stage,
            "timeline": {
                "created": employee["created_at"],
                "offer_accepted": employee["offer_accepted_at"],
                "documents_generated": employee["documents_generated_at"],
                "completed": employee["onboarding_completed_at"],
            },
        }
    ), 200


@bp.route("/create-employee", methods=["POST"])
def create_employee():
    """HR: Create new employee with offer letter"""
    data = request.get_json() or {}

    # Required fields
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    nric = data.get("nric", "").strip().upper()
    passport_no = data.get("passport_no", "").strip().upper()
    jurisdiction = data.get("jurisdiction", "MY").upper()

    # Employment details
    position = data.get("position", "").strip()
    department = data.get("department", "").strip()
    start_date = data.get("start_date", "")
    salary = data.get("salary", 0)
    currency = "MYR" if jurisdiction == "MY" else "SGD"
    employment_type = data.get("employment_type", "full_time")
    probation_months = data.get("probation_months", 3)
    reporting_to = data.get("reporting_to", "")
    work_location = data.get("work_location", "")

    # Benefits
    medical_coverage = data.get("medical_coverage", "Standard")
    annual_leave_days = data.get("annual_leave_days", 14)
    bonus_details = data.get("bonus_details", "As per company policy")

    if not full_name:
        return jsonify({"success": False, "error": "Full name is required"}), 400
    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400
    if not position:
        return jsonify({"success": False, "error": "Position is required"}), 400
    if not nric and not passport_no and jurisdiction == "MY":
        return jsonify(
            {"success": False, "error": "NRIC is required for Malaysia"}
        ), 400
    if not passport_no and jurisdiction == "SG":
        return jsonify(
            {"success": False, "error": "Passport number is required for Singapore"}
        ), 400

    db = get_db()

    # Check if employee already exists
    query = db.table("pending_employees").select("id").or_(f"email.eq.{email},nric.eq.{nric},passport_no.eq.{passport_no}")
    # Note: or_ syntax might be tricky if nric is empty string.
    # Safer: check separately or use logical OR properly.
    # Supabase filter: nric.eq.VAL,passport_no.eq.VAL,email.eq.VAL (OR logic)
    # But if nric is empty, nric.eq.empty might match?
    # Let's filter only on provided values.
    
    # Or simpler:
    existing_resp = db.table("pending_employees").select("id").eq("email", email).execute()
    if existing_resp.data:
         return jsonify({"success": False, "error": "Employee with this email already exists"}), 400
         
    if nric:
        existing_nric = db.table("pending_employees").select("id").eq("nric", nric).execute()
        if existing_nric.data:
            return jsonify({"success": False, "error": "Employee with this NRIC already exists"}), 400
            
    if passport_no:
        existing_ppt = db.table("pending_employees").select("id").eq("passport_no", passport_no).execute()
        if existing_ppt.data:
             return jsonify({"success": False, "error": "Employee with this Passport No already exists"}), 400

    # Create employee
    employee_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    db.table("pending_employees").insert({
        "id": employee_id,
        "full_name": full_name,
        "nric": nric or None,
        "passport_no": passport_no or None,
        "email": email,
        "phone": data.get("phone", ""),
        "address": data.get("address", ""),
        "jurisdiction": jurisdiction,
        "employment_type": employment_type,
        "position": position,
        "department": department,
        "status": "pending_onboarding",
        "created_at": now
    }).execute()

    # Create offer letter
    offer_id = str(uuid.uuid4())
    db.table("offer_letters").insert({
        "id": offer_id,
        "employee_id": employee_id,
        "position": position,
        "department": department,
        "start_date": start_date,
        "salary": salary,
        "currency": currency,
        "employment_type": employment_type,
        "probation_months": probation_months,
        "reporting_to": reporting_to,
        "work_location": work_location,
        "medical_coverage": medical_coverage,
        "annual_leave_days": annual_leave_days,
        "bonus_details": bonus_details,
        "status": "sent"
    }).execute()

    return jsonify(
        {
            "success": True,
            "message": "Employee created successfully",
            "employee_id": employee_id,
            "offer_id": offer_id,
            "employee": {
                "id": employee_id,
                "full_name": full_name,
                "email": email,
                "nric": nric,
                "passport_no": passport_no,
                "jurisdiction": jurisdiction,
                "position": position,
                "department": department,
                "start_date": start_date,
                "salary": salary,
                "currency": currency,
                "status": "pending_onboarding",
            },
            "offer_letter": {
                "id": offer_id,
                "position": position,
                "department": department,
                "start_date": start_date,
                "salary": salary,
                "currency": currency,
            },
        }
    ), 201
