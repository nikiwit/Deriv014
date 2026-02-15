# Telegram HR Bot Setup Guide

This guide will walk you through setting up the Telegram HR Manager Bot step-by-step.

## Prerequisites

- Access to Supabase dashboard
- Telegram account
- OpenAI API key
- HR admin credentials for your system

## Step-by-Step Setup

### Step 1: Install Dependencies ✅

```bash
cd backend
pip install python-telegram-bot==20.7
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

**Verify installation:**
```bash
python -c "import telegram; print(telegram.__version__)"
```

Should output: `20.7`

---

### Step 2: Create Telegram Bot 🤖

1. **Open Telegram** and search for `@BotFather`

2. **Start a conversation** and send:
   ```
   /newbot
   ```

3. **Follow the prompts:**
   - Choose a name: `DerivHR Manager Bot`
   - Choose a username: `derivhr_manager_bot` (must end with 'bot')

4. **Copy the token** you receive. It looks like:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567
   ```

5. **Optional: Set bot description**
   ```
   /setdescription
   ```
   Then paste:
   ```
   HR Manager Assistant Bot - Query onboarding, training, and employee metrics using natural language.
   ```

6. **Optional: Set bot commands**
   ```
   /setcommands
   ```
   Then paste:
   ```
   start - Welcome message
   help - Show example queries
   status - Bot status
   ```

---

### Step 3: Configure Environment Variables ⚙️

Edit `backend/.env` and add:

```bash
# ============================================
# TELEGRAM BOT CONFIGURATION
# ============================================

# Bot token from BotFather
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567

# Use polling for development (true) or webhook for production (false)
TELEGRAM_USE_POLLING=true

# Webhook URL (only needed if TELEGRAM_USE_POLLING=false)
# TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram

# ============================================
# EXISTING CONFIGURATION (should already be set)
# ============================================

SUPABASE_URL=https://svoighribndahnfgazqi.supabase.co
SUPABASE_KEY=your-supabase-key
OPENAI_API_KEY=your-openai-key
```

**Save the file.**

---

### Step 4: Create Database Table 🗄️

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard

2. **Select your project**: `derivhr` or similar

3. **Navigate to**: SQL Editor (left sidebar)

4. **Click**: "New query"

5. **Copy and paste** the following SQL:

```sql
-- Create telegram_authorized_users table
CREATE TABLE IF NOT EXISTS telegram_authorized_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_chat_id TEXT UNIQUE NOT NULL,
  telegram_username TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  authorized_by UUID REFERENCES users(id) ON DELETE SET NULL,
  authorized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_authorized_users(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_authorized_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_is_active ON telegram_authorized_users(is_active);

-- Add comment
COMMENT ON TABLE telegram_authorized_users IS 'Stores authorized Telegram users for HR bot access';
```

6. **Click**: "Run" button

7. **Verify**: You should see "Success. No rows returned"

8. **Check the table exists**:
   - Go to "Table Editor" in sidebar
   - You should see `telegram_authorized_users` in the list

---

### Step 5: Get Your Telegram Chat ID 🔑

**Option A: Use the Bot Logs (Recommended)**

1. **Start the bot**:
   ```bash
   cd backend
   python run_telegram_bot.py
   ```

2. **Open Telegram** and find your bot:
   - Search for `@derivhr_manager_bot` (or whatever username you chose)
   - Click on it

3. **Send any message** to the bot:
   ```
   Hello
   ```

4. **Check the terminal** where the bot is running. You should see:
   ```
   WARNING - Unauthorized access attempt from chat_id: 123456789
   ```

5. **Copy that chat ID**: `123456789`

6. **Stop the bot**: Press `Ctrl+C`

**Option B: Use a Telegram Bot**

1. Search for `@userinfobot` on Telegram
2. Start it and it will tell you your chat ID

---

### Step 6: Authorize Yourself 🔓

1. **Go back to Supabase Dashboard** > SQL Editor

2. **Get your user ID** from the users table:
   ```sql
   SELECT id, email, role FROM users WHERE email = 'your-email@company.com';
   ```
   Copy the `id` value.

3. **Insert authorization record**:
   ```sql
   INSERT INTO telegram_authorized_users (
     telegram_chat_id, 
     telegram_username, 
     user_id, 
     authorized_by, 
     is_active
   )
   VALUES (
     '123456789',          -- Your chat ID from step 5
     '@your_username',     -- Your Telegram username (optional)
     'your-user-id-here',  -- Your user ID from query above
     'your-user-id-here',  -- Same user ID (you're authorizing yourself)
     true
   );
   ```

4. **Run the query**

5. **Verify it worked**:
   ```sql
   SELECT * FROM telegram_authorized_users;
   ```
   You should see your record.

---

### Step 7: Start the Bot 🚀

```bash
cd backend
python run_telegram_bot.py
```

**Expected output:**
```
============================================================
🤖  Telegram HR Manager Bot
============================================================

Configuration loaded:
  ✓ Bot Token: ********************AbCdEfGhIj
  ✓ Supabase URL: https://svoighribndahnfgazqi.supabase.co
  ✓ OpenAI API Key: ********************
  ✓ Mode: Polling
  ✓ Log Level: INFO

2026-02-15 10:30:00 - INFO - Supabase client initialized for Telegram bot
2026-02-15 10:30:01 - INFO - Intent detector initialized with OpenAI
2026-02-15 10:30:01 - INFO - Response formatter initialized with OpenAI
2026-02-15 10:30:01 - INFO - Handlers registered
2026-02-15 10:30:01 - INFO - Telegram HR Bot initialized successfully!
2026-02-15 10:30:01 - INFO - Starting bot with polling...
2026-02-15 10:30:01 - INFO - 🤖 Telegram HR Bot is running (polling mode)
2026-02-15 10:30:01 - INFO - Press Ctrl+C to stop
```

---

### Step 8: Test the Bot ✅

1. **Open Telegram** and go to your bot

2. **Send**: `/start`

   **Expected response:**
   ```
   👋 Welcome, [Your Name]!

   I'm your HR Manager Assistant. I can help you with:

   📊 Onboarding progress reports
   📚 Training completion status
   👥 Employee statistics
   📄 Document submission tracking
   ⚠️ Delayed cases and alerts

   Just ask me questions in natural language, like:
   • "How many employees are onboarding?"
   • "Show me training progress this month"
   • "Any delayed onboarding cases?"

   Department: HR
   Type /help for more examples.
   ```

3. **Send**: `How many employees are onboarding?`

   **Expected response:**
   The bot will analyze your question and provide a summary!

4. **Send**: `/help`

   See all example queries you can ask.

---

## Common Issues

### Issue: "Access Denied"

**Solution**: Your Telegram account isn't authorized.
- Double-check your chat ID in step 5
- Verify the INSERT query in step 6 ran successfully
- Ensure your user has `role = 'hr_admin'` in the users table

### Issue: Bot doesn't respond

**Solution**: 
- Check the bot is running: `python run_telegram_bot.py`
- Look for errors in the terminal
- Verify environment variables are set in `backend/.env`

### Issue: "Configuration Error: TELEGRAM_BOT_TOKEN environment variable is required"

**Solution**:
- Edit `backend/.env` and add the bot token
- Make sure there are no spaces around the `=` sign
- Restart the bot

### Issue: Database connection errors

**Solution**:
- Verify Supabase URL and key in `.env`
- Check Supabase project is active
- Run the schema.sql again to ensure table exists

---

## Authorizing Additional Users

To authorize another HR manager:

1. **They send a message to the bot** and you check logs for their chat ID

2. **Run this SQL** in Supabase:
   ```sql
   INSERT INTO telegram_authorized_users (telegram_chat_id, user_id, authorized_by, is_active)
   VALUES (
     'their-chat-id',
     (SELECT id FROM users WHERE email = 'their-email@company.com'),
     (SELECT id FROM users WHERE email = 'your-email@company.com'),
     true
   );
   ```

---

## Running in Production

For production deployment, use webhook mode instead of polling:

1. **Set up HTTPS endpoint** (required for webhooks)

2. **Update `.env`**:
   ```bash
   TELEGRAM_USE_POLLING=false
   TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram
   ```

3. **Deploy** to your server or container

4. **Bot will use webhook** instead of polling (more efficient)

---

## Next Steps

- Add more HR managers to authorized users
- Test various queries
- Monitor bot logs for usage patterns
- Consider setting up alerts for important events

## Support

If you encounter issues:
1. Check the bot terminal for error messages
2. Review the logs for details
3. Verify each setup step was completed
4. Test `/status` command to check bot health

---

**Congratulations! Your Telegram HR Bot is now running! 🎉**
