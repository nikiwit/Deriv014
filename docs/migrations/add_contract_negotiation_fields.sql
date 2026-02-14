-- Migration: Add contract negotiation fields to chat_sessions
-- Date: 2026-02-14
-- Description: Adds session tracking for contract negotiation flow

-- Add columns to chat_sessions table
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS active_contract_negotiation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contract_employee_id TEXT,
ADD COLUMN IF NOT EXISTS contract_collection_state TEXT;

-- Add comment for documentation
COMMENT ON COLUMN chat_sessions.active_contract_negotiation IS 'Flag indicating if session is in active contract negotiation mode';
COMMENT ON COLUMN chat_sessions.contract_employee_id IS 'Employee ID for the contract being negotiated in this session';
COMMENT ON COLUMN chat_sessions.contract_collection_state IS 'JSON state for tracking contract data collection progress';
