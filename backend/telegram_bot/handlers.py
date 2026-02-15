"""
Message Handlers for Telegram Bot

Routes different types of messages and commands to appropriate handlers.
"""

import logging
from telegram import Update
from telegram.ext import ContextTypes
from .auth import AuthService
from .intent_detector import IntentDetector
from .query_service import HRQueryService
from .response_formatter import ResponseFormatter

logger = logging.getLogger(__name__)


class MessageHandlers:
    """Handles all incoming Telegram messages and commands"""
    
    def __init__(
        self,
        auth_service: AuthService,
        intent_detector: IntentDetector,
        query_service: HRQueryService,
        response_formatter: ResponseFormatter
    ):
        """
        Initialize message handlers.
        
        Args:
            auth_service: Authentication service
            intent_detector: Intent detection service
            query_service: HR query service
            response_formatter: Response formatting service
        """
        self.auth = auth_service
        self.intent = intent_detector
        self.query = query_service
        self.formatter = response_formatter
    
    async def handle_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        chat_id = str(update.effective_chat.id)
        logger.info(f"Received /start from chat_id: {chat_id}")
        
        # Check authorization
        is_authorized, user_data = self.auth.is_authorized(chat_id)
        
        if not is_authorized:
            message = self.auth.get_unauthorized_message().format(chat_id=chat_id)
            await update.message.reply_text(message, parse_mode="Markdown")
            return
        
        # Send welcome message
        welcome = self.auth.get_welcome_message(user_data)
        await update.message.reply_text(welcome, parse_mode="Markdown")
    
    async def handle_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        chat_id = str(update.effective_chat.id)
        logger.info(f"Received /help from chat_id: {chat_id}")
        
        # Check authorization
        is_authorized, user_data = self.auth.is_authorized(chat_id)
        
        if not is_authorized:
            message = self.auth.get_unauthorized_message().format(chat_id=chat_id)
            await update.message.reply_text(message, parse_mode="Markdown")
            return
        
        # Send help message
        help_text = self.auth.format_help_message()
        await update.message.reply_text(help_text, parse_mode="Markdown")
    
    async def handle_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /status command"""
        chat_id = str(update.effective_chat.id)
        logger.info(f"Received /status from chat_id: {chat_id}")
        
        # Check authorization
        is_authorized, user_data = self.auth.is_authorized(chat_id)
        
        if not is_authorized:
            message = self.auth.get_unauthorized_message().format(chat_id=chat_id)
            await update.message.reply_text(message, parse_mode="Markdown")
            return
        
        # Bot status
        status_message = (
            "🤖 *Bot Status*\n\n"
            "✅ Online and operational\n"
            "✅ Database connected\n"
            "✅ OpenAI integration active\n\n"
            f"*Your Access:*\n"
            f"Name: {user_data.get('first_name', 'Unknown')}\n"
            f"Role: {user_data.get('role', 'Unknown')}\n"
            f"Department: {user_data.get('department', 'Unknown')}\n"
        )
        await update.message.reply_text(status_message, parse_mode="Markdown")
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle regular text messages (natural language queries)"""
        chat_id = str(update.effective_chat.id)
        message_text = update.message.text
        
        logger.info(f"Received message from {chat_id}: {message_text[:50]}...")
        
        # Check authorization
        is_authorized, user_data = self.auth.is_authorized(chat_id)
        
        if not is_authorized:
            message = self.auth.get_unauthorized_message().format(chat_id=chat_id)
            await update.message.reply_text(message, parse_mode="Markdown")
            return
        
        try:
            # Send "typing" indicator
            await update.message.chat.send_action("typing")
            
            # Step 1: Detect intent
            intent_result = self.intent.detect_intent(message_text)
            logger.info(f"Detected intent: {intent_result.get('intent')}")
            
            # Handle help intent
            if intent_result.get("intent") == "help":
                help_text = self.auth.format_help_message()
                await update.message.reply_text(help_text, parse_mode="Markdown")
                return
            
            # Handle unknown intent
            if intent_result.get("intent") == "unknown":
                response = (
                    "🤔 I'm not sure I understand that question.\n\n"
                    "Try asking about:\n"
                    "• Onboarding progress\n"
                    "• Training completion\n"
                    "• Employee lists\n"
                    "• Document status\n\n"
                    "Or type /help for more examples."
                )
                await update.message.reply_text(response)
                return
            
            # Step 2: Execute query
            query_result = self.query.execute_query(
                intent_result.get("intent"),
                intent_result.get("filters", {})
            )
            
            # Check for query errors
            if "error" in query_result:
                error_msg = f"❌ Query error: {query_result['error']}"
                await update.message.reply_text(error_msg)
                return
            
            # Step 3: Format response
            response = self.formatter.format_response(
                query_result,
                intent_result.get("response_format", "summary")
            )
            
            # Step 4: Send response (split if too long)
            await self._send_long_message(update, response)
            
            logger.info(f"Successfully handled query from {chat_id}")
            
        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)
            error_message = (
                "❌ Sorry, I encountered an error processing your request.\n\n"
                f"Error: {str(e)}\n\n"
                "Please try again or contact support if the issue persists."
            )
            await update.message.reply_text(error_message)
    
    async def handle_error(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle errors"""
        logger.error(f"Update {update} caused error: {context.error}", exc_info=context.error)
        
        if update and update.message:
            await update.message.reply_text(
                "❌ An error occurred. Please try again later."
            )
    
    async def _send_long_message(self, update: Update, message: str):
        """
        Send message, splitting if it exceeds Telegram's 4096 character limit.
        
        Args:
            update: Telegram update object
            message: Message to send
        """
        max_length = 4096
        
        if len(message) <= max_length:
            await update.message.reply_text(message, parse_mode="Markdown")
        else:
            # Split message into chunks
            chunks = []
            current_chunk = ""
            
            for line in message.split("\n"):
                if len(current_chunk) + len(line) + 1 > max_length:
                    chunks.append(current_chunk)
                    current_chunk = line + "\n"
                else:
                    current_chunk += line + "\n"
            
            if current_chunk:
                chunks.append(current_chunk)
            
            # Send chunks
            for i, chunk in enumerate(chunks):
                if i > 0:
                    chunk = f"_(continued {i+1}/{len(chunks)})_\n\n" + chunk
                await update.message.reply_text(chunk, parse_mode="Markdown")
