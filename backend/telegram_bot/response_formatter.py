"""
Response Formatter Service

Formats query results into human-friendly or structured table responses using OpenAI.
"""

import logging
import json
from typing import Dict, Any
from openai import OpenAI

logger = logging.getLogger(__name__)


class ResponseFormatter:
    """Formats query results into user-friendly messages"""
    
    def __init__(self, openai_api_key: str):
        """
        Initialize response formatter with OpenAI client.
        
        Args:
            openai_api_key: OpenAI API key
        """
        self.client = OpenAI(api_key=openai_api_key)
        logger.info("Response formatter initialized with OpenAI")
    
    def format_response(
        self, 
        query_result: Dict[str, Any], 
        response_format: str = "summary"
    ) -> str:
        """
        Format query result into a user-friendly message.
        
        Args:
            query_result: Result from HRQueryService
            response_format: "summary", "table", or "detailed"
            
        Returns:
            Formatted message string
        """
        intent = query_result.get("intent")
        
        # Handle errors
        if "error" in query_result:
            return f"❌ Error: {query_result['error']}"
        
        # Route to appropriate formatter
        try:
            if response_format == "table":
                return self._format_as_table(query_result)
            elif response_format == "detailed":
                return self._format_as_detailed(query_result)
            else:
                return self._format_as_summary(query_result)
        except Exception as e:
            logger.error(f"Error formatting response: {e}")
            return f"❌ Error formatting response: {str(e)}"
    
    def _format_as_summary(self, query_result: Dict[str, Any]) -> str:
        """Format as human-like summary using OpenAI"""
        try:
            system_prompt = """You are an HR assistant formatting data for managers via Telegram.
Convert the query results into a natural, conversational summary.
Use emojis appropriately. Keep it concise but informative.
Use Markdown formatting for emphasis (*bold*, _italic_).
"""
            
            user_prompt = f"""Format these HR query results into a friendly summary:

Intent: {query_result.get('intent')}
Data: {json.dumps(query_result, default=str, indent=2)}

Make it conversational and highlight key insights."""
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return self._fallback_format(query_result)
    
    def _format_as_table(self, query_result: Dict[str, Any]) -> str:
        """Format as structured table"""
        intent = query_result.get("intent")
        data = query_result.get("data", [])
        count = query_result.get("count", 0)
        
        if not data:
            return f"📊 No data found for this query."
        
        # Build table based on intent
        if intent == "employee_list":
            return self._build_employee_table(data, count)
        elif intent == "training_progress":
            return self._build_training_table(data, count)
        elif intent == "onboarding_status":
            return self._build_onboarding_table(data, count)
        else:
            return self._fallback_format(query_result)
    
    def _format_as_detailed(self, query_result: Dict[str, Any]) -> str:
        """Format as detailed list with all information"""
        intent = query_result.get("intent")
        data = query_result.get("data", [])
        count = query_result.get("count", 0)
        
        if not data:
            return f"📋 No results found."
        
        output = f"*Detailed Results* ({count} items)\n\n"
        
        for i, item in enumerate(data[:10], 1):  # Limit to 10 for Telegram
            output += f"*{i}. {item.get('employee_name', item.get('full_name', 'Unknown'))}*\n"
            
            # Add relevant fields based on intent
            if intent == "onboarding_status":
                output += f"   Progress: {item.get('progress_percentage', 0)}%\n"
                output += f"   Documents: {item.get('submitted_documents', 0)}/{item.get('total_documents', 0)}\n"
                if item.get('is_delayed'):
                    output += f"   ⚠️ Delayed ({item.get('days_since_created', 0)} days)\n"
            
            elif intent == "training_progress":
                output += f"   Department: {item.get('department', 'N/A')}\n"
                output += f"   Progress: {item.get('progress_percentage', 0)}%\n"
                output += f"   Completed: {item.get('completed_items', 0)}/{item.get('total_training_items', 0)}\n"
            
            output += "\n"
        
        if len(data) > 10:
            output += f"_... and {len(data) - 10} more_\n"
        
        return output
    
    def _build_employee_table(self, data: list, count: int) -> str:
        """Build employee list table"""
        output = f"👥 *Employee List* ({count} employees)\n\n"
        output += "```\n"
        output += f"{'Name':<20} {'Dept':<15} {'Email':<25}\n"
        output += "-" * 60 + "\n"
        
        for emp in data[:15]:  # Limit to 15
            name = (emp.get('first_name', '') + ' ' + emp.get('last_name', ''))[:19]
            dept = (emp.get('department', 'N/A'))[:14]
            email = (emp.get('email', 'N/A'))[:24]
            output += f"{name:<20} {dept:<15} {email:<25}\n"
        
        output += "```\n"
        
        if len(data) > 15:
            output += f"\n_... and {len(data) - 15} more employees_"
        
        return output
    
    def _build_training_table(self, data: list, count: int) -> str:
        """Build training progress table"""
        output = f"📚 *Training Progress* ({count} employees)\n\n"
        output += "```\n"
        output += f"{'Name':<20} {'Dept':<12} {'Progress':<10} {'Status'}\n"
        output += "-" * 60 + "\n"
        
        for item in data[:15]:
            name = item.get('employee_name', 'Unknown')[:19]
            dept = item.get('department', 'N/A')[:11]
            progress = f"{item.get('progress_percentage', 0)}%"
            status = "✅" if item.get('is_completed') else "🔄"
            
            output += f"{name:<20} {dept:<12} {progress:<10} {status}\n"
        
        output += "```\n"
        
        if len(data) > 15:
            output += f"\n_... and {len(data) - 15} more_"
        
        return output
    
    def _build_onboarding_table(self, data: list, count: int) -> str:
        """Build onboarding status table"""
        output = f"📊 *Onboarding Status* ({count} employees)\n\n"
        output += "```\n"
        output += f"{'Name':<20} {'Progress':<10} {'Days':<6} {'Status'}\n"
        output += "-" * 55 + "\n"
        
        for item in data[:15]:
            name = item.get('full_name', 'Unknown')[:19]
            progress = f"{item.get('progress_percentage', 0)}%"
            days = str(item.get('days_since_created', 0))
            status = "⚠️" if item.get('is_delayed') else "✅"
            
            output += f"{name:<20} {progress:<10} {days:<6} {status}\n"
        
        output += "```\n"
        
        if len(data) > 15:
            output += f"\n_... and {len(data) - 15} more_"
        
        return output
    
    def _fallback_format(self, query_result: Dict[str, Any]) -> str:
        """Fallback formatting when specific formatter isn't available"""
        intent = query_result.get("intent")
        count = query_result.get("count", 0)
        
        output = f"📊 *{intent.replace('_', ' ').title()}*\n\n"
        output += f"Results: {count} items found\n\n"
        
        # Show metrics if available
        if "metrics" in query_result:
            output += "*Metrics:*\n"
            for key, value in query_result["metrics"].items():
                output += f"• {key.replace('_', ' ').title()}: {value}\n"
        
        return output
