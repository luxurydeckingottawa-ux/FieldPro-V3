-- 008: Add customer_requested_swaps column to jobs table
-- Stores material swaps customers request via the portal "Try Different
-- Decking" flow. Each entry documents a swap from one material to another
-- along with the price impact. Office must reconcile these before the job
-- advances from Sold → Production.
--
-- Shape (JSONB array):
-- [
--   {
--     "optionId": "opt-A-1716...",
--     "category": "decking",
--     "fromId": "fiberon_goodlife_weekender",
--     "fromName": "Fiberon GoodLife Weekender",
--     "toId": "azek_landmark",
--     "toName": "PVC Landmark",
--     "toBrand": "Azek",
--     "priceImpact": 1410,
--     "timestamp": "2026-04-17T14:32:00Z",
--     "reconciledAt": null,
--     "reconciledBy": null
--   }
-- ]

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'jobs'
      AND column_name = 'customer_requested_swaps'
  ) THEN
    ALTER TABLE jobs ADD COLUMN customer_requested_swaps JSONB;
    COMMENT ON COLUMN jobs.customer_requested_swaps IS
      'Customer-initiated material swaps captured via portal. Array of swap records with fromId, toId, priceImpact, timestamp. Office must reconcile before production.';
  END IF;
END $$;
