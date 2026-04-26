-- 013: InstaQuote lead capture
-- =============================================================================
-- Adds the columns and bot-log table needed for the InstaQuote endpoint
-- (POST /api/instaquote-lead). Customers fill out the calculator on
-- luxurydecking.ca, hit submit, and a row lands in `jobs` with
-- pipeline_stage = 'INSTAQUOTE_LEAD'. The endpoint immediately generates
-- a branded PDF, emails it to them, and drops them into the existing drip.
--
-- Design notes:
--   - We extend `jobs` rather than creating a new `leads` table — pipeline
--     already treats jobs and leads as a single lifecycle (PipelineStage enum).
--   - pipeline_stage is a TEXT column (no constraint) so adding the new
--     'INSTAQUOTE_LEAD' value requires no schema change beyond convention.
--   - `instaquote_bot_log` is a separate small table for honeypot hits and
--     rate-limit denials so we can review abuse without polluting `jobs`.
--   - submission_id has a UNIQUE constraint to enforce idempotency at the
--     DB level, not just the function (defence in depth).
-- =============================================================================

-- 1. Add InstaQuote columns to jobs ------------------------------------------
DO $$
BEGIN
  -- lead_source already exists on jobs (see 001), so we DON'T re-add it.
  -- Just document the new value we'll use:
  --   lead_source = 'instaquote' marks rows captured by the website widget.

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'jobs' AND column_name = 'source_metadata') THEN
    ALTER TABLE jobs ADD COLUMN source_metadata JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN jobs.source_metadata IS
      'Free-form metadata about the lead source. For instaquote leads holds {config, estimates, meta}.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'jobs' AND column_name = 'submission_id') THEN
    ALTER TABLE jobs ADD COLUMN submission_id UUID;
    COMMENT ON COLUMN jobs.submission_id IS
      'Idempotency key supplied by external lead-capture widgets (e.g. InstaQuote). UNIQUE.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'jobs' AND column_name = 'pdf_url') THEN
    ALTER TABLE jobs ADD COLUMN pdf_url TEXT;
    COMMENT ON COLUMN jobs.pdf_url IS
      'Signed Supabase Storage URL of the InstaQuote blueprint PDF. Expires after 30 days.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'jobs' AND column_name = 'pdf_generated_at') THEN
    ALTER TABLE jobs ADD COLUMN pdf_generated_at TIMESTAMPTZ;
    COMMENT ON COLUMN jobs.pdf_generated_at IS
      'When the InstaQuote PDF was generated and uploaded to storage.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'jobs' AND column_name = 'ip_hash') THEN
    ALTER TABLE jobs ADD COLUMN ip_hash TEXT;
    COMMENT ON COLUMN jobs.ip_hash IS
      'SHA-256(submitter_ip || ORG_SALT). Used for rate limiting and abuse review without storing raw IPs.';
  END IF;
END $$;

-- 2. Unique constraint on submission_id (idempotency, defence in depth) ------
-- Use a partial unique index so existing rows with NULL submission_id are OK.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_submission_id_unique
  ON jobs (submission_id)
  WHERE submission_id IS NOT NULL;

-- 3. Index for rate-limit lookups (org + ip_hash + recency) ------------------
CREATE INDEX IF NOT EXISTS idx_jobs_instaquote_ratelimit
  ON jobs (org_id, ip_hash, created_at DESC)
  WHERE lead_source = 'instaquote';

-- 4. Bot / abuse log table ---------------------------------------------------
-- Honeypot hits and rate-limit denials land here, NOT in jobs. Keeps the
-- pipeline clean while letting us review attacker patterns.
CREATE TABLE IF NOT EXISTS instaquote_bot_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  reason TEXT NOT NULL,                -- 'honeypot' | 'rate_limit' | 'origin_blocked' | 'validation'
  ip_hash TEXT,
  user_agent TEXT,
  origin TEXT,
  payload_excerpt JSONB,               -- email + a few config fields, NEVER the full payload
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instaquote_bot_log_org_created
  ON instaquote_bot_log (org_id, created_at DESC);

ALTER TABLE instaquote_bot_log ENABLE ROW LEVEL SECURITY;

-- Only authenticated users in the same org can read the log.
-- (Service role bypasses RLS, so the function can always write.)
DROP POLICY IF EXISTS "Users see own org bot log" ON instaquote_bot_log;
CREATE POLICY "Users see own org bot log" ON instaquote_bot_log
  FOR SELECT USING (org_id = get_user_org_id());

-- No INSERT/UPDATE/DELETE policy — only the service-role function writes here.

-- 5. Storage bucket -----------------------------------------------------------
-- Private bucket for the generated PDFs. Service role uploads, signed URLs
-- handed out to email recipients (30-day expiry).
INSERT INTO storage.buckets (id, name, public)
VALUES ('instaquote-pdfs', 'instaquote-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — only service role can read/write the bucket directly.
-- Public access is via signed URLs only (created by the function).
DROP POLICY IF EXISTS "Service role only — instaquote pdfs read"   ON storage.objects;
DROP POLICY IF EXISTS "Service role only — instaquote pdfs insert" ON storage.objects;

-- Note: storage.objects already has RLS enabled by Supabase.
-- We deliberately do NOT add a permissive read policy — anonymous reads
-- happen through signed URLs (which use a different code path that
-- bypasses RLS for the duration of the signed token).

-- =============================================================================
-- DOWN MIGRATION (for reference — run manually if needed)
-- =============================================================================
-- DROP TABLE IF EXISTS instaquote_bot_log;
-- DELETE FROM storage.buckets WHERE id = 'instaquote-pdfs';
-- DROP INDEX IF EXISTS idx_jobs_instaquote_ratelimit;
-- DROP INDEX IF EXISTS idx_jobs_submission_id_unique;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS ip_hash;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS pdf_generated_at;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS pdf_url;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS submission_id;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS source_metadata;
-- =============================================================================
