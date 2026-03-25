'use server'

import { createClient } from '@/lib/supabase/server'
import type { DashboardStats } from '@/lib/types'

export interface InventoryStatusRow {
  product_id: string
  name: string
  category: string | null
  current_quantity: number
  reorder_threshold: number
}

export interface TrendDataPoint {
  date: string        // "MMM d" format, e.g. "Mar 20"
  ingress: number
  egress: number
}

export interface DashboardData {
  stats: DashboardStats
  inventoryStatus: InventoryStatusRow[]
  trendData: TrendDataPoint[]
  lowStockProducts: InventoryStatusRow[]
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()

  // Fetch inventory status joined with products
  const { data: statusData } = await supabase
    .from('inventory_status')
    .select('product_id, current_quantity, product:products(name, category, reorder_threshold)')

  const inventoryStatus: InventoryStatusRow[] = (statusData ?? []).map((row: {
    product_id: string
    current_quantity: number
    product: { name: string; category: string | null; reorder_threshold: number } | null
  }) => ({
    product_id: row.product_id,
    name: row.product?.name ?? 'Unknown',
    category: row.product?.category ?? null,
    current_quantity: row.current_quantity,
    reorder_threshold: row.product?.reorder_threshold ?? 5,
  }))

  const lowStockProducts = inventoryStatus.filter(
    (p) => p.current_quantity <= p.reorder_threshold
  )

  // Total items in stock
  const totalItems = inventoryStatus.reduce((sum, s) => sum + Math.max(0, s.current_quantity), 0)

  // Count distinct products
  const { count: totalProducts } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })

  // Recent transactions (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { count: recentTransactions } = await supabase
    .from('inventory_transactions')
    .select('id', { count: 'exact', head: true })
    .gte('transaction_date', sevenDaysAgo.toISOString())

  // Transaction trend: last 14 days grouped by date
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
  fourteenDaysAgo.setHours(0, 0, 0, 0)

  const { data: txData } = await supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity, transaction_date')
    .gte('transaction_date', fourteenDaysAgo.toISOString())
    .order('transaction_date', { ascending: true })

  // Build a map keyed by "YYYY-MM-DD"
  const trendMap = new Map<string, { ingress: number; egress: number }>()
  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenDaysAgo)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    trendMap.set(key, { ingress: 0, egress: 0 })
  }

  for (const tx of txData ?? []) {
    const key = tx.transaction_date.slice(0, 10)
    const entry = trendMap.get(key)
    if (!entry) continue
    if (tx.transaction_type === 'ingress') entry.ingress += tx.quantity
    else entry.egress += tx.quantity
  }

  const trendData: TrendDataPoint[] = Array.from(trendMap.entries()).map(([date, vals]) => {
    const d = new Date(date + 'T00:00:00')
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { date: label, ...vals }
  })

  return {
    stats: {
      totalProducts: totalProducts ?? 0,
      totalItems,
      lowStockCount: lowStockProducts.length,
      recentTransactions: recentTransactions ?? 0,
    },
    inventoryStatus: inventoryStatus.sort((a, b) => b.current_quantity - a.current_quantity),
    trendData,
    lowStockProducts,
  }
}
