import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InventoryStatusRow } from '@/lib/actions/dashboard'

interface AlertBannerProps {
  lowStockProducts: InventoryStatusRow[]
}

export function AlertBanner({ lowStockProducts }: AlertBannerProps) {
  if (lowStockProducts.length === 0) return null

  const preview = lowStockProducts.slice(0, 3)
  const extra = lowStockProducts.length - preview.length

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">
            {lowStockProducts.length} {lowStockProducts.length === 1 ? 'product' : 'products'} low on stock
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {preview.map((p) => p.name).join(', ')}
            {extra > 0 && ` and ${extra} more`}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-auto" asChild>
        <Link href="/protected/alerts">View alerts</Link>
      </Button>
    </div>
  )
}
