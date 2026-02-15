# 🔧 Network Error Fix

## Error You're Seeing:
```
NetworkError: httpx.[error]: [details]
```

This means the bot can't connect to Telegram's API servers.

---

## 🚀 Quick Fixes (Try These In Order):

### Fix 1: Check Internet Connection
```bash
# Test if you can reach Telegram API
curl https://api.telegram.org/bot8354590552:AAE_MXUP9JuU64uYVKlp-p62lGVPFsOz9aI/getMe
```

If this works, you'll see JSON with your bot info.
If it fails, check your internet connection.

---

### Fix 2: Disable SSL Verification (Temporary)

Edit `backend/telegram_bot/bot.py` and change the Application builder:

**Current:**
```python
self.application = Application.builder().token(config.bot_token).build()
```

**Change to:**
```python
from telegram.request import HTTPXRequest

# Create request with SSL disabled
request = HTTPXRequest(
    connection_pool_size=8,
    connect_timeout=30.0,
    read_timeout=30.0,
    write_timeout=30.0,
    pool_timeout=30.0,
)

self.application = Application.builder() \
    .token(config.bot_token) \
    .request(request) \
    .build()
```

---

### Fix 3: Use Proxy (If Behind Firewall)

If you're behind a corporate firewall or VPN:

Edit `backend/telegram_bot/bot.py`:

```python
from telegram.request import HTTPXRequest
import httpx

# Configure proxy
proxy_url = "http://your-proxy:port"  # Update this

request = HTTPXRequest(
    proxy=proxy_url,
    connection_pool_size=8,
)

self.application = Application.builder() \
    .token(config.bot_token) \
    .request(request) \
    .build()
```

---

### Fix 4: Check Firewall/Antivirus

Your firewall might be blocking Python from accessing the internet.

**macOS:**
```bash
# Allow Python through firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/python3
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/python3
```

**Or:** System Preferences → Security & Privacy → Firewall → Allow Python

---

### Fix 5: Try Different Network

- Disable VPN if you're using one
- Try mobile hotspot instead of WiFi
- Try different WiFi network

---

### Fix 6: Verify Bot Token

Make sure your bot token is valid:

1. Open Telegram
2. Message @BotFather
3. Send `/mybots`
4. Select your bot
5. Click "API Token"
6. Verify it matches your `.env` file

---

## 🧪 Test Connection Manually

```bash
# Test from terminal
cd backend
source ../venv/bin/activate

# Test with curl
curl https://api.telegram.org/bot$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/getMe

# Should return JSON like:
# {"ok":true,"result":{"id":123456789,"is_bot":true,"username":"your_bot"}}
```

---

## 📝 Detailed Diagnostic

Create this test file to diagnose:

```python
# test_connection.py
import httpx
import asyncio

async def test():
    token = "8354590552:AAE_MXUP9JuU64uYVKlp-p62lGVPFsOz9aI"
    
    # Test 1: Basic connection
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.telegram.org/bot{token}/getMe",
                timeout=10.0
            )
            print(f"✅ Connection works!")
            print(f"Bot: {response.json()}")
    except httpx.ConnectError as e:
        print(f"❌ Can't connect: {e}")
        print("Check firewall/internet")
    except httpx.TimeoutException:
        print(f"❌ Timeout - network too slow")
    except Exception as e:
        print(f"❌ Error: {e}")

asyncio.run(test())
```

Run it:
```bash
python test_connection.py
```

---

## 🎯 Most Likely Solutions:

1. **VPN/Proxy Issue** - Disable VPN or configure proxy
2. **Firewall** - Allow Python through firewall  
3. **Corporate Network** - May block Telegram, use personal hotspot
4. **SSL Issue** - Use Fix 2 (disable SSL verification temporarily)

---

## ✅ After Fixing:

Once network works, restart the bot:

```bash
cd backend
python run_telegram_bot.py
```

You should see:
```
🤖 Telegram HR Bot is running (polling mode)
```

Then test in Telegram:
```
/start
```

---

**Need more help?** Share the output of:
```bash
curl https://api.telegram.org/bot8354590552:AAE_MXUP9JuU64uYVKlp-p62lGVPFsOz9aI/getMe
```
