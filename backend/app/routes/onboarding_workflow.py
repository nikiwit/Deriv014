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

    pending_employee = db.execute(
        """SELECT * FROM pending_employees 
           WHERE (nric = ? OR passport_no = ?) AND status = 'pending_onboarding'
           LIMIT 1""",
        (identifier, identifier),
    ).fetchone()

    if pending_employee:
        employee_data = dict(pending_employee)

        offer_letter = db.execute(
            """SELECT * FROM offer_letters 
               WHERE employee_id = ? ORDER BY created_at DESC LIMIT 1""",
            (employee_data.get("id"),),
        ).fetchone()

        if offer_letter:
            employee_data["offer_letter"] = dict(offer_letter)

        return jsonify(
            {
                "success": True,
                "found": True,
                "stage": "review",
                "employee": employee_data,
                "message": "Employee record found. Please review your information.",
            }
        ), 200

    existing_employee = db.execute(
        """SELECT * FROM employees 
           WHERE nric = ? OR passport_no = ?
           LIMIT 1""",
        (identifier, identifier),
    ).fetchone()

    if existing_employee:
        return jsonify(
            {
                "success": True,
                "found": True,
                "stage": "already_onboarded",
                "employee": dict(existing_employee),
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

    db.execute(
        """INSERT INTO hr_notifications 
           (id, type, nric, passport_no, name, email, phone, message, jurisdiction, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)""",
        (
            notification_id,
            "onboarding_not_found",
            nric,
            passport_no,
            name,
            email,
            phone,
            message,
            jurisdiction,
            datetime.utcnow().isoformat(),
        ),
    )
    db.commit()

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

    employee = db.execute(
        "SELECT * FROM pending_employees WHERE id = ?", (employee_id,)
    ).fetchone()

    if not employee:
        return jsonify({"success": False, "error": "Employee record not found"}), 404

    offer_letter = db.execute(
        """SELECT * FROM offer_letters 
           WHERE employee_id = ? ORDER BY created_at DESC LIMIT 1""",
        (employee_id,),
    ).fetchone()

    documents = db.execute(
        """SELECT * FROM pending_documents 
           WHERE employee_id = ?""",
        (employee_id,),
    ).fetchall()

    return jsonify(
        {
            "success": True,
            "employee": dict(employee),
            "offer_letter": dict(offer_letter) if offer_letter else None,
            "documents": [dict(d) for d in documents],
            "review_items": _build_review_items(
                dict(employee), dict(offer_letter) if offer_letter else None
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

    employee = db.execute(
        "SELECT * FROM pending_employees WHERE id = ?", (employee_id,)
    ).fetchone()

    if not employee:
        return jsonify({"success": False, "error": "Employee not found"}), 404

    employee_dict = dict(employee)

    db.execute(
        """UPDATE pending_employees 
           SET status = 'offer_accepted', offer_accepted_at = ?
           WHERE id = ?""",
        (accepted_at, employee_id),
    )

    db.execute(
        """UPDATE offer_letters 
           SET status = 'accepted', accepted_at = ?
           WHERE employee_id = ?""",
        (accepted_at, employee_id),
    )

    db.execute(
        """INSERT INTO offer_acceptance_log 
           (id, employee_id, action, ip_address, timestamp)
           VALUES (?, ?, 'accepted', ?, ?)""",
        (str(uuid.uuid4()), employee_id, ip_address, accepted_at),
    )

    db.commit()

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

    employee = db.execute(
        "SELECT * FROM pending_employees WHERE id = ?", (employee_id,)
    ).fetchone()

    if not employee:
        return jsonify({"success": False, "error": "Employee not found"}), 404

    dispute_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()

    db.execute(
        """UPDATE pending_employees 
           SET status = 'offer_disputed', dispute_reason = ?, dispute_details = ?, disputed_at = ?
           WHERE id = ?""",
        (dispute_reason, dispute_details, timestamp, employee_id),
    )

    db.execute(
        """UPDATE offer_letters 
           SET status = 'disputed'
           WHERE employee_id = ?""",
        (employee_id,),
    )

    db.execute(
        """INSERT INTO offer_disputes 
           (id, employee_id, dispute_reason, dispute_details, status, created_at)
           VALUES (?, ?, ?, ?, 'open', ?)""",
        (dispute_id, employee_id, dispute_reason, dispute_details, timestamp),
    )

    db.commit()

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
    employee = db.execute(
        "SELECT * FROM pending_employees WHERE id = ?", (employee_id,)
    ).fetchone()

    if not employee:
        return jsonify({"success": False, "error": "Employee not found"}), 404

    employee_dict = dict(employee)
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
                db.execute(
                    """INSERT INTO generated_documents 
                       (id, employee_id, document_type, file_path, status, created_at)
                       VALUES (?, ?, ?, ?, 'generated', ?)""",
                    (
                        doc.get("contract_id"),
                        employee_id,
                        doc.get("document_type"),
                        doc.get("file_path", ""),
                        datetime.utcnow().isoformat(),
                    ),
                )

        db.execute(
            """UPDATE pending_employees 
               SET status = 'documents_generated', documents_generated_at = ?
               WHERE id = ?""",
            (datetime.utcnow().isoformat(), employee_id),
        )

        db.commit()

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

    employee = db.execute(
        "SELECT id, full_name, status, created_at, offer_accepted_at, documents_generated_at, onboarding_completed_at FROM pending_employees WHERE id = ?",
        (employee_id,),
    ).fetchone()

    if not employee:
        return jsonify({"success": False, "error": "Employee not found"}), 404

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
    existing = db.execute(
        "SELECT id FROM pending_employees WHERE nric = ? OR passport_no = ? OR email = ?",
        (nric, passport_no, email),
    ).fetchone()

    if existing:
        return jsonify(
            {
                "success": False,
                "error": "Employee with this NRIC, passport, or email already exists",
                "existing_id": dict(existing)["id"],
            }
        ), 400

    # Create employee
    employee_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    db.execute(
        """
        INSERT INTO pending_employees 
        (id, full_name, nric, passport_no, email, phone, address, jurisdiction, employment_type, position, department, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_onboarding', ?)
    """,
        (
            employee_id,
            full_name,
            nric or None,
            passport_no or None,
            email,
            data.get("phone", ""),
            data.get("address", ""),
            jurisdiction,
            employment_type,
            position,
            department,
            now,
        ),
    )

    # Create offer letter
    offer_id = str(uuid.uuid4())
    db.execute(
        """
        INSERT INTO offer_letters
        (id, employee_id, position, department, start_date, salary, currency, employment_type, probation_months, reporting_to, work_location, medical_coverage, annual_leave_days, bonus_details, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')
    """,
        (
            offer_id,
            employee_id,
            position,
            department,
            start_date,
            salary,
            currency,
            employment_type,
            probation_months,
            reporting_to,
            work_location,
            medical_coverage,
            annual_leave_days,
            bonus_details,
        ),
    )

    db.commit()

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
