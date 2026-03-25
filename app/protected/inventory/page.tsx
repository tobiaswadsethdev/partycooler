import { getProducts } from '@/lib/actions/products'
import { getTransactions, getInventoryStatus } from '@/lib/actions/transactions'
import { createClient } from '@/lib/supabase/server'
import { TransactionForm } from '@/components/inventory/TransactionForm'
import { TransactionHistory } from '@/components/inventory/TransactionHistory'
import { QuickActionsPanel } from '@/components/inventory/QuickActionsPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [products, transactions, inventoryStatus] = await Promise.all([
    getProducts(),
    getTransactions(100),
    getInventoryStatus(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
        <p className="text-muted-foreground">
          Record stock movements and view transaction history
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: history + quick actions */}
        <div className="space-y-6 min-w-0">
          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">Transaction history</TabsTrigger>
              <TabsTrigger value="quick">Quick actions</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4">
              <TransactionHistory transactions={transactions} currentUserId={user?.id ?? null} />
            </TabsContent>
            <TabsContent value="quick" className="mt-4">
              <QuickActionsPanel
                products={products}
                inventoryStatus={inventoryStatus}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: record form */}
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
                <TransactionForm products={products} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
