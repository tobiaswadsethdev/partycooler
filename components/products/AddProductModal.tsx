'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ProductForm } from './ProductForm'
import { createProduct } from '@/lib/actions/products'
import type { ProductFormValues } from '@/lib/actions/products'

export function AddProductModal() {
  const [open, setOpen] = useState(false)

  async function handleSubmit(values: ProductFormValues) {
    const result = await createProduct(values)
    if (result.success) {
      toast.success('Product added successfully')
      setOpen(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
          <DialogDescription>
            Add a new product to your inventory catalog.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          submitLabel="Add product"
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
