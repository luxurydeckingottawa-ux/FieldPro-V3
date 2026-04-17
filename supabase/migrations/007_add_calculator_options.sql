-- 007: Add calculator_options column to jobs table
-- Stores the full multi-option estimator state (EstimateOptionSnapshot[]) so
-- estimates can be re-opened in the showroom with all options intact.
-- The dataService.updateJob keymap now maps calculatorOptions → calculator_options;
-- this column must exist for those updates to land rather than being silently dropped.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'jobs'
      AND column_name = 'calculator_options'
  ) THEN
    ALTER TABLE jobs ADD COLUMN calculator_options JSONB;
    COMMENT ON COLUMN jobs.calculator_options IS
      'Multi-option estimator snapshot (EstimateOptionSnapshot[]). NULL for jobs created before the showroom estimator.';
  END IF;
END $$;
