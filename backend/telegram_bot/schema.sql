-- Migration: Create telegram_authorized_users table
-- 
-- This table stores authorized Telegram users who can interact with the HR bot.
-- Only HR administrators should be authorized to use the bot.
--
-- To apply this migration:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this SQL
-- 3. Click "Run"

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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_authorized_users(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_authorized_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_is_active ON telegram_authorized_users(is_active);

-- Add comment
COMMENT ON TABLE telegram_authorized_users IS 'Stores authorized Telegram users for HR bot access';

-- Example: Add your first authorized user (replace with your actual values)
-- 
-- To get your Telegram chat ID:
-- 1. Message your bot
-- 2. Check the bot logs for "Unauthorized access attempt from chat_id: XXXXXX"
-- 3. Use that chat ID below
--
-- INSERT INTO telegram_authorized_users (telegram_chat_id, telegram_username, user_id, authorized_by, is_active)
-- VALUES (
--   'YOUR_TELEGRAM_CHAT_ID',  -- Your Telegram chat ID (as string)
--   '@your_telegram_username', -- Your Telegram username (optional)
--   (SELECT id FROM users WHERE email = 'admin@derivhr.com' AND role = 'hr_admin'), -- Your user ID
--   (SELECT id FROM users WHERE email = 'admin@derivhr.com' AND role = 'hr_admin'), -- Who authorized (yourself for first user)
--   true
-- );
