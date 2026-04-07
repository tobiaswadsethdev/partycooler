import { getUserProductSummaries } from '@/lib/actions/user-summary'
import { UserProductSummaryTable } from '@/components/my-activity/UserProductSummaryTable'

export default async function MyActivityPage() {
  const summaries = await getUserProductSummaries()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Activity</h2>
        <p className="text-muted-foreground">
          Your personal ingress and egress totals by product
        </p>
      </div>
      <UserProductSummaryTable summaries={summaries} />
    </div>
  )
}
