'use client'

import { useState } from 'react'
import { Search, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import { EditProductModal } from './EditProductModal'
import { DeleteProductButton } from './DeleteProductButton'
import { AddProductModal } from './AddProductModal'
import type { Product } from '@/lib/types'

interface ProductsListProps {
  products: Product[]
}

export function ProductsList({ products }: ProductsListProps) {
  const [search, setSearch] = useState('')

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (products.length === 0) {
    return (
      <Empty className="border">
        <EmptyMedia variant="icon">
          <Package />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No products yet</EmptyTitle>
          <EmptyDescription>
            Add your first product to start tracking inventory.
          </EmptyDescription>
        </EmptyHeader>
        <AddProductModal />
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          aria-label="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Reorder at</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No products match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.category ? (
                      <Badge variant="secondary">{product.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {product.sku ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.unit_price != null
                      ? `$${product.unit_price.toFixed(2)}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.reorder_threshold}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <EditProductModal product={product} />
                      <DeleteProductButton id={product.id} name={product.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No products match your search.
          </p>
        ) : (
          filtered.map((product) => (
            <div key={product.id} className="flex items-start justify-between rounded-md border bg-card p-4">
              <div className="min-w-0 space-y-1">
                <p className="font-medium truncate">{product.name}</p>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {product.category && (
                    <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                  )}
                  {product.sku && (
                    <span className="font-mono">{product.sku}</span>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {product.unit_price != null && (
                    <span>${product.unit_price.toFixed(2)} / unit</span>
                  )}
                  <span>Reorder at {product.reorder_threshold}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 ml-2">
                <EditProductModal product={product} />
                <DeleteProductButton id={product.id} name={product.name} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
