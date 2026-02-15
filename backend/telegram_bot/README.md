# Telegram HR Manager Bot

A standalone, separated Telegram bot module for HR managers to query onboarding progress, training completion, and employee metrics using natural language.

## Features

- 🤖 Natural language understanding with OpenAI
- 📊 Real-time HR metrics and analytics
- 🔐 Secure HR admin-only access
- 📈 Multiple response formats (summary, table, detailed)
- ⚡ Fast queries with direct Supabase connection
- 🚀 Independent deployment (no Flask dependency)

## Architecture

This module is **completely isolated** from the Flask application:
- Direct Supabase connection (no Flask g context)
- Independent configuration and environment
- Can run as separate process or container
- Zero coupling with main Flask app

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install `python-telegram-bot==20.7` and other dependencies.

### 2. Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the bot token (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 3. Configure Environment Variables

Add to `backend/.env`:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_USE_POLLING=true  # false for webhook in production

# These should already exist in your .env:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
OPENAI_API_KEY=your-openai-key
```

### 4. Create Database Table

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and run the SQL from `backend/telegram_bot/schema.sql`

### 5. Authorize Your Telegram Account

**Method 1: Get your Chat ID first**
1. Start the bot: `python run_telegram_bot.py`
2. Send a message to your bot on Telegram
3. Check the bot logs for: `"Unauthorized access attempt from chat_id: XXXXXX"`
4. Stop the bot (Ctrl+C)

**Method 2: Add yourself to the database**

Go to Supabase SQL Editor and run:

```sql
INSERT INTO telegram_authorized_users (telegram_chat_id, telegram_username, user_id, authorized_by, is_active)
VALUES (
  'YOUR_TELEGRAM_CHAT_ID',  -- From step 1
  '@your_username',         -- Your Telegram username
  (SELECT id FROM users WHERE email = 'your-email@company.com' AND role = 'hr_admin'),
  (SELECT id FROM users WHERE email = 'your-email@company.com' AND role = 'hr_admin'),
  true
);
```

### 6. Run the Bot

```bash
cd backend
python run_telegram_bot.py
```

You should see:
```
🤖  Telegram HR Manager Bot
============================================================

Configuration loaded:
  ✓ Bot Token: ********************AbCdEfGhIj
  ✓ Supabase URL: https://your-project.supabase.co
  ✓ OpenAI API Key: ********************
  ✓ Mode: Polling
  ✓ Log Level: INFO

🤖 Telegram HR Bot is running (polling mode)
Press Ctrl+C to stop
```

## Usage

### Commands

- `/start` - Welcome message and overview
- `/help` - Show example queries
- `/status` - Check bot status

### Example Queries

**Onboarding:**
- "How many employees are onboarding?"
- "Show me onboarding progress today"
- "Any delayed onboarding cases?"
- "List employees who started this week"

**Training:**
- "Who completed training this month?"
- "Show me employees with incomplete training"
- "Training progress summary"
- "Who didn't finish mandatory training?"

**General:**
- "How is the progress today?"
- "Give me a daily summary"
- "Show all employees in Engineering"
- "Document submission status"

## Deployment Options

### Option 1: Same Server, Separate Process

Run both Flask and Telegram bot on the same server:

```bash
# Terminal 1: Flask backend
cd backend && python run.py

# Terminal 2: Telegram bot
cd backend && python run_telegram_bot.py
```

### Option 2: Separate Docker Containers

```yaml
# docker-compose.yml
services:
  flask-backend:
    build: ./backend
    command: python run.py
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
    
  telegram-bot:
    build: ./backend
    command: python run_telegram_bot.py
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
```

### Option 3: Different Servers

Deploy Flask app and Telegram bot to completely different servers:
- Both connect to the same Supabase instance
- No network communication required between them
- Scale independently

## Module Structure

```
telegram_bot/
├── __init__.py              # Module initialization
├── config.py                # Independent configuration
├── database.py              # Direct Supabase client
├── auth.py                  # HR authorization
├── intent_detector.py       # OpenAI intent parsing
├── query_service.py         # Supabase queries
├── response_formatter.py    # Response generation
├── handlers.py              # Message handlers
├── bot.py                   # Main bot logic
├── schema.sql               # Database migration
└── README.md                # This file
```

## Troubleshooting

### Bot doesn't respond

1. Check bot is running: `python run_telegram_bot.py`
2. Verify your Telegram chat ID is in `telegram_authorized_users` table
3. Check `is_active = true` for your record
4. Ensure your user has `role = 'hr_admin'` in `users` table

### "Access Denied" message

Your Telegram account isn't authorized. Follow step 5 in Setup to authorize yourself.

### "Configuration Error"

Missing environment variables. Ensure `backend/.env` has:
- `TELEGRAM_BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `OPENAI_API_KEY`

### Database connection errors

1. Verify Supabase URL and key are correct
2. Check Supabase project is active
3. Ensure `telegram_authorized_users` table exists (run schema.sql)

## Security

- ✅ Only authorized HR admins can use the bot
- ✅ Telegram chat ID verification
- ✅ Database-backed authorization
- ✅ No data stored in Telegram
- ✅ All queries logged for audit

## Support

For issues or questions:
1. Check the logs when running the bot
2. Verify database tables and authorization
3. Test with `/status` command to check bot health
4. Review this README for setup steps

## License

Proprietary - DerivHR Platform
