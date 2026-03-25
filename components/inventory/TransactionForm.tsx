'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createTransaction, type TransactionFormValues } from '@/lib/actions/transactions'
import type { Product } from '@/lib/types'

const schema = z.object({
  product_id: z.string().uuid('Please select a product'),
  transaction_type: z.enum(['ingress', 'egress']),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
})

interface TransactionFormProps {
  products: Product[]
  defaultProductId?: string
  defaultType?: 'ingress' | 'egress'
  onSuccess?: () => void
}

export function TransactionForm({
  products,
  defaultProductId,
  defaultType = 'ingress',
  onSuccess,
}: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      product_id: defaultProductId ?? '',
      transaction_type: defaultType,
      quantity: 1,
    },
  })

  const transactionType = form.watch('transaction_type')

  async function onSubmit(values: TransactionFormValues) {
    const result = await createTransaction(values)
    if (result.success) {
      toast.success(
        transactionType === 'ingress' ? 'Stock added successfully' : 'Stock removed successfully'
      )
      form.reset({
        product_id: values.product_id,
        transaction_type: values.transaction_type,
        quantity: 1,
      })
      onSuccess?.()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Transaction type toggle */}
        <FormField
          control={form.control}
          name="transaction_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => field.onChange('ingress')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors',
                      field.value === 'ingress'
                        ? 'border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Stock In
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('egress')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors',
                      field.value === 'egress'
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <ArrowUpFromLine className="h-4 w-4" />
                    Stock Out
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Product select */}
        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.category ? ` · ${p.category}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantity */}
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
          variant={transactionType === 'egress' ? 'destructive' : 'default'}
        >
          {form.formState.isSubmitting
            ? 'Recording...'
            : transactionType === 'ingress'
            ? 'Record stock in'
            : 'Record stock out'}
        </Button>
      </form>
    </Form>
  )
}
