'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserProductSummary } from '@/lib/types'

export async function getUserProductSummaries(): Promise<UserProductSummary[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('product_id, transaction_type, quantity, product:products(id, name, category)')
    .eq('user_id', user.id)

  if (error || !data) return []

  const map = new Map<string, UserProductSummary>()

  for (const row of data) {
    const product = row.product as { id: string; name: string; category: string | null } | null
    if (!product) continue

    const entry = map.get(row.product_id) ?? {
      product_id: row.product_id,
      product_name: product.name,
      category: product.category,
      total_ingress: 0,
      total_egress: 0,
      net_change: 0,
      transaction_count: 0,
    }

    if (row.transaction_type === 'ingress') {
      entry.total_ingress += row.quantity
      entry.net_change += row.quantity
    } else if (row.transaction_type === 'egress') {
      entry.total_egress += row.quantity
      entry.net_change -= row.quantity
    }
    // 'adjustment' counted in transaction_count but not ingress/egress totals
    entry.transaction_count += 1

    map.set(row.product_id, entry)
  }

  return Array.from(map.values()).sort(
    (a, b) => (b.total_ingress + b.total_egress) - (a.total_ingress + a.total_egress)
  )
}
