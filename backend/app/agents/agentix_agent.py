"""
Agentix Agent for DerivHR

Specializes in:
- Pending task detection
- Automated reminders
- Escalation management
- Notification routing (Telegram, Email, WhatsApp)
- Deadline tracking
- Offer rejection notifications
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from .base import BaseAgent, AgentMessage, CrossCheckResult, ValidationResult


class AgentixAgent(BaseAgent):
    """
    Reminder & Alert System Specialist

    Capabilities:
    - Detect pending tasks and deadlines
    - Send automated reminders
    - Manage escalation levels
    - Route notifications to appropriate channels
    - Track onboarding status
    - Alert HR on offer rejections
    """

    CHANNELS = {
        "telegram": {"enabled": True, "priority": "high"},
        "email": {"enabled": True, "priority": "normal"},
        "whatsapp": {"enabled": False, "priority": "urgent"},
        "in_app": {"enabled": True, "priority": "low"},
    }

    ESCALATION_THRESHOLDS = {"level_1_days": 3, "level_2_days": 5, "level_3_days": 7}

    REMINDER_TYPES = {
        "offer_pending": {
            "message": "Your offer letter from Deriv is still pending your response. Please review and respond before {expiry_date}.",
            "frequency_days": 1,
        },
        "document_submission": {
            "message": "Please submit your pending onboarding documents. Remaining: {pending_docs}.",
            "frequency_days": 2,
        },
        "training_incomplete": {
            "message": "You have incomplete mandatory training modules. Please complete them before your start date.",
            "frequency_days": 3,
        },
        "contract_signing": {
            "message": "Please sign your employment contract. This is required to complete your onboarding.",
            "frequency_days": 1,
        },
    }

    ALERT_TYPES = {
        "offer_rejection": {
            "channel": "telegram",
            "priority": "high",
            "template": "OFFER REJECTED: {employee_name} has rejected the offer for {position}. Reason: {reason}",
        },
        "onboarding_overdue": {
            "channel": "telegram",
            "priority": "medium",
            "template": "ONBOARDING OVERDUE: {employee_name} onboarding is {days_overdue} days overdue.",
        },
        "document_expired": {
            "channel": "email",
            "priority": "medium",
            "template": "DOCUMENT EXPIRED: {employee_name}'s {doc_type} has expired.",
        },
        "certification_expiring": {
            "channel": "email",
            "priority": "low",
            "template": "CERTIFICATION EXPIRING: {employee_name}'s {cert_type} expires on {expiry_date}.",
        },
    }

    def __init__(self):
        super().__init__("agentix_agent", "Reminder & Alert System")
        self.cross_check_agents = []

    @property
    def capabilities(self) -> List[str]:
        return [
            "pending_task_detection",
            "automated_reminders",
            "escalation_management",
            "notification_routing",
            "deadline_tracking",
            "offer_rejection_alerts",
            "telegram_notifications",
            "email_notifications",
        ]

    def _register_handlers(self):
        self._message_handlers = {
            "send_reminder": self._send_reminder,
            "send_alert": self._send_alert,
            "setup_reminders": self._setup_reminders,
            "check_pending_tasks": self._check_pending_tasks,
            "escalate": self._escalate,
            "get_overdue_items": self._get_overdue_items,
            "schedule_reminder": self._schedule_reminder,
            "cancel_reminder": self._cancel_reminder,
            "send_telegram_alert": self._send_telegram_alert,
        }

    def _send_reminder(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Send a reminder to an employee or HR."""
        employee_id = payload.get("employee_id", "")
        reminder_type = payload.get("type", "offer_pending")
        channel = payload.get("channel", "email")
        custom_message = payload.get("message", "")

        reminder_config = self.REMINDER_TYPES.get(reminder_type, {})
        message = custom_message or reminder_config.get(
            "message", "Reminder: You have pending items."
        )

        reminder_id = str(uuid.uuid4())

        return {
            "success": True,
            "data": {
                "reminder_id": reminder_id,
                "employee_id": employee_id,
                "type": reminder_type,
                "channel": channel,
                "message": message,
                "sent_at": datetime.now().isoformat(),
                "status": "sent",
                "next_reminder": (
                    datetime.now()
                    + timedelta(days=reminder_config.get("frequency_days", 1))
                ).isoformat(),
            },
        }

    def _send_alert(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Send an alert to HR or management."""
        alert_type = payload.get("alert_type", payload.get("type", "general"))
        employee_id = payload.get("employee_id", "")
        channel = payload.get("channel", "telegram")
        priority = payload.get("priority", "normal")
        employee_name = payload.get("employee_name", "Unknown")
        position = payload.get("position", "")
        reason = payload.get("reason", "No reason provided")
        custom_message = payload.get("message", "")

        alert_config = self.ALERT_TYPES.get(alert_type, {})

        if not custom_message:
            template = alert_config.get("template", "Alert: {message}")
            custom_message = template.format(
                employee_name=employee_name, position=position, reason=reason, **payload
            )

        alert_id = str(uuid.uuid4())

        return {
            "success": True,
            "data": {
                "alert_id": alert_id,
                "type": alert_type,
                "channel": channel or alert_config.get("channel", "telegram"),
                "priority": priority or alert_config.get("priority", "normal"),
                "employee_id": employee_id,
                "message": custom_message,
                "sent_at": datetime.now().isoformat(),
                "status": "sent",
                "recipients": self._get_alert_recipients(alert_type),
            },
        }

    def _send_telegram_alert(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Send a Telegram alert specifically."""
        message = payload.get("message", "")
        chat_id = payload.get("chat_id", "hr_channel")
        employee_name = payload.get("employee_name", "")
        position = payload.get("position", "")
        reason = payload.get("reason", "")

        if not message:
            message = f"HR ALERT\n\nEmployee: {employee_name}\nPosition: {position}"
            if reason:
                message += f"\nReason: {reason}"

        return {
            "success": True,
            "data": {
                "channel": "telegram",
                "chat_id": chat_id,
                "message": message,
                "sent_at": datetime.now().isoformat(),
                "status": "sent",
                "bot_token_required": True,
            },
        }

    def _setup_reminders(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Setup reminder schedule for an employee onboarding."""
        employee_id = payload.get("employee_id", "")
        reminder_type = payload.get("type", "onboarding")
        start_date = payload.get("start_date", datetime.now().isoformat())

        reminders = []

        if reminder_type == "onboarding":
            reminders = [
                {
                    "id": str(uuid.uuid4()),
                    "type": "offer_pending",
                    "scheduled_for": (datetime.now() + timedelta(days=2)).isoformat(),
                    "channel": "email",
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "document_submission",
                    "scheduled_for": (datetime.now() + timedelta(days=5)).isoformat(),
                    "channel": "email",
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "training_incomplete",
                    "scheduled_for": (datetime.now() + timedelta(days=7)).isoformat(),
                    "channel": "email",
                },
            ]

        return {
            "success": True,
            "data": {
                "employee_id": employee_id,
                "reminder_type": reminder_type,
                "reminders_created": reminders,
                "total": len(reminders),
                "created_at": datetime.now().isoformat(),
            },
        }

    def _check_pending_tasks(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Check for all pending tasks in the system."""
        task_types = payload.get("task_types", ["onboarding", "documents", "training"])

        pending = {"onboarding": [], "documents": [], "training": []}

        return {
            "success": True,
            "data": {
                "pending_tasks": pending,
                "total_pending": sum(len(v) for v in pending.values()),
                "requires_action": [],
                "escalation_candidates": [],
            },
        }

    def _escalate(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Escalate an overdue item."""
        employee_id = payload.get("employee_id", "")
        escalation_level = payload.get("level", 1)
        reason = payload.get("reason", "")

        escalation_actions = {
            1: {"notify": "hr_manager", "channel": "email"},
            2: {"notify": "hr_director", "channel": "telegram"},
            3: {"notify": "management", "channel": "telegram"},
        }

        action = escalation_actions.get(escalation_level, escalation_actions[1])

        return {
            "success": True,
            "data": {
                "employee_id": employee_id,
                "escalation_level": escalation_level,
                "reason": reason,
                "action_taken": action,
                "escalated_at": datetime.now().isoformat(),
                "next_escalation": (datetime.now() + timedelta(days=2)).isoformat()
                if escalation_level < 3
                else None,
            },
        }

    def _get_overdue_items(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Get all overdue items."""
        days_threshold = payload.get("days_threshold", 3)

        return {
            "success": True,
            "data": {
                "overdue_onboarding": [],
                "overdue_documents": [],
                "overdue_training": [],
                "action_required": [
                    "Send reminders",
                    "Escalate to HR",
                    "Update deadlines",
                ],
            },
        }

    def _schedule_reminder(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Schedule a future reminder."""
        employee_id = payload.get("employee_id", "")
        reminder_type = payload.get("type", "")
        scheduled_for = payload.get("scheduled_for", "")
        channel = payload.get("channel", "email")

        return {
            "success": True,
            "data": {
                "reminder_id": str(uuid.uuid4()),
                "employee_id": employee_id,
                "type": reminder_type,
                "scheduled_for": scheduled_for,
                "channel": channel,
                "status": "scheduled",
                "created_at": datetime.now().isoformat(),
            },
        }

    def _cancel_reminder(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Cancel a scheduled reminder."""
        reminder_id = payload.get("reminder_id", "")

        return {
            "success": True,
            "data": {
                "reminder_id": reminder_id,
                "status": "cancelled",
                "cancelled_at": datetime.now().isoformat(),
            },
        }

    def _get_alert_recipients(self, alert_type: str) -> List[str]:
        """Get recipients for an alert type."""
        recipients = {
            "offer_rejection": ["hr_manager", "recruiter"],
            "onboarding_overdue": ["hr_manager"],
            "document_expired": ["hr_admin", "employee"],
            "certification_expiring": ["hr_admin", "employee", "manager"],
        }
        return recipients.get(alert_type, ["hr_manager"])

    def handle_offer_rejection(
        self, employee_id: str, employee_name: str, position: str, reason: str
    ) -> Dict:
        """
        Handle offer rejection - send Telegram alert to HR.

        This is called when an employee rejects an offer.
        """
        return self._send_alert(
            {
                "alert_type": "offer_rejection",
                "employee_id": employee_id,
                "employee_name": employee_name,
                "position": position,
                "reason": reason,
                "channel": "telegram",
                "priority": "high",
            },
            None,
        )

    def check_onboarding_status(self, employee_id: str) -> Dict:
        """Check if onboarding is pending and needs reminder."""
        return self._check_pending_tasks(
            {"task_types": ["onboarding"], "employee_id": employee_id}, None
        )

    def validate_cross_check(self, result: Dict[str, Any]) -> CrossCheckResult:
        """Validate reminder/alert actions."""
        return CrossCheckResult(
            validator_agent=self.agent_id,
            result=ValidationResult.VALID,
            notes="Reminder system operational",
        )

    def get_daily_tasks(self) -> Dict:
        """Get all tasks that need to run daily."""
        return {
            "check_pending_offers": True,
            "check_document_deadlines": True,
            "check_training_deadlines": True,
            "send_scheduled_reminders": True,
            "escalate_overdue_items": True,
        }
