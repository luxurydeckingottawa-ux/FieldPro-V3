-- 012: Add permit_notice_active flag to jobs table
-- Office toggles this from the Admin Setup checklist beside the
-- "Apply for permits if needed" item. When true, the customer portal
-- shows an info banner letting the customer know we are actively
-- waiting on municipal permit approval. When false (default), no
-- banner is shown.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'jobs'
      AND column_name = 'permit_notice_active'
  ) THEN
    ALTER TABLE jobs ADD COLUMN permit_notice_active BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN jobs.permit_notice_active IS
      'When true, customer portal shows an info banner that the permit application is in progress. Toggled by office from the Admin Setup checklist.';
  END IF;
END $$;
