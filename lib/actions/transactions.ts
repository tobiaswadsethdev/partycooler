'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { InventoryTransaction, InventoryStatus } from '@/lib/types'

const transactionSchema = z.object({
  product_id: z.string().uuid('Please select a product'),
  transaction_type: z.enum(['ingress', 'egress', 'adjustment']),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  paid_by_pant: z.boolean().optional().default(false),
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
    paid_by_pant: parsed.data.paid_by_pant ?? false,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/home')
  revalidatePath('/protected/dashboard')
  revalidatePath('/protected/activity')
  return { success: true }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: existing, error: fetchError } = await supabase
    .from('inventory_transactions')
    .select('user_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) return { success: false, error: 'Transaction not found' }
  if (existing.user_id !== user.id) return { success: false, error: 'You can only delete your own transactions' }

  const { error } = await supabase
    .from('inventory_transactions')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/home')
  revalidatePath('/protected/dashboard')
  revalidatePath('/protected/activity')
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

const adjustmentSchema = z.object({
  product_id: z.string().uuid('Please select a product'),
  quantity: z.coerce.number().int().min(1, 'Adjustment quantity must be at least 1'),
  notes: z.string().min(1, 'A reason is required').max(500, 'Reason must be 500 characters or fewer'),
})

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>

export async function createAdjustment(values: AdjustmentFormValues): Promise<ActionResult> {
  const parsed = adjustmentSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase.from('inventory_transactions').insert({
    user_id: user.id,
    product_id: parsed.data.product_id,
    transaction_type: 'adjustment',
    quantity: parsed.data.quantity,
    notes: parsed.data.notes,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/inventory')
  revalidatePath('/protected/dashboard')
  return { success: true }
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
