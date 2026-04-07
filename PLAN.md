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

- [x] **1.1** Request Supabase integration and configure environment variables
- [x] **1.2** Set up Supabase client/server utilities (`lib/supabase/`)
- [x] **1.3** Create route protection (`proxy.ts` — Next.js 16 uses `proxy` convention, not `middleware`)
- [x] **1.4** Create profiles table with RLS and signup trigger (see `scripts/schema.sql`)
- [x] **1.5** Build authentication pages:
  - `/auth/login/page.tsx`
  - `/auth/sign-up/page.tsx`
  - `/auth/sign-up-success/page.tsx`
  - `/auth/error/page.tsx`
- [x] **1.6** Create protected layout with sidebar navigation (uses shadcn `SidebarProvider`)

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
-- Updated to profiles_select_any so transaction attribution (By column) shows other users' names.
CREATE POLICY "profiles_select_any" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
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

- [x] **2.1** Create products table (see `scripts/schema.sql`)
- [x] **2.2** Create TypeScript types (`lib/types/index.ts`)
- [x] **2.3** Build components:
  - `components/products/ProductsList.tsx` - Table with sorting/filtering
  - `components/products/AddProductModal.tsx` - Create product form
  - `components/products/EditProductModal.tsx` - Edit product form
  - `components/products/DeleteProductButton.tsx` - Delete with confirmation
  - `components/products/ProductForm.tsx` - Shared form (used by Add and Edit modals)
- [x] **2.4** Create products page: `/protected/products/page.tsx`
- [x] **2.5** Implement Server Actions for product CRUD (`lib/actions/products.ts`)

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

- [x] **3.1** Create inventory_transactions table (see `scripts/schema.sql`)
- [x] **3.2** Create inventory_status table with update trigger (see `scripts/schema.sql`)
- [x] **3.3** Build components:
  - `components/inventory/TransactionForm.tsx` - Record transactions
  - `components/inventory/TransactionHistory.tsx` - History table
  - `components/inventory/QuickActionsPanel.tsx` - Quick stock shortcuts
- [x] **3.4** Create inventory page: `/protected/inventory/page.tsx`
- [x] **3.5** Implement Server Actions for transactions (`lib/actions/transactions.ts`)

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

- [x] **4.1** Build dashboard components:
  - `components/dashboard/InventorySummaryCards.tsx` - KPI cards (4-up grid)
  - `components/dashboard/InventoryStatusChart.tsx` - Horizontal bar chart; bars turn red at/below reorder threshold
  - `components/dashboard/TransactionTrendChart.tsx` - Dual area chart (ingress green / egress red), 14 days
  - `components/dashboard/AlertBanner.tsx` - Low stock warning banner with link to alerts page
  - Note: `QuickStatsPanel` was not built separately — stats are embedded in `InventorySummaryCards`
- [x] **4.2** Create dashboard page: `/protected/dashboard/page.tsx`
- [x] **4.3** Implement data fetching with aggregations (`lib/actions/dashboard.ts`)
- [x] **4.4** Responsive chart layouts — side-by-side on desktop, stacked on mobile

---

### Phase 5: Alerts System

**Goal:** Automated low stock alerts and management

- [x] **5.1** Create alerts table with low-stock trigger (see `scripts/schema.sql`)
- [x] **5.2** Build components:
  - `components/alerts/AlertsList.tsx` - Tabbed active/resolved lists with "Resolve all" button
  - `components/alerts/AlertItem.tsx` - Individual alert card with resolve + delete actions
- [x] **5.3** Create alerts page: `/protected/alerts/page.tsx`
- [x] **5.4** Add mark-as-resolved functionality (per-alert and bulk resolve-all)
- [x] **5.5** AlertBanner already integrated into dashboard in Phase 4

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

- [x] **6.1** Create activity_logs table with auto-log trigger (see `scripts/schema.sql`)
- [x] **6.2** Build components:
  - `components/activity/ActivitySummaryCards.tsx` - Daily/weekly/monthly stat cards (ingress, egress, net, count)
  - `components/activity/ActivityChart.tsx` - Grouped bar chart (30-day, stock in vs out)
  - `components/activity/ActivityLog.tsx` - Searchable table (desktop) + card list (mobile)
- [x] **6.3** Create activity page: `/protected/activity/page.tsx`
- [x] **6.4** Implement aggregation queries for summaries (`lib/actions/activity.ts`)

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

- [x] **7.1** Add loading states and skeleton screens — `loading.tsx` for all 5 protected routes, matching page layouts
- [x] **7.2** Implement error boundaries — `app/protected/error.tsx` with reset button, covers all protected pages
- [x] **7.3** Toast notifications — Sonner integrated in Phase 2; all CRUD and resolve actions show toasts
- [x] **7.4** Mobile responsiveness — sidebar hidden on mobile with bottom nav, tables convert to card lists, charts are responsive containers, bottom padding accounts for nav bar
- [x] **7.5** Accessibility — `aria-label` on all search inputs, `aria-current="page"` on active nav links (sidebar + mobile nav), `role="status"` + `aria-live="polite"` on dynamic counts, `sr-only` on icon-only buttons
- [x] **7.6** Performance — "Show more" pagination (20/page) on TransactionHistory and ActivityLog; dashboard data fetched in parallel with `Promise.all`

---

### Phase 8: Settings & Dark Mode

**Goal:** User profile management and system-aware theme switching

- [x] **8.1** Add `name` column to `profiles` table (consolidated into `scripts/schema.sql`)
- [x] **8.2** Update sign-up form to collect display name on registration
- [x] **8.3** Create `lib/actions/profile.ts` — `getProfile` and `updateProfile` server actions
- [x] **8.4** Build `components/settings/ProfileForm.tsx` — editable name field, read-only email
- [x] **8.5** Create settings page: `/protected/settings/page.tsx`
- [x] **8.6** Update `AppSidebar` to display user's name (or email fallback) and Settings link
- [x] **8.7** Update protected layout to fetch and pass profile name to sidebar
- [x] **8.8** Wire up `ThemeProvider` (`next-themes`) in `app/layout.tsx` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`
- [x] **8.9** Create `components/layout/ThemeToggle.tsx` — ghost icon button toggling Sun/Moon with mounted guard
- [x] **8.10** Add `ThemeToggle` to `Header` (top-right, `ml-auto`) and add Settings route title

---

### Phase 9: Delete Own Transactions

**Goal:** Allow users to delete transactions they personally recorded

- [x] **9.1** Add `transactions_delete_own` RLS policy to `scripts/schema.sql` (and run in Supabase SQL editor: `CREATE POLICY "transactions_delete_own" ON inventory_transactions FOR DELETE USING (auth.uid() = user_id);`)
- [x] **9.2** Add `deleteTransaction` server action to `lib/actions/transactions.ts` — auth check + ownership check + delete + revalidate
- [x] **9.3** Create `components/inventory/DeleteTransactionButton.tsx` — AlertDialog confirmation, follows `DeleteProductButton` pattern
- [x] **9.4** Update `app/protected/inventory/page.tsx` — fetch current user, pass `currentUserId` prop to `TransactionHistory`
- [x] **9.5** Update `components/inventory/TransactionHistory.tsx` — new `currentUserId` prop, delete button column in desktop table and mobile cards (only shown for own transactions)

**Note:** Deleting a transaction correctly triggers the existing `update_inventory_status` DB trigger, so inventory counts auto-update. Activity logs are not written for deletions (the `log_inventory_transaction` trigger only fires on `INSERT`).

---

### Phase 10: Stock Diff Adjustment

**Goal:** Allow users to record stock discrepancies (when physical count is lower than the app shows), specifying how many units to deduct and a mandatory reason.

- [x] **10.1** Create `scripts/migration-add-adjustment.sql` — adds `notes TEXT` column, extends `transaction_type` CHECK to include `'adjustment'`, updates `update_inventory_status()` trigger to treat adjustments as deductions, updates `log_inventory_transaction()` trigger to emit `'stock_adjustment'` action with notes in details
- [x] **10.2** Update `lib/types/index.ts` — extend `transaction_type` union to `'ingress' | 'egress' | 'adjustment'`, add `notes?: string | null` to `InventoryTransaction`
- [x] **10.3** Add `adjustmentSchema`, `AdjustmentFormValues` type, and `createAdjustment` server action to `lib/actions/transactions.ts`
- [x] **10.4** Create `components/inventory/AdjustmentForm.tsx` — product select with current stock hint, "units to deduct" input, required reason textarea, calls `createAdjustment`
- [x] **10.5** Update `components/inventory/TransactionHistory.tsx` — add `txMeta()` helper for icon/color/label per type (amber `SlidersHorizontal` for adjustments), show `notes` in product cell (desktop) and below timestamp (mobile)
- [x] **10.6** Update `app/protected/inventory/page.tsx` — add "Stock adjustment" third tab hosting `AdjustmentForm`

**Note:** Adjustments reuse the existing `inventory_transactions` table. Deleting an adjustment row correctly reverts the stock via the existing trigger. Activity summaries currently bucket adjustments under egress totals (acceptable simplification).

---

### Phase 12: My Activity — Per-User Product Traffic Summary

**Goal:** Let each user see their own total ingress and egress per product, independent of other users' contributions.

- [x] **12.1** Add `UserProductSummary` interface to `lib/types/index.ts`
- [x] **12.2** Create `lib/actions/user-summary.ts` — `getUserProductSummaries()` server action that fetches the current user's transactions joined with products, aggregates client-side, and sorts by total volume descending
- [x] **12.3** Create `components/my-activity/UserProductSummaryTable.tsx` — searchable table (desktop) + card list (mobile) with ingress (green), egress (red), net change (colored), and transaction count columns; "Show more" pagination at 20/page
- [x] **12.4** Add "My contributions by product" section to `/protected/activity/page.tsx` — calls both `getActivityData` and `getUserProductSummaries` in parallel; table renders below the transaction log
- [x] **12.5** Added `all_total` field (global ingress + egress across all users) to `UserProductSummary` so each row shows both personal and team-wide totals for the product

**Note:** Adjustments are counted in `my_transaction_count` but excluded from directional ingress/egress totals. The separate `/protected/my-activity` route was removed — the summary lives on the Activity page.

---

### Phase 11: Change Password

**Goal:** Allow users to change their password from the settings page

- [x] **11.1** Add `changePasswordSchema`, `ChangePasswordValues` type, and `changePassword` server action to `lib/actions/profile.ts` — verifies current password via `signInWithPassword` before calling `updateUser`
- [x] **11.2** Create `components/settings/ChangePasswordForm.tsx` — three password fields (current, new, confirm), inline Zod validation, toast feedback, form resets on success
- [x] **11.3** Update `app/protected/settings/page.tsx` — add "Password" card section below "Profile" card

---

## Directory Structure

```
/vercel/share/v0-project/
├── scripts/
│   ├── schema.sql                    # Full baseline schema (all tables, triggers, RLS)
│   └── migration-add-adjustment.sql  # Phase 10: adds notes column + adjustment transaction type
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
│   │   ├── alerts.ts                 # Alert server actions
│   │   └── profile.ts                # Profile server actions
│   └── utils/
│       └── calculations.ts           # Helper functions
│
├── components/
│   ├── ui/                           # shadcn/ui (pre-installed)
│   ├── layout/
│   │   ├── AppSidebar.tsx
│   │   ├── Header.tsx
│   │   ├── MobileNav.tsx
│   │   └── ThemeToggle.tsx
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
│   │   ├── QuickActionsPanel.tsx
│   │   ├── AdjustmentForm.tsx
│   │   └── DeleteTransactionButton.tsx
│   ├── alerts/
│   │   ├── AlertsList.tsx
│   │   └── AlertItem.tsx
│   ├── activity/
│   │   ├── ActivitySummaryCards.tsx
│   │   ├── ActivityChart.tsx
│   │   └── ActivityLog.tsx
│   └── settings/
│       ├── ProfileForm.tsx
│       └── ChangePasswordForm.tsx
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
│       ├── activity/page.tsx
│       └── settings/page.tsx
│
├── proxy.ts                           # Route protection (Next.js 16)
└── PLAN.md                           # This file
```

---

## TypeScript Types

```typescript
// lib/types/index.ts

export interface Profile {
  id: string
  email: string
  name: string | null
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
| `/protected/activity` | Activity | Historical summaries, logs, and per-product contributions |
| `/protected/settings` | Settings | Profile name management |

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
