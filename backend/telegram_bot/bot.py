"""
Main Telegram HR Bot

Ties together all components and runs the bot.
This module is completely independent from Flask.
"""

import logging
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters
)

from .config import TelegramBotConfig
from .database import HRDatabase
from .auth import AuthService
from .intent_detector import IntentDetector
from .query_service import HRQueryService
from .response_formatter import ResponseFormatter
from .handlers import MessageHandlers

logger = logging.getLogger(__name__)


class TelegramHRBot:
    """Main Telegram bot for HR Manager queries"""
    
    def __init__(self, config: TelegramBotConfig):
        """
        Initialize the Telegram HR Bot.
        
        Args:
            config: Bot configuration
        """
        self.config = config
        
        # Validate configuration
        if not config.validate():
            raise ValueError("Invalid bot configuration. Check your environment variables.")
        
        logger.info("Initializing Telegram HR Bot...")
        
        # Initialize core services
        self.database = HRDatabase(config.supabase_url, config.supabase_key)
        self.auth_service = AuthService(self.database)
        self.intent_detector = IntentDetector(config.openai_api_key)
        self.query_service = HRQueryService(self.database)
        self.response_formatter = ResponseFormatter(config.openai_api_key)
        
        # Initialize message handlers
        self.message_handlers = MessageHandlers(
            self.auth_service,
            self.intent_detector,
            self.query_service,
            self.response_formatter
        )
        
        # Build application
        self.application = Application.builder().token(config.bot_token).build()
        self._register_handlers()
        
        logger.info("Telegram HR Bot initialized successfully!")
    
    def _register_handlers(self):
        """Register all command and message handlers"""
        # Command handlers
        self.application.add_handler(
            CommandHandler("start", self.message_handlers.handle_start)
        )
        self.application.add_handler(
            CommandHandler("help", self.message_handlers.handle_help)
        )
        self.application.add_handler(
            CommandHandler("status", self.message_handlers.handle_status)
        )
        
        # Message handler for natural language queries
        self.application.add_handler(
            MessageHandler(
                filters.TEXT & ~filters.COMMAND,
                self.message_handlers.handle_message
            )
        )
        
        # Error handler
        self.application.add_error_handler(self.message_handlers.handle_error)
        
        logger.info("Handlers registered")
    
    def run(self):
        """
        Run the bot using polling or webhook based on configuration.
        """
        if self.config.use_polling:
            logger.info("Starting bot with polling...")
            self.run_polling()
        else:
            logger.info("Starting bot with webhook...")
            self.run_webhook()
    
    def run_polling(self):
        """
        Run bot with polling (recommended for development).
        Blocks until interrupted.
        """
        logger.info("🤖 Telegram HR Bot is running (polling mode)")
        logger.info("Press Ctrl+C to stop")
        
        # Start polling
        self.application.run_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True
        )
    
    def run_webhook(self):
        """
        Run bot with webhook (recommended for production).
        Requires TELEGRAM_WEBHOOK_URL in config.
        """
        if not self.config.webhook_url:
            raise ValueError("TELEGRAM_WEBHOOK_URL must be set for webhook mode")
        
        logger.info(f"🤖 Telegram HR Bot is running (webhook mode)")
        logger.info(f"Webhook URL: {self.config.webhook_url}")
        
        # Start webhook
        self.application.run_webhook(
            listen="0.0.0.0",
            port=8443,
            url_path=self.config.bot_token,
            webhook_url=f"{self.config.webhook_url}/{self.config.bot_token}"
        )
    
    async def stop(self):
        """Stop the bot gracefully"""
        logger.info("Stopping Telegram HR Bot...")
        try:
            await self.application.stop()
            # Clean up database connection
            if hasattr(self, 'database') and self.database:
                self.database.close()
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
        logger.info("Bot stopped")


def setup_logging(log_level: str = "INFO"):
    """
    Configure logging for the bot.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
    """
    logging.basicConfig(
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        level=getattr(logging, log_level.upper())
    )
    
    # Reduce noise from external libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("telegram").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
