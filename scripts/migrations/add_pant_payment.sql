-- =============================================================================
-- Migration: Add paid_by_pant to inventory_transactions
-- Adds a boolean flag so stock-in transactions can be attributed to Pant
-- (the Swedish bottle recycling deposit system) instead of the recording user.
-- =============================================================================

-- Add column to inventory_transactions
ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS paid_by_pant BOOLEAN NOT NULL DEFAULT FALSE;

-- Update trigger function to propagate paid_by_pant into activity_logs.details
CREATE OR REPLACE FUNCTION log_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.transaction_type = 'ingress' THEN 'stock_in' ELSE 'stock_out' END,
    'inventory_transaction',
    NEW.id,
    jsonb_build_object(
      'product_id',       NEW.product_id,
      'quantity',         NEW.quantity,
      'transaction_type', NEW.transaction_type,
      'paid_by_pant',     NEW.paid_by_pant
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
