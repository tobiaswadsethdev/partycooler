import { getDashboardData } from '@/lib/actions/dashboard'
import { InventorySummaryCards } from '@/components/dashboard/InventorySummaryCards'
import { InventoryStatusChart } from '@/components/dashboard/InventoryStatusChart'
import { TransactionTrendChart } from '@/components/dashboard/TransactionTrendChart'
import { AlertBanner } from '@/components/dashboard/AlertBanner'

export default async function DashboardPage() {
  const { stats, inventoryStatus, trendData, lowStockProducts } = await getDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Your inventory at a glance</p>
      </div>

      <AlertBanner lowStockProducts={lowStockProducts} />

      <InventorySummaryCards stats={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="min-w-0"><TransactionTrendChart data={trendData} /></div>
        <div className="min-w-0"><InventoryStatusChart data={inventoryStatus} /></div>
      </div>
    </div>
  )
}
