"""
Standalone Runner for Telegram HR Bot

This script runs the Telegram bot independently from the Flask application.
Can be deployed separately or run on the same server as a separate process.

Usage:
    python run_telegram_bot.py
"""

import sys
import os

# Add parent directory to path so we can import telegram_bot module
sys.path.insert(0, os.path.dirname(__file__))

from telegram_bot.bot import TelegramHRBot, setup_logging
from telegram_bot.config import TelegramBotConfig


def main():
    """Main entry point for the Telegram bot"""
    
    print("=" * 60)
    print("🤖  Telegram HR Manager Bot")
    print("=" * 60)
    print()
    
    try:
        # Load configuration from environment
        config = TelegramBotConfig.from_env()
        
        # Setup logging
        setup_logging(config.log_level)
        
        # Display configuration (without sensitive data)
        print("Configuration loaded:")
        print(f"  ✓ Bot Token: {'*' * 20}{config.bot_token[-10:]}")
        print(f"  ✓ Supabase URL: {config.supabase_url}")
        print(f"  ✓ OpenAI API Key: {'*' * 20}")
        print(f"  ✓ Mode: {'Polling' if config.use_polling else 'Webhook'}")
        print(f"  ✓ Log Level: {config.log_level}")
        print()
        
        # Create and run bot
        bot = TelegramHRBot(config)
        bot.run()
        
    except ValueError as e:
        print(f"\n❌ Configuration Error: {e}")
        print("\nPlease ensure the following environment variables are set:")
        print("  - TELEGRAM_BOT_TOKEN")
        print("  - SUPABASE_URL")
        print("  - SUPABASE_KEY")
        print("  - OPENAI_API_KEY")
        print("\nOptional:")
        print("  - TELEGRAM_USE_POLLING (default: true)")
        print("  - TELEGRAM_WEBHOOK_URL (required for webhook mode)")
        print("  - LOG_LEVEL (default: INFO)")
        sys.exit(1)
        
    except KeyboardInterrupt:
        print("\n\n✋ Bot stopped by user")
        sys.exit(0)
        
    except Exception as e:
        print(f"\n❌ Fatal Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
