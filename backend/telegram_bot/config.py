"""
Independent Configuration Module for Telegram Bot

This config has NO Flask dependencies and can be used standalone.
"""

import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv


@dataclass
class TelegramBotConfig:
    """Configuration for the Telegram HR Bot"""
    
    bot_token: str
    supabase_url: str
    supabase_key: str
    openai_api_key: str
    use_polling: bool = True
    webhook_url: Optional[str] = None
    log_level: str = "INFO"
    
    @classmethod
    def from_env(cls, env_file: Optional[str] = None) -> "TelegramBotConfig":
        """
        Load configuration from environment variables.
        
        Args:
            env_file: Optional path to .env file. If None, uses backend/.env
        """
        if env_file:
            load_dotenv(env_file)
        else:
            # Load from backend/.env by default
            env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
            load_dotenv(env_path)
        
        # Validate required environment variables
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required")
        if not supabase_url:
            raise ValueError("SUPABASE_URL environment variable is required")
        if not supabase_key:
            raise ValueError("SUPABASE_KEY environment variable is required")
        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        return cls(
            bot_token=bot_token,
            supabase_url=supabase_url,
            supabase_key=supabase_key,
            openai_api_key=openai_api_key,
            use_polling=os.getenv("TELEGRAM_USE_POLLING", "true").lower() == "true",
            webhook_url=os.getenv("TELEGRAM_WEBHOOK_URL"),
            log_level=os.getenv("LOG_LEVEL", "INFO").upper()
        )
    
    def validate(self) -> bool:
        """Validate configuration"""
        return bool(
            self.bot_token and 
            self.supabase_url and 
            self.supabase_key and 
            self.openai_api_key
        )
