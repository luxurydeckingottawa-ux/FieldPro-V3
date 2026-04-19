-- 009: Add angela_conversations column to jobs table
-- Stores the running log of customer conversations with the Angela advisor
-- widget (embedded in the customer estimate portal via iframe). Each entry
-- captures one session's exchange plus the final summary payload the widget
-- posts back on end-of-conversation.
--
-- Shape (JSONB array):
-- [
--   {
--     "startedAt": "2026-04-18T14:32:00Z",
--     "endedAt":   "2026-04-18T14:38:12Z",
--     "questionCount": 4,
--     "questions": [
--       "How does payment work?",
--       "Can we change materials later?",
--       "What's the deposit?",
--       "When can you start?"
--     ],
--     "summary": "Asked about financing and switching materials after accept. Spouse hasn't seen estimate yet. Warming up.",
--     "sentiment": "hesitant",
--     "closeReadiness": "warming",
--     "escalated": false
--   }
-- ]
--
-- Data flow:
--   angela.luxurydecking.ca/widget  (iframe)
--     -> postMessage { type: 'ANGELA_SUMMARY', ... }
--     -> EstimatePortalView listener
--     -> onTrackEngagement()
--     -> jobs.angela_conversations (this column)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'jobs'
      AND column_name = 'angela_conversations'
  ) THEN
    ALTER TABLE jobs ADD COLUMN angela_conversations JSONB DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN jobs.angela_conversations IS
      'Customer conversations with the Angela advisor widget. Array of session records with questions, summary, sentiment, close-readiness, escalation flag. Written by the portal via postMessage -> onTrackEngagement.';
  END IF;
END $$;
