# Partycooler

Real-time inventory management for drinks and refrigeration systems. Built with Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, and Supabase.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + shadcn/ui + Tailwind CSS 4 |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (email/password) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Notifications | Sonner |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file at the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
```

> Supabase now uses **publishable keys** (prefixed `sb_publishable_`). Do not use the older anon key variable name.

### 3. Set up the database

Run the baseline schema in your [Supabase SQL editor](https://supabase.com/dashboard):

```
scripts/schema.sql
```

This single file creates all tables, indexes, RLS policies, and triggers in the correct order.

> **Tip:** Disable email confirmation in Supabase Auth settings during development for faster testing.

---

## Troubleshooting

### "relation inventory_transactions does not exist" when recording a transaction

This is caused by a bug in the `update_inventory_status()` trigger function — it references tables without the `public.` schema prefix, which fails under Supabase's required `SET search_path = ''` security setting.

To fix the live database, run this patch once in the Supabase SQL editor:

```
scripts/fix-inventory-trigger.sql
```

This replaces the trigger function with a corrected version that uses schema-qualified table references.

### A drink appears twice, with its stock split across both rows

Two `products` rows with the same name (e.g. two "Pepsi Max") split the stock, the transaction history, and the activity log between them, and make the MCP `consume_drink` tool fail with `Ambiguous drink`.

Merge them, then close the door behind you:

```
scripts/merge-duplicate-products.sql        # set v_target_name, then run
scripts/migrations/unique_product_name.sql  # run once, afterwards
```

The merge re-points all transactions and activity logs at the oldest row, so it ends up with the combined stock, and deletes the duplicates. Run the preview query at the top of the file first — the merge is not reversible.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Project Structure

```
partycooler/
├── app/
│   ├── api/mcp/                  # Remote MCP server endpoint (Streamable HTTP)
│   ├── auth/                     # Login, sign-up, success, error pages
│   ├── oauth/consent/            # OAuth 2.1 consent page (MCP authorization)
│   ├── .well-known/              # OAuth protected resource metadata (RFC 9728)
│   └── protected/                # Authenticated pages (dashboard, products, inventory, …)
├── components/
│   ├── ui/                       # shadcn/ui primitives (57 components)
│   ├── layout/                   # AppSidebar, Header, MobileNav, ThemeToggle
│   ├── dashboard/                # KPI cards, charts, ProductStockList
│   ├── products/                 # ProductsList, AddProductModal, EditProductModal, DeleteProductButton
│   ├── inventory/                # TransactionForm, DeleteTransactionButton
│   ├── my-activity/              # UserProductSummaryTable, MyTransactionsList
│   ├── activity/                 # ActivitySummaryCards, ActivityChart, ActivityLog, UserProductMatrix
│   └── settings/                 # ProfileForm, ChangePasswordForm
├── lib/
│   ├── supabase/                 # Browser and server Supabase clients
│   ├── actions/                  # Server Actions (products, transactions, dashboard, profile)
│   ├── mcp/                      # MCP tool implementations (consume_drink, list_drinks)
│   └── types/                    # TypeScript interfaces
├── scripts/                      # Database schema (schema.sql), migrations, one-off data fixes
├── proxy.ts                      # Route protection (Next.js 16 proxy convention)
├── PLAN.md                       # Implementation roadmap
└── DESIGN.md                     # Design system specification
```

---

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation & Authentication | ✅ Complete |
| 2 | Product Management (CRUD) | ✅ Complete |
| 3 | Inventory Tracking | ✅ Complete |
| 4 | Dashboard & Visualization | ✅ Complete |
| 5 | Alerts System | ❌ Removed |
| 6 | Activity Summary | ✅ Complete |
| 7 | Polish & Optimization | ✅ Complete |
| 8 | Settings & Dark Mode | ✅ Complete |
| 9 | Delete Own Transactions | ✅ Complete |
| 10 | Stock Diff Adjustment | ✅ Complete |
| 11 | Change Password | ✅ Complete |
| 12 | My contributions by product (on Activity page) | ✅ Complete |
| 13 | Pant payment attribution for stock-in | ✅ Complete |
| 14 | Homepage/Dashboard redesign | ✅ Complete |
| 15 | My Transactions + Activity delete | ✅ Complete |
| 16 | MCP server for drink consumption | ✅ Complete |
| 17 | Merge duplicate products + unique product names | ✅ Complete |

---

## Navigation

| Route | Description |
|-------|-------------|
| `/` | Redirects to home or login |
| `/auth/login` | Email/password sign-in (supports `?next=` return path) |
| `/auth/sign-up` | User registration |
| `/oauth/consent` | OAuth 2.1 consent page for MCP clients |
| `/api/mcp/mcp` | Remote MCP server endpoint (Streamable HTTP, OAuth-protected) |
| `/protected/home` | Record stock in/out, current stock list, my activity summary, my transactions (with delete) |
| `/protected/dashboard` | KPI cards, charts, low-stock count |
| `/protected/products` | Add, edit, delete products |
| `/protected/activity` | Daily/weekly/monthly summaries, 30-day bar chart, transaction log (delete own), team activity cross-table |
| `/protected/settings` | Profile management (display name, change password) |

---

## Key Design Decisions

- **Single device per user** — all data is scoped by `user_id` with Supabase Row Level Security.
- **Database-side calculations** — inventory totals are computed by PostgreSQL triggers, not application code.
- **Mobile-first** — sidebar on desktop, bottom navigation bar on mobile.
- **Proxy convention** — Next.js 16 uses `proxy.ts` (not `middleware.ts`) with an exported `proxy` function.
- **Dark mode** — system-aware theme switching via `next-themes`; toggle in the header persists preference to localStorage.

---

## MCP Server

The app hosts a remote [MCP](https://modelcontextprotocol.io) server at `/api/mcp/mcp` (Streamable HTTP), so AI assistants can record drink consumption. Nothing to install — users add the deployment URL as a connector in their MCP client and sign in with their existing Partycooler account.

| Tool | Description |
|------|-------------|
| `consume_drink` | Record that the signed-in user consumed a drink (`drink`, optional `quantity`). Creates an `egress` transaction attributed to the authenticated caller. |
| `list_drinks` | List all drinks with current stock levels. |

**Authentication** is OAuth 2.1 with Supabase Auth as the authorization server: the MCP client discovers it via the RFC 9728 metadata at `/.well-known/oauth-protected-resource`, registers itself dynamically, and sends the user through a browser sign-in + consent flow (`/oauth/consent`). Every request then carries the caller's own Supabase access token, so tools run under their identity and RLS.

**Scope** — tools act only for the authenticated caller. `consume_drink` takes the user id from the verified bearer token and never from tool arguments, so an MCP client cannot record consumption against someone else's account. The `transactions_insert_own` RLS policy enforces the same rule in the database (see `scripts/migrations/restrict_transaction_insert_to_self.sql` for existing deployments).

**One-time Supabase setup:**

1. Enable the OAuth 2.1 server: Dashboard → Authentication → OAuth Server (or `[auth.oauth_server] enabled = true` in `config.toml`).
2. Set the authorization URL path to `/oauth/consent` (the consent page ships with this app).

---

## Documentation

- [`PLAN.md`](./PLAN.md) — Full implementation plan with SQL schemas, component list, and phase breakdown.
- [`DESIGN.md`](./DESIGN.md) — Design system: colors, typography, spacing, component patterns, accessibility rules.
