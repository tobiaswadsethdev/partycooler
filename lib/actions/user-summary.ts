'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserProductSummary } from '@/lib/types'

export interface MatrixUser {
  id: string
  name: string | null
  email: string
}

export interface MatrixProduct {
  id: string
  name: string
  category: string | null
}

export interface UserProductMatrix {
  users: MatrixUser[]
  products: MatrixProduct[]
  nets: Record<string, Record<string, number>>
}

export async function getUserProductMatrix(): Promise<UserProductMatrix> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('user_id, product_id, transaction_type, quantity, paid_by_pant, product:products(id, name, category), profile:profiles(name, email)')
    .neq('transaction_type', 'adjustment')
    .eq('paid_by_pant', false)

  if (error || !data) return { users: [], products: [], nets: {} }

  const userMap = new Map<string, MatrixUser>()
  const productMap = new Map<string, MatrixProduct>()
  const nets: Record<string, Record<string, number>> = {}

  for (const row of data) {
    const profile = row.profile as { name: string | null; email: string } | null
    const product = row.product as { id: string; name: string; category: string | null } | null
    if (!profile || !product) continue

    if (!userMap.has(row.user_id)) {
      userMap.set(row.user_id, { id: row.user_id, name: profile.name, email: profile.email })
    }
    if (!productMap.has(row.product_id)) {
      productMap.set(row.product_id, { id: row.product_id, name: product.name, category: product.category })
    }

    if (!nets[row.user_id]) nets[row.user_id] = {}
    if (!nets[row.user_id][row.product_id]) nets[row.user_id][row.product_id] = 0

    if (row.transaction_type === 'ingress') {
      nets[row.user_id][row.product_id] += row.quantity
    } else if (row.transaction_type === 'egress') {
      nets[row.user_id][row.product_id] -= row.quantity
    }
  }

  const users = Array.from(userMap.values()).sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email)
  )
  const products = Array.from(productMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return { users, products, nets }
}

export async function getUserProductSummaries(): Promise<UserProductSummary[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('product_id, transaction_type, quantity, product:products(id, name, category)')
    .eq('user_id', user.id)
    .eq('paid_by_pant', false)

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
