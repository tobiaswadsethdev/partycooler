CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  sku TEXT,
  unit_price DECIMAL(10, 2),
  reorder_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category ON products(user_id, category);

-- RLS policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_own" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "products_insert_own" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_update_own" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "products_delete_own" ON products FOR DELETE USING (auth.uid() = user_id);
