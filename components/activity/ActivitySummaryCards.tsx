import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActivitySummary } from '@/lib/types'

interface ActivitySummaryCardsProps {
  daily: ActivitySummary
  weekly: ActivitySummary
  monthly: ActivitySummary
}

function SummaryCard({ summary }: { summary: ActivitySummary }) {
  const labels: Record<ActivitySummary['period'], string> = {
    daily: 'Last 24 hours',
    weekly: 'Last 7 days',
    monthly: 'Last 30 days',
  }

  const NetIcon =
    summary.netChange > 0 ? TrendingUp :
    summary.netChange < 0 ? TrendingDown : Minus

  const netColor =
    summary.netChange > 0 ? 'text-[var(--color-success)]' :
    summary.netChange < 0 ? 'text-destructive' : 'text-muted-foreground'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {labels[summary.period]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowDownToLine className="h-3.5 w-3.5 text-[var(--color-success)]" />
            Stock in
          </span>
          <span className="tabular-nums font-medium text-[var(--color-success)]">
            +{summary.totalIngress}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowUpFromLine className="h-3.5 w-3.5 text-destructive" />
            Stock out
          </span>
          <span className="tabular-nums font-medium text-destructive">
            -{summary.totalEgress}
          </span>
        </div>
        <div className="border-t pt-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {summary.transactionCount} transactions
          </span>
          <span className={`flex items-center gap-1 tabular-nums font-semibold ${netColor}`}>
            <NetIcon className="h-3.5 w-3.5" />
            {summary.netChange > 0 ? '+' : ''}{summary.netChange}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ActivitySummaryCards({ daily, weekly, monthly }: ActivitySummaryCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <SummaryCard summary={daily} />
      <SummaryCard summary={weekly} />
      <SummaryCard summary={monthly} />
    </div>
  )
}
