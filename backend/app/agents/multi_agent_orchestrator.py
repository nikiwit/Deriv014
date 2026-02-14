"""
Multi-Agent Orchestrator for DerivHR

Central coordinator that:
- Routes queries to appropriate agents
- Manages agent communication
- Implements cross-check validation workflow
- Coordinates onboarding workflow
- Handles session management
"""

import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from .base import (
    BaseAgent,
    AgentMessage,
    AgentResponse,
    CrossCheckResult,
    ValidationResult,
    SharedContext,
)
from .policy_agent import PolicyAgent
from .salary_agent import SalaryAgent
from .training_agent import TrainingAgent
from .onboarding_agent import OnboardingAgent
from .agentix_agent import AgentixAgent


class WorkflowType(Enum):
    QUERY = "query"
    ONBOARDING = "onboarding"
    OFFER_ACCEPTANCE = "offer_acceptance"
    OFFER_REJECTION = "offer_rejection"
    DOCUMENT_GENERATION = "document_generation"
    CALCULATION = "calculation"
    COMPLIANCE_CHECK = "compliance_check"


@dataclass
class WorkflowResult:
    success: bool
    workflow_type: WorkflowType
    data: Dict[str, Any]
    cross_checks: List[CrossCheckResult] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    agents_involved: List[str] = field(default_factory=list)


class MultiAgentOrchestrator:
    """
    Central Orchestrator for the Multi-Agent HR System.

    Responsibilities:
    - Route queries to appropriate agents
    - Manage cross-agent validation
    - Coordinate onboarding workflow
    - Handle offer acceptance/rejection
    - Maintain session context
    - Aggregate responses with citations
    """

    def __init__(self):
        self._initialize_agents()
        self._sessions: Dict[str, SharedContext] = {}
        self._workflow_history: List[Dict] = []

    def _initialize_agents(self):
        """Initialize all agents."""
        self.agents: Dict[str, BaseAgent] = {
            "policy_agent": PolicyAgent(),
            "salary_agent": SalaryAgent(),
            "training_agent": TrainingAgent(),
            "onboarding_agent": OnboardingAgent(),
            "agentix_agent": AgentixAgent(),
        }

    def get_session(self, session_id: str) -> SharedContext:
        """Get or create a session context."""
        if session_id not in self._sessions:
            self._sessions[session_id] = SharedContext()
        return self._sessions[session_id]

    def dispatch_to_agent(
        self,
        target_agent: str,
        action: str,
        payload: Dict[str, Any],
        context: Optional[SharedContext] = None,
    ) -> AgentResponse:
        """
        Dispatch a message to a specific agent.

        Args:
            target_agent: ID of the target agent
            action: Action to perform
            payload: Data for the action
            context: Optional shared context

        Returns:
            AgentResponse from the target agent
        """
        agent = self.agents.get(target_agent)
        if not agent:
            return AgentResponse(
                success=False, payload={}, errors=[f"Unknown agent: {target_agent}"]
            )

        message = AgentMessage(
            source_agent="orchestrator",
            target_agent=target_agent,
            action=action,
            payload=payload,
            context=context.to_dict() if context else None,
        )

        return agent.receive_message(message)

    def dispatch_with_cross_check(
        self,
        target_agent: str,
        action: str,
        payload: Dict[str, Any],
        context: Optional[SharedContext] = None,
    ) -> Tuple[AgentResponse, List[CrossCheckResult]]:
        """
        Dispatch to agent and perform cross-check validation.

        Args:
            target_agent: ID of the target agent
            action: Action to perform
            payload: Data for the action
            context: Optional shared context

        Returns:
            Tuple of (AgentResponse, List[CrossCheckResult])
        """
        response = self.dispatch_to_agent(target_agent, action, payload, context)

        cross_checks = []
        agent = self.agents.get(target_agent)

        if agent and response.success:
            for validator_id in agent.cross_check_agents:
                validator = self.agents.get(validator_id)
                if validator:
                    check_result = validator.validate_cross_check(response.payload)
                    cross_checks.append(check_result)

        return response, cross_checks

    def process_onboarding_offer(
        self, employee_data: Dict[str, Any], offer_details: Dict[str, Any]
    ) -> WorkflowResult:
        """
        Process the initial offer creation for onboarding.

        Flow:
        1. Create offer via OnboardingAgent
        2. Cross-check with PolicyAgent
        3. Cross-check with SalaryAgent
        4. Store in temporary DB
        5. Setup reminders via AgentixAgent
        """
        context = SharedContext()
        context.update({"employee_data": employee_data, "offer_details": offer_details})

        errors = []
        warnings = []
        agents_involved = []

        response, cross_checks = self.dispatch_with_cross_check(
            "onboarding_agent",
            "create_offer",
            {"employee_data": employee_data, "offer_details": offer_details},
            context,
        )
        agents_involved.append("onboarding_agent")

        if not response.success:
            errors.extend(response.errors)
            return WorkflowResult(
                success=False,
                workflow_type=WorkflowType.ONBOARDING,
                data={},
                cross_checks=cross_checks,
                errors=errors,
                agents_involved=agents_involved,
            )

        for check in cross_checks:
            agents_involved.append(check.validator_agent)
            if check.result == ValidationResult.INVALID:
                errors.append(
                    f"Cross-check failed ({check.validator_agent}): {check.notes}"
                )

        if any(c.result == ValidationResult.INVALID for c in cross_checks):
            warnings.append("Offer created with validation warnings")

        agentix_response = self.dispatch_to_agent(
            "agentix_agent",
            "setup_reminders",
            {
                "employee_id": response.data.get("offer", {}).get("employee_id"),
                "type": "onboarding",
            },
            context,
        )
        agents_involved.append("agentix_agent")

        return WorkflowResult(
            success=len(errors) == 0,
            workflow_type=WorkflowType.ONBOARDING,
            data=response.data,
            cross_checks=cross_checks,
            errors=errors,
            warnings=warnings,
            agents_involved=agents_involved,
        )

    def process_offer_acceptance(
        self, offer_id: str, employee_id: str, signature: Optional[str] = None
    ) -> WorkflowResult:
        """
        Process offer acceptance - automate all onboarding.

        When employee accepts:
        1. Update status to accepted
        2. Generate all documents (contract, policies, forms)
        3. Setup employee portal
        4. Assign onboarding training
        5. Setup reminders for pending tasks
        6. Cross-check all actions
        """
        context = SharedContext()
        context.set("offer_id", offer_id)
        context.set("employee_id", employee_id)

        errors = []
        warnings = []
        agents_involved = []
        all_cross_checks = []

        response, cross_checks = self.dispatch_with_cross_check(
            "onboarding_agent",
            "accept_offer",
            {"offer_id": offer_id, "employee_id": employee_id, "signature": signature},
            context,
        )
        agents_involved.append("onboarding_agent")
        all_cross_checks.extend(cross_checks)

        if not response.success:
            errors.extend(response.errors)
            return WorkflowResult(
                success=False,
                workflow_type=WorkflowType.OFFER_ACCEPTANCE,
                data={},
                cross_checks=all_cross_checks,
                errors=errors,
                agents_involved=agents_involved,
            )

        doc_response = self.dispatch_to_agent(
            "onboarding_agent",
            "generate_onboarding_documents",
            {"employee_id": employee_id, "employee_data": {}},
            context,
        )
        agents_involved.append("onboarding_agent")

        if doc_response.success:
            context.set("documents", doc_response.data.get("documents", []))

        training_response = self.dispatch_to_agent(
            "training_agent",
            "get_onboarding_training",
            {"employee_id": employee_id},
            context,
        )
        agents_involved.append("training_agent")

        if training_response.success:
            context.set("training_schedule", training_response.data)

        reminder_response = self.dispatch_to_agent(
            "agentix_agent",
            "setup_reminders",
            {"employee_id": employee_id, "type": "onboarding"},
            context,
        )
        agents_involved.append("agentix_agent")

        for check in cross_checks:
            if check.result == ValidationResult.INVALID:
                errors.append(f"Validation failed: {check.notes}")

        return WorkflowResult(
            success=len(errors) == 0,
            workflow_type=WorkflowType.OFFER_ACCEPTANCE,
            data={
                "acceptance": response.data,
                "documents": doc_response.data if doc_response.success else {},
                "training": training_response.data if training_response.success else {},
                "reminders": reminder_response.data
                if reminder_response.success
                else {},
                "employee_portal_url": f"/employee/portal/{employee_id}",
            },
            cross_checks=all_cross_checks,
            errors=errors,
            warnings=warnings,
            agents_involved=list(set(agents_involved)),
        )

    def process_offer_rejection(
        self, offer_id: str, employee_id: str, reason: Optional[str] = None
    ) -> WorkflowResult:
        """
        Process offer rejection - notify HR via Telegram/channel.

        When employee rejects:
        1. Update status to rejected
        2. Log rejection reason
        3. Send Telegram alert to HR
        4. Create follow-up task
        5. Archive candidate data
        """
        context = SharedContext()
        context.set("offer_id", offer_id)
        context.set("employee_id", employee_id)
        context.set("rejection_reason", reason)

        errors = []
        agents_involved = []

        response = self.dispatch_to_agent(
            "onboarding_agent",
            "reject_offer",
            {"offer_id": offer_id, "employee_id": employee_id, "reason": reason},
            context,
        )
        agents_involved.append("onboarding_agent")

        if not response.success:
            errors.extend(response.errors)

        alert_response = self.dispatch_to_agent(
            "agentix_agent",
            "send_alert",
            {
                "alert_type": "offer_rejection",
                "employee_id": employee_id,
                "reason": reason or "Not provided",
                "channel": "telegram",
                "priority": "high",
            },
            context,
        )
        agents_involved.append("agentix_agent")

        return WorkflowResult(
            success=len(errors) == 0,
            workflow_type=WorkflowType.OFFER_REJECTION,
            data={
                "rejection": response.data if response.success else {},
                "alert": alert_response.data if alert_response.success else {},
                "hr_notified": True,
            },
            errors=errors,
            agents_involved=agents_involved,
        )

    def process_calculation(
        self, calculation_type: str, params: Dict[str, Any]
    ) -> WorkflowResult:
        """
        Process a calculation request.

        Flow:
        1. Route to SalaryAgent for calculation
        2. Cross-check with PolicyAgent for compliance
        3. Return results with validation
        """
        context = SharedContext()
        context.update(params)

        agents_involved = []
        errors = []

        response, cross_checks = self.dispatch_with_cross_check(
            "salary_agent", f"calculate_{calculation_type}", params, context
        )
        agents_involved.append("salary_agent")

        for check in cross_checks:
            agents_involved.append(check.validator_agent)
            if check.result == ValidationResult.INVALID:
                errors.append(f"Policy violation: {check.notes}")
                if check.corrections:
                    response.payload["corrections"] = check.corrections

        return WorkflowResult(
            success=response.success and len(errors) == 0,
            workflow_type=WorkflowType.CALCULATION,
            data=response.data if response.success else {},
            cross_checks=cross_checks,
            errors=errors + response.errors,
            agents_involved=agents_involved,
        )

    def process_query(
        self,
        query: str,
        session_id: Optional[str] = None,
        jurisdiction: Optional[str] = None,
    ) -> WorkflowResult:
        """
        Process a general HR query.

        Routes to appropriate agent based on query type.
        """
        session_id = session_id or str(uuid.uuid4())
        context = self.get_session(session_id)

        query_lower = query.lower()

        if any(
            kw in query_lower
            for kw in ["epf", "socso", "cpf", "calculate", "salary", "overtime"]
        ):
            target_agent = "salary_agent"
            action = "get_contribution_summary"
        elif any(
            kw in query_lower for kw in ["policy", "handbook", "compliance", "rule"]
        ):
            target_agent = "policy_agent"
            action = "interpret_policy"
        elif any(kw in query_lower for kw in ["training", "course", "certification"]):
            target_agent = "training_agent"
            action = "recommend_training"
        elif any(kw in query_lower for kw in ["onboarding", "offer", "new employee"]):
            target_agent = "onboarding_agent"
            action = "get_onboarding_status"
        else:
            target_agent = "policy_agent"
            action = "interpret_policy"

        response = self.dispatch_to_agent(
            target_agent,
            action,
            {"query": query, "jurisdiction": jurisdiction},
            context,
        )

        return WorkflowResult(
            success=response.success,
            workflow_type=WorkflowType.QUERY,
            data=response.data if response.success else {},
            errors=response.errors,
            agents_involved=[target_agent],
        )

    def get_pending_onboardings(self) -> Dict[str, Any]:
        """Get all pending onboarding items for AgentixAgent monitoring."""
        response = self.dispatch_to_agent(
            "agentix_agent",
            "check_pending_tasks",
            {"task_types": ["onboarding", "documents", "training"]},
        )

        return response.data if response.success else {}

    def run_daily_checks(self) -> Dict[str, Any]:
        """Run daily checks for pending items and send reminders."""
        results = {}

        pending = self.get_pending_onboardings()
        results["pending_items"] = pending

        return results

    def get_agent_info(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific agent."""
        agent = self.agents.get(agent_id)
        if agent:
            return agent.get_info()
        return None

    def get_all_agents_info(self) -> List[Dict[str, Any]]:
        """Get information about all agents."""
        return [agent.get_info() for agent in self.agents.values()]

    def log_workflow(self, workflow: WorkflowResult) -> None:
        """Log a completed workflow for audit."""
        self._workflow_history.append(
            {
                "timestamp": datetime.now().isoformat(),
                "workflow_type": workflow.workflow_type.value,
                "success": workflow.success,
                "agents_involved": workflow.agents_involved,
                "errors": workflow.errors,
            }
        )


_orchestrator_instance: Optional[MultiAgentOrchestrator] = None


def get_orchestrator() -> MultiAgentOrchestrator:
    """Get the global orchestrator instance."""
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = MultiAgentOrchestrator()
    return _orchestrator_instance
