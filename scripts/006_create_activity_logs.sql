CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_activity_user_date ON activity_logs(user_id, created_at DESC);

-- RLS policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_select_own" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_insert_own" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to log inventory transactions automatically
CREATE OR REPLACE FUNCTION log_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.transaction_type = 'ingress' THEN 'stock_in' ELSE 'stock_out' END,
    'inventory_transaction',
    NEW.id,
    jsonb_build_object(
      'product_id', NEW.product_id,
      'quantity', NEW.quantity,
      'transaction_type', NEW.transaction_type,
      'notes', NEW.notes
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_inventory_transaction
AFTER INSERT ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION log_inventory_transaction();
