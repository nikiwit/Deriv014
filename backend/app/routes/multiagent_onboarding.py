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
from flask import Blueprint, current_app, jsonify, request, send_file

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
    data = request.get_json() or {}
    new_status = data.get("status", "completed")

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
