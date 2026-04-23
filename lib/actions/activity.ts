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
      .select('*, profile:profiles(name, email)')
      .order('created_at', { ascending: false })
      .limit(100),
    summarisePeriod(supabase, dayAgo, 'daily'),
    summarisePeriod(supabase, weekAgo, 'weekly'),
    summarisePeriod(supabase, monthAgo, 'monthly'),
  ])

  // activity_logs.details->>'product_id' is JSONB and has no FK to products,
  // so Supabase can't auto-resolve it — fetch the referenced products manually.
  const logs = logsResult.data ?? []
  const productIds = Array.from(
    new Set(
      logs
        .map((l) => (l.details as Record<string, unknown> | null)?.product_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )

  let productMap = new Map<string, { id: string; name: string }>()
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds)
    productMap = new Map((products ?? []).map((p) => [p.id, p]))
  }

  const enrichedLogs: ActivityLog[] = logs.map((log) => {
    const pid = (log.details as Record<string, unknown> | null)?.product_id
    const product = typeof pid === 'string' ? productMap.get(pid) : undefined
    return product ? { ...log, product } : log
  })

  // Build 30-day chart data from inventory_transactions
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)

  const { data: txData } = await supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity, transaction_date')
    .gte('transaction_date', thirtyDaysAgo.toISOString())
    .order('transaction_date', { ascending: true })

  // Build a map of YYYY-MM-DD (UTC) → totals
  const chartMap = new Map<string, { ingress: number; egress: number }>()
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setUTCDate(d.getUTCDate() + i)
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
    const d = new Date(date + 'T12:00:00Z')
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      ingress: vals.ingress,
      egress: vals.egress,
      net: vals.ingress - vals.egress,
    }
  })

  return {
    logs: enrichedLogs,
    summaries: { daily, weekly, monthly },
    chartData,
  }
}
