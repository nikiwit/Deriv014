"""
Authentication and Authorization Service for Telegram Bot

Verifies that only authorized HR managers can use the bot.
"""

import logging
from typing import Optional, Dict, Any
from .database import HRDatabase

logger = logging.getLogger(__name__)


class AuthService:
    """Handles authentication and authorization for Telegram bot users"""
    
    def __init__(self, database: HRDatabase):
        """
        Initialize authentication service.
        
        Args:
            database: HRDatabase instance
        """
        self.db = database
    
    def is_authorized(self, telegram_chat_id: str) -> tuple[bool, Optional[Dict[str, Any]]]:
        """
        Check if a Telegram user is authorized to use the bot.
        
        Args:
            telegram_chat_id: The Telegram chat ID (as string)
            
        Returns:
            Tuple of (is_authorized, user_data)
            - is_authorized: True if user is an authorized HR manager
            - user_data: Dict with user info if authorized, None otherwise
        """
        is_auth, user_data = self.db.is_user_authorized(telegram_chat_id)
        
        if is_auth:
            logger.info(f"Authorized user: {user_data.get('email', 'unknown')} (chat_id: {telegram_chat_id})")
        else:
            logger.warning(f"Unauthorized access attempt from chat_id: {telegram_chat_id}")
        
        return is_auth, user_data
    
    def get_unauthorized_message(self) -> str:
        """
        Get the message to send to unauthorized users.
        
        Returns:
            Helpful message explaining why access is denied
        """
        return (
            "🚫 *Access Denied*\n\n"
            "You are not authorized to use this HR Manager bot.\n\n"
            "This bot is restricted to HR administrators only. "
            "If you are an HR manager and need access, please contact your system administrator "
            "to have your Telegram account authorized.\n\n"
            "Your Telegram Chat ID (provide this to admin): `{chat_id}`"
        )
    
    def get_welcome_message(self, user_data: Dict[str, Any]) -> str:
        """
        Get personalized welcome message for authorized users.
        
        Args:
            user_data: User information from database
            
        Returns:
            Welcome message with user's name
        """
        first_name = user_data.get("first_name", "")
        department = user_data.get("department", "HR")
        
        return (
            f"👋 Welcome, {first_name}!\n\n"
            f"I'm your HR Manager Assistant. I can help you with:\n\n"
            f"📊 Onboarding progress reports\n"
            f"📚 Training completion status\n"
            f"👥 Employee statistics\n"
            f"📄 Document submission tracking\n"
            f"⚠️ Delayed cases and alerts\n\n"
            f"Just ask me questions in natural language, like:\n"
            f"• \"How many employees are onboarding?\"\n"
            f"• \"Show me training progress this month\"\n"
            f"• \"Any delayed onboarding cases?\"\n\n"
            f"Department: {department}\n"
            f"Type /help for more examples."
        )
    
    def format_help_message(self) -> str:
        """
        Get comprehensive help message with example queries.
        
        Returns:
            Formatted help message
        """
        return (
            "📖 *HR Manager Bot Help*\n\n"
            "*Example Questions:*\n\n"
            
            "*Onboarding:*\n"
            "• How many employees are onboarding?\n"
            "• Show me onboarding progress today\n"
            "• Any delayed onboarding cases?\n"
            "• List employees who started this week\n\n"
            
            "*Training:*\n"
            "• Who completed training this month?\n"
            "• Show me employees with incomplete training\n"
            "• Training progress summary\n"
            "• Who didn't finish mandatory training?\n\n"
            
            "*General:*\n"
            "• How is the progress today?\n"
            "• Give me a daily summary\n"
            "• Show all employees in Engineering\n"
            "• Document submission status\n\n"
            
            "*Commands:*\n"
            "/start - Welcome message\n"
            "/help - This help message\n"
            "/status - Bot status\n\n"
            
            "Just type your question naturally, and I'll understand! 🤖"
        )
