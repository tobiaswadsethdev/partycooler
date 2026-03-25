CREATE TABLE inventory_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  current_quantity INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- RLS policies
ALTER TABLE inventory_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_select_own" ON inventory_status FOR SELECT USING (auth.uid() = user_id);

-- Trigger to update inventory status after transactions
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
DECLARE
  new_quantity INTEGER;
  target_user_id UUID;
  target_product_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT COALESCE(SUM(
    CASE WHEN transaction_type = 'ingress' THEN quantity
         WHEN transaction_type = 'egress' THEN -quantity
         ELSE 0 END
  ), 0)
  INTO new_quantity
  FROM inventory_transactions
  WHERE product_id = target_product_id AND user_id = target_user_id;

  INSERT INTO inventory_status (user_id, product_id, current_quantity, last_updated)
  VALUES (target_user_id, target_product_id, new_quantity, NOW())
  ON CONFLICT (user_id, product_id) DO UPDATE
  SET current_quantity = new_quantity, last_updated = NOW();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_inventory_status
AFTER INSERT OR UPDATE OR DELETE ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION update_inventory_status();
