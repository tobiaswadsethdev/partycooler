'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import { Boxes } from 'lucide-react'
import type { InventoryStatusRow } from '@/lib/actions/dashboard'

const chartConfig = {
  current_quantity: {
    label: 'In stock',
  },
} satisfies ChartConfig

interface InventoryStatusChartProps {
  data: InventoryStatusRow[]
}

export function InventoryStatusChart({ data }: InventoryStatusChartProps) {
  // Cap to top 10 for readability
  const chartData = data.slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current stock levels</CardTitle>
        <CardDescription>Top 10 products by quantity</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <Empty className="border-0 py-8">
            <EmptyMedia variant="icon"><Boxes /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No stock data yet</EmptyTitle>
              <EmptyDescription>Record transactions to see stock levels here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => String(v)} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={110}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${value} units in stock`}
                  />
                }
              />
              <Bar dataKey="current_quantity" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.product_id}
                    fill={
                      entry.current_quantity <= entry.reorder_threshold
                        ? 'var(--color-destructive)'
                        : 'var(--color-primary)'
                    }
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
