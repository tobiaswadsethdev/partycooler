-- =============================================================================
-- Partycooler — Baseline Schema
-- Single-file setup for a fresh Supabase project.
-- Run this once in the Supabase SQL editor on a clean database.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup.
-- SET search_path = '' is required by Supabase (2024+) for SECURITY DEFINER
-- functions; all table references must be schema-qualified.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  category          TEXT,
  reorder_threshold INTEGER DEFAULT 5,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category ON products(user_id, category);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_own" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "products_insert_own" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_update_own" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "products_delete_own" ON products FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- inventory_transactions
-- ---------------------------------------------------------------------------

CREATE TABLE inventory_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  transaction_type TEXT CHECK (transaction_type IN ('ingress', 'egress')),
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  transaction_date TIMESTAMP DEFAULT NOW(),
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_date ON inventory_transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_product   ON inventory_transactions(product_id, transaction_date DESC);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_select_own" ON inventory_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON inventory_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- inventory_status
-- Maintained automatically by trigger on inventory_transactions.
-- ---------------------------------------------------------------------------

CREATE TABLE inventory_status (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  current_quantity INTEGER DEFAULT 0,
  last_updated     TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE inventory_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_select_own" ON inventory_status FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
DECLARE
  new_quantity       INTEGER;
  target_user_id    UUID;
  target_product_id UUID;
BEGIN
  target_user_id    := COALESCE(NEW.user_id,    OLD.user_id);
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT COALESCE(SUM(
    CASE WHEN transaction_type = 'ingress' THEN  quantity
         WHEN transaction_type = 'egress'  THEN -quantity
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


-- ---------------------------------------------------------------------------
-- alerts
-- Low-stock alerts are created/auto-resolved by trigger on inventory_status.
-- ---------------------------------------------------------------------------

CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type  TEXT CHECK (alert_type IN ('low_stock', 'expiry_warning')),
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_alerts_user_active ON alerts(user_id, is_resolved, created_at DESC);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_select_own" ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alerts_insert_own" ON alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_update_own" ON alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alerts_delete_own" ON alerts FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION create_low_stock_alert()
RETURNS TRIGGER AS $$
DECLARE
  threshold INTEGER;
BEGIN
  SELECT reorder_threshold INTO threshold
  FROM products WHERE id = NEW.product_id;

  IF NEW.current_quantity <= threshold THEN
    INSERT INTO alerts (user_id, product_id, alert_type)
    VALUES (NEW.user_id, NEW.product_id, 'low_stock')
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE alerts
    SET is_resolved = TRUE, resolved_at = NOW()
    WHERE product_id = NEW.product_id
      AND user_id    = NEW.user_id
      AND alert_type = 'low_stock'
      AND is_resolved = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_low_stock_alert
AFTER INSERT OR UPDATE ON inventory_status
FOR EACH ROW EXECUTE FUNCTION create_low_stock_alert();


-- ---------------------------------------------------------------------------
-- activity_logs
-- Every inventory transaction is logged automatically by trigger.
-- ---------------------------------------------------------------------------

CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_user_date ON activity_logs(user_id, created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_select_own" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_insert_own" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

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
      'product_id',       NEW.product_id,
      'quantity',         NEW.quantity,
      'transaction_type', NEW.transaction_type
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_inventory_transaction
AFTER INSERT ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION log_inventory_transaction();
