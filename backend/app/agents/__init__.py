"""
HR Agent System - Multi-agent orchestration for DerivHR

This module provides a comprehensive HR AI agent system with:
- Main HR Agent: Orchestrator with multi-jurisdictional expertise (MY/SG)
- Policy Research Agent: Deep policy analysis and cross-referencing
- Compliance Agent: Statutory calculations and regulatory checks
- Document Agent: Contract generation and form guidance
- Employee Support Agent: Day-to-day HR assistance
"""

from .prompts import AGENT_PROMPTS, get_agent_prompt, AgentType
from .intent import IntentClassifier
from .orchestrator import AgentOrchestrator

__all__ = [
    'AGENT_PROMPTS',
    'get_agent_prompt',
    'AgentType',
    'IntentClassifier',
    'AgentOrchestrator'
]
