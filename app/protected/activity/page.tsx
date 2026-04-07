import { getActivityData } from '@/lib/actions/activity'
import { getUserProductSummaries } from '@/lib/actions/user-summary'
import { ActivitySummaryCards } from '@/components/activity/ActivitySummaryCards'
import { ActivityChart } from '@/components/activity/ActivityChart'
import { ActivityLog } from '@/components/activity/ActivityLog'
import { UserProductSummaryTable } from '@/components/my-activity/UserProductSummaryTable'

export default async function ActivityPage() {
  const [{ logs, summaries, chartData }, productSummaries] = await Promise.all([
    getActivityData(),
    getUserProductSummaries(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity</h2>
        <p className="text-muted-foreground">
          Historical summaries and transaction log
        </p>
      </div>

      <ActivitySummaryCards
        daily={summaries.daily}
        weekly={summaries.weekly}
        monthly={summaries.monthly}
      />

      <ActivityChart data={chartData} />

      <div>
        <h3 className="text-base font-semibold mb-4">Transaction log</h3>
        <ActivityLog logs={logs} />
      </div>

      <div>
        <h3 className="text-base font-semibold mb-1">My contributions by product</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your stock-in and stock-out per product, with total activity across all users.
        </p>
        <UserProductSummaryTable summaries={productSummaries} />
      </div>
    </div>
  )
}
