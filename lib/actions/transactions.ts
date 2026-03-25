'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { InventoryTransaction, InventoryStatus } from '@/lib/types'

const transactionSchema = z.object({
  product_id: z.string().uuid('Please select a product'),
  transaction_type: z.enum(['ingress', 'egress']),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function createTransaction(values: TransactionFormValues): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase.from('inventory_transactions').insert({
    user_id: user.id,
    product_id: parsed.data.product_id,
    transaction_type: parsed.data.transaction_type,
    quantity: parsed.data.quantity,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/inventory')
  revalidatePath('/protected/dashboard')
  return { success: true }
}

export async function getTransactions(limit = 50): Promise<InventoryTransaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*, product:products(id, name, category, reorder_threshold, created_at, updated_at, user_id), profile:profiles(name, email)')
    .order('transaction_date', { ascending: false })
    .limit(limit)

  if (error) return []
  return data ?? []
}

export async function getInventoryStatus(): Promise<InventoryStatus[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_status')
    .select('*, product:products(id, name, category, reorder_threshold, created_at, updated_at, user_id)')
    .order('last_updated', { ascending: false })

  if (error) return []
  return data ?? []
}
