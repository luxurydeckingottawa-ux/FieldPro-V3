-- ============================================================
-- 006: Security & Schema Fixes (from Round 2 Audit)
-- ============================================================
-- Addresses: S-05, D-06, D-07, D-08
--
-- S-05: incoming_messages table open to anon — restrict to authenticated
-- D-06: Missing columns for fields added to dataService keyMap
-- D-07: organizations table RLS has zero policies
-- D-08: RLS uses FOR ALL — add role-based differentiation
--
-- Rollback:
--   -- S-05: Re-create old anon policies
--   -- D-06: ALTER TABLE jobs DROP COLUMN ...
--   -- D-07: DROP POLICY ... ON organizations
--   -- D-08: DROP POLICY ... ON jobs; re-create old FOR ALL policy
-- ============================================================


-- ============================================================
-- S-05: Fix incoming_messages RLS
-- Problem: anon role has INSERT, SELECT, UPDATE with USING (true)
-- Fix: INSERT stays for anon (Twilio webhook needs it), but
--      SELECT/UPDATE restricted to authenticated users only
-- ============================================================

DROP POLICY IF EXISTS "Allow read for authenticated" ON incoming_messages;
DROP POLICY IF EXISTS "Allow update read status" ON incoming_messages;

-- Twilio webhook insert stays open to anon (the webhook can't authenticate)
-- But reading and updating requires authentication
CREATE POLICY "Authenticated users can read messages" ON incoming_messages
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update messages" ON incoming_messages
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- D-06: Add missing columns to jobs table
-- These fields are now in the dataService keyMap but may not
-- exist as DB columns. Using IF NOT EXISTS pattern.
-- ============================================================

DO $$
BEGIN
  -- Digital work order (JSONB — the full job setup wizard data)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='digital_work_order') THEN
    ALTER TABLE jobs ADD COLUMN digital_work_order JSONB;
  END IF;

  -- Job setup flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='needs_job_setup') THEN
    ALTER TABLE jobs ADD COLUMN needs_job_setup BOOLEAN DEFAULT FALSE;
  END IF;

  -- Live estimate data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='live_estimate') THEN
    ALTER TABLE jobs ADD COLUMN live_estimate JSONB;
  END IF;

  -- Calculator selections and dimensions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='calculator_selections') THEN
    ALTER TABLE jobs ADD COLUMN calculator_selections JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='calculator_dimensions') THEN
    ALTER TABLE jobs ADD COLUMN calculator_dimensions JSONB;
  END IF;

  -- Customer signature
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='customer_signature') THEN
    ALTER TABLE jobs ADD COLUMN customer_signature TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='customer_signature_cloudinary_url') THEN
    ALTER TABLE jobs ADD COLUMN customer_signature_cloudinary_url TEXT;
  END IF;

  -- Contract
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='contract_pdf_url') THEN
    ALTER TABLE jobs ADD COLUMN contract_pdf_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='contract_signed_date') THEN
    ALTER TABLE jobs ADD COLUMN contract_signed_date TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='deposit_requested_date') THEN
    ALTER TABLE jobs ADD COLUMN deposit_requested_date TEXT;
  END IF;

  -- Job files as JSON (separate from job_files table — inline on the job record)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='job_files_json') THEN
    ALTER TABLE jobs ADD COLUMN job_files_json JSONB;
  END IF;

  -- Notes fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='notes') THEN
    ALTER TABLE jobs ADD COLUMN notes TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='site_notes') THEN
    ALTER TABLE jobs ADD COLUMN site_notes TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='office_notes') THEN
    ALTER TABLE jobs ADD COLUMN office_notes TEXT DEFAULT '';
  END IF;

  -- Accepted package details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='accepted_package_tier') THEN
    ALTER TABLE jobs ADD COLUMN accepted_package_tier TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='accepted_monthly_payment') THEN
    ALTER TABLE jobs ADD COLUMN accepted_monthly_payment NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='declined_reason') THEN
    ALTER TABLE jobs ADD COLUMN declined_reason TEXT;
  END IF;

  -- Invoices as JSON on job record (separate from invoices table)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='invoices') THEN
    ALTER TABLE jobs ADD COLUMN invoices JSONB;
  END IF;

  -- Description field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='description') THEN
    ALTER TABLE jobs ADD COLUMN description TEXT DEFAULT '';
  END IF;
END $$;


-- ============================================================
-- D-07: Organizations table — add RLS policy
-- Problem: RLS enabled but zero policies = every query returns 0 rows
-- ============================================================

DROP POLICY IF EXISTS "Users see own org" ON organizations;
CREATE POLICY "Users see own org" ON organizations
  FOR SELECT TO authenticated
  USING (id = get_user_org_id());


-- ============================================================
-- D-08: Jobs table — replace FOR ALL with role-based policies
-- Problem: FOR ALL lets any authenticated user DELETE any job in the org
-- Fix: SELECT/INSERT/UPDATE for all org members, DELETE for admins only
-- ============================================================

-- Drop the existing overly-permissive policy
DROP POLICY IF EXISTS "Users can manage own org jobs" ON jobs;

-- All org members can read jobs
CREATE POLICY "Org members can read jobs" ON jobs
  FOR SELECT TO authenticated
  USING (org_id = get_user_org_id());

-- All org members can create jobs
CREATE POLICY "Org members can create jobs" ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_user_org_id());

-- All org members can update jobs
CREATE POLICY "Org members can update jobs" ON jobs
  FOR UPDATE TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- Only admins can delete jobs (check role in profiles table)
CREATE POLICY "Admins can delete jobs" ON jobs
  FOR DELETE TO authenticated
  USING (
    org_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
