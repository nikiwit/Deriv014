"""
Diagnose network connectivity issues with Telegram bot
"""
import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(__file__))

print("="*60)
print("🔍 Telegram Bot Network Diagnostics")
print("="*60)
print()

# Test 1: Check bot token format
print("1. Checking bot token...")
from telegram_bot.config import TelegramBotConfig
try:
    config = TelegramBotConfig.from_env()
    token = config.bot_token
    
    if ":" in token and len(token) > 40:
        print(f"   ✅ Token format looks valid")
        print(f"   Token: {'*' * 20}{token[-10:]}")
    else:
        print(f"   ❌ Token format looks invalid")
        print(f"   Token should be like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz")
except Exception as e:
    print(f"   ❌ Error loading config: {e}")
    sys.exit(1)

print()

# Test 2: Test basic network connectivity
print("2. Testing network connectivity...")
try:
    import urllib.request
    import ssl
    
    # Try to reach Telegram API
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    url = f"https://api.telegram.org/bot{token}/getMe"
    req = urllib.request.Request(url)
    
    print(f"   Testing: {url[:50]}...")
    
    try:
        response = urllib.request.urlopen(req, context=context, timeout=10)
        data = response.read()
        print(f"   ✅ Can reach Telegram API!")
        print(f"   Response: {data[:100].decode()}")
    except urllib.error.HTTPError as e:
        print(f"   ❌ HTTP Error {e.code}: {e.reason}")
        if e.code == 401:
            print(f"   The bot token is invalid!")
        elif e.code == 404:
            print(f"   The endpoint doesn't exist")
    except urllib.error.URLError as e:
        print(f"   ❌ Network Error: {e.reason}")
        print(f"   Possible causes:")
        print(f"   - Firewall blocking connection")
        print(f"   - VPN/Proxy issues")
        print(f"   - No internet connection")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        
except Exception as e:
    print(f"   ❌ Test failed: {e}")

print()

# Test 3: Test with requests library
print("3. Testing with requests library...")
try:
    import requests
    url = f"https://api.telegram.org/bot{token}/getMe"
    response = requests.get(url, timeout=10, verify=False)
    
    if response.status_code == 200:
        print(f"   ✅ Requests library works!")
        data = response.json()
        if data.get('ok'):
            print(f"   Bot info: {data.get('result', {}).get('username')}")
    else:
        print(f"   ❌ Status code: {response.status_code}")
        
except ImportError:
    print(f"   ⚠️  requests library not installed")
except Exception as e:
    print(f"   ❌ Error: {e}")

print()

# Test 4: Test with httpx (what telegram bot uses)
print("4. Testing with httpx (telegram bot's library)...")
try:
    import httpx
    
    async def test_httpx():
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            url = f"https://api.telegram.org/bot{token}/getMe"
            response = await client.get(url)
            return response
    
    response = asyncio.run(test_httpx())
    
    if response.status_code == 200:
        print(f"   ✅ httpx works!")
        data = response.json()
        if data.get('ok'):
            print(f"   Bot username: @{data.get('result', {}).get('username')}")
    else:
        print(f"   ❌ Status code: {response.status_code}")
        
except Exception as e:
    print(f"   ❌ httpx error: {e}")
    print(f"   This is the same error the bot is experiencing!")

print()
print("="*60)
print("Diagnosis Complete")
print("="*60)
print()

print("💡 Recommendations:")
print()
print("If network tests failed:")
print("  1. Check your internet connection")
print("  2. Check if a firewall is blocking Python")
print("  3. Try disabling VPN if you're using one")
print("  4. Check if api.telegram.org is accessible")
print()
print("If bot token is invalid:")
print("  1. Go to @BotFather on Telegram")
print("  2. Send /mybots")
print("  3. Select your bot")
print("  4. Get new token if needed")
print()
print("To test manually:")
print(f"  curl https://api.telegram.org/bot{token[:20]}...{token[-10:]}/getMe")
print()
