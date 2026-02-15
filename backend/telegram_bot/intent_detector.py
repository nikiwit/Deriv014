"""
Intent Detection Service using OpenAI

Converts natural language questions into structured queries.
"""

import logging
import json
from typing import Dict, Any, Optional
from openai import OpenAI

logger = logging.getLogger(__name__)


class IntentDetector:
    """Uses OpenAI to detect intent and extract parameters from user messages"""
    
    # Supported intent types
    INTENT_TYPES = [
        "count_onboarding",
        "onboarding_status",
        "training_progress",
        "training_delayed",
        "employee_list",
        "document_status",
        "daily_summary",
        "help",
        "unknown"
    ]
    
    def __init__(self, openai_api_key: str):
        """
        Initialize intent detector with OpenAI client.
        
        Args:
            openai_api_key: OpenAI API key
        """
        self.client = OpenAI(api_key=openai_api_key)
        logger.info("Intent detector initialized with OpenAI")
    
    def detect_intent(self, message: str) -> Dict[str, Any]:
        """
        Detect intent and extract parameters from user message.
        
        Args:
            message: User's natural language question
            
        Returns:
            Dict with intent, filters, and response format preference
            Example:
            {
                "intent": "count_onboarding",
                "filters": {
                    "status": "in_progress",
                    "time_range": "today"
                },
                "response_format": "summary"
            }
        """
        try:
            system_prompt = self._get_system_prompt()
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info(f"Detected intent: {result.get('intent')} for message: '{message[:50]}...'")
            
            return result
            
        except Exception as e:
            logger.error(f"Error detecting intent: {e}")
            return {
                "intent": "unknown",
                "filters": {},
                "response_format": "text",
                "error": str(e)
            }
    
    def _get_system_prompt(self) -> str:
        """
        Get the system prompt for intent detection.
        
        Returns:
            Formatted system prompt
        """
        return """You are an HR intent classifier for a Telegram bot. 
Your job is to convert HR manager questions into structured JSON queries.

Available intents:
- count_onboarding: Count employees in onboarding process
- onboarding_status: Get detailed onboarding progress for specific employees
- training_progress: Get training completion metrics
- training_delayed: Find employees with delayed/incomplete training
- employee_list: List employees with filters
- document_status: Check document submission status
- daily_summary: Daily overview of HR metrics
- help: User asking for help or examples
- unknown: Cannot determine intent

For each question, return JSON with:
{
  "intent": "one_of_the_intents_above",
  "filters": {
    "status": "pending|in_progress|completed|null",
    "time_range": "today|this_week|this_month|null",
    "department": "department_name|null",
    "delayed": true|false|null,
    "completed": true|false|null
  },
  "response_format": "summary|table|detailed"
}

Examples:

User: "How many employees are onboarding right now?"
Response: {
  "intent": "count_onboarding",
  "filters": {"status": "in_progress", "time_range": null},
  "response_format": "summary"
}

User: "Show me employees who completed training this month"
Response: {
  "intent": "training_progress",
  "filters": {"completed": true, "time_range": "this_month"},
  "response_format": "table"
}

User: "Any delayed onboarding cases?"
Response: {
  "intent": "onboarding_status",
  "filters": {"delayed": true},
  "response_format": "detailed"
}

User: "How is the progress today?"
Response: {
  "intent": "daily_summary",
  "filters": {"time_range": "today"},
  "response_format": "summary"
}

User: "List all employees in Engineering"
Response: {
  "intent": "employee_list",
  "filters": {"department": "Engineering"},
  "response_format": "table"
}

Always return valid JSON. Be smart about interpreting similar phrases."""
