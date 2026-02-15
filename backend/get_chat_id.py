"""
Helper script to get your Telegram Chat ID

This script runs the bot and listens for messages.
When you message the bot, it will display your chat ID clearly.

Usage:
    python get_chat_id.py
    
Then message your bot on Telegram and your chat ID will appear here.
"""
import sys
import os
import asyncio
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

sys.path.insert(0, os.path.dirname(__file__))

from telegram_bot.config import TelegramBotConfig

print("="*60)
print("🔍 Telegram Chat ID Finder")
print("="*60)
print()
print("Instructions:")
print("1. Keep this script running")
print("2. Open Telegram and find your bot")
print("3. Send ANY message to your bot")
print("4. Your Chat ID will appear below")
print()
print("="*60)
print()
print("Waiting for messages...")
print("(Press Ctrl+C to stop)")
print()

# Track shown chat IDs to avoid duplicates
shown_chat_ids = set()

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming messages and display chat ID"""
    chat_id = update.effective_chat.id
    username = update.effective_user.username
    first_name = update.effective_user.first_name
    last_name = update.effective_user.last_name
    message_text = update.message.text
    
    if chat_id not in shown_chat_ids:
        shown_chat_ids.add(chat_id)
        
        print("="*60)
        print("✅ MESSAGE RECEIVED!")
        print("="*60)
        print()
        print(f"👤 User Information:")
        print(f"   Name: {first_name} {last_name or ''}")
        print(f"   Username: @{username}" if username else "   Username: (none)")
        print(f"   Message: {message_text[:50]}...")
        print()
        print(f"🔑 YOUR TELEGRAM CHAT ID:")
        print(f"   {chat_id}")
        print()
        print("="*60)
        print()
        print(f"📋 To authorize this user, run:")
        print(f"   python authorize_telegram_user.py {chat_id} YOUR_EMAIL@derivhr.com")
        print()
        print(f"Example:")
        print(f"   python authorize_telegram_user.py {chat_id} emma.ng@derivhr.com")
        print()
        print("="*60)
        print()
        print("Waiting for more messages...")
        print("(Press Ctrl+C to stop)")
        print()
    
    # Send a response
    await update.message.reply_text(
        f"✅ Got it!\n\n"
        f"Your Chat ID is: `{chat_id}`\n\n"
        f"The admin needs to authorize this Chat ID for you to use the bot.\n\n"
        f"Chat ID: `{chat_id}`",
        parse_mode="Markdown"
    )

def main():
    """Run the chat ID finder"""
    try:
        # Load config
        config = TelegramBotConfig.from_env()
        
        # Create application
        application = Application.builder().token(config.bot_token).build()
        
        # Add message handler (responds to all messages)
        application.add_handler(
            MessageHandler(filters.TEXT | filters.COMMAND, handle_message)
        )
        
        # Run with polling
        application.run_polling(allowed_updates=Update.ALL_TYPES)
        
    except KeyboardInterrupt:
        print("\n\n✋ Stopped by user")
        print()
        if shown_chat_ids:
            print("📝 Chat IDs collected:")
            for chat_id in shown_chat_ids:
                print(f"   {chat_id}")
        print()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
