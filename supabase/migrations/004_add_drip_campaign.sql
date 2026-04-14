-- ============================================================
-- Migration 004: Add drip_campaign column to jobs
-- ============================================================
-- Stores the full campaign state as JSONB so the Edge Function
-- can query it server-side and fire touches without needing the
-- React app to be open.
-- ============================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS drip_campaign JSONB DEFAULT NULL;

-- Index so the Edge Function can efficiently query only active campaigns
CREATE INDEX IF NOT EXISTS idx_jobs_drip_campaign_status
  ON jobs ((drip_campaign->>'status'))
  WHERE drip_campaign IS NOT NULL;

COMMENT ON COLUMN jobs.drip_campaign IS
  'Active drip campaign state: { campaignType, startedAt, completedTouches, sentMessages, status }';
