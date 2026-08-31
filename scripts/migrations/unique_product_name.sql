-- =============================================================================
-- Migration: Unique product name
--
-- Stops duplicate drinks (two "Pepsi Max" rows) from being created, by making
-- products.name unique ignoring case and surrounding whitespace.
--
-- Run this once in the Supabase SQL Editor AFTER
-- scripts/merge-duplicate-products.sql has cleared the existing duplicates.
-- =============================================================================

-- 1. Fail with a readable message if duplicates remain, instead of a cryptic
--    index build error.
DO $$
DECLARE
  v_dupes TEXT;
BEGIN
  SELECT string_agg(format('%s (%s rows)', name, cnt), ', ' ORDER BY name)
  INTO v_dupes
  FROM (
    SELECT min(name) AS name, count(*) AS cnt
    FROM public.products
    GROUP BY lower(trim(name))
    HAVING count(*) > 1
  ) d;

  IF v_dupes IS NOT NULL THEN
    RAISE EXCEPTION
      'Duplicate product names remain — merge them first with scripts/merge-duplicate-products.sql: %',
      v_dupes;
  END IF;
END $$;

-- 2. Enforce uniqueness on the normalised name.
--    Violations surface as SQLSTATE 23505, which lib/actions/products.ts maps to
--    "A product with that name already exists".
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name_unique
  ON public.products (lower(trim(name)));

-- Rollback:
-- DROP INDEX IF EXISTS idx_products_name_unique;
