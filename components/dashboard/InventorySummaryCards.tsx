import { Package, Boxes, AlertTriangle, ArrowLeftRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardStats } from '@/lib/types'

interface InventorySummaryCardsProps {
  stats: DashboardStats
}

export function InventorySummaryCards({ stats }: InventorySummaryCardsProps) {
  const cards = [
    {
      label: 'Total products',
      value: stats.totalProducts,
      icon: Package,
      description: 'in catalog',
    },
    {
      label: 'Items in stock',
      value: stats.totalItems,
      icon: Boxes,
      description: 'across all products',
    },
    {
      label: 'Low stock alerts',
      value: stats.lowStockCount,
      icon: AlertTriangle,
      description: 'products need reorder',
      urgent: stats.lowStockCount > 0,
    },
    {
      label: 'Recent transactions',
      value: stats.recentTransactions,
      icon: ArrowLeftRight,
      description: 'in the last 7 days',
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, description, urgent }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon
              className={`h-4 w-4 ${urgent ? 'text-destructive' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tabular-nums ${urgent ? 'text-destructive' : ''}`}
            >
              {value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
