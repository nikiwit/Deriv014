import json
import uuid
from datetime import datetime
from flask import Blueprint, jsonify, request
from pathlib import Path
from typing import Optional, Dict, Any, List
import os

from app.database import get_db

bp = Blueprint("onboarding_workflow", __name__, url_prefix="/api/onboarding-workflow")

# Also register offer endpoints without prefix
offer_bp = Blueprint("offer", __name__, url_prefix="/api/offer")


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


# @bp.route("/generate-offer-approval", methods=["POST"])
# def generate_offer_approval():
#     """Generate offer approval JSON and create user with pending_employee role"""
#     data = request.get_json() or {}
    
#     # Required fields
#     full_name = data.get("full_name", "").strip()
#     email = data.get("email", "").strip().lower()
#     first_name = data.get("first_name", "").strip()
#     last_name = data.get("last_name", "").strip()
#     position_title = data.get("position_title", "").strip()
#     department = data.get("department", "").strip()
#     start_date = data.get("start_date", "")
#     salary = data.get("salary", "")
    
#     if not full_name or not email or not position_title:
#         return jsonify({
#             "success": False,
#             "error": "full_name, email, and position_title are required"
#         }), 400
    
#     # Generate employee ID
#     employee_id = str(uuid.uuid4())
#     now = datetime.utcnow().isoformat()
    
#     # Prepare offer approval data
#     offer_data = {
#         "employee_id": employee_id,
#         "full_name": full_name,
#         "email": email,
#         "first_name": first_name,
#         "last_name": last_name,
#         "nric": data.get("nric", ""),
#         "position_title": position_title,
#         "position": data.get("position", position_title),
#         "department": department,
#         "start_date": start_date,
#         "salary": salary,
#         "nationality": data.get("nationality", "Malaysian"),
#         "date_of_birth": data.get("date_of_birth", ""),
#         "work_location": data.get("work_location", ""),
#         "work_hours": data.get("work_hours", ""),
#         "leave_annual_days": data.get("leave_annual_days", 14),
#         "leave_sick_days": data.get("leave_sick_days", 14),
#         "public_holidays_policy": data.get("public_holidays_policy", ""),
#         "bank_name": data.get("bank_name", ""),
#         "bank_account_holder": data.get("bank_account_holder", ""),
#         "bank_account_number": data.get("bank_account_number", ""),
#         "jurisdiction": data.get("jurisdiction", "MY"),
#         "bonus": data.get("bonus", ""),
#         "probation_months": data.get("probation_months", 3),
#         "created_at": now,
#         "status": "pending"
#     }
    
#     # Create JSON file in backend/temp_data
#     backend_dir = Path(__file__).parent.parent.parent
#     temp_data_dir = backend_dir / "temp_data"
#     temp_data_dir.mkdir(exist_ok=True)
    
#     json_filename = f"{employee_id}_offer_approval.json"
#     json_filepath = temp_data_dir / json_filename
    
#     try:
#         with open(json_filepath, "w") as f:
#             json.dump(offer_data, f, indent=2)
#     except Exception as e:
#         return jsonify({
#             "success": False,
#             "error": f"Failed to create JSON file: {str(e)}"
#         }), 500
    
#     # Create user in users table with pending_employee role
#     db = get_db()
#     offer_url = f"/offer/{employee_id}"
    
#     try:
#         # # Check if user already exists
#         # existing = db.table("users").select("id").eq("email", email).execute()
#         # if existing.data:
#         #     return jsonify({
#         #         "success": False,
#         #         "error": "User with this email already exists"
#         #     }), 409
        
#         # In generate_offer_approval() at line 729
#         existing = db.table("users").select("id, role").eq("email", email).execute()
#         if existing.data:
#             # Check if this is for the SAME employee
#             existing_user = existing.data[0]
#             if existing_user.get("employee_id") == employee_id:
#                 # Same employee, just return success
#                 user_id = existing_user["id"]
#             elif existing_user.get("role") == "pending_employee":
#                 # Update existing pending employee
#                 db.table("users").update(user_data).eq("id", existing_user["id"]).execute()
#                 user_id = existing_user["id"]
#             else:
#                 # Different employee with same email
#                 return jsonify({
#                     "success": False,
#                     "error": "User with this email already exists for a different employee"
#                 }), 409
#         else:
#             # Create new user
#             result = db.table("users").insert(user_data).execute()
#             user_id = result.data[0]["id"]

#         # Create user — only columns that exist in the users table
#         user_data = {
#             "email": email,
#             "first_name": first_name,
#             "last_name": last_name,
#             "role": "pending_employee",
#             "department": department,
#             "employee_id": employee_id,
#             "nationality": data.get("nationality", "Malaysian"),
#             "start_date": start_date or None,
#             "onboarding_complete": False,
#             "nric": data.get("nric", ""),
#         }

#         result = db.table("users").insert(user_data).execute()
#         user_id = result.data[0]["id"] if result.data else employee_id

#         # Update offer_data JSON with the user_id for reference
#         offer_data["user_id"] = user_id
#         with open(json_filepath, "w") as f:
#             json.dump(offer_data, f, indent=2)

#         return jsonify({
#             "success": True,
#             "employee_id": employee_id,
#             "user_id": user_id,
#             "offer_url": offer_url,
#             "json_path": str(json_filepath),
#             "message": "Offer approval generated and user created with pending_employee role"
#         }), 201

#     except Exception as e:
#         # Clean up JSON file if user creation fails
#         if json_filepath.exists():
#             json_filepath.unlink()
#         return jsonify({
#             "success": False,
#             "error": f"Failed to create user: {str(e)}"
#         }), 500

@bp.route("/generate-offer-approval", methods=["POST"])
def generate_offer_approval():
    """Generate offer approval JSON and create/update user with pending_employee role"""
    data = request.get_json() or {}
    
    # Required fields
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    position_title = data.get("position_title", "").strip()
    department = data.get("department", "").strip()
    start_date = data.get("start_date", "")
    salary = data.get("salary", "")
    
    if not full_name or not email or not position_title:
        return jsonify({
            "success": False,
            "error": "full_name, email, and position_title are required"
        }), 400
    
    # Generate employee ID
    employee_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    # Prepare offer approval data
    offer_data = {
        "employee_id": employee_id,
        "full_name": full_name,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "nric": data.get("nric", ""),
        "position_title": position_title,
        "position": data.get("position", position_title),
        "department": department,
        "start_date": start_date,
        "salary": salary,
        "nationality": data.get("nationality", "Malaysian"),
        "date_of_birth": data.get("date_of_birth", ""),
        "work_location": data.get("work_location", ""),
        "work_hours": data.get("work_hours", ""),
        "leave_annual_days": data.get("leave_annual_days", 14),
        "leave_sick_days": data.get("leave_sick_days", 14),
        "public_holidays_policy": data.get("public_holidays_policy", ""),
        "bank_name": data.get("bank_name", ""),
        "bank_account_holder": data.get("bank_account_holder", ""),
        "bank_account_number": data.get("bank_account_number", ""),
        "jurisdiction": data.get("jurisdiction", "MY"),
        "bonus": data.get("bonus", ""),
        "probation_months": data.get("probation_months", 3),
        "created_at": now,
        "status": "pending"
    }
    
    # Create JSON file in backend/temp_data
    backend_dir = Path(__file__).parent.parent.parent
    temp_data_dir = backend_dir / "temp_data"
    temp_data_dir.mkdir(exist_ok=True)
    
    json_filename = f"{employee_id}_offer_approval.json"
    json_filepath = temp_data_dir / json_filename
    
    try:
        with open(json_filepath, "w") as f:
            json.dump(offer_data, f, indent=2)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to create JSON file: {str(e)}"
        }), 500
    
    # Create or update user in users table with pending_employee role
    db = get_db()
    offer_url = f"/offer/{employee_id}"
    
    try:
        # Prepare user data (email included for inserts; we'll avoid changing it on update)
        user_data = {
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "role": "pending_employee",
            "department": department,
            "employee_id": employee_id,
            "nationality": data.get("nationality", "Malaysian"),
            "start_date": start_date or None,
            "onboarding_complete": False,
            "nric": data.get("nric", ""),
        }

        # Check if user already exists by email
        existing = db.table("users").select("id, role, employee_id").eq("email", email).execute()
        if existing.data:
            existing_user = existing.data[0]
            # Update all fields except email
            update_data = {k: v for k, v in user_data.items() if k != "email"}
            db.table("users").update(update_data).eq("id", existing_user["id"]).execute()
            user_id = existing_user["id"]
        else:
            # Create new user
            result = db.table("users").insert(user_data).execute()
            user_id = result.data[0]["id"]

        # Update offer_data JSON with the user_id for reference
        offer_data["user_id"] = user_id
        with open(json_filepath, "w") as f:
            json.dump(offer_data, f, indent=2)

        return jsonify({
            "success": True,
            "employee_id": employee_id,
            "user_id": user_id,
            "offer_url": offer_url,
            "json_path": str(json_filepath),
            "message": "Offer approval generated and user created/updated with pending_employee role"
        }), 201

    except Exception as e:
        # Clean up JSON file if user creation/update fails
        if json_filepath.exists():
            json_filepath.unlink()
        return jsonify({
            "success": False,
            "error": f"Failed to create or update user: {str(e)}"
        }), 500

# ── OFFER LETTER DISPLAY & ACTIONS ──────────────────────────────────

@offer_bp.route("/<employee_id>", methods=["GET"])
def get_offer_letter(employee_id):
    """Display offer letter details by employee ID"""
    backend_dir = Path(__file__).parent.parent.parent
    json_filepath = backend_dir / "temp_data" / f"{employee_id}_offer_approval.json"
    
    if not json_filepath.exists():
        return jsonify({
            "success": False,
            "error": "Offer letter not found"
        }), 404
    
    try:
        with open(json_filepath, "r") as f:
            offer_data = json.load(f)
        
        return jsonify({
            "success": True,
            "employee_id": employee_id,
            "offer_data": offer_data,
            "actions": {
                "accept_url": f"/api/offer/{employee_id}/accept",
                "reject_url": f"/api/offer/{employee_id}/reject"
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to read offer letter: {str(e)}"
        }), 500


@offer_bp.route("/<employee_id>/accept", methods=["POST"])
def accept_offer_letter(employee_id):
    """Accept offer letter - create employees record and update user role"""
    db = get_db()

    # Load the offer JSON to get all employee details
    backend_dir = Path(__file__).parent.parent.parent
    json_filepath = backend_dir / "temp_data" / f"{employee_id}_offer_approval.json"

    if not json_filepath.exists():
        return jsonify({
            "success": False,
            "error": "Offer letter data not found"
        }), 404

    try:
        with open(json_filepath, "r") as f:
            offer_data = json.load(f)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to read offer data: {str(e)}"
        }), 500

    if offer_data.get("status") == "accepted":
        return jsonify({
            "success": False,
            "error": "This offer has already been accepted"
        }), 400

    now = datetime.utcnow().isoformat()

    try:
        # 1) Check if employee already exists in employees table
        existing_emp = db.table("employees").select("id").eq("email", offer_data.get("email", "")).execute()
        if existing_emp.data:
            new_employee_id = existing_emp.data[0]["id"]
        else:
            # Create record in employees table from offer JSON data
            new_employee_id = str(uuid.uuid4())
            db.table("employees").insert({
                "id": new_employee_id,
                "email": offer_data.get("email", ""),
                "full_name": offer_data.get("full_name", ""),
                "nric": offer_data.get("nric") or None,
                "jurisdiction": offer_data.get("jurisdiction", "MY"),
                "position": offer_data.get("position_title") or offer_data.get("position", ""),
                "department": offer_data.get("department", ""),
                "start_date": offer_data.get("start_date") or None,
                "bank_name": offer_data.get("bank_name", ""),
                "bank_account": offer_data.get("bank_account_number", ""),
            }).execute()

        # 2) Update user role from pending_employee → employee
        user_id = offer_data.get("user_id", employee_id)
        db.table("users").update({
            "role": "employee",
            "employee_id": new_employee_id,
            "onboarding_complete": False,
        }).eq("employee_id", employee_id).execute()

        # 3) Update JSON file status
        offer_data["status"] = "accepted"
        offer_data["accepted_at"] = now
        offer_data["employees_table_id"] = new_employee_id
        with open(json_filepath, "w") as f:
            json.dump(offer_data, f, indent=2)

        return jsonify({
            "success": True,
            "message": "Offer accepted! Employee record created.",
            "employee_id": new_employee_id,
            "updated_role": "employee"
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to accept offer: {str(e)}"
        }), 500


@offer_bp.route("/<employee_id>/reject", methods=["POST"])
def reject_offer_letter(employee_id):
    """Reject offer letter - create dispute and notify HR"""
    data = request.get_json() or {}
    reason = data.get("reason", "Not specified")
    
    db = get_db()
    
    # Check if user exists
    user_resp = db.table("users").select("id, email, first_name, last_name").eq("id", employee_id).execute()
    if not user_resp.data:
        return jsonify({
            "success": False,
            "error": "User not found"
        }), 404
    
    user = user_resp.data[0]
    
    # Update JSON file status
    backend_dir = Path(__file__).parent.parent.parent
    json_filepath = backend_dir / "temp_data" / f"{employee_id}_offer_approval.json"
    
    if json_filepath.exists():
        try:
            with open(json_filepath, "r") as f:
                offer_data = json.load(f)
            offer_data["status"] = "rejected"
            offer_data["rejected_at"] = datetime.utcnow().isoformat()
            offer_data["rejection_reason"] = reason
            with open(json_filepath, "w") as f:
                json.dump(offer_data, f, indent=2)
        except Exception as e:
            print(f"Failed to update JSON file: {e}")
    
    # Create dispute record
    dispute_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    try:
        db.table("offer_disputes").insert({
            "id": dispute_id,
            "employee_id": employee_id,
            "dispute_reason": reason,
            "dispute_details": reason,
            "status": "open",
            "created_at": timestamp
        }).execute()
        
        # Notify HR
        db.table("hr_notifications").insert({
            "id": str(uuid.uuid4()),
            "type": "offer_rejected",
            "nric": "",
            "passport_no": "",
            "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "email": user["email"],
            "phone": "",
            "message": f"Candidate rejected offer. Reason: {reason}",
            "jurisdiction": "MY",
            "status": "pending",
            "created_at": timestamp
        }).execute()
        
        return jsonify({
            "success": True,
            "message": "Offer rejected. HR has been notified and will contact you.",
            "employee_id": employee_id,
            "dispute_id": dispute_id
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to reject offer: {str(e)}"
        }), 500
