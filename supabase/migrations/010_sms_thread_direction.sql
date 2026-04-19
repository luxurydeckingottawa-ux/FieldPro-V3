-- ============================================================
-- 010_sms_thread_direction.sql
-- ============================================================
-- Unified SMS thread store on the customer job file.
--
-- incoming_messages was originally insert-only from the Twilio webhook.
-- We're now reusing the same table for outbound office-sent SMS so the
-- customer-file chat bubble can render a single chronological thread.
--
-- Columns added:
--   direction        'inbound' (default) | 'outbound'
--   sent_by_user_id  UUID of the admin who composed the outbound message
--                    (nullable — automated drip sends leave this null)
--
-- Already applied in production via Management API on 2026-04-19. This
-- file exists so the migration is in version control and future dev
-- environments / rebuilds replay it.
-- ============================================================

ALTER TABLE incoming_messages
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound';

ALTER TABLE incoming_messages
  DROP CONSTRAINT IF EXISTS incoming_messages_direction_check;

ALTER TABLE incoming_messages
  ADD CONSTRAINT incoming_messages_direction_check
  CHECK (direction IN ('inbound', 'outbound'));

ALTER TABLE incoming_messages
  ADD COLUMN IF NOT EXISTS sent_by_user_id UUID;

-- Composite index so the job-file chat bubble can scan a single customer's
-- thread cheaply: query-pattern is `from_number = X OR to_number = X`
-- (inbound uses from_number=X, outbound uses to_number=X), ordered newest-first.
CREATE INDEX IF NOT EXISTS idx_incoming_messages_threads
  ON incoming_messages(from_number, to_number, received_at DESC);
