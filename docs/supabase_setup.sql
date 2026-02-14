-- =============================================================================
-- DERIVHR DATABASE SETUP SCRIPT
-- =============================================================================
-- Run this script in Supabase SQL Editor to create required tables
-- https://supabase.com/dashboard/project/svoighribndahnfgazqi/sql
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- EMPLOYEES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nric TEXT,
    jurisdiction TEXT NOT NULL DEFAULT 'MY',
    position TEXT,
    department TEXT,
    start_date DATE,
    phone TEXT,
    address TEXT,
    bank_name TEXT,
    bank_account TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    status TEXT DEFAULT 'onboarding',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ONBOARDING STATES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS onboarding_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    offer_id UUID NOT NULL,
    status TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    position TEXT,
    department TEXT,
    salary NUMERIC,
    jurisdiction TEXT NOT NULL DEFAULT 'MY',
    start_date TEXT,
    probation_months INTEGER DEFAULT 3,
    offer_sent_at TIMESTAMP WITH TIME ZONE,
    offer_expires_at TIMESTAMP WITH TIME ZONE,
    offer_responded_at TIMESTAMP WITH TIME ZONE,
    offer_response TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    hr_notified_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    documents_generated_at TIMESTAMP WITH TIME ZONE,
    training_assigned_at TIMESTAMP WITH TIME ZONE,
    forms_completed_at TIMESTAMP WITH TIME ZONE,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE onboarding_states ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ONBOARDING DOCUMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS onboarding_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    document_name TEXT NOT NULL,
    document_type TEXT,
    required BOOLEAN DEFAULT TRUE,
    submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    file_path TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE onboarding_documents ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- INSERT MOCK DATA (Run after tables are created)
-- =============================================================================

-- Insert mock employees
INSERT INTO employees (id, email, full_name, nric, jurisdiction, position, department, start_date, phone, address, bank_name, bank_account, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, status)
VALUES 
    (uuid_generate_v4(), 'john.doe@derivhr.com', 'John Doe', '910101-14-1234', 'MY', 'Software Engineer', 'Engineering', '2024-03-15', '+60123456789', '123 Jalan Example, Kuala Lumpur', 'Maybank', '1234567890123', 'Jane Doe', '+60198765432', 'Spouse', 'onboarding_active'),
    (uuid_generate_v4(), 'sarah.chen@derivhr.com', 'Sarah Chen', '920202-10-5678', 'MY', 'Product Manager', 'Product', '2024-04-01', '+60111222333', '456 Ocean View, Penang', 'CIMB', '9876543210987', 'Michael Chen', '+60114444555', 'Sibling', 'offer_pending'),
    (uuid_generate_v4(), 'ahmad.khalid@derivhr.com', 'Ahmad Khalid', '880505-12-9012', 'MY', 'Data Analyst', 'Analytics', '2024-04-15', '+60115555666', '789 Taman Sentosa, Johor', 'Public Bank', '555544443333', 'Fatima Ahmad', '+60116666777', 'Parent', 'offer_pending')
ON CONFLICT (email) DO NOTHING;

-- Get employee IDs for offers
-- Note: Replace these UUIDs with actual IDs from the employees table after insertion

-- Insert onboarding states (offers)
-- Run this after employees are inserted:
/*
INSERT INTO onboarding_states (id, employee_id, offer_id, status, employee_name, email, phone, position, department, salary, jurisdiction, start_date, probation_months, offer_sent_at, offer_expires_at, offer_response)
SELECT 
    uuid_generate_v4(),
    id,
    uuid_generate_v4(),
    CASE WHEN status = 'onboarding_active' THEN 'offer_accepted' ELSE 'offer_pending' END,
    full_name,
    email,
    phone,
    position,
    department,
    5000.00,
    jurisdiction,
    start_date,
    3,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '7 days',
    CASE WHEN status = 'onboarding_active' THEN 'accepted' ELSE 'pending' END
FROM employees;
*/

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'Tables created successfully!' as status;
SELECT COUNT(*) as employee_count FROM employees;
SELECT COUNT(*) as user_count FROM users;
