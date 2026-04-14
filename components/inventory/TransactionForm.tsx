'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { createTransaction } from '@/lib/actions/transactions'
import type { Product, InventoryStatus } from '@/lib/types'

const schema = z.object({
  product_id: z.string().uuid('Please select a product'),
  transaction_type: z.enum(['ingress', 'egress']),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  paid_by_pant: z.boolean().default(false),
  is_adjustment: z.boolean().default(false),
})

type FormValues = z.infer<typeof schema>

interface TransactionFormProps {
  products: Product[]
  inventoryStatus?: InventoryStatus[]
  defaultProductId?: string
  defaultType?: 'ingress' | 'egress'
  onSuccess?: () => void
}

export function TransactionForm({
  products,
  inventoryStatus = [],
  defaultProductId,
  defaultType = 'egress',
  onSuccess,
}: TransactionFormProps) {
  const qtyMap = new Map(inventoryStatus.map((s) => [s.product_id, s.current_quantity]))

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      product_id: defaultProductId ?? '',
      transaction_type: defaultType,
      quantity: 1,
      paid_by_pant: false,
      is_adjustment: false,
    },
  })

  const transactionType = form.watch('transaction_type')
  const isAdjustment = form.watch('is_adjustment')

  async function onSubmit(values: FormValues) {
    const transactionTypeToSubmit =
      values.transaction_type === 'egress' && values.is_adjustment ? 'adjustment' : values.transaction_type

    const result = await createTransaction({
      product_id: values.product_id,
      transaction_type: transactionTypeToSubmit,
      quantity: values.quantity,
      paid_by_pant: values.paid_by_pant,
    })

    if (result.success) {
      toast.success(
        transactionTypeToSubmit === 'ingress'
          ? 'Stock added successfully'
          : transactionTypeToSubmit === 'adjustment'
          ? 'Stock adjustment recorded'
          : 'Stock removed successfully'
      )
      form.reset({
        product_id: values.product_id,
        transaction_type: values.transaction_type,
        quantity: 1,
        paid_by_pant: false,
        is_adjustment: false,
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
                    onClick={() => { field.onChange('ingress'); form.setValue('is_adjustment', false) }}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors',
                      field.value === 'ingress'
                        ? 'border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20'
                        : 'border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/40'
                    )}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Stock In
                  </button>
                  <button
                    type="button"
                    onClick={() => { field.onChange('egress'); form.setValue('paid_by_pant', false) }}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors',
                      field.value === 'egress'
                        ? 'border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20'
                        : 'border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/40'
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
                  {products.map((p) => {
                    const qty = qtyMap.get(p.id) ?? 0
                    const isOutOfStock = transactionType === 'egress' && qty === 0
                    return (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        disabled={isOutOfStock}
                        className={cn(isOutOfStock && 'opacity-40 cursor-not-allowed')}
                      >
                        {p.name}
                        {p.category ? ` · ${p.category}` : ''}
                        {` (${qty})`}
                      </SelectItem>
                    )
                  })}
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

        {/* Paid by Pant — only for stock in */}
        {transactionType === 'ingress' && (
          <FormField
            control={form.control}
            name="paid_by_pant"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">Paid by Pant</FormLabel>
              </FormItem>
            )}
          />
        )}

        {/* Stock adjustment — only for stock out */}
        {transactionType === 'egress' && (
          <FormField
            control={form.control}
            name="is_adjustment"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">Stock adjustment</FormLabel>
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          className="w-full cursor-pointer hover:brightness-90 hover:shadow-md"
          disabled={form.formState.isSubmitting}
          variant={transactionType === 'egress' ? 'destructive' : 'default'}
        >
          {form.formState.isSubmitting
            ? 'Recording...'
            : transactionType === 'ingress'
            ? 'Record stock in'
            : isAdjustment
            ? 'Record adjustment'
            : 'Record stock out'}
        </Button>
      </form>
    </Form>
  )
}
