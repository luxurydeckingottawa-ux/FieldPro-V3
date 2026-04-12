-- ============================================================
-- Migration 003: Indexes, Constraints, and New Tables
-- ============================================================
-- Additive only — no existing columns or data are modified.
-- Safe to run on a live database.
-- ============================================================

-- ============================================================
-- 1. MISSING INDEXES (Items #1 from fix list)
-- ============================================================

-- Jobs: client lookup (for SMS matching, search)
CREATE INDEX IF NOT EXISTS idx_jobs_client_phone ON jobs(org_id, client_phone);
CREATE INDEX IF NOT EXISTS idx_jobs_client_email ON jobs(org_id, client_email);

-- Jobs: schedule queries
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(org_id, scheduled_date);

-- Chat sessions: phone lookup (for matching incoming SMS to a session)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_phone ON chat_sessions(org_id, client_phone);

-- Incoming messages: phone lookup (for matching to jobs/sessions)
CREATE INDEX IF NOT EXISTS idx_incoming_messages_phone ON incoming_messages(from_number);

-- Profiles: email lookup (for login/invite matching)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================================
-- 2. CHECK CONSTRAINTS — NOT VALID (Item #2)
-- ============================================================
-- NOT VALID means: enforce on future writes only.
-- Existing rows are not checked (safe for live DB).
-- Run VALIDATE CONSTRAINT manually after confirming clean data.

ALTER TABLE jobs ADD CONSTRAINT chk_pipeline_stage
  CHECK (pipeline_stage IN (
    'LEAD_IN', 'FIRST_CONTACT', 'SECOND_CONTACT', 'THIRD_CONTACT',
    'LEAD_ON_HOLD', 'LEAD_WON', 'LEAD_LOST',
    'EST_UNSCHEDULED', 'EST_SCHEDULED', 'EST_IN_PROGRESS', 'EST_COMPLETED',
    'EST_SENT', 'EST_ON_HOLD', 'EST_APPROVED', 'EST_REJECTED',
    'SITE_VISIT_SCHEDULED', 'ESTIMATE_IN_PROGRESS', 'ESTIMATE_SENT', 'FOLLOW_UP',
    'JOB_SOLD', 'ADMIN_SETUP', 'PRE_PRODUCTION', 'READY_TO_START',
    'IN_FIELD', 'COMPLETION', 'PAID_CLOSED'
  )) NOT VALID;

ALTER TABLE jobs ADD CONSTRAINT chk_job_status
  CHECK (status IN (
    'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD', 'ACTIVE'
  )) NOT VALID;

-- ============================================================
-- 3. ORG_ID ON INCOMING_MESSAGES (Item #5)
-- ============================================================
-- Add nullable for now — existing rows have no org context.
-- incoming-sms.js webhook will populate this going forward
-- by resolving the Twilio `To` number → org via org_phone_numbers.

ALTER TABLE incoming_messages
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_incoming_messages_org ON incoming_messages(org_id);

-- ============================================================
-- 4. SUBSCRIPTIONS TABLE (Item #15)
-- ============================================================
-- Tracks Stripe subscriptions per org.
-- One row per org per subscription period.

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org sees own subscription" ON subscriptions
  FOR ALL USING (org_id = get_user_org_id());

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. FEATURE FLAGS TABLE (Item #16)
-- ============================================================
-- Gates features per org by plan tier.
-- Allows per-org overrides (e.g. beta features for specific accounts).

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  flag TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, flag)
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org sees own feature flags" ON feature_flags
  FOR ALL USING (org_id = get_user_org_id());

CREATE INDEX IF NOT EXISTS idx_feature_flags_org ON feature_flags(org_id);

CREATE TRIGGER feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. ORG PHONE NUMBERS TABLE (Item #17)
-- ============================================================
-- Maps Twilio numbers to orgs for multi-tenant SMS routing.
-- When an SMS arrives on a given Twilio number,
-- look up this table to find the correct org_id.

CREATE TABLE IF NOT EXISTS org_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  twilio_number TEXT UNIQUE NOT NULL,
  label TEXT DEFAULT 'main',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE org_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org sees own phone numbers" ON org_phone_numbers
  FOR ALL USING (org_id = get_user_org_id());

CREATE INDEX IF NOT EXISTS idx_org_phone_numbers_number ON org_phone_numbers(twilio_number);

-- Seed Luxury Decking's Twilio number
INSERT INTO org_phone_numbers (org_id, twilio_number, label)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '+13433144019',
  'main'
) ON CONFLICT (twilio_number) DO NOTHING;

-- ============================================================
-- 7. AUDIT LOG TABLE (Item #30)
-- ============================================================
-- Append-only log of all mutations for compliance and debugging.
-- Written by application layer (not DB triggers) so we capture intent.

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,          -- e.g. 'job.created', 'job.stage_changed', 'estimate.sent'
  table_name TEXT,               -- e.g. 'jobs'
  record_id UUID,                -- the affected row's id
  old_values JSONB,              -- snapshot before change (null for creates)
  new_values JSONB,              -- snapshot after change (null for deletes)
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read audit log; no one can update or delete
CREATE POLICY "Admins read own org audit log" ON audit_log
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(table_name, record_id);

-- ============================================================
-- 8. INVITATIONS TABLE (Item #31)
-- ============================================================
-- Self-serve team member invites. Admin creates a row,
-- system emails the invite link, recipient clicks to register.

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'ESTIMATOR', 'FIELD_EMPLOYEE', 'SUBCONTRACTOR')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org sees own invitations" ON invitations
  FOR ALL USING (org_id = get_user_org_id());

-- Public read via token (for accept flow — no auth required)
CREATE POLICY "Accept invitation via token" ON invitations
  FOR SELECT USING (
    token = current_setting('request.headers', true)::json->>'x-invite-token'
  );

CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
