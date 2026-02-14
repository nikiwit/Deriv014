"""
Base Agent Class for DerivHR Multi-Agent System

Provides the foundation for all specialized HR agents with:
- Message passing protocol
- Cross-agent validation
- Shared context management
- Agent communication logging
"""

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable
from enum import Enum


class AgentStatus(Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    WAITING_VALIDATION = "waiting_validation"
    ERROR = "error"


class ValidationResult(Enum):
    VALID = "valid"
    INVALID = "invalid"
    PENDING = "pending"
    NEEDS_REVIEW = "needs_review"


@dataclass
class AgentMessage:
    source_agent: str
    target_agent: str
    action: str
    payload: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    requires_validation: bool = False
    validation_agents: List[str] = field(default_factory=list)


@dataclass
class AgentResponse:
    success: bool
    payload: Dict[str, Any]
    message_id: str = ""
    source_agent: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    validation_results: List[Dict[str, Any]] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class CrossCheckResult:
    validator_agent: str
    result: ValidationResult
    notes: str = ""
    corrections: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class BaseAgent(ABC):
    """
    Abstract base class for all HR agents.

    Implements:
    - Message receiving and processing
    - Cross-agent validation protocol
    - Shared context access
    - Error handling and logging
    """

    def __init__(self, agent_id: str, agent_name: str):
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.status = AgentStatus.IDLE
        self.cross_check_agents: List[str] = []
        self._message_handlers: Dict[str, Callable] = {}
        self._register_handlers()

    @abstractmethod
    def _register_handlers(self):
        """Register message handlers for different action types."""
        pass

    @property
    @abstractmethod
    def capabilities(self) -> List[str]:
        """Return list of agent capabilities."""
        pass

    def receive_message(self, message: AgentMessage) -> AgentResponse:
        """
        Receive and process a message from another agent or orchestrator.

        Args:
            message: The incoming agent message

        Returns:
            AgentResponse with results and any validation data
        """
        self.status = AgentStatus.PROCESSING

        try:
            handler = self._message_handlers.get(message.action)
            if not handler:
                return AgentResponse(
                    success=False,
                    payload={},
                    source_agent=self.agent_id,
                    errors=[f"Unknown action: {message.action}"],
                )

            result = handler(message.payload, message.context)

            response = AgentResponse(
                success=result.get("success", True),
                payload=result.get("data", result),
                source_agent=self.agent_id,
                errors=result.get("errors", []),
                warnings=result.get("warnings", []),
            )

            self.status = AgentStatus.IDLE
            return response

        except Exception as e:
            self.status = AgentStatus.ERROR
            return AgentResponse(
                success=False, payload={}, source_agent=self.agent_id, errors=[str(e)]
            )

    def send_message(
        self,
        target_agent: str,
        action: str,
        payload: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
        requires_validation: bool = False,
    ) -> AgentMessage:
        """
        Create a message to send to another agent.

        Args:
            target_agent: ID of the target agent
            action: Action type to perform
            payload: Data for the action
            context: Optional shared context
            requires_validation: Whether cross-check validation is needed

        Returns:
            AgentMessage ready for dispatch
        """
        return AgentMessage(
            source_agent=self.agent_id,
            target_agent=target_agent,
            action=action,
            payload=payload,
            context=context,
            requires_validation=requires_validation,
            validation_agents=self.cross_check_agents if requires_validation else [],
        )

    def validate_cross_check(self, result: Dict[str, Any]) -> CrossCheckResult:
        """
        Validate the result from another agent as part of cross-check.

        Args:
            result: The result to validate

        Returns:
            CrossCheckResult with validation outcome
        """
        return CrossCheckResult(
            validator_agent=self.agent_id,
            result=ValidationResult.VALID,
            notes="Default validation passed",
        )

    def get_info(self) -> Dict[str, Any]:
        """Get agent information for display/logging."""
        return {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "status": self.status.value,
            "capabilities": self.capabilities,
            "cross_check_agents": self.cross_check_agents,
        }


class SharedContext:
    """
    Shared context manager for inter-agent communication.

    Stores:
    - Employee data being processed
    - Workflow state
    - Cross-check results
    - Session information
    """

    def __init__(self):
        self._context: Dict[str, Any] = {}
        self._cross_checks: List[CrossCheckResult] = []
        self._history: List[Dict[str, Any]] = []

    def set(self, key: str, value: Any) -> None:
        """Set a context value."""
        self._context[key] = value
        self._log_action("set", key, value)

    def get(self, key: str, default: Any = None) -> Any:
        """Get a context value."""
        return self._context.get(key, default)

    def update(self, data: Dict[str, Any]) -> None:
        """Update multiple context values."""
        self._context.update(data)
        for key, value in data.items():
            self._log_action("update", key, value)

    def add_cross_check(self, result: CrossCheckResult) -> None:
        """Add a cross-check validation result."""
        self._cross_checks.append(result)
        self._log_action("cross_check", result.validator_agent, result.result.value)

    def get_cross_checks(self) -> List[CrossCheckResult]:
        """Get all cross-check results."""
        return self._cross_checks

    def has_validation_errors(self) -> bool:
        """Check if any cross-check failed."""
        return any(
            check.result == ValidationResult.INVALID for check in self._cross_checks
        )

    def clear(self) -> None:
        """Clear the context for a new workflow."""
        self._context = {}
        self._cross_checks = []

    def _log_action(self, action: str, key: str, value: Any) -> None:
        """Log context changes for audit."""
        self._history.append(
            {
                "timestamp": datetime.now().isoformat(),
                "action": action,
                "key": key,
                "value": str(value)[:100],  # Truncate for storage
            }
        )

    def to_dict(self) -> Dict[str, Any]:
        """Export context as dictionary."""
        return {
            "context": self._context,
            "cross_checks": [
                {
                    "validator": c.validator_agent,
                    "result": c.result.value,
                    "notes": c.notes,
                }
                for c in self._cross_checks
            ],
            "history": self._history[-50:],  # Last 50 actions
        }
