'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { updateProfile, type ProfileFormValues } from '@/lib/actions/profile'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
})

interface ProfileFormProps {
  defaultName: string
  email: string
}

export function ProfileForm({ defaultName, email }: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: defaultName },
  })

  async function onSubmit(values: ProfileFormValues) {
    const result = await updateProfile(values)
    if (result.success) {
      toast.success('Profile updated')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <p className="text-sm font-medium mb-1.5">Email</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </Form>
  )
}
