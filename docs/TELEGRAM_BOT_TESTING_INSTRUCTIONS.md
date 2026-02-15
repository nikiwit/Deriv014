# Telegram HR Bot - Testing Instructions

## 🧪 Ready to Test!

Your Telegram HR Manager Bot is fully implemented and ready for testing. Follow these instructions to get it running.

---

## Prerequisites

You need to provide:
1. **Telegram Bot Token** (from @BotFather)
2. **Your HR Manager Email** (to authorize your Telegram account)

---

## Step 1: Create Your Telegram Bot (2 minutes)

### 1.1 Open Telegram

Open the Telegram app on your phone or computer.

### 1.2 Find BotFather

- Search for `@BotFather` in Telegram
- Click on the verified BotFather account (blue checkmark)
- Click "Start" or send `/start`

### 1.3 Create New Bot

Send this command:
```
/newbot
```

### 1.4 Choose Bot Name

When asked "Alright, a new bot. How are we going to call it?", send:
```
DerivHR Manager Bot
```
(or any name you prefer)

### 1.5 Choose Bot Username

When asked for username, send:
```
derivhr_manager_bot
```
(or any username ending with "bot")

### 1.6 Copy the Token

BotFather will reply with your bot token. It looks like:
```
123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567890
```

**📋 COPY THIS TOKEN - You'll need it in the next step!**

---

## Step 2: Configure Environment (30 seconds)

### 2.1 Open the `.env` file

Navigate to: `backend/.env`

### 2.2 Add Bot Token

Add these lines at the end of the file:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=paste-your-token-here
TELEGRAM_USE_POLLING=true
```

Replace `paste-your-token-here` with your actual token from Step 1.6.

### 2.3 Verify Other Variables

Make sure these already exist in your `.env`:
```bash
SUPABASE_URL=https://svoighribndahnfgazqi.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
```

### 2.4 Save the File

Save and close the `.env` file.

---

## Step 3: Install Dependencies (1 minute)

Open terminal and run:

```bash
cd backend
pip install python-telegram-bot==20.7
```

Wait for installation to complete.

---

## Step 4: Create Database Table (1 minute)

### 4.1 Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar

### 4.2 Create Table

Click "New query" and paste this SQL:

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
```

### 4.3 Run the Query

Click the "Run" button. You should see "Success. No rows returned".

### 4.4 Verify Table Created

1. Click "Table Editor" in left sidebar
2. You should see `telegram_authorized_users` in the list

---

## Step 5: Get Your Telegram Chat ID (2 minutes)

### 5.1 Start the Bot

In terminal, run:

```bash
cd backend
python run_telegram_bot.py
```

You should see:
```
============================================================
🤖  Telegram HR Manager Bot
============================================================

Configuration loaded:
  ✓ Bot Token: ********************AbCdEfGhIj
  ✓ Supabase URL: https://svoighribndahnfgazqi.supabase.co
  ...
  
🤖 Telegram HR Bot is running (polling mode)
Press Ctrl+C to stop
```

### 5.2 Message Your Bot

1. Open Telegram
2. Search for `@derivhr_manager_bot` (or your bot's username)
3. Click on your bot
4. Click "Start" button or send any message like "Hello"

### 5.3 Check Terminal Logs

Look at the terminal where the bot is running. You should see:

```
WARNING - Unauthorized access attempt from chat_id: 123456789
```

**📋 COPY YOUR CHAT ID** (e.g., `123456789`)

### 5.4 Stop the Bot

Press `Ctrl+C` in the terminal to stop the bot.

---

## Step 6: Authorize Your Telegram Account (1 minute)

### 6.1 Get Your User ID

In Supabase Dashboard > SQL Editor, run:

```sql
SELECT id, email, role FROM users 
WHERE email = 'YOUR_EMAIL_HERE' 
AND role = 'hr_admin';
```

Replace `YOUR_EMAIL_HERE` with your actual email (e.g., `admin@derivhr.com`).

**📋 COPY YOUR USER ID** from the result.

### 6.2 Authorize Yourself

Still in SQL Editor, run this query (replace the values):

```sql
INSERT INTO telegram_authorized_users (
  telegram_chat_id, 
  telegram_username, 
  user_id, 
  authorized_by, 
  is_active
)
VALUES (
  'YOUR_CHAT_ID_HERE',     -- e.g., '123456789'
  '@your_telegram_username', -- e.g., '@mariaivanova'
  'YOUR_USER_ID_HERE',      -- UUID from step 6.1
  'YOUR_USER_ID_HERE',      -- Same UUID (you're authorizing yourself)
  true
);
```

Click "Run". You should see "Success. 1 row inserted".

### 6.3 Verify Authorization

Run this to check:

```sql
SELECT * FROM telegram_authorized_users;
```

You should see your record.

---

## Step 7: Start Testing! (Now)

### 7.1 Start the Bot

```bash
cd backend
python run_telegram_bot.py
```

### 7.2 Open Telegram

Go to your bot conversation.

### 7.3 Test Commands

**Test 1: Start Command**

Send:
```
/start
```

Expected response:
```
👋 Welcome, [Your Name]!

I'm your HR Manager Assistant. I can help you with:

📊 Onboarding progress reports
📚 Training completion status
👥 Employee statistics
...
```

✅ If you see this, authorization is working!

**Test 2: Help Command**

Send:
```
/help
```

You should see a list of example queries.

**Test 3: Status Command**

Send:
```
/status
```

You should see bot status and your user info.

### 7.4 Test Natural Language Queries

Try these questions:

**Query 1: Employee Count**
```
How many employees are onboarding?
```

**Query 2: Training Progress**
```
Show me training progress this month
```

**Query 3: Daily Summary**
```
Give me a daily summary
```

**Query 4: Delayed Cases**
```
Any delayed onboarding cases?
```

**Query 5: Department List**
```
List all employees in Engineering
```

**Query 6: Custom Question**
```
Who completed training this week?
```

---

## Expected Behavior

### ✅ Success Indicators

- Bot responds within 3 seconds
- Responses are conversational and helpful
- Data is accurate from your database
- Commands work correctly
- Natural language queries are understood

### ❌ Common Issues

**Issue**: "Access Denied"
- **Solution**: Your Telegram account isn't authorized. Go back to Step 6.

**Issue**: Bot doesn't respond
- **Solution**: 
  1. Check terminal - is bot running?
  2. Verify `TELEGRAM_BOT_TOKEN` in `.env`
  3. Check for error messages in terminal

**Issue**: "Configuration Error"
- **Solution**: Missing environment variables. Check Step 2.

**Issue**: Bot responds with "I'm not sure I understand"
- **Solution**: Try rephrasing your question or use `/help` for examples

---

## Test Checklist

Complete this checklist:

- [ ] Bot created with @BotFather
- [ ] Token added to `.env`
- [ ] Dependencies installed
- [ ] Database table created
- [ ] Chat ID obtained
- [ ] Telegram account authorized
- [ ] Bot starts without errors
- [ ] `/start` command works
- [ ] `/help` command works
- [ ] `/status` command works
- [ ] Natural language query about onboarding works
- [ ] Natural language query about training works
- [ ] Daily summary query works
- [ ] Responses are well-formatted
- [ ] Bot understands various question phrasings

---

## Advanced Testing

### Test Different Response Formats

The bot should automatically choose the best format, but you can test specific ones:

**Summary Format:**
```
How is onboarding going today?
```

**Table Format:**
```
Show me a list of all employees
```

**Detailed Format:**
```
Give me detailed information about delayed training cases
```

### Test Edge Cases

```
What happens when no one is onboarding?
```

```
Show me employees in a non-existent department
```

```
Ask an unrelated question like "What's the weather?"
```

---

## Monitoring & Logs

While testing, watch the terminal logs. You should see:

```
INFO - Received message from 123456789: How many employees...
INFO - Detected intent: count_onboarding
INFO - Successfully handled query from 123456789
```

Any errors will also appear here.

---

## Running Alongside Flask

You can run both the Flask backend and Telegram bot simultaneously:

**Terminal 1: Flask Backend**
```bash
cd backend
python run.py
```

**Terminal 2: Telegram Bot**
```bash
cd backend
python run_telegram_bot.py
```

Both will connect to the same Supabase database.

---

## Next Steps After Testing

Once testing is complete and everything works:

1. ✅ Keep bot running in background or as a service
2. ✅ Authorize additional HR managers (see README)
3. ✅ Monitor usage and feedback
4. ✅ Consider webhook mode for production
5. ✅ Set up monitoring/alerting

---

## Need Help?

**Check:**
1. Terminal logs for error messages
2. Supabase logs for database issues
3. `docs/telegram_bot_setup.md` for detailed guide
4. `backend/telegram_bot/README.md` for module docs

**Common Files:**
- Environment: `backend/.env`
- Bot code: `backend/telegram_bot/`
- Runner: `backend/run_telegram_bot.py`
- Logs: Terminal output

---

## Feedback

After testing, note:
- ✍️ Which queries worked well
- ✍️ Which queries need improvement
- ✍️ Response quality and accuracy
- ✍️ Response time
- ✍️ User experience feedback
- ✍️ Any errors encountered

---

**Happy Testing! 🎉**

The bot is ready to help you manage HR operations via Telegram!
