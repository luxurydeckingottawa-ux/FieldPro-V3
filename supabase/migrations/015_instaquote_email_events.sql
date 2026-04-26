-- 015: InstaQuote email-event tracking + suppression list
-- =============================================================================
-- Adds two tables that close the loop between SendGrid and FieldPro for the
-- InstaQuote nurture pipeline:
--
--   instaquote_email_events  -- per-message open/click/bounce/unsub events
--                               from the SendGrid Event Webhook. Drives the
--                               reporting dashboard and the engagement-based
--                               exit triggers (Won when booking link clicked,
--                               Closed on hard bounce / unsubscribe / spam).
--
--   email_suppression        -- global do-not-email list. Populated on hard
--                               bounce, unsubscribe, or spam report. The
--                               instaquote-lead endpoint checks this before
--                               creating a new lead, and the drip processor
--                               will (next pass) skip suppressed addresses.
--
-- Both tables are RLS-locked. Service role writes; org members read events.
-- Suppression list is service-role-only on read (prevents PII leak via
-- enumeration from the client bundle).
-- =============================================================================

-- 1. Per-touch email events --------------------------------------------------
CREATE TABLE IF NOT EXISTS instaquote_email_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  lead_id         UUID REFERENCES jobs(id) ON DELETE CASCADE,
  touch_id        TEXT,                 -- e.g. 'iq-t1-email'
  event_type      TEXT NOT NULL,        -- delivered | open | click | bounce | dropped | unsubscribe | spamreport | group_unsubscribe
  sg_message_id   TEXT,
  sg_email        TEXT,
  url             TEXT,                 -- present on click events
  bounce_type     TEXT,                 -- 'hard' | 'soft' | 'block' (bounce/dropped only)
  payload_excerpt JSONB,                -- trimmed event object (no full payload)
  occurred_at     TIMESTAMPTZ NOT NULL,
  received_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iq_events_lead
  ON instaquote_email_events (lead_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_iq_events_org_type
  ON instaquote_email_events (org_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_iq_events_org_touch
  ON instaquote_email_events (org_id, touch_id, event_type);

ALTER TABLE instaquote_email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read iq events" ON instaquote_email_events;
CREATE POLICY "Org members read iq events"
  ON instaquote_email_events
  FOR SELECT
  USING (org_id = get_user_org_id());

-- No INSERT/UPDATE/DELETE policy: only service role (webhook) writes.

-- 2. Email suppression list --------------------------------------------------
CREATE TABLE IF NOT EXISTS email_suppression (
  email          TEXT PRIMARY KEY,
  reason         TEXT NOT NULL,        -- bounce | unsubscribe | spamreport | manual
  suppressed_at  TIMESTAMPTZ DEFAULT NOW(),
  org_id         UUID REFERENCES organizations(id),
  source_event_id UUID REFERENCES instaquote_email_events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_suppression_org
  ON email_suppression (org_id, suppressed_at DESC);

ALTER TABLE email_suppression ENABLE ROW LEVEL SECURITY;

-- Suppression list is sensitive PII. No client read. Service role only.
DROP POLICY IF EXISTS "Service role only suppression" ON email_suppression;
CREATE POLICY "Service role only suppression"
  ON email_suppression
  FOR SELECT
  USING (false);

-- =============================================================================
-- DOWN MIGRATION (run manually if needed)
-- =============================================================================
-- DROP TABLE IF EXISTS email_suppression;
-- DROP INDEX IF EXISTS idx_iq_events_org_touch;
-- DROP INDEX IF EXISTS idx_iq_events_org_type;
-- DROP INDEX IF EXISTS idx_iq_events_lead;
-- DROP TABLE IF EXISTS instaquote_email_events;
-- =============================================================================
