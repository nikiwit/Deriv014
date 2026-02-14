"""
Multi-Agent Onboarding API Routes

Handles the multi-agent onboarding workflow:
- HR creates new employee offer (temporary stored)
- Employee accepts/rejects offer
- Acceptance triggers document automation via OnboardingAgent
- Rejection triggers Telegram notification via AgentixAgent
- Cross-check validation between agents
"""

import uuid
import datetime
from flask import Blueprint, current_app, jsonify, request

from app.database import get_db
from app.agents import MultiAgentOrchestrator, get_orchestrator, WorkflowType

bp = Blueprint(
    "multiagent_onboarding", __name__, url_prefix="/api/multiagent/onboarding"
)


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

    Request Body:
    {
        "employee_data": {
            "full_name": "John Doe",
            "email": "john@example.com",
            "phone": "+60123456789",
            "nric": "910101-14-1234",
            "jurisdiction": "MY"
        },
        "offer_details": {
            "position": "Software Engineer",
            "department": "Engineering",
            "salary": 5000,
            "start_date": "2024-03-01",
            "probation_months": 3,
            "expiry_days": 7
        }
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    employee_data = data.get("employee_data", {})
    offer_details = data.get("offer_details", {})

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
    employee_id = offer_data.get("employee_id")
    offer_id = offer_data.get("offer_id")

    db = get_db()

    try:
        db.table("onboarding_states").insert(
            {
                "id": str(uuid.uuid4()),
                "employee_id": employee_id,
                "offer_id": offer_id,
                "status": "offer_pending",
                "employee_name": employee_data.get("full_name"),
                "email": employee_data.get("email"),
                "position": offer_details.get("position"),
                "department": offer_details.get("department"),
                "salary": offer_details.get("salary"),
                "jurisdiction": employee_data.get("jurisdiction", "MY"),
                "offer_sent_at": datetime.datetime.now().isoformat(),
                "offer_expires_at": offer_data.get("expires_at"),
                "created_at": datetime.datetime.now().isoformat(),
            }
        ).execute()

        db.table("employees").insert(
            {
                "id": employee_id,
                "email": employee_data.get("email"),
                "full_name": employee_data.get("full_name"),
                "nric": employee_data.get("nric"),
                "jurisdiction": employee_data.get("jurisdiction", "MY"),
                "position": offer_details.get("position"),
                "department": offer_details.get("department"),
                "start_date": offer_details.get("start_date"),
                "phone": employee_data.get("phone"),
                "status": "offer_pending",
            }
        ).execute()

    except Exception as e:
        current_app.logger.error(f"Database error: {e}")
        return jsonify({"error": str(e)}), 500

    return jsonify(
        {
            "success": True,
            "offer_id": offer_id,
            "employee_id": employee_id,
            "status": "offer_pending",
            "portal_url": f"/employee/offer/{offer_id}",
            "expires_at": offer_data.get("expires_at"),
            "cross_checks": [
                {"agent": c.validator_agent, "result": c.result.value, "notes": c.notes}
                for c in result.cross_checks
            ],
            "agents_involved": result.agents_involved,
        }
    ), 201


@bp.route("/offer/<offer_id>/respond", methods=["POST"])
def respond_to_offer(offer_id):
    """
    Employee accepts or rejects an offer.

    On ACCEPT:
    - OnboardingAgent updates status
    - Generates all documents (contract, policies, forms)
    - TrainingAgent assigns onboarding training
    - AgentixAgent sets up reminders
    - Creates employee portal access

    On REJECT:
    - AgentixAgent sends Telegram alert to HR
    - Creates follow-up task for HR manager
    - Archives candidate data

    Request Body:
    {
        "response": "accepted",  // or "rejected"
        "reason": "Optional rejection reason",
        "signature": "base64_signature_data"
    }
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

    orchestrator = get_orchestrator()

    if response_type == "accepted":
        result = orchestrator.process_offer_acceptance(offer_id, employee_id, signature)

        if result.success:
            db.table("onboarding_states").update(
                {
                    "status": "offer_accepted",
                    "accepted_at": datetime.datetime.now().isoformat(),
                    "offer_response": "accepted",
                }
            ).eq("offer_id", offer_id).execute()

            db.table("employees").update({"status": "onboarding_active"}).eq(
                "id", employee_id
            ).execute()

            return jsonify(
                {
                    "success": True,
                    "status": "accepted",
                    "employee_id": employee_id,
                    "portal_url": f"/employee/portal/{employee_id}",
                    "onboarding_checklist": f"/employee/portal/{employee_id}/checklist",
                    "documents_generated": result.data.get("documents", {}).get(
                        "documents", []
                    ),
                    "training_assigned": result.data.get("training", {}),
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

    else:  # rejected
        result = orchestrator.process_offer_rejection(offer_id, employee_id, reason)

        db.table("onboarding_states").update(
            {
                "status": "offer_rejected",
                "rejected_at": datetime.datetime.now().isoformat(),
                "offer_response": "rejected",
                "rejection_reason": reason,
                "hr_notified_at": datetime.datetime.now().isoformat(),
            }
        ).eq("offer_id", offer_id).execute()

        db.table("employees").update({"status": "offer_rejected"}).eq(
            "id", employee_id
        ).execute()

        return jsonify(
            {
                "success": True,
                "status": "rejected",
                "employee_id": employee_id,
                "hr_notified": True,
                "notification_channel": "telegram",
                "message": "HR has been notified of your decision. Thank you for your interest.",
                "agents_involved": result.agents_involved,
            }
        ), 200


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

    return jsonify(
        {
            "offer_id": offer_id,
            "employee_name": offer.get("employee_name"),
            "position": offer.get("position"),
            "department": offer.get("department"),
            "salary": offer.get("salary"),
            "jurisdiction": offer.get("jurisdiction"),
            "expires_at": offer.get("offer_expires_at"),
            "status": offer.get("status"),
            "company_info": {
                "name": "Deriv Solutions",
                "address": "Cyberjaya, Malaysia"
                if offer.get("jurisdiction") == "MY"
                else "Singapore",
                "website": "https://deriv.com",
            },
        }
    ), 200


@bp.route("/employee/<employee_id>/portal", methods=["GET"])
def get_employee_portal(employee_id):
    """Get employee portal data for onboarding."""
    db = get_db()

    emp_resp = db.table("employees").select("*").eq("id", employee_id).execute()
    if not emp_resp.data:
        return jsonify({"error": "Employee not found"}), 404

    employee = emp_resp.data[0]

    docs_resp = (
        db.table("onboarding_documents")
        .select("id, document_name, required, submitted, submitted_at")
        .eq("employee_id", employee_id)
        .execute()
    )

    documents = docs_resp.data or []
    total = len(documents)
    submitted = sum(1 for d in documents if d.get("submitted"))

    return jsonify(
        {
            "employee_id": employee_id,
            "employee_name": employee.get("full_name"),
            "email": employee.get("email"),
            "position": employee.get("position"),
            "department": employee.get("department"),
            "status": employee.get("status"),
            "onboarding_progress": {
                "total": total,
                "submitted": submitted,
                "percentage": round(submitted / total * 100) if total > 0 else 0,
            },
            "documents": documents,
        }
    ), 200


@bp.route("/pending", methods=["GET"])
def get_pending_onboardings():
    """Get all pending onboarding items for AgentixAgent monitoring."""
    db = get_db()

    pending_resp = (
        db.table("onboarding_states")
        .select("*")
        .in_(
            "status", ["offer_created", "offer_sent", "offer_pending", "offer_accepted"]
        )
        .execute()
    )

    pending = pending_resp.data or []

    expiring_soon = [
        p
        for p in pending
        if p.get("offer_expires_at")
        and (
            datetime.datetime.fromisoformat(p["offer_expires_at"])
            - datetime.datetime.now()
        ).days
        <= 2
    ]

    return jsonify(
        {
            "pending_offers": pending,
            "expiring_soon": expiring_soon,
            "total_pending": len(pending),
        }
    ), 200


@bp.route("/agents/info", methods=["GET"])
def get_agents_info():
    """Get information about all agents in the system."""
    orchestrator = get_orchestrator()
    agents = orchestrator.get_all_agents_info()

    return jsonify({"agents": agents, "total": len(agents)}), 200


@bp.route("/calculate/<calculation_type>", methods=["POST"])
def calculate_statutory(calculation_type):
    """
    Calculate statutory contributions using SalaryAgent with PolicyAgent cross-check.

    Types: epf, socso, cpf, eis, overtime, pcb, payroll
    """
    data = request.get_json()

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
    data = request.get_json()

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
            "data": response.data if response.success else {},
            "errors": response.errors,
        }
    ), 200 if response.success else 400


@bp.route("/alerts/send", methods=["POST"])
def send_alert():
    """Trigger AgentixAgent to send an alert to HR (Telegram, Email)."""
    data = request.get_json()

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
            "data": response.data if response.success else {},
            "errors": response.errors,
        }
    ), 200 if response.success else 400


@bp.route("/training/onboarding", methods=["POST"])
def get_onboarding_training():
    """Get onboarding training plan from TrainingAgent."""
    data = request.get_json()

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
            "data": response.data if response.success else {},
            "errors": response.errors,
        }
    ), 200 if response.success else 400


@bp.route("/policy/verify", methods=["POST"])
def verify_policy_compliance():
    """Verify compliance using PolicyAgent."""
    data = request.get_json()

    orchestrator = get_orchestrator()

    response = orchestrator.dispatch_to_agent(
        "policy_agent",
        "verify_compliance",
        {
            "action_type": data.get("action_type", ""),
            "employee_data": data.get("employee_data", {}),
        },
    )

    return jsonify(
        {
            "success": response.success,
            "data": response.data if response.success else {},
            "errors": response.errors,
        }
    ), 200 if response.success else 400
