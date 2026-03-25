'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActivityLog, ActivitySummary } from '@/lib/types'

export interface ActivityData {
  logs: ActivityLog[]
  summaries: {
    daily: ActivitySummary
    weekly: ActivitySummary
    monthly: ActivitySummary
  }
  chartData: ActivityChartPoint[]
}

export interface ActivityChartPoint {
  date: string
  ingress: number
  egress: number
  net: number
}

function emptyPeriod(period: ActivitySummary['period']): ActivitySummary {
  return { period, totalIngress: 0, totalEgress: 0, netChange: 0, transactionCount: 0 }
}

async function summarisePeriod(
  supabase: Awaited<ReturnType<typeof createClient>>,
  since: Date,
  period: ActivitySummary['period']
): Promise<ActivitySummary> {
  const { data } = await supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity')
    .gte('transaction_date', since.toISOString())

  if (!data || data.length === 0) return emptyPeriod(period)

  let totalIngress = 0
  let totalEgress = 0
  for (const row of data) {
    if (row.transaction_type === 'ingress') totalIngress += row.quantity
    else totalEgress += row.quantity
  }

  return {
    period,
    totalIngress,
    totalEgress,
    netChange: totalIngress - totalEgress,
    transactionCount: data.length,
  }
}

export async function getActivityData(): Promise<ActivityData> {
  const supabase = await createClient()

  const now = new Date()

  const dayAgo = new Date(now)
  dayAgo.setDate(dayAgo.getDate() - 1)

  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const monthAgo = new Date(now)
  monthAgo.setDate(monthAgo.getDate() - 30)

  // Fetch in parallel
  const [logsResult, daily, weekly, monthly] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    summarisePeriod(supabase, dayAgo, 'daily'),
    summarisePeriod(supabase, weekAgo, 'weekly'),
    summarisePeriod(supabase, monthAgo, 'monthly'),
  ])

  // Build 30-day chart data from inventory_transactions
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const { data: txData } = await supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity, transaction_date')
    .gte('transaction_date', thirtyDaysAgo.toISOString())
    .order('transaction_date', { ascending: true })

  // Build a map of YYYY-MM-DD → totals
  const chartMap = new Map<string, { ingress: number; egress: number }>()
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    chartMap.set(d.toISOString().slice(0, 10), { ingress: 0, egress: 0 })
  }

  for (const tx of txData ?? []) {
    const key = tx.transaction_date.slice(0, 10)
    const entry = chartMap.get(key)
    if (!entry) continue
    if (tx.transaction_type === 'ingress') entry.ingress += tx.quantity
    else entry.egress += tx.quantity
  }

  const chartData: ActivityChartPoint[] = Array.from(chartMap.entries()).map(([date, vals]) => {
    const d = new Date(date + 'T00:00:00')
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ingress: vals.ingress,
      egress: vals.egress,
      net: vals.ingress - vals.egress,
    }
  })

  return {
    logs: logsResult.data ?? [],
    summaries: { daily, weekly, monthly },
    chartData,
  }
}
