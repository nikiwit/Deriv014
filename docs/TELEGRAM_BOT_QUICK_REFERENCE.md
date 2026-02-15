# Telegram HR Bot - Quick Reference Card

## 🚀 Start Bot

```bash
cd backend
python run_telegram_bot.py
```

---

## 📝 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and overview |
| `/help` | Show example queries |
| `/status` | Check bot status and your info |

---

## 💬 Example Queries

### Onboarding

```
How many employees are onboarding?
Show me onboarding progress today
Any delayed onboarding cases?
List employees who started this week
Who started onboarding this month?
```

### Training

```
Who completed training this month?
Show me employees with incomplete training
Training progress summary
Who didn't finish mandatory training?
How many employees finished training?
```

### General

```
How is the progress today?
Give me a daily summary
Show all employees in Engineering
List employees by department
Document submission status
```

### Custom

Ask naturally! The AI understands various phrasings:
- "What's the onboarding situation?"
- "Give me an update on training"
- "How are things going?"

---

## 🔧 Configuration

### Environment Variables (in `backend/.env`)

```bash
TELEGRAM_BOT_TOKEN=your-token-here
TELEGRAM_USE_POLLING=true
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
OPENAI_API_KEY=your-openai-key
```

---

## 🗄️ Database Table

### telegram_authorized_users

```sql
-- Check authorized users
SELECT * FROM telegram_authorized_users;

-- Add new user
INSERT INTO telegram_authorized_users (telegram_chat_id, user_id, authorized_by, is_active)
VALUES ('chat_id', 'user_id', 'authorizer_id', true);

-- Disable user
UPDATE telegram_authorized_users SET is_active = false WHERE telegram_chat_id = 'chat_id';
```

---

## 🔍 Troubleshooting

### Issue: "Access Denied"
**Fix**: Add your Telegram chat ID to `telegram_authorized_users` table

### Issue: Bot doesn't respond
**Fix**: 
1. Check bot is running
2. Verify `TELEGRAM_BOT_TOKEN` in `.env`
3. Check terminal for errors

### Issue: "Configuration Error"
**Fix**: Ensure all environment variables are set in `backend/.env`

### Issue: Bot says "I don't understand"
**Fix**: Try rephrasing or use `/help` for examples

---

## 📊 Response Formats

The bot automatically chooses the best format:

- **Summary**: Conversational, human-like responses
- **Table**: Structured data in columns
- **Detailed**: Comprehensive lists with all information

---

## 🔐 Security

- Only authorized HR admins can use bot
- Telegram chat ID verification
- Database-backed authorization
- All queries logged

---

## 📁 File Locations

| What | Where |
|------|-------|
| Bot code | `backend/telegram_bot/` |
| Runner | `backend/run_telegram_bot.py` |
| Config | `backend/.env` |
| Database schema | `backend/telegram_bot/schema.sql` |
| Documentation | `docs/telegram_bot_*.md` |

---

## 🧪 Testing Checklist

- [ ] Bot created with @BotFather
- [ ] Token in `.env`
- [ ] Dependencies installed
- [ ] Database table created
- [ ] Authorized in database
- [ ] `/start` works
- [ ] `/help` works
- [ ] Natural language queries work

---

## 📞 Quick Help

**Setup Guide**: `docs/TELEGRAM_BOT_TESTING_INSTRUCTIONS.md`

**Module Docs**: `backend/telegram_bot/README.md`

**Full Summary**: `docs/TELEGRAM_BOT_IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Key Features

✅ Natural language understanding  
✅ AI-powered responses  
✅ Real-time database queries  
✅ Secure HR-admin access  
✅ Multiple response formats  
✅ Standalone deployment  

---

## 🚦 Status Indicators

**Green**: Bot running, no errors  
**Yellow**: Bot running, some warnings  
**Red**: Bot stopped or errors

Check terminal logs for details.

---

## 📈 Useful SQL Queries

```sql
-- Count authorized users
SELECT COUNT(*) FROM telegram_authorized_users WHERE is_active = true;

-- See recent activity (check bot logs)

-- Get user ID by email
SELECT id, email, role FROM users WHERE email = 'your@email.com';

-- List all HR admins
SELECT * FROM users WHERE role = 'hr_admin';
```

---

## 🔄 Restart Bot

```bash
# Stop: Press Ctrl+C
# Start: 
cd backend
python run_telegram_bot.py
```

---

**Quick Reference v1.0** | **Updated**: Feb 15, 2026
