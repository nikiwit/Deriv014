"""
Intent Classification for HR Agent Routing

Classifies user queries and routes them to the appropriate specialized agent
based on keyword matching, pattern recognition, and complexity analysis.
"""

import re
from typing import Tuple, Optional
from .prompts import AgentType


class IntentClassifier:
    """
    Classifies user intent and routes queries to appropriate HR agents.

    Uses a combination of:
    - Keyword matching for specific topics
    - Regex patterns for complex query structures
    - Complexity scoring for specialist routing
    """

    # Keyword patterns for each agent type
    PATTERNS = {
        AgentType.POLICY_RESEARCH: [
            r'\b(policy|policies|handbook|guideline|rule|procedure|regulation)\b',
            r"\b(what does|what is|explain|clarify|interpret|meaning)\b.*\b(policy|section|clause|article)\b",
            r"\b(entitled|entitlement|eligible|eligibility|qualify|qualified)\b",
            r"\b(compare|difference|vs|versus|between)\b.*\b(MY|SG|Malaysia|Singapore)\b",
            r"\b(where can i find|which document|which policy)\b",
            r"\b(section|chapter|clause|article)\s*\d+",
        ],
        AgentType.COMPLIANCE: [
            r"\b(calculate|computation|how much|amount|total)\b",
            r"\b(EPF|KWSP|SOCSO|PERKESO|EIS|CPF|PCB|MTD|SDL)\b",
            r"\b(statutory|contribution|deduction|tax)\b",
            r"\b(overtime|OT)\b.*\b(rate|pay|calculate|eligible)\b",
            r"\b(compliance|audit|risk|violation|penalty|fine)\b",
            r"\b(visa|work permit|employment pass|S pass|EP)\b.*\b(expir|renew|status|valid)\b",
            r"\b(minimum wage|salary threshold|ceiling)\b",
            r"\b(foreign worker|expatriate|expat)\b.*\b(quota|levy|regulation)\b",
            r"\b(probation|confirmation|termination)\b.*\b(notice|period|calculate)\b",
        ],
        AgentType.DOCUMENT: [
            r"\b(contract|form|document|checklist|template|letter)\b",
            r"\b(generate|create|draft|prepare|issue)\b.*\b(contract|letter|document|offer)\b",
            r"\b(what documents|required documents|submit|submission|upload)\b",
            r"\b(EA form|IR8A|KWSP form|Form 8A|nomination form)\b",
            r"\b(onboarding documents|new hire paperwork)\b",
            r"\b(offer letter|confirmation letter|warning letter|termination letter)\b",
        ],
        AgentType.EMPLOYEE_SUPPORT: [
            r"\b(leave|annual leave|sick leave|maternity|paternity|MC|medical certificate)\b",
            r"\b(onboarding|first day|orientation|new hire|new joiner|induction)\b",
            r"\b(apply|application|request|submit)\b.*\b(leave|time off|vacation)\b",
            r"\b(balance|remaining|how many days|days left)\b",
            r"\b(who|where|when|how)\b.*\b(HR|manager|team|contact)\b",
            r"\b(help|assist|support|question|confused|unclear)\b",
            r"\b(benefit|insurance|medical|dental|optical)\b",
            r"\b(claim|reimbursement|expense)\b",
            r"\b(work from home|WFH|remote|flexible|hybrid)\b",
            r"\b(public holiday|PH|off day|rest day)\b",
        ],

        # New intents added below
        AgentType.PROFILE_QUERY: [
            r"\b(profile|my profile|view profile|update profile|edit profile)\b",
            r"\b(change my (name|email|phone|address|bank|details))\b",
            r"\b(show me my (profile|details|information))\b",
            r"\b(upload profile picture|profile photo)\b",
        ],

        AgentType.REQUEST_HR_TALK: [
            r"\b(talk to (hr|human resources)|speak to (hr|human resources)|contact hr)\b",
            r"\b(schedule|book|arrange)\b.*\b(meeting|call)\b.*\b(hr|human resources)\b",
            r"\b(need to (talk|speak) to someone|request meeting)\b",
            r"\b(urgent|escalat(e|ion)|raise to (hr|manager))\b",
        ],

        AgentType.SMALL_TALK: [
            r"\b(hi|hello|hey|good morning|good afternoon|good evening)\b",
            r"\b(thanks|thank you|ty|cheers)\b",
            r"\b(how are you|what's up|sup|how's it going)\b",
            r"\b(joke|fun|bored)\b",
        ],

        AgentType.BOT_CAPABILITIES: [
            r"\b(what can you do|your capabilities|how can you help|help me with)\b",
            r"\b(list of features|features|capabilities|limitations)\b",
            r"\b(is this a bot|are you a bot|bot or human)\b",
            r"\b(can you (generate|draft|calculate|route|connect))\b",
        ],
    }

    # Keywords that indicate complexity (prefer specialized agents)
    COMPLEXITY_KEYWORDS = [
        'section', 'act', 'law', 'legal', 'court', 'tribunal',
        'termination', 'dismissal', 'constructive', 'dispute',
        'investigation', 'misconduct', 'harassment', 'grievance',
        'audit', 'penalty', 'violation', 'breach',
    ]

    # High-priority routing keywords (override pattern matching)
    PRIORITY_ROUTING = {
        # Immediate compliance routing
        'epf': AgentType.COMPLIANCE,
        'socso': AgentType.COMPLIANCE,
        'cpf': AgentType.COMPLIANCE,
        'eis': AgentType.COMPLIANCE,
        'pcb': AgentType.COMPLIANCE,
        'tax': AgentType.COMPLIANCE,

        # Immediate document routing
        'contract': AgentType.DOCUMENT,
        'offer letter': AgentType.DOCUMENT,
        'generate': AgentType.DOCUMENT,

        # Immediate policy routing
        'employment act': AgentType.POLICY_RESEARCH,
        'section 60': AgentType.POLICY_RESEARCH,

        # Immediate profile / HR talk routing
        'profile': AgentType.PROFILE_QUERY,
        'my profile': AgentType.PROFILE_QUERY,
        'talk to hr': AgentType.REQUEST_HR_TALK,
        'speak to hr': AgentType.REQUEST_HR_TALK,
    }

    @classmethod
    def classify(
        cls,
        query: str,
        jurisdiction: Optional[str] = None
    ) -> Tuple[AgentType, float]:
        """
        Classify query intent and return the most appropriate agent.

        Args:
            query: The user's query string
            jurisdiction: Optional jurisdiction context (MY/SG)

        Returns:
            Tuple of (AgentType, confidence_score 0.0-1.0)
        """
        query_lower = query.lower()

        # Check for priority routing first
        for keyword, agent in cls.PRIORITY_ROUTING.items():
            if keyword in query_lower:
                return agent, 0.95

        # Score each agent based on pattern matches
        scores = {agent: 0.0 for agent in AgentType}

        for agent, patterns in cls.PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, query_lower, re.IGNORECASE):
                    scores[agent] += 1.0

        # Check for complexity indicators
        complexity_score = sum(1 for kw in cls.COMPLEXITY_KEYWORDS if kw in query_lower)

        # Boost specialized agents for complex queries
        if complexity_score >= 2:
            scores[AgentType.POLICY_RESEARCH] *= 1.5
            scores[AgentType.COMPLIANCE] *= 1.5

        # Find highest scoring agent
        best_agent = max(scores, key=scores.get)
        best_score = scores[best_agent]

        # Default to Employee Support for simple queries with no strong signal
        if best_score < 1.0:
            return AgentType.EMPLOYEE_SUPPORT, 0.5

        # For Main HR, we need explicit routing or high complexity
        if best_agent == AgentType.MAIN_HR:
            return AgentType.EMPLOYEE_SUPPORT, 0.5

        # Normalize confidence (0.5-1.0 range)
        confidence = min(0.5 + (best_score / 6.0), 1.0)

        return best_agent, confidence

    @classmethod
    def get_routing_reason(
        cls,
        agent_type: AgentType,
        confidence: float
    ) -> str:
        """
        Generate a human-readable explanation for the routing decision.

        Args:
            agent_type: The selected agent type
            confidence: The confidence score

        Returns:
            A string explaining the routing decision
        """
        confidence_level = (
            "high" if confidence >= 0.8 else
            "medium" if confidence >= 0.6 else
            "low"
        )

        reasons = {
            AgentType.MAIN_HR: "General HR query requiring multi-disciplinary expertise",
            AgentType.POLICY_RESEARCH: "Policy interpretation or cross-referencing needed",
            AgentType.COMPLIANCE: "Statutory calculations or regulatory assessment required",
            AgentType.DOCUMENT: "Document generation or form guidance requested",
            AgentType.EMPLOYEE_SUPPORT: "General employee assistance or day-to-day HR support",
            AgentType.PROFILE_QUERY: "Profile lookup or update request",
            AgentType.REQUEST_HR_TALK: "Request to schedule or escalate to an HR representative",
            AgentType.SMALL_TALK: "Casual / social interaction detected",
            AgentType.BOT_CAPABILITIES: "Questions about bot features, scope, or limitations",
        }

        return f"Routed to {agent_type.value} ({confidence_level} confidence): {reasons.get(agent_type, 'Unknown')}"

    @classmethod
    def detect_jurisdiction(cls, query: str) -> Optional[str]:
        """
        Detect jurisdiction from query content.

        Args:
            query: The user's query string

        Returns:
            'MY', 'SG', or None if unclear
        """
        query_lower = query.lower()

        my_indicators = [
            'malaysia', 'malaysian', 'my', 'epf', 'kwsp', 'socso', 'perkeso',
            'eis', 'ringgit', 'rm', 'ea 1955', 'employment act 1955'
        ]

        sg_indicators = [
            'singapore', 'singaporean', 'sg', 'cpf', 'sdl', 'mom',
            'employment pass', 's pass', 'sgd', 'ea cap 91', 'cap. 91'
        ]

        my_count = sum(1 for indicator in my_indicators if indicator in query_lower)
        sg_count = sum(1 for indicator in sg_indicators if indicator in query_lower)

        if my_count > sg_count:
            return 'MY'
        elif sg_count > my_count:
            return 'SG'

        return None
