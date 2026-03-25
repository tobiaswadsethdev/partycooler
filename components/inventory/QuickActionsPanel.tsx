'use client'

import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TransactionForm } from './TransactionForm'
import type { Product, InventoryStatus } from '@/lib/types'

interface QuickActionsPanelProps {
  products: Product[]
  inventoryStatus: InventoryStatus[]
}

export function QuickActionsPanel({ products, inventoryStatus }: QuickActionsPanelProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>()
  const [selectedType, setSelectedType] = useState<'ingress' | 'egress'>('ingress')

  const statusMap = new Map(inventoryStatus.map((s) => [s.product_id, s.current_quantity]))

  function selectQuickAction(productId: string, type: 'ingress' | 'egress') {
    setSelectedProductId(productId)
    setSelectedType(type)
  }

  if (products.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Quick actions — click a product to pre-fill the form</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {products.slice(0, 6).map((product) => {
          const qty = statusMap.get(product.id) ?? 0
          const isSelected = selectedProductId === product.id
          return (
            <div
              key={product.id}
              className={cn(
                'flex items-center justify-between rounded-md border bg-card p-3 transition-colors',
                isSelected && 'border-primary ring-1 ring-primary'
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground tabular-nums">{qty} in stock</span>
                  {product.reorder_threshold != null && qty <= product.reorder_threshold && (
                    <Badge variant="destructive" className="text-xs py-0">Low</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-2 shrink-0">
                <button
                  type="button"
                  onClick={() => selectQuickAction(product.id, 'ingress')}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--success)] hover:bg-[var(--success)]/10 transition-colors"
                  aria-label={`Stock in ${product.name}`}
                >
                  <ArrowDownToLine className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickAction(product.id, 'egress')}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label={`Stock out ${product.name}`}
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {selectedProductId && (
        <div className="mt-4 rounded-md border bg-card p-4">
          <p className="text-sm font-medium mb-4">
            Record transaction for{' '}
            <span className="text-foreground">
              {products.find((p) => p.id === selectedProductId)?.name}
            </span>
          </p>
          <TransactionForm
            products={products}
            defaultProductId={selectedProductId}
            defaultType={selectedType}
            onSuccess={() => setSelectedProductId(undefined)}
          />
        </div>
      )}
    </div>
  )
}
