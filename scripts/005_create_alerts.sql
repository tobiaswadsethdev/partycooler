CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT CHECK (alert_type IN ('low_stock', 'expiry_warning')),
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Index for fast lookup of active alerts
CREATE INDEX idx_alerts_user_active ON alerts(user_id, is_resolved, created_at DESC);

-- RLS policies
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_select_own" ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alerts_insert_own" ON alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_update_own" ON alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alerts_delete_own" ON alerts FOR DELETE USING (auth.uid() = user_id);

-- Trigger to create/auto-resolve low stock alerts when inventory_status changes
CREATE OR REPLACE FUNCTION create_low_stock_alert()
RETURNS TRIGGER AS $$
DECLARE
  threshold INTEGER;
BEGIN
  SELECT reorder_threshold INTO threshold
  FROM products WHERE id = NEW.product_id;

  IF NEW.current_quantity <= threshold THEN
    -- Insert only if no active alert exists for this product
    INSERT INTO alerts (user_id, product_id, alert_type)
    VALUES (NEW.user_id, NEW.product_id, 'low_stock')
    ON CONFLICT DO NOTHING;
  ELSE
    -- Auto-resolve any active low_stock alert when stock recovers
    UPDATE alerts
    SET is_resolved = TRUE, resolved_at = NOW()
    WHERE product_id = NEW.product_id
      AND user_id = NEW.user_id
      AND alert_type = 'low_stock'
      AND is_resolved = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_low_stock_alert
AFTER INSERT OR UPDATE ON inventory_status
FOR EACH ROW EXECUTE FUNCTION create_low_stock_alert();
