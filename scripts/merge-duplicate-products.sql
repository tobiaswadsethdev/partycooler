-- =============================================================================
-- Merge duplicate products
--
-- Collapses every `products` row whose normalised name matches v_target_name
-- into the oldest of them. Transactions and activity logs are re-pointed at the
-- survivor, so the merged product ends up with the combined stock and the full
-- history; the duplicates are then deleted.
--
-- Run once in the Supabase SQL Editor (service_role bypasses RLS). The SQL
-- editor is required, not optional: `inventory_transactions` and `activity_logs`
-- have no UPDATE policy at all, so the re-pointing below affects zero rows under
-- a normal publishable-key session.
--
-- There is no rollback — the DELETE at the end is destructive. Run the preview
-- query first and keep its output.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- PREVIEW — run this on its own first, then again afterwards to compare.
-- Before: one row per duplicate. After: a single row whose stock and tx_count
-- are the sums of the previous rows'.
-- ---------------------------------------------------------------------------

-- SELECT p.id, p.name, p.category, p.reorder_threshold, p.created_at,
--        COALESCE(s.current_quantity, 0) AS stock,
--        (SELECT count(*) FROM inventory_transactions t WHERE t.product_id = p.id) AS tx_count
-- FROM products p
-- LEFT JOIN inventory_status s ON s.product_id = p.id
-- WHERE lower(trim(p.name)) = 'pepsi max'
-- ORDER BY p.created_at;


-- ---------------------------------------------------------------------------
-- MERGE
-- One DO block, so it is a single statement and any failure rolls back the
-- whole merge.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_target_name TEXT := 'pepsi max';   -- lower(trim(name)) of the drink to merge
  v_ids         UUID[];
  v_keeper      UUID;
  v_dupes       UUID[];
  v_moved       INTEGER;
  v_logs        INTEGER;
  v_stock       INTEGER;
BEGIN
  SELECT array_agg(id ORDER BY created_at, id)
  INTO v_ids
  FROM public.products
  WHERE lower(trim(name)) = v_target_name;

  IF COALESCE(array_length(v_ids, 1), 0) < 2 THEN
    RAISE NOTICE 'Nothing to merge: % row(s) named "%".',
      COALESCE(array_length(v_ids, 1), 0), v_target_name;
    RETURN;
  END IF;

  v_keeper := v_ids[1];                -- oldest row survives
  v_dupes  := v_ids[2:];

  -- The keeper keeps its own values; only fill in what it is missing.
  UPDATE public.products AS k
  SET category = COALESCE(
        k.category,
        (SELECT d.category FROM public.products d
          WHERE d.id = ANY(v_dupes) AND d.category IS NOT NULL
          ORDER BY d.created_at, d.id LIMIT 1)
      ),
      reorder_threshold = COALESCE(
        k.reorder_threshold,
        (SELECT d.reorder_threshold FROM public.products d
          WHERE d.id = ANY(v_dupes) AND d.reorder_threshold IS NOT NULL
          ORDER BY d.created_at, d.id LIMIT 1)
      ),
      updated_at = NOW()
  WHERE k.id = v_keeper;

  -- Re-point the history. The AFTER UPDATE trigger on inventory_transactions
  -- recomputes inventory_status for the keeper, which is what gives it the
  -- combined stock. The duplicates' status rows go stale here and are removed
  -- by the cascade further down — hence the DELETE comes last.
  UPDATE public.inventory_transactions
  SET product_id = v_keeper
  WHERE product_id = ANY(v_dupes);
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  -- activity_logs.details->>'product_id' is JSONB with no FK, so nothing
  -- updates it for us. The Activity page reads it to resolve the product name.
  UPDATE public.activity_logs
  SET details = jsonb_set(details, '{product_id}', to_jsonb(v_keeper))
  WHERE details->>'product_id' = ANY(v_dupes::TEXT[]);
  GET DIAGNOSTICS v_logs = ROW_COUNT;

  -- Cascades to the duplicates' now-stale inventory_status rows.
  DELETE FROM public.products WHERE id = ANY(v_dupes);

  SELECT current_quantity INTO v_stock
  FROM public.inventory_status
  WHERE product_id = v_keeper;

  RAISE NOTICE 'Merged % duplicate(s) of "%" into %. Re-pointed % transaction(s) and % activity log(s). Stock is now %.',
    array_length(v_dupes, 1), v_target_name, v_keeper, v_moved, v_logs, COALESCE(v_stock, 0);
END $$;
