'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserProductSummary } from '@/lib/types'

export async function getUserProductSummaries(): Promise<UserProductSummary[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Fetch current user's transactions and all transactions in parallel
  const [myResult, allResult] = await Promise.all([
    supabase
      .from('inventory_transactions')
      .select('product_id, transaction_type, quantity, product:products(id, name, category)')
      .eq('user_id', user.id),
    supabase
      .from('inventory_transactions')
      .select('product_id, transaction_type, quantity'),
  ])

  if (!myResult.data) return []

  // Build per-product map from current user's transactions
  const map = new Map<string, UserProductSummary>()

  for (const row of myResult.data) {
    const product = row.product as { id: string; name: string; category: string | null } | null
    if (!product) continue

    const entry = map.get(row.product_id) ?? {
      product_id: row.product_id,
      product_name: product.name,
      category: product.category,
      my_ingress: 0,
      my_egress: 0,
      my_net: 0,
      my_transaction_count: 0,
      all_total: 0,
    }

    if (row.transaction_type === 'ingress') {
      entry.my_ingress += row.quantity
      entry.my_net += row.quantity
    } else if (row.transaction_type === 'egress') {
      entry.my_egress += row.quantity
      entry.my_net -= row.quantity
    }
    entry.my_transaction_count += 1

    map.set(row.product_id, entry)
  }

  // Tally global totals per product (ingress + egress from all users)
  for (const row of allResult.data ?? []) {
    const entry = map.get(row.product_id)
    if (!entry) continue
    if (row.transaction_type === 'ingress' || row.transaction_type === 'egress') {
      entry.all_total += row.quantity
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => (b.my_ingress + b.my_egress) - (a.my_ingress + a.my_egress)
  )
}
