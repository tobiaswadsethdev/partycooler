# Partycooler - Implementation Plan

A responsive web application for real-time inventory management of drinks and products in refrigeration systems.

---

## Quick Reference

| Aspect | Choice |
|--------|--------|
| **Database** | Supabase PostgreSQL |
| **Device Model** | Single device per user |
| **Authentication** | Simple email/password |
| **Alerts** | Low stock alerts + Activity summaries |

---

## Implementation Phases

### Phase 1: Foundation & Authentication

**Goal:** Set up Supabase integration and basic authentication flow

- [ ] **1.1** Request Supabase integration and configure environment variables
- [ ] **1.2** Set up Supabase client/server utilities (`lib/supabase/`)
- [ ] **1.3** Create middleware for session protection
- [ ] **1.4** Run `scripts/001_create_profiles.sql` - Create profiles table with RLS
- [ ] **1.5** Build authentication pages:
  - `/auth/login/page.tsx`
  - `/auth/sign-up/page.tsx`
  - `/auth/sign-up-success/page.tsx`
  - `/auth/error/page.tsx`
- [ ] **1.6** Create protected layout with sidebar navigation

**SQL Script - 001_create_profiles.sql:**
```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  device_name TEXT DEFAULT 'My Cooler',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### Phase 2: Product Management

**Goal:** Full CRUD operations for product catalog

- [ ] **2.1** Run `scripts/002_create_products.sql` - Create products table
- [ ] **2.2** Create TypeScript types (`lib/types/index.ts`)
- [ ] **2.3** Build components:
  - `components/products/ProductsList.tsx` - Table with sorting/filtering
  - `components/products/AddProductModal.tsx` - Create product form
  - `components/products/EditProductModal.tsx` - Edit product form
  - `components/products/DeleteProductButton.tsx` - Delete with confirmation
- [ ] **2.4** Create products page: `/protected/products/page.tsx`
- [ ] **2.5** Implement Server Actions for product CRUD

**SQL Script - 002_create_products.sql:**
```sql
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
```

---

### Phase 3: Inventory Tracking

**Goal:** Record and track stock movements (ingress/egress)

- [ ] **3.1** Run `scripts/003_create_inventory_transactions.sql`
- [ ] **3.2** Run `scripts/004_create_inventory_status.sql` (with trigger)
- [ ] **3.3** Build components:
  - `components/inventory/TransactionForm.tsx` - Record transactions
  - `components/inventory/TransactionHistory.tsx` - History table
  - `components/inventory/QuickActionsPanel.tsx` - Quick stock shortcuts
- [ ] **3.4** Create inventory page: `/protected/inventory/page.tsx`
- [ ] **3.5** Implement Server Actions for transactions

**SQL Script - 003_create_inventory_transactions.sql:**
```sql
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
```

**SQL Script - 004_create_inventory_status.sql:**
```sql
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
```

---

### Phase 4: Dashboard & Visualization

**Goal:** Create main dashboard with charts and statistics

- [ ] **4.1** Build dashboard components:
  - `components/dashboard/InventorySummaryCards.tsx` - KPI cards
  - `components/dashboard/InventoryStatusChart.tsx` - Bar chart (Recharts)
  - `components/dashboard/TransactionTrendChart.tsx` - Line chart
  - `components/dashboard/QuickStatsPanel.tsx` - Summary stats
  - `components/dashboard/AlertBanner.tsx` - Low stock warning
- [ ] **4.2** Create dashboard page: `/protected/dashboard/page.tsx`
- [ ] **4.3** Implement data fetching with aggregations
- [ ] **4.4** Add responsive chart layouts for mobile

---

### Phase 5: Alerts System

**Goal:** Automated low stock alerts and management

- [ ] **5.1** Run `scripts/005_create_alerts.sql` (with trigger)
- [ ] **5.2** Build components:
  - `components/alerts/AlertsList.tsx` - Alerts table/cards
  - `components/alerts/AlertItem.tsx` - Individual alert card
- [ ] **5.3** Create alerts page: `/protected/alerts/page.tsx`
- [ ] **5.4** Add mark-as-resolved functionality
- [ ] **5.5** Integrate AlertBanner into dashboard

**SQL Script - 005_create_alerts.sql:**
```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT CHECK (alert_type IN ('low_stock', 'expiry_warning')),
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- RLS policies
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_select_own" ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alerts_update_own" ON alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alerts_delete_own" ON alerts FOR DELETE USING (auth.uid() = user_id);

-- Trigger to create low stock alerts
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
    -- Auto-resolve if stock is now above threshold
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
```

---

### Phase 6: Activity Summary

**Goal:** Historical reporting and activity logs

- [ ] **6.1** Run `scripts/006_create_activity_logs.sql`
- [ ] **6.2** Build components:
  - `components/activity/ActivitySummaryCards.tsx` - Daily/weekly/monthly
  - `components/activity/ActivityChart.tsx` - Trend visualization
  - `components/activity/ActivityLog.tsx` - History table
- [ ] **6.3** Create activity page: `/protected/activity/page.tsx`
- [ ] **6.4** Implement aggregation queries for summaries

**SQL Script - 006_create_activity_logs.sql:**
```sql
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
```

---

### Phase 7: Polish & Optimization

**Goal:** Production-ready application

- [ ] **7.1** Add loading states and skeleton screens
- [ ] **7.2** Implement error boundaries and error handling
- [ ] **7.3** Add toast notifications for actions
- [ ] **7.4** Mobile responsiveness testing and fixes
- [ ] **7.5** Accessibility audit (keyboard navigation, ARIA labels)
- [ ] **7.6** Performance optimization (pagination, query optimization)

---

## Directory Structure

```
/vercel/share/v0-project/
├── scripts/                          # Database migration scripts
│   ├── 001_create_profiles.sql
│   ├── 002_create_products.sql
│   ├── 003_create_inventory_transactions.sql
│   ├── 004_create_inventory_status.sql
│   ├── 005_create_alerts.sql
│   └── 006_create_activity_logs.sql
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── proxy.ts                  # Session proxy
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces
│   ├── actions/
│   │   ├── products.ts               # Product server actions
│   │   ├── transactions.ts           # Transaction server actions
│   │   └── alerts.ts                 # Alert server actions
│   └── utils/
│       └── calculations.ts           # Helper functions
│
├── components/
│   ├── ui/                           # shadcn/ui (pre-installed)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileNav.tsx
│   ├── dashboard/
│   │   ├── InventorySummaryCards.tsx
│   │   ├── InventoryStatusChart.tsx
│   │   ├── TransactionTrendChart.tsx
│   │   ├── QuickStatsPanel.tsx
│   │   └── AlertBanner.tsx
│   ├── products/
│   │   ├── ProductsList.tsx
│   │   ├── AddProductModal.tsx
│   │   ├── EditProductModal.tsx
│   │   └── DeleteProductButton.tsx
│   ├── inventory/
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionHistory.tsx
│   │   └── QuickActionsPanel.tsx
│   ├── alerts/
│   │   ├── AlertsList.tsx
│   │   └── AlertItem.tsx
│   └── activity/
│       ├── ActivitySummaryCards.tsx
│       ├── ActivityChart.tsx
│       └── ActivityLog.tsx
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      # Redirect to login/dashboard
│   ├── auth/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── sign-up/page.tsx
│   │   ├── sign-up-success/page.tsx
│   │   └── error/page.tsx
│   └── protected/
│       ├── layout.tsx                # Sidebar + auth check
│       ├── dashboard/page.tsx
│       ├── products/page.tsx
│       ├── inventory/page.tsx
│       ├── alerts/page.tsx
│       └── activity/page.tsx
│
├── middleware.ts                      # Session protection
└── PLAN.md                           # This file
```

---

## TypeScript Types

```typescript
// lib/types/index.ts

export interface Profile {
  id: string
  email: string
  device_name: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  user_id: string
  name: string
  category: string | null
  sku: string | null
  unit_price: number | null
  reorder_threshold: number
  created_at: string
  updated_at: string
}

export interface InventoryTransaction {
  id: string
  user_id: string
  product_id: string
  transaction_type: 'ingress' | 'egress'
  quantity: number
  notes: string | null
  transaction_date: string
  created_at: string
  // Joined fields
  product?: Product
}

export interface InventoryStatus {
  id: string
  user_id: string
  product_id: string
  current_quantity: number
  last_updated: string
  // Joined fields
  product?: Product
}

export interface Alert {
  id: string
  user_id: string
  product_id: string
  alert_type: 'low_stock' | 'expiry_warning'
  is_resolved: boolean
  created_at: string
  resolved_at: string | null
  // Joined fields
  product?: Product
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface DashboardStats {
  totalProducts: number
  totalItems: number
  lowStockCount: number
  recentTransactions: number
}

export interface ActivitySummary {
  period: 'daily' | 'weekly' | 'monthly'
  totalIngress: number
  totalEgress: number
  netChange: number
  transactionCount: number
}
```

---

## Navigation Structure

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Redirect to dashboard or login |
| `/auth/login` | Login | Email/password login |
| `/auth/sign-up` | Sign Up | User registration |
| `/protected/dashboard` | Dashboard | Main overview with charts |
| `/protected/products` | Products | Product catalog management |
| `/protected/inventory` | Inventory | Record transactions, view history |
| `/protected/alerts` | Alerts | Low stock alerts management |
| `/protected/activity` | Activity | Historical summaries and logs |

---

## Success Criteria

- [ ] Users can register and login securely
- [ ] Users can add, edit, delete products
- [ ] Users can record inventory transactions (ingress/egress)
- [ ] Dashboard displays real-time inventory status with charts
- [ ] Alert system automatically flags low stock items
- [ ] Activity summaries show daily/weekly/monthly trends
- [ ] Full transaction history searchable and filterable
- [ ] Responsive design works on mobile and desktop
- [ ] All data isolated by user (RLS enforced)
- [ ] Application handles errors gracefully

---

## Notes

- **Email Confirmation:** Disable in Supabase settings during development for faster testing
- **RLS:** All tables use Row Level Security - user_id must be passed on all operations
- **Triggers:** Database triggers handle inventory calculations and alert generation automatically
- **Mobile-First:** Design for mobile screens first, then enhance for desktop
