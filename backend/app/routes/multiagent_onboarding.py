"""
Enhanced Multi-Agent Onboarding API Routes

Complete onboarding workflow:
1. HR creates offer → stored in temp DB with status: offer_pending
2. Employee receives offer link → reviews and responds
3. ACCEPT → auto-generate all documents, create portal, assign training
4. REJECT → notify HR via Telegram, create follow-up task
5. AgentixAgent monitors pending items and sends reminders
"""

import uuid
import datetime
import os
import json
from flask import Blueprint, current_app, jsonify, request, send_file
from supabase import create_client, Client

from app.database import get_db
from app.agents import MultiAgentOrchestrator, get_orchestrator, WorkflowType

bp = Blueprint(
    "multiagent_onboarding", __name__, url_prefix="/api/multiagent/onboarding"
)

ONBOARDING_DOCUMENTS = {
    "MY": [
        {"id": "employment_contract", "name": "Employment Contract", "required": True},
        {"id": "offer_letter", "name": "Offer Letter", "required": True},
        {"id": "data_it_policy", "name": "Data & IT Policy", "required": True},
        {"id": "employee_handbook", "name": "Employee Handbook", "required": True},
        {"id": "leave_policy", "name": "Leave Policy", "required": True},
        {"id": "epf_form", "name": "EPF Nomination Form", "required": True},
        {"id": "socso_form", "name": "SOCSO Registration Form", "required": True},
        {"id": "emergency_contact", "name": "Emergency Contact Form", "required": True},
        {"id": "bank_details", "name": "Bank Details Form", "required": True},
    ],
    "SG": [
        {"id": "employment_contract", "name": "Employment Contract", "required": True},
        {"id": "offer_letter", "name": "Offer Letter", "required": True},
        {"id": "data_it_policy", "name": "Data & IT Policy", "required": True},
        {"id": "employee_handbook", "name": "Employee Handbook", "required": True},
        {"id": "leave_policy", "name": "Leave Policy", "required": True},
        {"id": "cpf_form", "name": "CPF Nomination Form", "required": True},
        {"id": "emergency_contact", "name": "Emergency Contact Form", "required": True},
        {"id": "bank_details", "name": "Bank Details Form", "required": True},
    ],
}

ONBOARDING_FORMS = [
    {"id": "personal_info", "name": "Personal Information", "required": True},
    {"id": "bank_details", "name": "Bank Details", "required": True},
    {"id": "emergency_contact", "name": "Emergency Contact", "required": True},
    {"id": "tax_declaration", "name": "Tax Declaration", "required": True},
    {
        "id": "statutory_consent",
        "name": "Statutory Contributions Consent",
        "required": True,
    },
]


@bp.route("/offer", methods=["POST"])
def create_offer():
    """
    HR creates a new employee offer.

    Flow:
    1. OnboardingAgent creates offer
    2. PolicyAgent validates compliance
    3. SalaryAgent validates salary/contributions
    4. Store in temporary DB (status: offer_pending)
    5. AgentixAgent sets up reminders
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    employee_data = data.get("employee_data", {})
    offer_details = data.get("offer_details", {})

    if not employee_data.get("email"):
        return jsonify({"error": "Employee email is required"}), 400
    if not employee_data.get("full_name"):
        return jsonify({"error": "Employee full name is required"}), 400
    if not offer_details.get("position"):
        return jsonify({"error": "Position is required"}), 400

    orchestrator = get_orchestrator()
    result = orchestrator.process_onboarding_offer(employee_data, offer_details)

    if not result.success:
        return jsonify(
            {
                "error": "Failed to create offer",
                "details": result.errors,
                "agents_involved": result.agents_involved,
            }
        ), 400

    offer_data = result.data.get("offer", {})
    employee_id = offer_data.get("employee_id") or str(uuid.uuid4())
    offer_id = offer_data.get("offer_id") or str(uuid.uuid4())
    jurisdiction = employee_data.get("jurisdiction", "MY")

    db = get_db()
    now = datetime.datetime.now().isoformat()
    expiry_days = offer_details.get("expiry_days", 7)
    expires_at = (
        datetime.datetime.now() + datetime.timedelta(days=expiry_days)
    ).isoformat()

    try:
        existing = (
            db.table("onboarding_states")
            .select("id")
            .eq("email", employee_data.get("email"))
            .execute()
        )
        if existing.data:
            return jsonify({"error": "An offer already exists for this email"}), 409

        db.table("onboarding_states").insert(
            {
                "id": str(uuid.uuid4()),
                "employee_id": employee_id,
                "offer_id": offer_id,
                "status": "offer_pending",
                "employee_name": employee_data.get("full_name"),
                "email": employee_data.get("email"),
                "phone": employee_data.get("phone", ""),
                "position": offer_details.get("position"),
                "department": offer_details.get("department", ""),
                "salary": float(offer_details.get("salary", 0)),
                "jurisdiction": jurisdiction,
                "start_date": offer_details.get("start_date", ""),
                "probation_months": offer_details.get("probation_months", 3),
                "offer_sent_at": now,
                "offer_expires_at": expires_at,
                "created_at": now,
            }
        ).execute()

        db.table("employees").insert(
            {
                "id": employee_id,
                "email": employee_data.get("email"),
                "full_name": employee_data.get("full_name"),
                "nric": employee_data.get("nric", ""),
                "jurisdiction": jurisdiction,
                "position": offer_details.get("position"),
                "department": offer_details.get("department", ""),
                "start_date": offer_details.get("start_date"),
                "phone": employee_data.get("phone", ""),
                "status": "offer_pending",
                "created_at": now,
            }
        ).execute()

        for doc in ONBOARDING_DOCUMENTS.get(jurisdiction, ONBOARDING_DOCUMENTS["MY"]):
            db.table("onboarding_documents").insert(
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": employee_id,
                    "document_name": doc["name"],
                    "document_type": doc["id"],
                    "required": doc["required"],
                    "submitted": False,
                    "created_at": now,
                }
            ).execute()

        for form in ONBOARDING_FORMS:
            db.table("onboarding_forms").insert(
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": employee_id,
                    "form_name": form["name"],
                    "form_type": form["id"],
                    "required": form["required"],
                    "completed": False,
                    "created_at": now,
                }
            ).execute()

    except Exception as e:
        current_app.logger.error(f"Database error: {e}")
        return jsonify({"error": str(e)}), 500

    orchestrator.dispatch_to_agent(
        "agentix_agent",
        "setup_reminders",
        {"employee_id": employee_id, "type": "onboarding", "start_date": now},
    )

    return jsonify(
        {
            "success": True,
            "offer_id": offer_id,
            "employee_id": employee_id,
            "status": "offer_pending",
            "portal_url": f"/employee/offer/{offer_id}",
            "employee_portal_url": f"/employee/portal/{employee_id}",
            "expires_at": expires_at,
            "cross_checks": [
                {"agent": c.validator_agent, "result": c.result.value, "notes": c.notes}
                for c in result.cross_checks
            ],
            "agents_involved": result.agents_involved,
        }
    ), 201


@bp.route("/offer/<offer_id>", methods=["GET"])
def get_offer_details(offer_id):
    """Get offer details for employee review."""
    db = get_db()

    offer_resp = (
        db.table("onboarding_states").select("*").eq("offer_id", offer_id).execute()
    )
    if not offer_resp.data:
        return jsonify({"error": "Offer not found"}), 404

    offer = offer_resp.data[0]
    jurisdiction = offer.get("jurisdiction", "MY")

    company_info = {
        "name": "Deriv Solutions Sdn Bhd"
        if jurisdiction == "MY"
        else "Deriv Solutions Pte Ltd",
        "address": "Level 6, Tower 2, Cyberjaya, Malaysia"
        if jurisdiction == "MY"
        else "Singapore",
        "website": "https://deriv.com",
        "registration": "202001234567 (Malaysia)"
        if jurisdiction == "MY"
        else "201812345Z (Singapore)",
    }

    benefits = {
        "annual_leave": f"{offer.get('annual_leave_days', 14)} days",
        "medical_coverage": "Full medical coverage for employee and dependents",
        "statutory": "EPF, SOCSO, EIS" if jurisdiction == "MY" else "CPF, SDL",
        "probation": f"{offer.get('probation_months', 3)} months",
    }

    return jsonify(
        {
            "offer_id": offer_id,
            "employee_id": offer.get("employee_id"),
            "employee_name": offer.get("employee_name"),
            "email": offer.get("email"),
            "position": offer.get("position"),
            "department": offer.get("department"),
            "salary": offer.get("salary"),
            "jurisdiction": jurisdiction,
            "start_date": offer.get("start_date"),
            "probation_months": offer.get("probation_months", 3),
            "expires_at": offer.get("offer_expires_at"),
            "status": offer.get("status"),
            "company_info": company_info,
            "benefits": benefits,
            "created_at": offer.get("created_at"),
        }
    ), 200


@bp.route("/offer/<offer_id>/respond", methods=["POST"])
def respond_to_offer(offer_id):
    """
    Employee accepts or rejects an offer.

    On ACCEPT:
    - Update status to accepted
    - Generate all documents (contract, policies, forms)
    - TrainingAgent assigns onboarding training
    - AgentixAgent sets up reminders
    - Create employee portal access

    On REJECT:
    - AgentixAgent sends Telegram alert to HR
    - Create follow-up task for HR manager
    - Archive candidate data
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    response_type = data.get("response", "").lower()
    reason = data.get("reason", "")
    signature = data.get("signature", "")

    if response_type not in ["accepted", "rejected"]:
        return jsonify({"error": "Response must be 'accepted' or 'rejected'"}), 400

    db = get_db()

    offer_resp = (
        db.table("onboarding_states").select("*").eq("offer_id", offer_id).execute()
    )
    if not offer_resp.data:
        return jsonify({"error": "Offer not found"}), 404

    offer_record = offer_resp.data[0]
    employee_id = offer_record.get("employee_id")

    if offer_record.get("status") not in [
        "offer_created",
        "offer_sent",
        "offer_pending",
    ]:
        return jsonify({"error": f"Offer already {offer_record.get('status')}"}), 400

    now = datetime.datetime.now().isoformat()
    orchestrator = get_orchestrator()

    if response_type == "accepted":
        result = orchestrator.process_offer_acceptance(offer_id, employee_id, signature)

        if result.success:
            db.table("onboarding_states").update(
                {
                    "status": "offer_accepted",
                    "accepted_at": now,
                    "offer_response": "accepted",
                    "updated_at": now,
                }
            ).eq("offer_id", offer_id).execute()

            db.table("employees").update(
                {
                    "status": "onboarding_active",
                    "updated_at": now,
                }
            ).eq("id", employee_id).execute()

            docs_resp = (
                db.table("onboarding_documents")
                .select("*")
                .eq("employee_id", employee_id)
                .execute()
            )
            documents = docs_resp.data or []

            forms_resp = (
                db.table("onboarding_forms")
                .select("*")
                .eq("employee_id", employee_id)
                .execute()
            )
            forms = forms_resp.data or []

            training_response = orchestrator.dispatch_to_agent(
                "training_agent",
                "get_onboarding_training",
                {
                    "department": offer_record.get("department", ""),
                    "position": offer_record.get("position", ""),
                    "start_date": offer_record.get("start_date"),
                },
            )

            # Create user account for auto-login
            user_data = None
            auto_login = False
            try:
                supabase_url = current_app.config.get("SUPABASE_URL")
                supabase_key = current_app.config.get("SUPABASE_KEY")
                if supabase_url and supabase_key:
                    sb: Client = create_client(supabase_url, supabase_key)
                    employee_email = offer_record.get("email", "")
                    employee_name = offer_record.get("employee_name", "")

                    # Check if user already exists
                    existing_user = (
                        sb.table("users")
                        .select(
                            "id, email, first_name, last_name, role, department, employee_id"
                        )
                        .eq("email", employee_email)
                        .execute()
                    )

                    if existing_user.data:
                        user_data = existing_user.data[0]
                        auto_login = True
                else:
                    # Create new user
                    name_parts = employee_name.split(" ", 1)
                    first_name = name_parts[0]
                    last_name = name_parts[1] if len(name_parts) > 1 else ""

                    user_record = {
                        "email": employee_email,
                        "first_name": first_name,
                        "last_name": last_name,
                        "role": "employee",
                        "department": offer_record.get("department", ""),
                        "employee_id": employee_id,
                        "position_title": offer_record.get("position", ""),
                        "onboarding_complete": False,
                        "created_at": datetime.datetime.now().isoformat(),
                    }

                    user_result = sb.table("users").insert(user_record).execute()
                    if user_result.data:
                        user_data = user_result.data[0]
                        auto_login = True
            except Exception as e:
                current_app.logger.warning(f"Failed to create user for auto-login: {e}")

            return jsonify(
                {
                    "success": True,
                    "status": "accepted",
                    "employee_id": employee_id,
                    "portal_url": f"/employee/portal/{employee_id}",
                    "onboarding_checklist": f"/employee/portal/{employee_id}/checklist",
                    "documents": documents,
                    "forms": forms,
                    "training": training_response.payload
                    if training_response.success
                    else {},
                    "next_steps": [
                        "Complete personal information form",
                        "Upload required documents",
                        "Complete mandatory training",
                        "Sign employment contract",
                    ],
                    "agents_involved": result.agents_involved,
                    "auto_login": auto_login,
                    "user": user_data,
                }
            ), 200
        else:
            return jsonify(
                {
                    "success": False,
                    "error": "Failed to process acceptance",
                    "details": result.errors,
                }
            ), 500

    else:
        result = orchestrator.process_offer_rejection(offer_id, employee_id, reason)

        db.table("onboarding_states").update(
            {
                "status": "offer_rejected",
                "rejected_at": now,
                "offer_response": "rejected",
                "rejection_reason": reason,
                "hr_notified_at": now,
                "updated_at": now,
            }
        ).eq("offer_id", offer_id).execute()

        db.table("employees").update(
            {
                "status": "offer_rejected",
                "updated_at": now,
            }
        ).eq("id", employee_id).execute()

        return jsonify(
            {
                "success": True,
                "status": "rejected",
                "employee_id": employee_id,
                "hr_notified": True,
                "notification_channel": "telegram",
                "message": "HR has been notified of your decision. Thank you for your interest in Deriv.",
                "agents_involved": result.agents_involved,
            }
        ), 200


@bp.route("/employee/<employee_id>/portal", methods=["GET"])
def get_employee_portal(employee_id):
    """Get complete employee portal data for onboarding."""
    db = get_db()

    emp_resp = db.table("employees").select("*").eq("id", employee_id).execute()
    if not emp_resp.data:
        return jsonify({"error": "Employee not found"}), 404

    employee = emp_resp.data[0]

    state_resp = (
        db.table("onboarding_states")
        .select("*")
        .eq("employee_id", employee_id)
        .execute()
    )
    onboarding_state = state_resp.data[0] if state_resp.data else {}

    docs_resp = (
        db.table("onboarding_documents")
        .select("*")
        .eq("employee_id", employee_id)
        .execute()
    )
    documents = docs_resp.data or []

    forms_resp = (
        db.table("onboarding_forms")
        .select("*")
        .eq("employee_id", employee_id)
        .execute()
    )
    forms = forms_resp.data or []

    total_items = len(documents) + len(forms)
    completed_items = sum(1 for d in documents if d.get("submitted")) + sum(
        1 for f in forms if f.get("completed")
    )

    return jsonify(
        {
            "employee_id": employee_id,
            "employee_name": employee.get("full_name"),
            "email": employee.get("email"),
            "position": employee.get("position"),
            "department": employee.get("department"),
            "status": employee.get("status"),
            "jurisdiction": employee.get("jurisdiction", "MY"),
            "start_date": employee.get("start_date"),
            "onboarding_state": onboarding_state,
            "onboarding_progress": {
                "total": total_items,
                "completed": completed_items,
                "percentage": round(completed_items / total_items * 100, 1)
                if total_items > 0
                else 0,
            },
            "documents": documents,
            "forms": forms,
            "portal_features": [
                "document_upload",
                "form_submission",
                "training_modules",
                "policy_access",
                "leave_application",
                "profile_management",
            ],
        }
    ), 200


@bp.route("/employee/<employee_id>/forms/<form_type>", methods=["GET", "POST"])
def handle_form(employee_id, form_type):
    """Get or submit an onboarding form."""
    db = get_db()

    if request.method == "GET":
        form_resp = (
            db.table("onboarding_forms")
            .select("*")
            .eq("employee_id", employee_id)
            .eq("form_type", form_type)
            .execute()
        )
        if not form_resp.data:
            return jsonify({"error": "Form not found"}), 404
        return jsonify({"form": form_resp.data[0]}), 200

    data = request.get_json()
    now = datetime.datetime.now().isoformat()

    db.table("onboarding_forms").update(
        {
            "completed": True,
            "completed_at": now,
            "form_data": data.get("form_data", {}),
            "updated_at": now,
        }
    ).eq("employee_id", employee_id).eq("form_type", form_type).execute()

    return jsonify(
        {
            "success": True,
            "form_type": form_type,
            "completed": True,
            "completed_at": now,
        }
    ), 200


@bp.route("/employee/<employee_id>/documents/<doc_id>/submit", methods=["POST"])
def submit_document(employee_id, doc_id):
    """Submit an onboarding document."""
    db = get_db()
    now = datetime.datetime.now().isoformat()

    data = request.get_json() or {}

    db.table("onboarding_documents").update(
        {
            "submitted": True,
            "submitted_at": now,
            "file_path": data.get("file_path", ""),
            "notes": data.get("notes", ""),
        }
    ).eq("id", doc_id).eq("employee_id", employee_id).execute()

    docs_resp = (
        db.table("onboarding_documents")
        .select("*")
        .eq("employee_id", employee_id)
        .execute()
    )
    documents = docs_resp.data or []
    completed = sum(1 for d in documents if d.get("submitted"))
    total = len(documents)

    if completed == total:
        db.table("employees").update(
            {
                "status": "onboarding_complete",
                "updated_at": now,
            }
        ).eq("id", employee_id).execute()

        db.table("onboarding_states").update(
            {
                "status": "onboarding_complete",
                "onboarding_completed_at": now,
                "updated_at": now,
            }
        ).eq("employee_id", employee_id).execute()

    return jsonify(
        {
            "success": True,
            "document_id": doc_id,
            "submitted": True,
            "submitted_at": now,
            "progress": {
                "completed": completed,
                "total": total,
                "percentage": round(completed / total * 100, 1) if total > 0 else 0,
            },
        }
    ), 200


@bp.route("/pending", methods=["GET"])
def get_pending_onboardings():
    """Get all pending onboarding items for AgentixAgent monitoring and HR dashboard."""
    db = get_db()

    pending_resp = (
        db.table("onboarding_states")
        .select("*")
        .in_(
            "status",
            [
                "offer_created",
                "offer_sent",
                "offer_pending",
                "offer_accepted",
                "documents_pending",
                "forms_pending",
            ],
        )
        .order("created_at", desc=True)
        .execute()
    )

    pending = pending_resp.data or []
    now = datetime.datetime.now()

    for p in pending:
        if p.get("offer_expires_at"):
            try:
                expiry = datetime.datetime.fromisoformat(p["offer_expires_at"])
                p["days_until_expiry"] = (expiry - now).days
            except:
                p["days_until_expiry"] = None

    expiring_soon = [
        p
        for p in pending
        if p.get("days_until_expiry") is not None and p.get("days_until_expiry") <= 2
    ]
    accepted_pending = [
        p
        for p in pending
        if p.get("status") in ["offer_accepted", "documents_pending", "forms_pending"]
    ]

    return jsonify(
        {
            "pending_offers": pending,
            "expiring_soon": expiring_soon,
            "accepted_pending_onboarding": accepted_pending,
            "total_pending": len(pending),
            "summary": {
                "offer_pending": len(
                    [p for p in pending if p.get("status") == "offer_pending"]
                ),
                "offer_accepted": len(
                    [p for p in pending if p.get("status") == "offer_accepted"]
                ),
                "offer_rejected": len(
                    [p for p in pending if p.get("status") == "offer_rejected"]
                ),
                "onboarding_active": len(
                    [
                        p
                        for p in pending
                        if p.get("status") in ["documents_pending", "forms_pending"]
                    ]
                ),
            },
        }
    ), 200


@bp.route("/stats", methods=["GET"])
def get_onboarding_stats():
    """Get onboarding statistics for HR dashboard."""
    db = get_db()

    all_resp = db.table("onboarding_states").select("status").execute()
    all_states = all_resp.data or []

    stats = {
        "total": len(all_states),
        "offer_pending": len(
            [s for s in all_states if s.get("status") == "offer_pending"]
        ),
        "offer_accepted": len(
            [s for s in all_states if s.get("status") == "offer_accepted"]
        ),
        "offer_rejected": len(
            [s for s in all_states if s.get("status") == "offer_rejected"]
        ),
        "onboarding_active": len(
            [
                s
                for s in all_states
                if s.get("status")
                in ["documents_pending", "forms_pending", "training_pending"]
            ]
        ),
        "onboarding_complete": len(
            [s for s in all_states if s.get("status") == "onboarding_complete"]
        ),
    }

    return jsonify(stats), 200


@bp.route("/agents/info", methods=["GET"])
def get_agents_info():
    """Get information about all agents in the system."""
    orchestrator = get_orchestrator()
    agents = orchestrator.get_all_agents_info()

    return jsonify({"agents": agents, "total": len(agents)}), 200


@bp.route("/calculate/<calculation_type>", methods=["POST"])
def calculate_statutory(calculation_type):
    """Calculate statutory contributions using SalaryAgent with PolicyAgent cross-check."""
    data = request.get_json() or {}

    params = {
        "salary": data.get("salary", 0),
        "jurisdiction": data.get("jurisdiction", "MY"),
        "age": data.get("age", 30),
        "allowance": data.get("allowance", 0),
    }

    orchestrator = get_orchestrator()
    result = orchestrator.process_calculation(calculation_type, params)

    return jsonify(
        {
            "success": result.success,
            "calculation_type": calculation_type,
            "data": result.data,
            "cross_checks": [
                {
                    "agent": c.validator_agent,
                    "result": c.result.value,
                    "notes": c.notes,
                    "corrections": c.corrections,
                }
                for c in result.cross_checks
            ],
            "errors": result.errors,
        }
    ), 200 if result.success else 400


@bp.route("/reminders/send", methods=["POST"])
def send_reminder():
    """Trigger AgentixAgent to send a reminder."""
    data = request.get_json() or {}

    orchestrator = get_orchestrator()

    response = orchestrator.dispatch_to_agent(
        "agentix_agent",
        "send_reminder",
        {
            "employee_id": data.get("employee_id"),
            "type": data.get("type", "offer_pending"),
            "channel": data.get("channel", "email"),
            "message": data.get("message", ""),
        },
    )

    return jsonify(
        {
            "success": response.success,
            "data": response.payload if response.success else {},
            "errors": response.errors,
        }
    ), 200 if response.success else 400


@bp.route("/alerts/send", methods=["POST"])
def send_alert():
    """Trigger AgentixAgent to send an alert to HR (Telegram, Email)."""
    data = request.get_json() or {}

    orchestrator = get_orchestrator()

    response = orchestrator.dispatch_to_agent(
        "agentix_agent",
        "send_alert",
        {
            "alert_type": data.get("alert_type", "general"),
            "employee_id": data.get("employee_id"),
            "employee_name": data.get("employee_name"),
            "position": data.get("position"),
            "reason": data.get("reason"),
            "channel": data.get("channel", "telegram"),
            "priority": data.get("priority", "normal"),
        },
    )

    return jsonify(
        {
            "success": response.success,
            "data": response.payload if response.success else {},
            "errors": response.errors,
        }
    ), 200 if response.success else 400


@bp.route("/training/onboarding", methods=["POST"])
def get_onboarding_training():
    """Get onboarding training plan from TrainingAgent."""
    data = request.get_json() or {}

    orchestrator = get_orchestrator()

    response = orchestrator.dispatch_to_agent(
        "training_agent",
        "get_onboarding_training",
        {
            "department": data.get("department", ""),
            "position": data.get("position", ""),
            "start_date": data.get("start_date"),
        },
    )

    return jsonify(
        {
            "success": response.success,
            "data": response.payload if response.success else {},
            "errors": response.errors,
        }
    ), 200 if response.success else 400


@bp.route("/employee/<employee_id>/tasks", methods=["GET"])
def get_employee_tasks(employee_id):
    """Get onboarding task progress for an employee."""
    db = get_db()

    # Get employee
    emp_resp = db.table("employees").select("*").eq("id", employee_id).execute()
    if not emp_resp.data:
        return jsonify({"error": "Employee not found"}), 404

    # Get task progress from onboarding_states
    state_resp = (
        db.table("onboarding_states")
        .select("*")
        .eq("employee_id", employee_id)
        .execute()
    )

    onboarding_state = state_resp.data[0] if state_resp.data else {}

    # Build tasks list
    doc_tasks = [
        {
            "id": "doc_identity",
            "title": "Upload Identity Document",
            "status": "completed"
            if onboarding_state.get("documents_generated_at")
            else "available",
        },
        {
            "id": "doc_offer",
            "title": "Accept Offer Letter",
            "status": "completed"
            if onboarding_state.get("offer_response") == "accepted"
            else "available",
        },
        {
            "id": "doc_contract",
            "title": "Sign Employment Contract",
            "status": "available",
        },
        {
            "id": "doc_tax",
            "title": "Complete Tax Forms (EA/PCB)",
            "status": "available",
        },
        {"id": "doc_bank", "title": "Submit Bank Details", "status": "available"},
    ]

    comp_tasks = [
        {
            "id": "comp_pdpa",
            "title": "Acknowledge Data Protection Policy",
            "status": "available",
        },
        {
            "id": "comp_harassment",
            "title": "Complete Anti-Harassment Training",
            "status": "available",
        },
        {
            "id": "comp_safety",
            "title": "Health & Safety Briefing",
            "status": "available",
        },
    ]

    it_tasks = [
        {
            "id": "it_policy",
            "title": "Accept IT Acceptable Use Policy",
            "status": "available",
        },
        {
            "id": "it_2fa",
            "title": "Setup Two-Factor Authentication",
            "status": "available",
        },
        {"id": "it_email", "title": "Configure Email & Slack", "status": "available"},
    ]

    train_tasks = [
        {
            "id": "train_overview",
            "title": "Watch Company Overview Video",
            "status": "available",
        },
        {
            "id": "train_role",
            "title": "Complete Role-Specific Training",
            "status": "available",
        },
    ]

    culture_tasks = [
        {
            "id": "culture_slack",
            "title": "Join Interest Groups on Slack",
            "status": "available",
        },
        {
            "id": "culture_buddy",
            "title": "Schedule Coffee Chat with Mentor",
            "status": "available",
        },
        {
            "id": "culture_profile",
            "title": "Complete Your Profile",
            "status": "available",
        },
    ]

    return jsonify(
        {
            "employee_id": employee_id,
            "tasks": {
                "documentation": doc_tasks,
                "compliance": comp_tasks,
                "it_setup": it_tasks,
                "training": train_tasks,
                "culture": culture_tasks,
            },
        }
    ), 200


@bp.route("/employee/<employee_id>/tasks/<task_id>", methods=["POST"])
def update_employee_task(employee_id, task_id):
    """Update a specific onboarding task."""
    # Handle both JSON and FormData requests
    content_type = request.content_type or ""

    signature_data = None
    uploaded_file = None

    if "multipart/form-data" in content_type:
        # Handle FormData with signature and/or file
        data = request.form.to_dict()
        signature_data = data.get("signature")
        if "file" in request.files:
            uploaded_file = request.files["file"]
    else:
        data = request.get_json() or {}

    new_status = (
        data.get("status", "completed") if isinstance(data, dict) else "completed"
    )

    db = get_db()

    # Get employee
    emp_resp = db.table("employees").select("*").eq("id", employee_id).execute()
    if not emp_resp.data:
        return jsonify({"error": "Employee not found"}), 404

    # Map task_id to database field
    task_mapping = {
        "doc_identity": "documents_generated_at",
        "doc_offer": "offer_response",
        "doc_contract": "forms_completed_at",
        "comp_pdpa": "forms_completed_at",
        "comp_harassment": "training_assigned_at",
        "comp_safety": "training_assigned_at",
        "it_policy": "forms_completed_at",
        "it_2fa": "forms_completed_at",
        "it_email": "forms_completed_at",
        "train_overview": "training_assigned_at",
        "train_role": "training_assigned_at",
    }

    field = task_mapping.get(task_id)
    if not field:
        return jsonify({"error": "Unknown task"}), 400

    # Update onboarding state
    update_data = {}
    if new_status == "completed":
        from datetime import datetime

        update_data[field] = datetime.now().isoformat()

        # Save signature if provided
        if signature_data:
            # Store signature in documents table or onboarding state
            # For now, save as a signed document record
            doc_data = {
                "employee_id": employee_id,
                "document_type": task_id,
                "file_name": f"signature_{task_id}.png",
                "file_data": signature_data,  # Base64 encoded
                "signed_at": datetime.now().isoformat(),
                "jurisdiction": "MY",  # Default, could be determined from employee
            }
            # Check if signature already exists
            existing = (
                db.table("onboarding_documents")
                .select("id")
                .eq("employee_id", employee_id)
                .eq("document_type", task_id)
                .execute()
            )
            if existing.data:
                db.table("onboarding_documents").update(doc_data).eq(
                    "employee_id", employee_id
                ).eq("document_type", task_id).execute()
            else:
                db.table("onboarding_documents").insert(doc_data).execute()

            # Mark contract as signed
            if task_id == "doc_contract":
                update_data["contract_signed_at"] = datetime.now().isoformat()
            elif task_id == "doc_offer":
                update_data["offer_signed_at"] = datetime.now().isoformat()

    # Handle file upload
    if uploaded_file:
        from datetime import datetime
        import base64

        # Read file content
        file_content = uploaded_file.read()
        file_base64 = base64.b64encode(file_content).decode("utf-8")

        # Save to documents table
        doc_data = {
            "employee_id": employee_id,
            "document_type": task_id,
            "file_name": uploaded_file.filename,
            "file_data": file_base64,
            "uploaded_at": datetime.now().isoformat(),
            "jurisdiction": "MY",
        }

        # Check if document already exists
        existing = (
            db.table("onboarding_documents")
            .select("id")
            .eq("employee_id", employee_id)
            .eq("document_type", task_id)
            .execute()
        )
        if existing.data:
            db.table("onboarding_documents").update(doc_data).eq(
                "employee_id", employee_id
            ).eq("document_type", task_id).execute()
        else:
            db.table("onboarding_documents").insert(doc_data).execute()

    if update_data:
        db.table("onboarding_states").update(update_data).eq(
            "employee_id", employee_id
        ).execute()

    return jsonify(
        {
            "success": True,
            "task_id": task_id,
            "status": new_status,
        }
    ), 200


# ============================================
# PENDING EMPLOYEES FOR IDENTITY VERIFICATION
# ============================================


@bp.route("/pending-employees", methods=["GET"])
def get_pending_employees():
    """Get list of employees who have signed offers but haven't completed onboarding."""
    db = get_db()

    # Get onboarding states with signed offers but incomplete onboarding
    result = db.table("onboarding_states").select("*").execute()

    pending_employees = []
    for state in result.data:
        employee_id = state.get("employee_id")
        if not employee_id:
            continue

        # Get employee details
        emp_resp = db.table("employees").select("*").eq("id", employee_id).execute()
        if not emp_resp.data:
            continue

        employee = emp_resp.data[0]

        # Check if offer is signed but onboarding not complete
        offer_signed = (
            state.get("offer_signed_at") or state.get("offer_response") == "accepted"
        )
        progress = state.get("onboarding_progress", 0)

        if offer_signed and progress < 100:
            pending_employees.append(
                {
                    "employee_id": employee_id,
                    "name": employee.get("full_name", employee.get("name", "")),
                    "email": employee.get("email", ""),
                    "position": employee.get("position", ""),
                    "department": employee.get("department", ""),
                    "start_date": employee.get("start_date", ""),
                    "progress": progress,
                }
            )

    return jsonify(
        {"employees": pending_employees, "count": len(pending_employees)}
    ), 200


@bp.route("/verify-identity", methods=["POST"])
def verify_employee_identity():
    """Verify employee identity using NRIC and return onboarding access."""
    data = request.get_json() or {}
    employee_id = data.get("employee_id")
    nric = data.get("nric", "").strip()

    if not employee_id or not nric:
        return jsonify({"error": "Employee ID and NRIC are required"}), 400

    db = get_db()

    # Get employee
    emp_resp = db.table("employees").select("*").eq("id", employee_id).execute()
    if not emp_resp.data:
        return jsonify({"error": "Employee not found"}), 404

    employee = emp_resp.data[0]

    # Verify NRIC (check last 4 digits or full match)
    employee_nric = employee.get("nric", "")

    # Allow last 4 digits or full NRIC match
    nric_match = False
    if employee_nric:
        employee_nric_clean = employee_nric.replace("-", "").replace(" ", "").upper()
        nric_clean = nric.replace("-", "").replace(" ", "").upper()

        if employee_nric_clean == nric_clean:
            nric_match = True
        elif len(nric_clean) >= 4 and employee_nric_clean.endswith(nric_clean):
            nric_match = True

    if not nric_match:
        return jsonify({"error": "Invalid NRIC. Please check and try again."}), 401

    # Get onboarding state
    state_resp = (
        db.table("onboarding_states")
        .select("*")
        .eq("employee_id", employee_id)
        .execute()
    )
    onboarding_state = state_resp.data[0] if state_resp.data else {}

    # Return employee data and onboarding access
    return jsonify(
        {
            "success": True,
            "employee": {
                "id": employee.get("id"),
                "name": employee.get("full_name", employee.get("name", "")),
                "email": employee.get("email", ""),
                "position": employee.get("position", ""),
                "department": employee.get("department", ""),
                "start_date": employee.get("start_date", ""),
            },
            "onboarding_state": onboarding_state,
        }
    ), 200


# ============================================
# ENHANCED ENDPOINTS (PHASE 1.2, 1.3, 1.5)
# ============================================


@bp.route("/employee/<employee_id>/upload", methods=["POST"])
def upload_document(employee_id):
    """Handle file upload for onboarding documents."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    doc_type = request.form.get("doc_type", "identity")

    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    # Create upload directory
    upload_dir = os.path.join(
        current_app.config.get("GENERATED_DOCS_DIR", "instance/generated_docs"),
        "onboarding",
        employee_id,
    )
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    file_id = str(uuid.uuid4())
    filename = f"{doc_type}_{file_id}{ext}"
    filepath = os.path.join(upload_dir, filename)

    # Save file
    file.save(filepath)

    db = get_db()
    now = datetime.datetime.now().isoformat()

    # Save document record
    doc_id = str(uuid.uuid4())
    try:
        db.table("onboarding_documents").insert(
            {
                "id": doc_id,
                "employee_id": employee_id,
                "document_type": doc_type,
                "document_name": file.filename,
                "file_path": filepath,
                "file_name": filename,
                "file_size": os.path.getsize(filepath),
                "mime_type": file.content_type,
                "submitted": True,
                "submitted_at": now,
                "created_at": now,
            }
        ).execute()
    except Exception as e:
        # Table might not exist in Supabase, try alternative
        pass

    return jsonify(
        {
            "success": True,
            "document_id": doc_id,
            "filename": filename,
            "file_path": filepath,
            "uploaded_at": now,
        }
    ), 201


@bp.route("/employee/<employee_id>/forms/<form_type>", methods=["POST"])
def submit_onboarding_form(employee_id, form_type):
    """Submit onboarding form data (Tax, Bank Details, Personal Info)."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Form data required"}), 400

    db = get_db()
    now = datetime.datetime.now().isoformat()

    # Map form types to task completions
    form_to_task = {
        "personal_info": "doc_personal_info",
        "bank_details": "doc_bank",
        "tax_declaration": "doc_tax",
    }

    # Save form data
    form_id = str(uuid.uuid4())
    try:
        db.table("onboarding_forms").insert(
            {
                "id": form_id,
                "employee_id": employee_id,
                "form_type": form_type,
                "form_name": form_type.replace("_", " ").title(),
                "form_data": json.dumps(data),
                "completed": True,
                "completed_at": now,
                "created_at": now,
            }
        ).execute()
    except Exception as e:
        pass

    # Update employee record with form data
    employee_updates = {}
    if form_type == "personal_info":
        employee_updates = {
            "phone": data.get("phone", ""),
            "address": data.get("address", ""),
            "emergency_contact_name": data.get("emergency_contact_name", ""),
            "emergency_contact_phone": data.get("emergency_contact_phone", ""),
            "emergency_contact_relation": data.get("emergency_contact_relation", ""),
            "date_of_birth": data.get("date_of_birth", ""),
            "gender": data.get("gender", ""),
            "marital_status": data.get("marital_status", ""),
        }
    elif form_type == "bank_details":
        employee_updates = {
            "bank_name": data.get("bank_name", ""),
            "bank_account": data.get("bank_account", ""),
        }
    elif form_type == "tax_declaration":
        employee_updates = {
            "tax_id": data.get("tax_id", ""),
            "epf_no": data.get("epf_no", ""),
        }

    if employee_updates:
        employee_updates["updated_at"] = now
        try:
            db.table("employees").update(employee_updates).eq(
                "id", employee_id
            ).execute()
        except:
            pass

    # Check if all required forms completed
    return jsonify(
        {
            "success": True,
            "form_id": form_id,
            "form_type": form_type,
            "completed_at": now,
            "next_task": form_to_task.get(form_type),
        }
    ), 200


# ============================================
# ENHANCED TASK ENDPOINT (PHASE 1.5)
# ============================================


@bp.route("/employee/<employee_id>/tasks-definition", methods=["GET"])
def get_task_definitions(employee_id):
    """Get full task definitions with dependencies."""
    # These match the frontend TASK_DEPENDENCIES
    task_definitions = [
        {
            "id": "doc_identity",
            "title": "Upload Identity Document",
            "category": "documentation",
            "priority": "required",
            "estimated_minutes": 5,
            "dependencies": [],
        },
        {
            "id": "doc_personal_info",
            "title": "Complete Personal Information",
            "category": "documentation",
            "priority": "required",
            "estimated_minutes": 10,
            "dependencies": ["doc_identity"],
        },
        {
            "id": "doc_offer",
            "title": "Accept Offer Letter",
            "category": "documentation",
            "priority": "required",
            "estimated_minutes": 10,
            "dependencies": ["doc_personal_info"],
        },
        {
            "id": "doc_contract",
            "title": "Sign Employment Contract",
            "category": "documentation",
            "priority": "required",
            "estimated_minutes": 15,
            "dependencies": ["doc_personal_info"],
        },
        {
            "id": "doc_tax",
            "title": "Complete Tax Forms",
            "category": "documentation",
            "priority": "required",
            "estimated_minutes": 10,
            "dependencies": ["doc_personal_info"],
        },
        {
            "id": "doc_bank",
            "title": "Submit Bank Details",
            "category": "documentation",
            "priority": "required",
            "estimated_minutes": 5,
            "dependencies": ["doc_personal_info"],
        },
        {
            "id": "it_policy",
            "title": "Accept IT Policy",
            "category": "it_setup",
            "priority": "required",
            "estimated_minutes": 10,
            "dependencies": ["doc_contract"],
        },
        {
            "id": "it_2fa",
            "title": "Setup 2FA",
            "category": "it_setup",
            "priority": "required",
            "estimated_minutes": 10,
            "dependencies": ["it_policy"],
        },
        {
            "id": "it_email",
            "title": "Configure Email & Slack",
            "category": "it_setup",
            "priority": "required",
            "estimated_minutes": 15,
            "dependencies": ["it_2fa"],
        },
        {
            "id": "comp_harassment",
            "title": "Anti-Harassment Training",
            "category": "compliance",
            "priority": "required",
            "estimated_minutes": 30,
            "dependencies": ["doc_contract"],
        },
        {
            "id": "comp_pdpa",
            "title": "Acknowledge PDPA",
            "category": "compliance",
            "priority": "required",
            "estimated_minutes": 10,
            "dependencies": ["comp_harassment"],
        },
        {
            "id": "comp_safety",
            "title": "Health & Safety",
            "category": "compliance",
            "priority": "required",
            "estimated_minutes": 20,
            "dependencies": ["comp_pdpa"],
        },
        {
            "id": "train_overview",
            "title": "Company Overview",
            "category": "training",
            "priority": "recommended",
            "estimated_minutes": 15,
            "dependencies": ["it_email"],
        },
        {
            "id": "train_role",
            "title": "Role Training",
            "category": "training",
            "priority": "recommended",
            "estimated_minutes": 60,
            "dependencies": ["train_overview"],
        },
        {
            "id": "culture_slack",
            "title": "Join Slack Groups",
            "category": "culture",
            "priority": "optional",
            "estimated_minutes": 5,
            "dependencies": ["doc_personal_info"],
        },
        {
            "id": "culture_buddy",
            "title": "Coffee Chat with Buddy",
            "category": "culture",
            "priority": "recommended",
            "estimated_minutes": 5,
            "dependencies": ["doc_personal_info"],
        },
        {
            "id": "culture_profile",
            "title": "Complete Profile",
            "category": "culture",
            "priority": "optional",
            "estimated_minutes": 10,
            "dependencies": ["it_email"],
        },
        {
            "id": "culture_org_chart",
            "title": "Explore Org Chart",
            "category": "culture",
            "priority": "optional",
            "estimated_minutes": 10,
            "dependencies": ["doc_personal_info"],
        },
        {
            "id": "culture_team_intro",
            "title": "Meet Your Team",
            "category": "culture",
            "priority": "recommended",
            "estimated_minutes": 15,
            "dependencies": ["doc_personal_info"],
        },
    ]

    # Get current progress from database
    db = get_db()
    completed_tasks = set()

    try:
        # Try to get completed tasks from onboarding_states
        state_resp = (
            db.table("onboarding_states")
            .select("*")
            .eq("employee_id", employee_id)
            .execute()
        )
        if state_resp.data and state_resp.data[0]:
            state = state_resp.data[0]
            if state.get("offer_response") == "accepted":
                completed_tasks.add("doc_offer")
            if state.get("documents_generated_at"):
                completed_tasks.add("doc_identity")
            if state.get("forms_completed_at"):
                completed_tasks.add("doc_contract")
                completed_tasks.add("doc_personal_info")
    except:
        pass

    # Determine unlocked tasks based on dependencies
    def is_unlocked(task_id, deps):
        if not deps:
            return True
        return all(d in completed_tasks for d in deps)

    tasks_with_status = []
    for task in task_definitions:
        task_id = task["id"]
        status = (
            "completed"
            if task_id in completed_tasks
            else "available"
            if is_unlocked(task_id, task.get("dependencies", []))
            else "locked"
        )
        tasks_with_status.append({**task, "status": status})

    return jsonify(
        {
            "employee_id": employee_id,
            "tasks": tasks_with_status,
            "completed_count": len(completed_tasks),
            "total_count": len(task_definitions),
        }
    ), 200


# ============================================
# REMINDERS (PHASE 2.5)
# ============================================


@bp.route("/employee/<employee_id>/reminders", methods=["GET"])
def get_reminders(employee_id):
    """Get pending reminders for an employee."""
    db = get_db()

    # Get task definitions with due dates
    state_resp = (
        db.table("onboarding_states")
        .select("*")
        .eq("employee_id", employee_id)
        .execute()
    )

    reminders = []
    now = datetime.datetime.now()

    # Calculate pending tasks with due dates
    task_due_dates = {
        "doc_identity": 1,
        "doc_personal_info": 1,
        "doc_offer": 3,
        "doc_contract": 5,
        "doc_tax": 7,
        "doc_bank": 7,
        "it_policy": 5,
        "it_2fa": 3,
        "it_email": 3,
        "comp_harassment": 14,
        "comp_pdpa": 10,
        "comp_safety": 14,
    }

    for task_id, days in task_due_dates.items():
        due = now + datetime.timedelta(days=days)
        reminders.append(
            {
                "task_id": task_id,
                "due_in_days": days,
                "due_date": due.isoformat(),
                "overdue": days < 0,
            }
        )

    return jsonify(
        {
            "employee_id": employee_id,
            "reminders": reminders,
        }
    ), 200


@bp.route("/reminders/send", methods=["POST"])
def send_onboarding_reminder():
    """Trigger reminder for onboarding tasks."""
    data = request.get_json()
    employee_id = data.get("employee_id")
    task_id = data.get("task_id")

    if not employee_id:
        return jsonify({"error": "employee_id required"}), 400

    # Get employee details
    db = get_db()
    emp_resp = db.table("employees").select("*").eq("id", employee_id).execute()

    if not emp_resp.data:
        return jsonify({"error": "Employee not found"}), 404

    employee = emp_resp.data[0]

    # Dispatch to AgentixAgent for reminder
    try:
        orchestrator = get_orchestrator()
        result = orchestrator.dispatch_to_agent(
            "agentix_agent",
            "send_reminder",
            {
                "employee_id": employee_id,
                "employee_email": employee.get("email"),
                "task_id": task_id,
                "channel": data.get("channel", "email"),
            },
        )
        return jsonify(
            {
                "success": True,
                "sent": result.success,
                "message": f"Reminder sent to {employee.get('email')}"
                if result.success
                else "Failed to send",
            }
        ), 200
    except:
        # If agent not available, return mock success
        return jsonify(
            {
                "success": True,
                "sent": True,
                "message": f"Reminder would be sent to {employee.get('email')}",
                "note": "AgentixAgent not available",
            }
        ), 200


# ============================================
# FEEDBACK (PHASE 3.5)
# ============================================


@bp.route("/employee/<employee_id>/feedback", methods=["POST"])
def submit_feedback(employee_id):
    """Submit post-onboarding feedback."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Feedback data required"}), 400

    db = get_db()
    now = datetime.datetime.now().isoformat()

    feedback_id = str(uuid.uuid4())

    try:
        # Try to insert into feedback table
        db.table("onboarding_feedback").insert(
            {
                "id": feedback_id,
                "employee_id": employee_id,
                "rating_overall": data.get("rating_overall"),
                "rating_clarity": data.get("rating_clarity"),
                "rating_support": data.get("rating_support"),
                "rating_tools": data.get("rating_tools"),
                "would_recommend": data.get("would_recommend"),
                "feedback_text": data.get("feedback_text", ""),
                "suggestions": data.get("suggestions", ""),
                "submitted_at": now,
            }
        ).execute()
    except:
        # Table might not exist
        pass

    return jsonify(
        {
            "success": True,
            "feedback_id": feedback_id,
            "submitted_at": now,
        }
    ), 201


@bp.route("/feedback", methods=["GET"])
def get_all_feedback():
    """Get all onboarding feedback (for HR)."""
    db = get_db()

    try:
        resp = (
            db.table("onboarding_feedback")
            .select("*")
            .order("submitted_at", desc=True)
            .execute()
        )
        feedback_list = resp.data or []
    except:
        feedback_list = []

    # Calculate averages
    if feedback_list:
        avg_overall = sum(f.get("rating_overall", 0) for f in feedback_list) / len(
            feedback_list
        )
        avg_clarity = sum(f.get("rating_clarity", 0) for f in feedback_list) / len(
            feedback_list
        )
        avg_support = sum(f.get("rating_support", 0) for f in feedback_list) / len(
            feedback_list
        )
        recommend_pct = (
            sum(1 for f in feedback_list if f.get("would_recommend"))
            / len(feedback_list)
            * 100
        )
    else:
        avg_overall = avg_clarity = avg_support = recommend_pct = 0

    return jsonify(
        {
            "feedback": feedback_list,
            "stats": {
                "total": len(feedback_list),
                "avg_overall": round(avg_overall, 1),
                "avg_clarity": round(avg_clarity, 1),
                "avg_support": round(avg_support, 1),
                "would_recommend_pct": round(recommend_pct, 1),
            },
        }
    ), 200


# ============================================
# HR DASHBOARD (PHASE 3.3)
# ============================================


@bp.route("/hr/employees-progress", methods=["GET"])
def get_employees_progress():
    """Get onboarding progress for all employees (HR Dashboard)."""
    db = get_db()

    try:
        # Get all employees with onboarding status
        emp_resp = (
            db.table("employees")
            .select("*")
            .in_(
                "status",
                ["onboarding", "offer_pending", "offer_accepted", "onboarding_active"],
            )
            .execute()
        )
        employees = emp_resp.data or []
    except:
        employees = []

    progress_data = []

    for emp in employees:
        emp_id = emp.get("id")

        # Get onboarding state
        try:
            state_resp = (
                db.table("onboarding_states")
                .select("*")
                .eq("employee_id", emp_id)
                .execute()
            )
            state = state_resp.data[0] if state_resp.data else {}
        except:
            state = {}

        # Count completed tasks
        completed = 0
        total = 19  # Total onboarding tasks

        if state.get("offer_response") == "accepted":
            completed += 1
        if state.get("documents_generated_at"):
            completed += 1
        if state.get("forms_completed_at"):
            completed += 4  # Multiple form tasks
        if state.get("training_assigned_at"):
            completed += 3  # Training tasks
        if state.get("onboarding_completed_at"):
            completed = total

        progress = round(completed / total * 100, 1)

        # Determine status
        status = emp.get("status", "unknown")
        if state.get("onboarding_completed_at"):
            status = "completed"

        progress_data.append(
            {
                "employee_id": emp_id,
                "name": emp.get("full_name", ""),
                "email": emp.get("email", ""),
                "department": emp.get("department", ""),
                "position": emp.get("position", ""),
                "start_date": emp.get("start_date", ""),
                "status": status,
                "completed_tasks": completed,
                "total_tasks": total,
                "progress_percentage": progress,
                "days_onboarding": (
                    datetime.datetime.now()
                    - datetime.datetime.fromisoformat(
                        emp.get("created_at", datetime.datetime.now().isoformat())
                    )
                ).days
                if emp.get("created_at")
                else 0,
            }
        )

    # Sort by progress (lowest first = needs attention)
    progress_data.sort(key=lambda x: x["progress_percentage"])

    return jsonify(
        {
            "employees": progress_data,
            "summary": {
                "total": len(progress_data),
                "completed": len(
                    [p for p in progress_data if p["status"] == "completed"]
                ),
                "in_progress": len(
                    [
                        p
                        for p in progress_data
                        if p["status"] in ["onboarding_active", "offer_accepted"]
                    ]
                ),
                "not_started": len(
                    [
                        p
                        for p in progress_data
                        if p["status"] in ["offer_pending", "onboarding"]
                    ]
                ),
                "avg_progress": round(
                    sum(p["progress_percentage"] for p in progress_data)
                    / len(progress_data),
                    1,
                )
                if progress_data
                else 0,
            },
        }
    ), 200


# ============================================
# BADGES (PHASE 3.2)
# ============================================


@bp.route("/employee/<employee_id>/badges", methods=["GET"])
def get_badges(employee_id):
    """Get earned badges for an employee."""
    db = get_db()

    try:
        resp = (
            db.table("onboarding_badges")
            .select("*")
            .eq("employee_id", employee_id)
            .execute()
        )
        badges = resp.data or []
    except:
        badges = []

    return jsonify(
        {
            "employee_id": employee_id,
            "badges": badges,
        }
    ), 200


@bp.route("/employee/<employee_id>/badges", methods=["POST"])
def award_badge(employee_id):
    """Award a badge to an employee."""
    data = request.get_json()
    badge_type = data.get("badge_type")

    if not badge_type:
        return jsonify({"error": "badge_type required"}), 400

    db = get_db()
    now = datetime.datetime.now().isoformat()

    badge_names = {
        "first_task": {
            "name": "First Step",
            "description": "Completed your first onboarding task",
        },
        "half_way": {"name": "Halfway There", "description": "Reached 50% completion"},
        "completed": {
            "name": "Onboarding Complete",
            "description": "Finished all onboarding tasks",
        },
        "speed_demon": {
            "name": "Speed Demon",
            "description": "Completed onboarding ahead of schedule",
        },
        "documentation_master": {
            "name": "Documentation Master",
            "description": "Completed all documentation tasks",
        },
        "culture_hero": {
            "name": "Culture Hero",
            "description": "Fully engaged with culture tasks",
        },
    }

    badge_info = badge_names.get(badge_type, {"name": badge_type, "description": ""})

    badge_id = str(uuid.uuid4())

    try:
        db.table("onboarding_badges").insert(
            {
                "id": badge_id,
                "employee_id": employee_id,
                "badge_type": badge_type,
                "badge_name": badge_info["name"],
                "badge_description": badge_info["description"],
                "earned_at": now,
            }
        ).execute()
    except:
        pass

    return jsonify(
        {
            "success": True,
            "badge_id": badge_id,
            "badge": badge_info,
        }
    ), 201
