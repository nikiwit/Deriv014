"""
Quick test script to check bot components
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from telegram_bot.config import TelegramBotConfig
from telegram_bot.database import HRDatabase

print("="*60)
print("Testing Telegram Bot Components")
print("="*60)
print()

# Test 1: Configuration
print("1. Testing Configuration...")
try:
    config = TelegramBotConfig.from_env()
    print("   ✅ Configuration loaded successfully")
    print(f"   - Bot Token: {'*' * 20}{config.bot_token[-10:]}")
    print(f"   - Supabase URL: {config.supabase_url}")
    print(f"   - Polling Mode: {config.use_polling}")
except Exception as e:
    print(f"   ❌ Configuration error: {e}")
    sys.exit(1)

print()

# Test 2: Database Connection
print("2. Testing Database Connection...")
try:
    db = HRDatabase(config.supabase_url, config.supabase_key)
    print("   ✅ Database connected")
except Exception as e:
    print(f"   ❌ Database connection error: {e}")
    sys.exit(1)

print()

# Test 3: Check tables exist
print("3. Checking Database Tables...")

# Check users table
try:
    users = db.get_all_users()
    print(f"   ✅ users table: {len(users)} records")
except Exception as e:
    print(f"   ❌ users table error: {e}")

# Check employees table  
try:
    employees = db.get_all_employees()
    print(f"   ✅ employees table: {len(employees)} records")
except Exception as e:
    print(f"   ❌ employees table error: {e}")

# Check telegram_authorized_users table
try:
    result = db.client.table("telegram_authorized_users").select("*").execute()
    print(f"   ✅ telegram_authorized_users table: {len(result.data)} records")
    if len(result.data) == 0:
        print("   ⚠️  No authorized users yet - you need to add yourself!")
except Exception as e:
    print(f"   ❌ telegram_authorized_users table error: {e}")
    print("   ⚠️  Table may not exist - run schema.sql in Supabase!")

print()

# Test 4: Check if HR admin exists
print("4. Checking for HR Admin Users...")
try:
    hr_admins = db.get_all_users(role="hr_admin")
    if hr_admins:
        print(f"   ✅ Found {len(hr_admins)} HR admin(s):")
        for admin in hr_admins:
            print(f"      - {admin.get('email')} (ID: {admin.get('id')})")
    else:
        print("   ⚠️  No HR admins found - check your users table")
except Exception as e:
    print(f"   ❌ Error checking HR admins: {e}")

print()
print("="*60)
print("Test Complete!")
print("="*60)
print()
print("Next Steps:")
print("1. If telegram_authorized_users table doesn't exist:")
print("   - Go to Supabase Dashboard > SQL Editor")
print("   - Run backend/telegram_bot/schema.sql")
print()
print("2. To authorize yourself:")
print("   - Start the bot: python run_telegram_bot.py")
print("   - Message your bot on Telegram")
print("   - Check logs for your chat ID")
print("   - Add your chat ID to telegram_authorized_users table")
print()
