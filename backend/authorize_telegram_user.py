"""
Helper script to authorize a Telegram user for the HR bot

Usage:
    python authorize_telegram_user.py <chat_id> <email>
    
Example:
    python authorize_telegram_user.py 123456789 emma.ng@derivhr.com
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from telegram_bot.config import TelegramBotConfig
from telegram_bot.database import HRDatabase

def authorize_user(chat_id: str, email: str):
    """Authorize a Telegram user"""
    
    print("="*60)
    print("Authorizing Telegram User")
    print("="*60)
    print()
    
    # Load config
    config = TelegramBotConfig.from_env()
    db = HRDatabase(config.supabase_url, config.supabase_key)
    
    # Find user by email
    print(f"1. Looking up user: {email}")
    try:
        result = db.client.table("users").select("*").eq("email", email).execute()
        
        if not result.data:
            print(f"   ❌ User not found: {email}")
            print(f"   Available HR admins:")
            hr_admins = db.get_all_users(role="hr_admin")
            for admin in hr_admins:
                print(f"      - {admin.get('email')}")
            return False
        
        user = result.data[0]
        user_id = user.get("id")
        role = user.get("role")
        
        print(f"   ✅ User found: {user.get('first_name')} {user.get('last_name')}")
        print(f"      Role: {role}")
        print(f"      ID: {user_id}")
        
        if role != "hr_admin":
            print(f"   ⚠️  Warning: User is not an HR admin!")
            print(f"   The bot only allows hr_admin role access.")
            response = input("   Continue anyway? (yes/no): ")
            if response.lower() != "yes":
                print("   Cancelled.")
                return False
    
    except Exception as e:
        print(f"   ❌ Error finding user: {e}")
        return False
    
    print()
    
    # Check if already authorized
    print(f"2. Checking existing authorization...")
    try:
        existing = db.client.table("telegram_authorized_users") \
            .select("*") \
            .eq("telegram_chat_id", str(chat_id)) \
            .execute()
        
        if existing.data:
            print(f"   ⚠️  Chat ID {chat_id} is already authorized!")
            existing_user = existing.data[0]
            print(f"      Current user ID: {existing_user.get('user_id')}")
            print(f"      Active: {existing_user.get('is_active')}")
            
            response = input("   Update authorization? (yes/no): ")
            if response.lower() != "yes":
                print("   Cancelled.")
                return False
            
            # Update existing
            db.client.table("telegram_authorized_users") \
                .update({
                    "user_id": user_id,
                    "is_active": True
                }) \
                .eq("telegram_chat_id", str(chat_id)) \
                .execute()
            
            print(f"   ✅ Authorization updated!")
        else:
            print(f"   No existing authorization found.")
    
    except Exception as e:
        print(f"   ❌ Error checking authorization: {e}")
        return False
    
    print()
    
    # Add authorization
    print(f"3. Adding authorization...")
    try:
        if not existing.data:
            db.add_authorized_user(
                telegram_chat_id=str(chat_id),
                telegram_username=None,
                user_id=user_id,
                authorized_by=user_id  # Self-authorization
            )
            print(f"   ✅ User authorized successfully!")
        
    except Exception as e:
        print(f"   ❌ Error adding authorization: {e}")
        return False
    
    print()
    
    # Verify
    print(f"4. Verifying authorization...")
    try:
        is_auth, user_data = db.is_user_authorized(str(chat_id))
        
        if is_auth:
            print(f"   ✅ Authorization verified!")
            print(f"      Name: {user_data.get('first_name')} {user_data.get('last_name')}")
            print(f"      Email: {user_data.get('email')}")
            print(f"      Role: {user_data.get('role')}")
        else:
            print(f"   ❌ Authorization failed verification!")
            return False
    
    except Exception as e:
        print(f"   ❌ Error verifying: {e}")
        return False
    
    print()
    print("="*60)
    print("✅ SUCCESS!")
    print("="*60)
    print()
    print("Next steps:")
    print("1. Start the bot: python run_telegram_bot.py")
    print("2. Open Telegram and message your bot")
    print("3. Send: /start")
    print()
    print("You should now see a welcome message!")
    print()
    
    return True


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python authorize_telegram_user.py <chat_id> <email>")
        print()
        print("Example:")
        print("  python authorize_telegram_user.py 123456789 emma.ng@derivhr.com")
        print()
        print("To get your chat ID:")
        print("  1. Start the bot: python run_telegram_bot.py")
        print("  2. Message your bot on Telegram")
        print("  3. Check the logs for: 'Unauthorized access attempt from chat_id: XXXXXX'")
        print("  4. Use that chat ID here")
        print()
        sys.exit(1)
    
    chat_id = sys.argv[1]
    email = sys.argv[2]
    
    success = authorize_user(chat_id, email)
    sys.exit(0 if success else 1)
