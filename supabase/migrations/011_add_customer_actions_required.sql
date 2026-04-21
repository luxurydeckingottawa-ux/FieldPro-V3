-- 011: Add customer_actions_required column to jobs table
-- Stores office-controlled "Customer Action Required" prompts shown on the
-- customer portal. Office toggles presets or adds custom prompts from the
-- job detail sidebar. An empty array means the portal shows a clean "No
-- Action Required" state.
--
-- Shape (JSONB array):
-- [
--   {
--     "id": "act-1716...",
--     "label": "Ensure laneway is clear for material delivery",
--     "createdAt": "2026-04-20T14:32:00Z",
--     "preset": "laneway_clear",
--     "completedAt": null
--   }
-- ]

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'jobs'
      AND column_name = 'customer_actions_required'
  ) THEN
    ALTER TABLE jobs ADD COLUMN customer_actions_required JSONB;
    COMMENT ON COLUMN jobs.customer_actions_required IS
      'Office-controlled Customer Action Required prompts shown on the portal. Array of {id, label, createdAt, preset?, completedAt?}.';
  END IF;
END $$;
