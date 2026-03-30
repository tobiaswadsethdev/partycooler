-- =============================================================================
-- Migration: Add stock adjustment transaction type
--
-- Adds a nullable `notes` column to inventory_transactions and introduces a
-- third transaction_type value ('adjustment') that deducts stock like an
-- egress but is semantically distinct (records a discovered discrepancy).
--
-- Run this once in the Supabase SQL editor against an existing database.
-- =============================================================================

-- 1. Add nullable notes column (existing rows unaffected)
ALTER TABLE inventory_transactions ADD COLUMN notes TEXT;

-- 2. Extend the transaction_type CHECK constraint to include 'adjustment'
ALTER TABLE inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;

ALTER TABLE inventory_transactions
  ADD CONSTRAINT inventory_transactions_transaction_type_check
  CHECK (transaction_type IN ('ingress', 'egress', 'adjustment'));

-- 3. Replace the inventory status trigger to treat 'adjustment' as a deduction
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
  FROM inventory_transactions
  WHERE product_id = target_product_id;

  INSERT INTO inventory_status (product_id, current_quantity, last_updated)
  VALUES (target_product_id, new_quantity, NOW())
  ON CONFLICT (product_id) DO UPDATE
    SET current_quantity = new_quantity, last_updated = NOW();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Replace the activity log trigger to emit 'stock_adjustment' and include notes
CREATE OR REPLACE FUNCTION log_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    NEW.user_id,
    CASE NEW.transaction_type
      WHEN 'ingress'    THEN 'stock_in'
      WHEN 'egress'     THEN 'stock_out'
      WHEN 'adjustment' THEN 'stock_adjustment'
    END,
    'inventory_transaction',
    NEW.id,
    jsonb_build_object(
      'product_id',       NEW.product_id,
      'quantity',         NEW.quantity,
      'transaction_type', NEW.transaction_type,
      'notes',            NEW.notes
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
