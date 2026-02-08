"""
Agent Orchestrator for DerivHR

Routes queries to appropriate sub-agents and manages the multi-agent workflow.
Integrates with the existing RAG system for context-aware responses.
"""

from typing import Dict, List, Tuple, Optional, Any
from .prompts import AgentType, get_agent_prompt
from .intent import IntentClassifier


class AgentOrchestrator:
    """
    Orchestrates the multi-agent HR system.

    Responsibilities:
    - Route queries to appropriate specialized agents
    - Maintain session context per agent
    - Integrate with RAG for document retrieval
    - Aggregate responses with source citations
    """

    def __init__(self):
        """Initialize the orchestrator with intent classifier."""
        self.intent_classifier = IntentClassifier()
        self._session_contexts: Dict[str, Dict] = {}

    def get_session_context(self, session_id: str) -> Dict:
        """
        Get or create session context.

        Args:
            session_id: The session identifier

        Returns:
            Session context dictionary
        """
        if session_id not in self._session_contexts:
            self._session_contexts[session_id] = {
                'agent_history': [],
                'jurisdiction': None,
                'last_agent': None,
            }
        return self._session_contexts[session_id]

    def route_query(
        self,
        session_id: str,
        query: str,
        jurisdiction: Optional[str] = None
    ) -> Tuple[AgentType, float, str]:
        """
        Route a query to the appropriate agent.

        Args:
            session_id: The session identifier
            query: The user's query
            jurisdiction: Optional jurisdiction override

        Returns:
            Tuple of (agent_type, confidence, routing_reason)
        """
        # Classify intent
        agent_type, confidence = self.intent_classifier.classify(query, jurisdiction)

        # Detect jurisdiction if not provided
        if not jurisdiction:
            jurisdiction = self.intent_classifier.detect_jurisdiction(query)

        # Get routing reason
        reason = self.intent_classifier.get_routing_reason(agent_type, confidence)

        # Update session context
        context = self.get_session_context(session_id)
        context['last_agent'] = agent_type
        context['jurisdiction'] = jurisdiction or context.get('jurisdiction')
        context['agent_history'].append({
            'agent': agent_type.value,
            'confidence': confidence,
        })

        return agent_type, confidence, reason

    def get_enhanced_prompt(
        self,
        agent_type: AgentType,
        jurisdiction: Optional[str] = None,
        employee_context: Optional[Dict] = None
    ) -> str:
        """
        Get the enhanced system prompt for an agent.

        Args:
            agent_type: The type of agent
            jurisdiction: Optional jurisdiction context
            employee_context: Optional employee profile

        Returns:
            The formatted system prompt
        """
        return get_agent_prompt(agent_type, jurisdiction, employee_context)

    def process_query(
        self,
        session_id: str,
        query: str,
        rag_engine: Any,
        jurisdiction: Optional[str] = None,
        employee_context: Optional[Dict] = None
    ) -> Dict:
        """
        Process a query through the agent system.

        Args:
            session_id: The session identifier
            query: The user's query
            rag_engine: The RAG engine instance for document retrieval
            jurisdiction: Optional jurisdiction override
            employee_context: Optional employee profile data

        Returns:
            Dictionary with response, sources, agent info, and metadata
        """
        # Route the query
        agent_type, confidence, routing_reason = self.route_query(
            session_id, query, jurisdiction
        )

        # Get enhanced prompt
        system_prompt = self.get_enhanced_prompt(
            agent_type,
            jurisdiction or self.get_session_context(session_id).get('jurisdiction'),
            employee_context
        )

        # Build enhanced query with agent context
        enhanced_query = self._build_enhanced_query(
            query, agent_type, system_prompt
        )

        # Query RAG engine
        try:
            response = rag_engine.chat(enhanced_query)
            response_text = str(response)
            sources = self._extract_sources(response)
        except Exception as e:
            response_text = f"I apologize, but I encountered an error processing your request. Please try again or contact HR directly.\n\n_Error: {str(e)}_"
            sources = []

        # Detect jurisdiction from sources if not already known
        detected_jurisdiction = jurisdiction or self._detect_jurisdiction_from_sources(sources)

        return {
            'response': response_text,
            'sources': sources,
            'agent_used': agent_type.value,
            'confidence': confidence,
            'jurisdiction': detected_jurisdiction,
            'routing_reason': routing_reason,
            'session_id': session_id,
        }

    def _build_enhanced_query(
        self,
        query: str,
        agent_type: AgentType,
        system_prompt: str
    ) -> str:
        """
        Build an enhanced query with agent context.

        Args:
            query: The original user query
            agent_type: The assigned agent type
            system_prompt: The agent's system prompt

        Returns:
            Enhanced query string
        """
        agent_labels = {
            AgentType.MAIN_HR: "Chief HR Intelligence Officer",
            AgentType.POLICY_RESEARCH: "Policy Research Specialist",
            AgentType.COMPLIANCE: "Compliance & Statutory Specialist",
            AgentType.DOCUMENT: "Document & Forms Specialist",
            AgentType.EMPLOYEE_SUPPORT: "Employee Support Specialist",
        }

        return f"""
[AGENT: {agent_labels.get(agent_type, 'HR Assistant')}]

{system_prompt}

---

USER QUERY: {query}

---

INSTRUCTIONS:
1. Respond according to your agent role and guidelines above
2. Use proper markdown formatting (headers, tables, bullet points)
3. Cite sources with document names and jurisdictions
4. Be professional but approachable
5. If the query is outside your expertise, indicate which specialist should handle it
"""

    def _extract_sources(self, response: Any) -> List[Dict]:
        """
        Extract source citations from RAG response.

        Args:
            response: The RAG engine response object

        Returns:
            List of source dictionaries
        """
        sources = []

        if hasattr(response, 'source_nodes'):
            for node in response.source_nodes:
                source = {
                    'file': node.metadata.get('file_name', 'Unknown'),
                    'jurisdiction': self._extract_jurisdiction_from_filename(
                        node.metadata.get('file_name', '')
                    ),
                    'score': getattr(node, 'score', None),
                    'snippet': node.text[:200] if hasattr(node, 'text') else '',
                }
                sources.append(source)

        return sources

    def _extract_jurisdiction_from_filename(self, filename: str) -> str:
        """
        Extract jurisdiction from filename pattern.

        Args:
            filename: The source document filename

        Returns:
            'MY', 'SG', or 'ALL'
        """
        filename_lower = filename.lower()

        if '_my_' in filename_lower or '_my.' in filename_lower:
            return 'MY'
        elif '_sg_' in filename_lower or '_sg.' in filename_lower:
            return 'SG'

        return 'ALL'

    def _detect_jurisdiction_from_sources(
        self,
        sources: List[Dict]
    ) -> Optional[str]:
        """
        Detect jurisdiction from source documents.

        Args:
            sources: List of source dictionaries

        Returns:
            'MY', 'SG', 'BOTH', or None
        """
        jurisdictions = set(s.get('jurisdiction') for s in sources)
        jurisdictions.discard('ALL')
        jurisdictions.discard(None)

        if 'MY' in jurisdictions and 'SG' in jurisdictions:
            return 'BOTH'
        elif 'MY' in jurisdictions:
            return 'MY'
        elif 'SG' in jurisdictions:
            return 'SG'

        return None

    def reset_session(self, session_id: str) -> None:
        """
        Reset a session's context.

        Args:
            session_id: The session to reset
        """
        if session_id in self._session_contexts:
            del self._session_contexts[session_id]

    def get_agent_info(self, agent_type: AgentType) -> Dict:
        """
        Get information about a specific agent.

        Args:
            agent_type: The agent type

        Returns:
            Dictionary with agent information
        """
        info = {
            AgentType.MAIN_HR: {
                'name': 'Chief HR Intelligence Officer',
                'role': 'Orchestrator & Expert',
                'capabilities': [
                    'Multi-jurisdictional expertise (MY/SG)',
                    'Employment law interpretation',
                    'Statutory knowledge',
                    'Query routing',
                ],
                'icon': 'Bot',
                'color': 'derivhr',
            },
            AgentType.POLICY_RESEARCH: {
                'name': 'Policy Research Specialist',
                'role': 'Deep Policy Analysis',
                'capabilities': [
                    'Policy interpretation',
                    'Cross-document analysis',
                    'MY vs SG comparison',
                    'Gap identification',
                ],
                'icon': 'BookOpen',
                'color': 'blue',
            },
            AgentType.COMPLIANCE: {
                'name': 'Compliance Officer',
                'role': 'Statutory & Regulatory',
                'capabilities': [
                    'EPF/SOCSO/CPF calculations',
                    'Overtime calculations',
                    'Visa status checks',
                    'Risk assessment',
                ],
                'icon': 'ShieldCheck',
                'color': 'amber',
            },
            AgentType.DOCUMENT: {
                'name': 'Document Specialist',
                'role': 'Forms & Contracts',
                'capabilities': [
                    'Contract generation',
                    'Document checklists',
                    'Form guidance',
                    'Submission tracking',
                ],
                'icon': 'FileText',
                'color': 'violet',
            },
            AgentType.EMPLOYEE_SUPPORT: {
                'name': 'Employee Support',
                'role': 'Day-to-Day Assistance',
                'capabilities': [
                    'Leave queries',
                    'Onboarding assistance',
                    'Benefits explanation',
                    'General HR support',
                ],
                'icon': 'HeartHandshake',
                'color': 'emerald',
            },
        }

        return info.get(agent_type, info[AgentType.MAIN_HR])


# Singleton instance for easy access
_orchestrator_instance: Optional[AgentOrchestrator] = None


def get_orchestrator() -> AgentOrchestrator:
    """
    Get the global orchestrator instance.

    Returns:
        The AgentOrchestrator singleton
    """
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = AgentOrchestrator()
    return _orchestrator_instance
