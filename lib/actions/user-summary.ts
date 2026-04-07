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
      my_ingress: 0,
      my_egress: 0,
      my_net: 0,
      my_transaction_count: 0,
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

  return Array.from(map.values()).sort(
    (a, b) => (b.my_ingress + b.my_egress) - (a.my_ingress + a.my_egress)
  )
}
