-- ============================================================
-- Luxury Decking Field Pro - Supabase Schema
-- ============================================================
-- This migration creates the core tables needed for the
-- Field Pro SaaS application. Designed for multi-tenancy
-- from day one so the schema scales when we start selling.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ORGANIZATIONS (multi-tenant foundation)
-- ============================================================
-- Every deck company that uses the software gets an org.
-- For now, Luxury Decking is the only org. When we go SaaS,
-- each customer company gets their own org_id and all their
-- data is isolated by Row Level Security policies.
-- ============================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- e.g. 'luxury-decking'
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. USERS / PROFILES
-- ============================================================
-- Links to Supabase Auth. Each user belongs to one org and
-- has a role (admin, estimator, field_employee, subcontractor).
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'ESTIMATOR', 'FIELD_EMPLOYEE', 'SUBCONTRACTOR')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. JOBS (the master record)
-- ============================================================
-- One row per project. This is the single source of truth that
-- carries data from lead through completion. Complex nested
-- objects (build_details, estimate_data, etc.) are stored as
-- JSONB so the schema stays flexible as we add features.
-- ============================================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  job_number TEXT NOT NULL,
  
  -- Client info
  client_name TEXT NOT NULL DEFAULT '',
  client_phone TEXT,
  client_email TEXT,
  project_address TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  
  -- Project info
  project_type TEXT DEFAULT '',
  assigned_users TEXT[] DEFAULT '{}',
  assigned_crew TEXT DEFAULT '',
  scheduled_date TEXT,
  material_delivery_date TEXT,
  scope_summary TEXT DEFAULT '',
  
  -- Pipeline & status
  current_stage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'SCHEDULED',
  pipeline_stage TEXT DEFAULT 'LEAD_IN',
  signoff_status TEXT DEFAULT 'pending',
  invoice_support_status TEXT DEFAULT 'not_required',
  final_submission_status TEXT DEFAULT 'pending',
  field_status TEXT,
  completion_package_status TEXT,
  photo_completion_status TEXT,
  completion_readiness_status TEXT,
  office_review_status TEXT DEFAULT 'NOT_READY',
  
  -- Scheduling
  planned_start_date TEXT,
  planned_duration_days INTEGER,
  planned_finish_date TEXT,
  official_schedule_status TEXT,
  
  -- Financials
  material_cost NUMERIC,
  labour_cost NUMERIC,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  estimate_amount NUMERIC,
  
  -- CRM / Lifecycle
  lifecycle_stage TEXT,
  lead_source TEXT,
  assigned_salesperson TEXT,
  last_contact_date TEXT,
  next_follow_up_date TEXT,
  follow_up_status TEXT,
  follow_up_reason TEXT,
  lost_reason TEXT,
  portal_status TEXT DEFAULT 'not_set',
  engagement_heat TEXT,
  estimate_status TEXT,
  estimate_sent_date TEXT,
  estimate_version TEXT,
  projected_sale_date TEXT,
  accepted_option_id TEXT,
  accepted_option_name TEXT,
  accepted_date TEXT,
  
  -- Deposit / Sold workflow
  deposit_status TEXT,
  sold_workflow_status TEXT,
  deposit_amount NUMERIC,
  deposit_requested_date TEXT,
  deposit_received_date TEXT,
  contract_signed_date TEXT,
  
  -- Nurture
  nurture_sequence TEXT,
  nurture_step INTEGER,
  nurture_status TEXT,
  post_project_status TEXT,
  
  -- Closeout
  verified_build_passport_url TEXT,
  subcontractor_invoice_url TEXT,
  
  -- Customer Portal
  customer_portal_token TEXT UNIQUE,
  
  -- Complex nested objects stored as JSONB
  office_checklists JSONB DEFAULT '[]',
  build_details JSONB DEFAULT '{}',
  field_forecast JSONB,
  forecast_review_status TEXT,
  field_progress JSONB,
  time_entries JSONB DEFAULT '[]',
  geofence_reminders JSONB DEFAULT '[]',
  estimate_data JSONB,
  accepted_build_summary JSONB,
  portal_engagement JSONB,
  ai_insights JSONB,
  next_action JSONB,
  activities JSONB DEFAULT '[]',
  selected_add_on_ids TEXT[],
  flagged_issues TEXT[] DEFAULT '{}',
  previous_jobs TEXT[],
  
  -- Timestamps
  stage_updated_at TIMESTAMPTZ,
  last_schedule_update_at TIMESTAMPTZ,
  last_schedule_updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. JOB FILES
-- ============================================================

CREATE TABLE job_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT DEFAULT 'other', -- drawing, permit, photo, closeout, other
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. JOB NOTES
-- ============================================================

CREATE TABLE job_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  note_type TEXT DEFAULT 'office', -- office, site
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. ESTIMATOR INTAKES
-- ============================================================
-- This is the critical table for the cross-device handoff.
-- When the field estimator submits from their phone,
-- this row is immediately visible to the office on any device.
-- ============================================================

CREATE TABLE estimator_intakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  submitted_by UUID REFERENCES profiles(id),
  
  -- The actual intake data
  checklist JSONB DEFAULT '{}',
  measure_sheet JSONB DEFAULT '{}',
  sketch JSONB DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  
  -- AI insights
  ai_insights JSONB,
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'submitted_to_office')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. CHAT SESSIONS & MESSAGES
-- ============================================================

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  unread_count INTEGER DEFAULT 0,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL,
  is_from_client BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'sent',
  template_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. INDEXES
-- ============================================================

CREATE INDEX idx_jobs_org ON jobs(org_id);
CREATE INDEX idx_jobs_pipeline ON jobs(org_id, pipeline_stage);
CREATE INDEX idx_jobs_portal_token ON jobs(customer_portal_token);
CREATE INDEX idx_jobs_status ON jobs(org_id, status);
CREATE INDEX idx_job_files_job ON job_files(job_id);
CREATE INDEX idx_job_notes_job ON job_notes(job_id);
CREATE INDEX idx_intakes_job ON estimator_intakes(job_id);
CREATE INDEX idx_intakes_org_status ON estimator_intakes(org_id, status);
CREATE INDEX idx_chat_sessions_job ON chat_sessions(job_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_profiles_org ON profiles(org_id);

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================
-- Every table is locked down so users can only see data
-- belonging to their own organization. This is what makes
-- multi-tenancy secure.
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimator_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: get the current user's org_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles: users can only see profiles in their own org
CREATE POLICY "Users see own org profiles" ON profiles
  FOR ALL USING (org_id = get_user_org_id());

-- Jobs: users can only see jobs in their own org
CREATE POLICY "Users see own org jobs" ON jobs
  FOR ALL USING (org_id = get_user_org_id());

-- Job files: scoped to org
CREATE POLICY "Users see own org files" ON job_files
  FOR ALL USING (org_id = get_user_org_id());

-- Job notes: scoped to org
CREATE POLICY "Users see own org notes" ON job_notes
  FOR ALL USING (org_id = get_user_org_id());

-- Estimator intakes: scoped to org
CREATE POLICY "Users see own org intakes" ON estimator_intakes
  FOR ALL USING (org_id = get_user_org_id());

-- Chat sessions: scoped to org
CREATE POLICY "Users see own org chats" ON chat_sessions
  FOR ALL USING (org_id = get_user_org_id());

-- Chat messages: scoped to org
CREATE POLICY "Users see own org messages" ON chat_messages
  FOR ALL USING (org_id = get_user_org_id());

-- Special policy: customer portal access (no auth required, uses token)
CREATE POLICY "Portal access via token" ON jobs
  FOR SELECT USING (
    customer_portal_token IS NOT NULL 
    AND customer_portal_token = current_setting('request.headers', true)::json->>'x-portal-token'
  );

-- ============================================================
-- 10. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER intakes_updated_at BEFORE UPDATE ON estimator_intakes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 11. SEED DATA (Luxury Decking as the first org)
-- ============================================================

INSERT INTO organizations (id, name, slug, settings) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Luxury Decking & PermaLite',
  'luxury-decking',
  '{"brand_color": "#D4AF37", "phone": "613-707-3060", "email": "admin@luxurydecking.ca"}'
);
