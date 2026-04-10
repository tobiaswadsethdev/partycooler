'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Activity } from 'lucide-react'
import type { ActivityChartPoint } from '@/lib/actions/activity'

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

interface ActivityChartProps {
  data: ActivityChartPoint[]
}

export function ActivityChart({ data }: ActivityChartProps) {
  const hasActivity = data.some((d) => d.ingress > 0 || d.egress > 0)

  // Show every 5th label to avoid crowding on 30-day view
  const tickFormatter = (_: string, index: number) =>
    index % 5 === 0 ? data[index]?.date ?? '' : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily activity</CardTitle>
        <CardDescription>Stock movements over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <Empty className="border-0 py-8">
            <EmptyMedia variant="icon"><Activity /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No activity yet</EmptyTitle>
              <EmptyDescription>
                Your activity chart will appear once you record transactions.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full sm:aspect-auto sm:h-[180px] md:h-[220px]">
            <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={tickFormatter}
              />
              <YAxis tickLine={false} axisLine={false} width={28} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="ingress" fill="var(--color-success)" fillOpacity={0.85} radius={[2, 2, 0, 0]} />
              <Bar dataKey="egress" fill="var(--color-destructive)" fillOpacity={0.85} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
