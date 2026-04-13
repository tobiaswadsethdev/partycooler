'use client'

import { cn } from '@/lib/utils'
import type { Product, InventoryStatus } from '@/lib/types'

interface ProductStockRow {
  product: Product
  currentQuantity: number
}

interface ProductStockListProps {
  products: Product[]
  inventoryStatus: InventoryStatus[]
}

export function ProductStockList({ products, inventoryStatus }: ProductStockListProps) {
  const qtyMap = new Map(inventoryStatus.map((s) => [s.product_id, s.current_quantity]))

  const rows: ProductStockRow[] = products
    .map((p) => ({ product: p, currentQuantity: qtyMap.get(p.id) ?? 0 }))
    .sort((a, b) => a.product.name.localeCompare(b.product.name))

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No products yet. Add some products to see stock levels.
      </p>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product, currentQuantity }) => {
              const isLowStock = currentQuantity <= product.reorder_threshold
              return (
                <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{product.category ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    <span className={cn(currentQuantity === 0 && 'text-destructive')}>
                      {currentQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {currentQuantity === 0 ? (
                      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        Out of stock
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        Low stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-xs font-medium text-[var(--success)]">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {rows.map(({ product, currentQuantity }) => {
          const isLowStock = currentQuantity <= product.reorder_threshold
          return (
            <div key={product.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                {product.category && (
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn('tabular-nums font-semibold text-sm', currentQuantity === 0 && 'text-destructive')}>
                  {currentQuantity}
                </span>
                {currentQuantity === 0 ? (
                  <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    Out
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    Low
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
