'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data ?? null
}

export async function updateProfile(values: ProfileFormValues): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/settings')
  revalidatePath('/protected', 'layout')
  return { success: true }
}

export async function changePassword(values: ChangePasswordValues): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { success: false, error: 'Not authenticated' }

  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  })
  if (signInError) return { success: false, error: 'Current password is incorrect' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword })
  if (error) return { success: false, error: error.message }

  return { success: true }
}
