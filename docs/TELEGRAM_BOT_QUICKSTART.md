# Telegram HR Bot - Quick Start Guide

Get your Telegram HR bot running in **5 minutes**!

## Prerequisites

- ✅ Backend running with Supabase configured
- ✅ OpenAI API key
- ✅ Telegram account
- ✅ HR admin credentials

## Quick Setup (5 Steps)

### 1. Install Dependencies (30 seconds)

```bash
cd backend
pip install python-telegram-bot==20.7
```

### 2. Create Bot (2 minutes)

1. Open Telegram → Search `@BotFather`
2. Send: `/newbot`
3. Name: `DerivHR Manager Bot`
4. Username: `derivhr_manager_bot`
5. **Copy the token** 🔑

### 3. Add to Environment (30 seconds)

Edit `backend/.env`:

```bash
TELEGRAM_BOT_TOKEN=your-token-here
TELEGRAM_USE_POLLING=true
```

### 4. Create Database Table (1 minute)

1. Supabase Dashboard → SQL Editor
2. Paste and run:

```sql
CREATE TABLE telegram_authorized_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_chat_id TEXT UNIQUE NOT NULL,
  telegram_username TEXT,
  user_id UUID REFERENCES users(id),
  authorized_by UUID REFERENCES users(id),
  authorized_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_telegram_chat_id ON telegram_authorized_users(telegram_chat_id);
```

### 5. Get Chat ID & Authorize (1 minute)

**Start bot:**
```bash
python run_telegram_bot.py
```

**Message your bot** on Telegram → Check terminal logs for:
```
Unauthorized access attempt from chat_id: 123456789
```

**Stop bot** (Ctrl+C) → **Run in Supabase**:

```sql
INSERT INTO telegram_authorized_users (telegram_chat_id, user_id, authorized_by, is_active)
VALUES (
  '123456789',  -- Your chat ID
  (SELECT id FROM users WHERE email = 'YOUR_EMAIL' AND role = 'hr_admin'),
  (SELECT id FROM users WHERE email = 'YOUR_EMAIL' AND role = 'hr_admin'),
  true
);
```

**Start bot again:**
```bash
python run_telegram_bot.py
```

## Test It!

Open Telegram → Send to your bot:

```
/start
```

You should get a welcome message! 🎉

## Try These Queries

- `How many employees are onboarding?`
- `Show me training progress this month`
- `Any delayed onboarding cases?`
- `Give me a daily summary`

## Troubleshooting

**Bot doesn't respond?**
- Check bot is running
- Verify your chat ID is in the database
- Ensure your user has `role = 'hr_admin'`

**"Access Denied"?**
- Your Telegram account isn't authorized
- Double-check the INSERT query ran successfully

**Can't find bot?**
- Search for `@your_bot_username` in Telegram
- Make sure you used the exact username you created

## Full Documentation

See [`docs/telegram_bot_setup.md`](telegram_bot_setup.md) for detailed setup guide.

See [`backend/telegram_bot/README.md`](../backend/telegram_bot/README.md) for module documentation.

---

**Need help?** Check the logs when running `python run_telegram_bot.py`
