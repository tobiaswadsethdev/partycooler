'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
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
import { updateProduct } from '@/lib/actions/products'
import type { Product } from '@/lib/types'
import type { ProductFormValues } from '@/lib/actions/products'

interface EditProductModalProps {
  product: Product
}

export function EditProductModal({ product }: EditProductModalProps) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(values: ProductFormValues) {
    const result = await updateProduct(product.id, values)
    if (result.success) {
      toast.success('Product updated successfully')
      setOpen(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit {product.name}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            Update the details for {product.name}.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          defaultValues={product}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
