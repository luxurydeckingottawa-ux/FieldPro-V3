-- ============================================================
-- 005: Invoices + Customers tables
-- ============================================================
-- Persists invoice and customer data that previously lived only
-- in React state.  Both tables follow the existing multi-tenant
-- pattern: org_id FK, RLS via get_user_org_id(), created_at /
-- updated_at timestamps.
--
-- Rollback:  DROP TABLE IF EXISTS invoices CASCADE;
--            DROP TABLE IF EXISTS customers CASCADE;
-- ============================================================

-- ============================================================
-- 1. INVOICES
-- ============================================================

CREATE TABLE invoices (
  id            TEXT        PRIMARY KEY,
  org_id        UUID        NOT NULL REFERENCES organizations(id),
  job_id        TEXT        NOT NULL,  -- references jobs.id; TEXT because app generates UUIDs as strings
  invoice_number TEXT       NOT NULL,
  customer_name  TEXT       NOT NULL DEFAULT '',
  customer_phone TEXT,
  customer_email TEXT,
  job_title      TEXT       NOT NULL DEFAULT '',
  job_address    TEXT       NOT NULL DEFAULT '',
  type           TEXT       NOT NULL CHECK (type IN ('deposit', 'material_delivery', 'final_payment')),
  status         TEXT       NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  subtotal       NUMERIC    NOT NULL DEFAULT 0,
  hst_rate       NUMERIC    NOT NULL DEFAULT 0.13,
  hst_amount     NUMERIC    NOT NULL DEFAULT 0,
  total          NUMERIC    NOT NULL DEFAULT 0,
  description    TEXT       NOT NULL DEFAULT '',
  issued_date    TEXT,      -- ISO date string (matches frontend)
  due_date       TEXT,
  paid_date      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_org        ON invoices(org_id);
CREATE INDEX idx_invoices_job        ON invoices(job_id);
CREATE INDEX idx_invoices_status     ON invoices(org_id, status);
CREATE INDEX idx_invoices_number     ON invoices(org_id, invoice_number);

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org invoices" ON invoices
  FOR ALL USING (org_id = get_user_org_id());

-- ============================================================
-- 2. CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id              TEXT        PRIMARY KEY,
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  first_name      TEXT        NOT NULL DEFAULT '',
  last_name       TEXT        NOT NULL DEFAULT '',
  display_name    TEXT        NOT NULL DEFAULT '',
  company         TEXT,
  email           TEXT,
  phone           TEXT,
  home_phone      TEXT,
  mobile          TEXT,
  customer_type   TEXT        NOT NULL DEFAULT 'homeowner' CHECK (customer_type IN ('homeowner', 'business')),
  status          TEXT        NOT NULL DEFAULT 'cold_lead'
                              CHECK (status IN ('active_client', 'quoted_not_converted', 'cold_lead', 'prospect')),
  addresses       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  notes           TEXT        NOT NULL DEFAULT '',
  lead_source     TEXT,
  lifetime_value  NUMERIC     NOT NULL DEFAULT 0,
  total_jobs      INTEGER     NOT NULL DEFAULT 0,
  last_service_date TEXT,
  hcp_id          TEXT,       -- legacy HousecallPro ID
  do_not_service  BOOLEAN     NOT NULL DEFAULT FALSE,
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_org       ON customers(org_id);
CREATE INDEX idx_customers_status    ON customers(org_id, status);
CREATE INDEX idx_customers_email     ON customers(org_id, email);
CREATE INDEX idx_customers_phone     ON customers(org_id, phone);
CREATE INDEX idx_customers_name      ON customers(org_id, last_name, first_name);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org customers" ON customers
  FOR ALL USING (org_id = get_user_org_id());

-- ============================================================
-- updated_at trigger (reuse pattern from 001)
-- ============================================================
-- The trigger function set_updated_at() was created in 001.
-- If it doesn't exist, create it here as a safety net.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
