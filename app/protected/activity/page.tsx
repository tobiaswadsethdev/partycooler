import { createClient } from '@/lib/supabase/server'
import { getActivityData } from '@/lib/actions/activity'
import { getUserProductMatrix } from '@/lib/actions/user-summary'
import { ActivitySummaryCards } from '@/components/activity/ActivitySummaryCards'
import { ActivityChart } from '@/components/activity/ActivityChart'
import { ActivityLog } from '@/components/activity/ActivityLog'
import { UserProductMatrix } from '@/components/activity/UserProductMatrix'

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ logs, summaries, chartData }, matrix] = await Promise.all([
    getActivityData(),
    getUserProductMatrix(),
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
        <ActivityLog logs={logs} currentUserId={user?.id} />
      </div>

      <div>
        <h3 className="text-base font-semibold mb-4">Team activity overview</h3>
        <UserProductMatrix data={matrix} />
      </div>
    </div>
  )
}
