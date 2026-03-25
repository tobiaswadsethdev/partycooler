'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import { ArrowLeftRight } from 'lucide-react'
import type { TrendDataPoint } from '@/lib/actions/dashboard'

const chartConfig = {
  ingress: {
    label: 'Stock in',
    color: 'var(--color-success)',
  },
  egress: {
    label: 'Stock out',
    color: 'var(--color-destructive)',
  },
} satisfies ChartConfig

interface TransactionTrendChartProps {
  data: TrendDataPoint[]
}

export function TransactionTrendChart({ data }: TransactionTrendChartProps) {
  const hasActivity = data.some((d) => d.ingress > 0 || d.egress > 0)
  // Show every 4th label (indices 0, 4, 8, 12) to keep labels away from the right edge on narrow screens
  const tickFormatter = (_: string, index: number) =>
    index % 4 === 0 ? (data[index]?.date ?? '') : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction trend</CardTitle>
        <CardDescription>Stock in vs. stock out — last 14 days</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <Empty className="border-0 py-8">
            <EmptyMedia variant="icon"><ArrowLeftRight /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No transactions yet</EmptyTitle>
              <EmptyDescription>Your trend chart will appear once you record transactions.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="fillIngress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillEgress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={tickFormatter}
              />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => String(v)} width={28} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="ingress"
                stroke="var(--color-success)"
                strokeWidth={2}
                fill="url(#fillIngress)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="egress"
                stroke="var(--color-destructive)"
                strokeWidth={2}
                fill="url(#fillEgress)"
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
