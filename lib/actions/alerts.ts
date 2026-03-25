'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Alert } from '@/lib/types'

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function getAlerts(): Promise<Alert[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('alerts')
    .select('*, product:products(id, name, category, sku, unit_price, reorder_threshold, created_at, updated_at, user_id)')
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function resolveAlert(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('alerts')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/alerts')
  revalidatePath('/protected/dashboard')
  return { success: true }
}

export async function resolveAllAlerts(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('alerts')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_resolved', false)

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/alerts')
  revalidatePath('/protected/dashboard')
  return { success: true }
}

export async function deleteAlert(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/alerts')
  revalidatePath('/protected/dashboard')
  return { success: true }
}
