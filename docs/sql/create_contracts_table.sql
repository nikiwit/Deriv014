-- ============================================================
-- contracts table — stores all employee contracts
-- ============================================================

CREATE TABLE IF NOT EXISTS contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Core contract fields
    employee_name   TEXT NOT NULL,
    email           TEXT,
    position        TEXT NOT NULL,
    department      TEXT,
    start_date      DATE,
    salary          NUMERIC(12,2),
    currency        TEXT DEFAULT 'MYR',
    jurisdiction    TEXT CHECK (jurisdiction IN ('MY', 'SG')) DEFAULT 'MY',
    nric            TEXT,
    nationality     TEXT,
    company         TEXT DEFAULT 'Deriv Solutions Sdn Bhd',

    -- Contract terms (snapshot at time of signing)
    probation_months    INT DEFAULT 3,
    notice_period       TEXT DEFAULT '1 month',
    work_hours          TEXT DEFAULT '9:00 AM - 6:00 PM (Mon-Fri)',
    overtime_rate       TEXT DEFAULT '1.5x hourly rate',
    governing_law       TEXT,
    leave_annual        TEXT,
    leave_sick          TEXT,
    leave_hospitalization TEXT,
    leave_maternity     TEXT,
    leave_paternity     TEXT,

    -- Full contract data as JSONB (for complete reconstruction)
    contract_data       JSONB,
    modification_history JSONB DEFAULT '[]'::JSONB,

    -- Status workflow: draft → pending_signature → active | rejected
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending_signature', 'active', 'signed', 'rejected', 'expired', 'terminated')),

    -- HR approval
    hr_user_id          UUID,
    hr_signed_at        TIMESTAMPTZ,
    hr_notes            TEXT,

    -- Employee signing
    employee_signed_at      TIMESTAMPTZ,
    employee_signature_url  TEXT,

    -- File references
    pdf_path        TEXT,
    json_path       TEXT,

    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_employee_id ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_employee_status ON contracts(employee_id, status);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON contracts;
CREATE TRIGGER trg_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_updated_at();
