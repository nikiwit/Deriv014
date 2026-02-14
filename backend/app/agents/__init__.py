"""
HR Agent System - Multi-agent orchestration for DerivHR
"""

from .prompts import AGENT_PROMPTS, get_agent_prompt, AgentType
from .intent import IntentClassifier
from .orchestrator import AgentOrchestrator
from .messaging import AgentMessage, AgentResponse, dispatch_to_agent
from .contract_agent import ContractAgent

__all__ = [
    'AGENT_PROMPTS',
    'get_agent_prompt',
    'AgentType',
    'IntentClassifier',
    'AgentOrchestrator',
    'AgentMessage',
    'AgentResponse',
    'dispatch_to_agent',
    'ContractAgent'
]
