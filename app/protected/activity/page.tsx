import { getActivityData } from '@/lib/actions/activity'
import { ActivitySummaryCards } from '@/components/activity/ActivitySummaryCards'
import { ActivityChart } from '@/components/activity/ActivityChart'
import { ActivityLog } from '@/components/activity/ActivityLog'

export default async function ActivityPage() {
  const { logs, summaries, chartData } = await getActivityData()

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
    </div>
  )
}
