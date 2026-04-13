import { getProducts } from '@/lib/actions/products'
import { getInventoryStatus } from '@/lib/actions/transactions'
import { getUserProductSummaries } from '@/lib/actions/user-summary'
import { TransactionForm } from '@/components/inventory/TransactionForm'
import { ProductStockList } from '@/components/dashboard/ProductStockList'
import { UserProductSummaryTable } from '@/components/my-activity/UserProductSummaryTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function HomePage() {
  const [products, inventoryStatus, productSummaries] = await Promise.all([
    getProducts(),
    getInventoryStatus(),
    getUserProductSummaries(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Home</h2>
        <p className="text-muted-foreground">Record transactions and view your activity</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: stock list + activity summary */}
        <div className="space-y-6 min-w-0">
          <div>
            <h3 className="text-base font-semibold mb-3">Current stock</h3>
            <ProductStockList products={products} inventoryStatus={inventoryStatus} />
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3">My activity summary</h3>
            <UserProductSummaryTable summaries={productSummaries} />
          </div>
        </div>

        {/* Right: transaction form (sticky) */}
        <div className="order-first lg:order-last lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record transaction</CardTitle>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add products first before recording transactions.
                </p>
              ) : (
                <TransactionForm products={products} inventoryStatus={inventoryStatus} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
