-- 015 DOWN: Drop instaquote_email_events + email_suppression
-- =============================================================================
DROP TABLE IF EXISTS email_suppression;
DROP INDEX IF EXISTS idx_iq_events_org_touch;
DROP INDEX IF EXISTS idx_iq_events_org_type;
DROP INDEX IF EXISTS idx_iq_events_lead;
DROP TABLE IF EXISTS instaquote_email_events;
