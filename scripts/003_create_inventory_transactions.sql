CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  transaction_type TEXT CHECK (transaction_type IN ('ingress', 'egress')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  transaction_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_user_date ON inventory_transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_product ON inventory_transactions(product_id, transaction_date DESC);

-- RLS policies
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_select_own" ON inventory_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON inventory_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
