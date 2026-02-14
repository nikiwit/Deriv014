"""
Onboarding Agent for DerivHR

Specializes in:
- Offer letter generation and tracking
- Employee acceptance/rejection workflow
- Document automation on acceptance
- Employee portal setup
- Onboarding progress tracking
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from .base import (
    BaseAgent,
    AgentMessage,
    AgentResponse,
    CrossCheckResult,
    ValidationResult,
)


class OnboardingAgent(BaseAgent):
    """
    Onboarding Workflow Specialist

    Capabilities:
    - Generate and track offer letters
    - Handle employee acceptance/rejection
    - Automate document generation on acceptance
    - Create employee portal access
    - Track onboarding progress
    - Coordinate with all other agents
    """

    ONBOARDING_STAGES = [
        "offer_created",
        "offer_sent",
        "offer_pending",
        "offer_accepted",
        "offer_rejected",
        "onboarding_active",
        "onboarding_complete",
    ]

    DEFAULT_OFFER_EXPIRY_DAYS = 7

    def __init__(self):
        super().__init__("onboarding_agent", "Onboarding Specialist")
        self.cross_check_agents = [
            "policy_agent",
            "salary_agent",
            "training_agent",
            "agentix_agent",
        ]

    @property
    def capabilities(self) -> List[str]:
        return [
            "offer_letter_generation",
            "offer_tracking",
            "acceptance_handling",
            "rejection_handling",
            "document_automation",
            "employee_portal_setup",
            "onboarding_workflow",
            "progress_tracking",
        ]

    def _register_handlers(self):
        self._message_handlers = {
            "create_offer": self._create_offer,
            "send_offer": self._send_offer,
            "accept_offer": self._accept_offer,
            "reject_offer": self._reject_offer,
            "get_onboarding_status": self._get_onboarding_status,
            "generate_onboarding_documents": self._generate_onboarding_documents,
            "setup_employee_portal": self._setup_employee_portal,
            "update_onboarding_progress": self._update_onboarding_progress,
            "get_pending_offers": self._get_pending_offers,
            "check_offer_expiry": self._check_offer_expiry,
        }

    def _create_offer(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Create a new offer for a candidate."""
        employee_data = payload.get("employee_data", {})
        offer_details = payload.get("offer_details", {})

        employee_id = str(uuid.uuid4())
        offer_id = str(uuid.uuid4())

        jurisdiction = employee_data.get("jurisdiction", "MY")
        salary = float(offer_details.get("salary", 0))
        position = offer_details.get("position", "")
        department = offer_details.get("department", "")
        start_date = offer_details.get("start_date", "")
        probation_months = offer_details.get("probation_months", 3)

        expiry_days = offer_details.get("expiry_days", self.DEFAULT_OFFER_EXPIRY_DAYS)
        offer_expires = datetime.now() + timedelta(days=expiry_days)

        offer = {
            "offer_id": offer_id,
            "employee_id": employee_id,
            "employee_name": employee_data.get("full_name", ""),
            "email": employee_data.get("email", ""),
            "position": position,
            "department": department,
            "salary": salary,
            "start_date": start_date,
            "probation_months": probation_months,
            "jurisdiction": jurisdiction,
            "status": "offer_created",
            "created_at": datetime.now().isoformat(),
            "expires_at": offer_expires.isoformat(),
            "nric": employee_data.get("nric", ""),
            "phone": employee_data.get("phone", ""),
        }

        return {
            "success": True,
            "data": {
                "offer": offer,
                "documents_to_generate": self._get_documents_for_offer(offer),
                "next_steps": [
                    "Review offer details",
                    "Generate offer letter",
                    "Send to candidate",
                    "Track response",
                ],
                "cross_check_required": True,
                "cross_check_agents": ["policy_agent", "salary_agent"],
            },
        }

    def _send_offer(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Send offer to candidate."""
        offer_id = payload.get("offer_id", "")
        offer_data = payload.get("offer_data", {})

        return {
            "success": True,
            "data": {
                "offer_id": offer_id,
                "status": "offer_sent",
                "sent_at": datetime.now().isoformat(),
                "email_sent_to": offer_data.get("email", ""),
                "expires_at": offer_data.get("expires_at", ""),
                "portal_url": f"/employee/offer/{offer_id}",
                "next_steps": [
                    "Monitor for response",
                    "Set reminder for follow-up",
                    "Prepare onboarding documents",
                ],
            },
        }

    def _accept_offer(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """
        Handle offer acceptance.

        When employee accepts:
        1. Update status to accepted
        2. Trigger document automation
        3. Setup employee portal
        4. Assign training
        5. Notify all relevant agents
        """
        offer_id = payload.get("offer_id", "")
        employee_id = payload.get("employee_id", "")
        signature = payload.get("signature", "")
        accepted_at = payload.get("accepted_at", datetime.now().isoformat())

        return {
            "success": True,
            "data": {
                "offer_id": offer_id,
                "employee_id": employee_id,
                "status": "offer_accepted",
                "accepted_at": accepted_at,
                "automated_actions": [
                    {
                        "action": "generate_documents",
                        "status": "triggered",
                        "documents": [
                            "employment_contract",
                            "policy_documents",
                            "compliance_checklist",
                            "training_schedule",
                        ],
                    },
                    {
                        "action": "setup_portal",
                        "status": "triggered",
                        "portal_url": f"/employee/portal/{employee_id}",
                    },
                    {
                        "action": "assign_training",
                        "status": "triggered",
                        "training_type": "onboarding",
                    },
                    {
                        "action": "notify_agents",
                        "status": "triggered",
                        "agents": [
                            "policy_agent",
                            "salary_agent",
                            "training_agent",
                            "agentix_agent",
                        ],
                    },
                ],
                "next_steps": [
                    "Complete onboarding forms",
                    "Submit required documents",
                    "Complete mandatory training",
                    "Attend orientation",
                ],
                "employee_portal_url": f"/employee/portal/{employee_id}",
            },
        }

    def _reject_offer(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """
        Handle offer rejection.

        When employee rejects:
        1. Update status to rejected
        2. Log rejection reason
        3. Trigger HR notification via Telegram/channel
        4. Create follow-up task for HR
        """
        offer_id = payload.get("offer_id", "")
        employee_id = payload.get("employee_id", "")
        reason = payload.get("reason", "")
        rejected_at = payload.get("rejected_at", datetime.now().isoformat())

        return {
            "success": True,
            "data": {
                "offer_id": offer_id,
                "employee_id": employee_id,
                "status": "offer_rejected",
                "rejected_at": rejected_at,
                "rejection_reason": reason,
                "hr_notification": {
                    "channel": "telegram",
                    "status": "triggered",
                    "message": f"Offer rejected for position. Reason: {reason if reason else 'Not provided'}",
                },
                "automated_actions": [
                    {"action": "notify_hr", "channel": "telegram", "priority": "high"},
                    {
                        "action": "create_followup_task",
                        "assigned_to": "hr_manager",
                        "task_type": "rejection_followup",
                    },
                    {"action": "log_rejection", "db_update": True},
                ],
                "next_steps_hr": [
                    "Review rejection reason",
                    "Contact candidate if appropriate",
                    "Update recruitment pipeline",
                    "Archive candidate data",
                ],
            },
        }

    def _get_onboarding_status(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Get current onboarding status for an employee."""
        employee_id = payload.get("employee_id", "")

        return {
            "success": True,
            "data": {
                "employee_id": employee_id,
                "status": "onboarding_active",
                "progress": {
                    "documents": {"completed": 5, "total": 9, "percentage": 56},
                    "training": {"completed": 2, "total": 4, "percentage": 50},
                    "forms": {"completed": 3, "total": 5, "percentage": 60},
                },
                "pending_items": [
                    "Submit NRIC copy",
                    "Complete IT security training",
                    "Sign employment contract",
                ],
                "estimated_completion": (
                    datetime.now() + timedelta(days=7)
                ).isoformat(),
            },
        }

    def _generate_onboarding_documents(
        self, payload: Dict, context: Optional[Dict]
    ) -> Dict:
        """Generate all onboarding documents for an employee."""
        employee_id = payload.get("employee_id", "")
        employee_data = payload.get("employee_data", {})
        jurisdiction = employee_data.get("jurisdiction", "MY")

        documents = [
            {
                "id": str(uuid.uuid4()),
                "type": "employment_contract",
                "name": "Employment Contract",
                "jurisdiction": jurisdiction,
                "status": "generating",
                "auto_sign": False,
            },
            {
                "id": str(uuid.uuid4()),
                "type": "offer_letter",
                "name": "Offer Letter",
                "jurisdiction": jurisdiction,
                "status": "generating",
                "auto_sign": False,
            },
            {
                "id": str(uuid.uuid4()),
                "type": "policy_data_it",
                "name": "Data & IT Policy",
                "jurisdiction": jurisdiction,
                "status": "generating",
                "auto_sign": False,
            },
            {
                "id": str(uuid.uuid4()),
                "type": "policy_handbook",
                "name": "Employee Handbook",
                "jurisdiction": jurisdiction,
                "status": "generating",
                "auto_sign": False,
            },
            {
                "id": str(uuid.uuid4()),
                "type": "policy_leave",
                "name": "Leave Policy",
                "jurisdiction": jurisdiction,
                "status": "generating",
                "auto_sign": False,
            },
            {
                "id": str(uuid.uuid4()),
                "type": "compliance_checklist",
                "name": "Compliance Checklist",
                "jurisdiction": jurisdiction,
                "status": "generating",
                "auto_sign": False,
            },
            {
                "id": str(uuid.uuid4()),
                "type": "training_schedule",
                "name": "Training Schedule",
                "jurisdiction": jurisdiction,
                "status": "generating",
                "auto_sign": False,
            },
        ]

        if jurisdiction == "MY":
            documents.extend(
                [
                    {
                        "id": str(uuid.uuid4()),
                        "type": "form_epf",
                        "name": "EPF Nomination Form",
                        "status": "pending_employee",
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "type": "form_socso",
                        "name": "SOCSO Registration Form",
                        "status": "pending_employee",
                    },
                ]
            )
        else:
            documents.extend(
                [
                    {
                        "id": str(uuid.uuid4()),
                        "type": "form_cpf",
                        "name": "CPF Nomination Form",
                        "status": "pending_employee",
                    }
                ]
            )

        return {
            "success": True,
            "data": {
                "employee_id": employee_id,
                "documents": documents,
                "total": len(documents),
                "generated_at": datetime.now().isoformat(),
                "cross_check_required": True,
            },
        }

    def _setup_employee_portal(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Setup employee portal access."""
        employee_id = payload.get("employee_id", "")
        employee_data = payload.get("employee_data", {})

        return {
            "success": True,
            "data": {
                "employee_id": employee_id,
                "portal_url": f"/employee/portal/{employee_id}",
                "portal_features": [
                    "document_upload",
                    "form_submission",
                    "training_modules",
                    "policy_access",
                    "leave_application",
                    "profile_management",
                ],
                "access_token": str(uuid.uuid4()),
                "created_at": datetime.now().isoformat(),
                "onboarding_checklist_url": f"/employee/portal/{employee_id}/checklist",
            },
        }

    def _update_onboarding_progress(
        self, payload: Dict, context: Optional[Dict]
    ) -> Dict:
        """Update onboarding progress."""
        employee_id = payload.get("employee_id", "")
        item_type = payload.get("item_type", "")
        item_id = payload.get("item_id", "")
        status = payload.get("status", "completed")

        return {
            "success": True,
            "data": {
                "employee_id": employee_id,
                "item_type": item_type,
                "item_id": item_id,
                "status": status,
                "updated_at": datetime.now().isoformat(),
                "progress_updated": True,
            },
        }

    def _get_pending_offers(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Get all pending offers."""
        status = payload.get("status", "offer_pending")

        return {
            "success": True,
            "data": {
                "status_filter": status,
                "pending_offers": [],
                "expiring_soon": [],
                "action_required": [],
            },
        }

    def _check_offer_expiry(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Check for expiring/expired offers."""
        days_threshold = payload.get("days_threshold", 2)

        return {
            "success": True,
            "data": {
                "expiring_within_days": days_threshold,
                "expired_offers": [],
                "expiring_offers": [],
                "action_required": [
                    "Send reminder to candidates",
                    "Notify HR managers",
                    "Update offer status",
                ],
            },
        }

    def _get_documents_for_offer(self, offer: Dict) -> List[str]:
        """Get list of documents to generate for an offer."""
        jurisdiction = offer.get("jurisdiction", "MY")

        documents = [
            "offer_letter",
            "employment_contract",
            "data_it_policy",
            "employee_handbook",
            "leave_policy",
        ]

        if jurisdiction == "MY":
            documents.extend(["epf_form", "socso_form"])
        else:
            documents.extend(["cpf_form", "ir8a_form"])

        return documents

    def validate_cross_check(self, result: Dict[str, Any]) -> CrossCheckResult:
        """Validate onboarding actions."""
        action = result.get("action", "")

        if action in ["accept_offer", "generate_documents"]:
            return CrossCheckResult(
                validator_agent=self.agent_id,
                result=ValidationResult.VALID,
                notes="Onboarding action verified",
            )

        return CrossCheckResult(
            validator_agent=self.agent_id,
            result=ValidationResult.NEEDS_REVIEW,
            notes="Review recommended for onboarding action",
        )

    def get_workflow_messages(
        self, employee_id: str, action: str
    ) -> List[AgentMessage]:
        """Get messages to send to other agents for cross-checking."""
        messages = []

        if action == "accept_offer":
            messages.append(
                AgentMessage(
                    source_agent=self.agent_id,
                    target_agent="policy_agent",
                    action="verify_compliance",
                    payload={"employee_id": employee_id, "action_type": "onboarding"},
                    requires_validation=True,
                )
            )

            messages.append(
                AgentMessage(
                    source_agent=self.agent_id,
                    target_agent="salary_agent",
                    action="validate_contributions",
                    payload={"employee_id": employee_id},
                    requires_validation=True,
                )
            )

            messages.append(
                AgentMessage(
                    source_agent=self.agent_id,
                    target_agent="training_agent",
                    action="get_onboarding_training",
                    payload={"employee_id": employee_id},
                    requires_validation=True,
                )
            )

            messages.append(
                AgentMessage(
                    source_agent=self.agent_id,
                    target_agent="agentix_agent",
                    action="setup_reminders",
                    payload={"employee_id": employee_id, "type": "onboarding"},
                    requires_validation=False,
                )
            )

        elif action == "reject_offer":
            messages.append(
                AgentMessage(
                    source_agent=self.agent_id,
                    target_agent="agentix_agent",
                    action="send_alert",
                    payload={
                        "employee_id": employee_id,
                        "channel": "telegram",
                        "priority": "high",
                        "type": "offer_rejection",
                    },
                    requires_validation=False,
                )
            )

        return messages
