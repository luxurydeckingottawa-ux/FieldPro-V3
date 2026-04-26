-- 013 DOWN — InstaQuote lead capture rollback
-- Run this only if you need to fully unwind migration 013.
-- Order matters: drop the dependent objects (indexes, table) before columns.

BEGIN;

DROP TABLE IF EXISTS instaquote_bot_log;

DELETE FROM storage.buckets WHERE id = 'instaquote-pdfs';

DROP INDEX IF EXISTS idx_jobs_instaquote_ratelimit;
DROP INDEX IF EXISTS idx_jobs_submission_id_unique;

ALTER TABLE jobs DROP COLUMN IF EXISTS ip_hash;
ALTER TABLE jobs DROP COLUMN IF EXISTS pdf_generated_at;
ALTER TABLE jobs DROP COLUMN IF EXISTS pdf_url;
ALTER TABLE jobs DROP COLUMN IF EXISTS submission_id;
ALTER TABLE jobs DROP COLUMN IF EXISTS source_metadata;

COMMIT;
