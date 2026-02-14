from dataclasses import dataclass
from typing import Dict, Any, Optional

@dataclass
class AgentMessage:
    source_agent: str
    target_agent: str
    payload: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None

@dataclass
class AgentResponse:
    payload: Dict[str, Any]

def dispatch_to_agent(message: AgentMessage) -> AgentResponse:
    """
    Mock dispatcher. In a real system, this would look up the agent
    and call receive_message.
    """
    if message.target_agent == "contract_agent":
        from .contract_agent import ContractAgent
        agent = ContractAgent()
        return agent.receive_message(message)
    
    return AgentResponse(payload={"success": False, "error": f"Unknown agent: {message.target_agent}"})
