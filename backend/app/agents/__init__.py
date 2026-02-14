"""
DerivHR Multi-Agent System

Specialized HR agents with cross-check validation:

- PolicyAgent: Policy interpretation, compliance verification
- SalaryAgent: EPF/SOCSO/CPF calculations, payroll
- TrainingAgent: L&D, certifications, onboarding training
- OnboardingAgent: Offer management, document automation
- AgentixAgent: Reminders, alerts, notifications
- MultiAgentOrchestrator: Central coordinator
"""

from .prompts import AGENT_PROMPTS, get_agent_prompt, AgentType
from .intent import IntentClassifier
from .orchestrator import AgentOrchestrator
from .messaging import AgentMessage, AgentResponse, dispatch_to_agent
from .contract_agent import ContractAgent

from .base import (
    BaseAgent,
    AgentStatus,
    CrossCheckResult,
    ValidationResult,
    SharedContext,
)

from .policy_agent import PolicyAgent
from .salary_agent import SalaryAgent
from .training_agent import TrainingAgent
from .onboarding_agent import OnboardingAgent
from .agentix_agent import AgentixAgent
from .multi_agent_orchestrator import (
    MultiAgentOrchestrator,
    WorkflowType,
    WorkflowResult,
    get_orchestrator,
)

__all__ = [
    "AGENT_PROMPTS",
    "get_agent_prompt",
    "AgentType",
    "IntentClassifier",
    "AgentOrchestrator",
    "AgentMessage",
    "AgentResponse",
    "dispatch_to_agent",
    "ContractAgent",
    "BaseAgent",
    "AgentStatus",
    "CrossCheckResult",
    "ValidationResult",
    "SharedContext",
    "PolicyAgent",
    "SalaryAgent",
    "TrainingAgent",
    "OnboardingAgent",
    "AgentixAgent",
    "MultiAgentOrchestrator",
    "WorkflowType",
    "WorkflowResult",
    "get_orchestrator",
]
