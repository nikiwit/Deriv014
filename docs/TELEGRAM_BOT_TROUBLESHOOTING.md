# Telegram Bot - Troubleshooting Guide

## Common Errors and Solutions

### ❌ AttributeError: 'SyncSupabaseAuthClient' object has no attribute '_refresh_token_timer'

**Error Message:**
```
File ".../supabase_auth/_sync/gotrue_client.py", line 1288, in __del__
    if self._refresh_token_timer:
AttributeError: 'SyncSupabaseAuthClient' object has no attribute '_refresh_token_timer'
```

**What It Means:**
This is a known issue with certain versions of the Supabase Python SDK. It occurs when the auth client is being cleaned up during shutdown.

**Solution:**

1. **Update Supabase library** (already fixed in code):
   ```bash
   pip install --upgrade supabase
   ```

2. **The fix is already implemented** in `backend/telegram_bot/database.py`:
   - Disabled auto-refresh token
   - Added graceful shutdown
   - Proper cleanup methods

3. **If error persists**, you can safely **ignore it** - it's a cleanup warning that doesn't affect bot functionality.

**Status:** ✅ **Fixed** - The code has been updated to prevent this error.

---

### ❌ Access Denied

**Error Message:**
```
🚫 Access Denied
You are not authorized to use this HR Manager bot.
```

**Solution:**

1. **Check your chat ID is in the database:**
   ```sql
   SELECT * FROM telegram_authorized_users WHERE telegram_chat_id = 'YOUR_CHAT_ID';
   ```

2. **Make sure `is_active = true`:**
   ```sql
   UPDATE telegram_authorized_users 
   SET is_active = true 
   WHERE telegram_chat_id = 'YOUR_CHAT_ID';
   ```

3. **Verify your user has `hr_admin` role:**
   ```sql
   SELECT id, email, role FROM users WHERE id = 'YOUR_USER_ID';
   ```

4. **If not authorized, add yourself:**
   ```sql
   INSERT INTO telegram_authorized_users (telegram_chat_id, user_id, authorized_by, is_active)
   VALUES (
     'YOUR_CHAT_ID',
     (SELECT id FROM users WHERE email = 'your@email.com' AND role = 'hr_admin'),
     (SELECT id FROM users WHERE email = 'your@email.com' AND role = 'hr_admin'),
     true
   );
   ```

---

### ❌ Configuration Error: TELEGRAM_BOT_TOKEN environment variable is required

**Error Message:**
```
ValueError: TELEGRAM_BOT_TOKEN environment variable is required
```

**Solution:**

1. **Check `.env` file exists** at `backend/.env`

2. **Add bot token** to `.env`:
   ```bash
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

3. **No spaces** around the `=` sign

4. **Restart the bot** after updating `.env`

---

### ❌ Bot doesn't respond

**Symptoms:**
- Bot shows as online
- You send messages
- No response

**Solution:**

1. **Check bot is running:**
   ```bash
   ps aux | grep run_telegram_bot
   ```

2. **Check terminal logs** for errors

3. **Test with `/start` command** first

4. **Verify authorization** (see Access Denied section above)

5. **Check OpenAI API key** is valid:
   ```bash
   echo $OPENAI_API_KEY
   ```

---

### ❌ "I'm not sure I understand that question"

**Error Message:**
```
🤔 I'm not sure I understand that question.
```

**Solution:**

1. **Try clearer phrasing:**
   - ❌ "employees?"
   - ✅ "How many employees are onboarding?"

2. **Use `/help` command** for example queries

3. **Try one of the supported intents:**
   - Onboarding: "How many employees are onboarding?"
   - Training: "Show me training progress"
   - Summary: "Give me a daily summary"

4. **Check OpenAI API** is working (check logs for OpenAI errors)

---

### ❌ Query error: [some database error]

**Error Message:**
```
❌ Query error: relation "employees" does not exist
```

**Solution:**

1. **Check table exists** in Supabase:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

2. **Run database migrations** if tables are missing

3. **Verify Supabase credentials** in `.env`:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-key
   ```

4. **Check Supabase project is active** in dashboard

---

### ❌ HTTPSConnectionPool error

**Error Message:**
```
requests.exceptions.ConnectionError: HTTPSConnectionPool
```

**Solution:**

1. **Check internet connection**

2. **Verify firewall** isn't blocking:
   - `api.telegram.org`
   - `api.openai.com`
   - `supabase.co`

3. **Check API endpoints are accessible:**
   ```bash
   curl https://api.telegram.org
   curl https://api.openai.com/v1/models
   ```

4. **Try switching networks** (VPN, different WiFi)

---

### ❌ Bot crashes on startup

**Symptoms:**
- Bot starts then immediately exits
- Error traceback in terminal

**Solution:**

1. **Check all environment variables** are set:
   ```bash
   TELEGRAM_BOT_TOKEN
   SUPABASE_URL
   SUPABASE_KEY
   OPENAI_API_KEY
   ```

2. **Check Python version** (requires 3.10+):
   ```bash
   python --version
   ```

3. **Reinstall dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Check for syntax errors** in logs

5. **Run with debug logging:**
   ```bash
   LOG_LEVEL=DEBUG python run_telegram_bot.py
   ```

---

### ❌ Rate limit errors

**Error Message:**
```
OpenAI API error: Rate limit exceeded
```

**Solution:**

1. **Wait a few minutes** and try again

2. **Check OpenAI usage** at platform.openai.com

3. **Upgrade OpenAI plan** if hitting limits frequently

4. **Add rate limiting** to bot (contact admin)

---

### ❌ Telegram webhook certificate errors

**Error Message:**
```
Telegram API error: Wrong response from the webhook
```

**Solution:**

1. **Use polling mode** for development:
   ```bash
   TELEGRAM_USE_POLLING=true
   ```

2. **For webhook mode**, ensure:
   - HTTPS endpoint (not HTTP)
   - Valid SSL certificate
   - Port 443, 80, 88, or 8443

3. **Delete old webhook:**
   ```bash
   curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook
   ```

---

## 🔧 Debugging Tips

### Check Bot Status

```bash
# Is bot running?
ps aux | grep run_telegram_bot

# Check logs
tail -f /path/to/bot/logs.txt

# Test connectivity
curl https://api.telegram.org/bot<TOKEN>/getMe
```

### Test Components Individually

```python
# Test Supabase connection
from telegram_bot.config import TelegramBotConfig
from telegram_bot.database import HRDatabase

config = TelegramBotConfig.from_env()
db = HRDatabase(config.supabase_url, config.supabase_key)
users = db.get_all_users()
print(f"Found {len(users)} users")
```

### Enable Debug Logging

In `backend/.env`:
```bash
LOG_LEVEL=DEBUG
```

Restart bot to see detailed logs.

---

## 📊 Health Check

Run this checklist:

- [ ] Bot token is valid (test with `/start`)
- [ ] Supabase connection works (check logs)
- [ ] OpenAI API key is valid (test a query)
- [ ] Database tables exist (`telegram_authorized_users`, `users`, `employees`)
- [ ] Your chat ID is authorized
- [ ] Your user has `hr_admin` role
- [ ] All dependencies installed
- [ ] Environment variables set
- [ ] No firewall blocking
- [ ] Internet connection working

---

## 🆘 Still Having Issues?

1. **Check terminal logs** - Most errors are logged
2. **Test `/status` command** - Shows bot health
3. **Review setup guide** - `docs/telegram_bot_setup.md`
4. **Check Supabase logs** - Dashboard > Logs
5. **Verify all credentials** - Token, keys, URLs

---

## 📞 Common Questions

**Q: Can I run multiple bots?**
A: Yes, use different tokens and configurations.

**Q: How do I add more users?**
A: Insert their chat IDs into `telegram_authorized_users` table.

**Q: Why is bot slow?**
A: OpenAI API calls take 1-3 seconds. This is normal.

**Q: Can I customize responses?**
A: Yes, edit `response_formatter.py`.

**Q: How do I update the bot?**
A: Stop bot, update code, restart bot.

---

**Updated:** February 15, 2026  
**Status:** Current troubleshooting guide
