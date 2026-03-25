'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/lib/types'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  reorder_threshold: z.coerce.number().int().min(0).default(5),
})

export type ProductFormValues = z.infer<typeof productSchema>

export type ActionResult =
  | { success: true; data?: Product }
  | { success: false; error: string }

export async function createProduct(values: ProductFormValues): Promise<ActionResult> {
  const parsed = productSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('products')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      category: parsed.data.category || null,
      reorder_threshold: parsed.data.reorder_threshold,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/products')
  return { success: true, data }
}

export async function updateProduct(id: string, values: ProductFormValues): Promise<ActionResult> {
  const parsed = productSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('products')
    .update({
      name: parsed.data.name,
      category: parsed.data.category || null,
      reorder_threshold: parsed.data.reorder_threshold,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/products')
  return { success: true, data }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/products')
  return { success: true }
}

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}
