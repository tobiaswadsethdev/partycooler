'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { createAdjustment, type AdjustmentFormValues } from '@/lib/actions/transactions'
import type { Product, InventoryStatus } from '@/lib/types'

const schema = z.object({
  product_id: z.string().uuid('Please select a product'),
  quantity: z.coerce.number().int().min(1, 'Adjustment must be at least 1'),
  notes: z.string().min(1, 'A reason is required').max(500, 'Reason must be 500 characters or fewer'),
})

interface AdjustmentFormProps {
  products: Product[]
  inventoryStatus: InventoryStatus[]
}

export function AdjustmentForm({ products, inventoryStatus }: AdjustmentFormProps) {
  const statusMap = new Map(inventoryStatus.map((s) => [s.product_id, s.current_quantity]))

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { product_id: '', quantity: 1, notes: '' },
  })

  const selectedProductId = form.watch('product_id')
  const currentStock = selectedProductId ? (statusMap.get(selectedProductId) ?? 0) : null

  async function onSubmit(values: AdjustmentFormValues) {
    const result = await createAdjustment(values)
    if (result.success) {
      toast.success('Stock adjustment recorded')
      form.reset({ product_id: values.product_id, quantity: 1, notes: '' })
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      {p.name}{p.category ? ` · ${p.category}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentStock !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  App shows <span className="tabular-nums font-medium">{currentStock}</span> in stock
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Units to deduct</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Reason <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. Counted 8 units, app shows 11 — 3 missing after event"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          {form.formState.isSubmitting ? 'Recording...' : 'Record adjustment'}
        </Button>
      </form>
    </Form>
  )
}
