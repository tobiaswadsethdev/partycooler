-- =============================================================================
-- Patch: Fix update_inventory_status() trigger function
--
-- The original function declared SET search_path = '' (required by Supabase
-- 2024+) but referenced inventory_transactions and inventory_status without
-- the public. schema prefix, causing:
--   ERROR: relation "inventory_transactions" does not exist
--
-- Run this once in the Supabase SQL editor to fix the live database.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
DECLARE
  new_quantity      INTEGER;
  target_product_id UUID;
BEGIN
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT COALESCE(SUM(
    CASE WHEN transaction_type = 'ingress'    THEN  quantity
         WHEN transaction_type = 'egress'     THEN -quantity
         WHEN transaction_type = 'adjustment' THEN -quantity
         ELSE 0 END
  ), 0)
  INTO new_quantity
  FROM public.inventory_transactions
  WHERE product_id = target_product_id;

  INSERT INTO public.inventory_status (product_id, current_quantity, last_updated)
  VALUES (target_product_id, new_quantity, NOW())
  ON CONFLICT (product_id) DO UPDATE
    SET current_quantity = new_quantity, last_updated = NOW();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
