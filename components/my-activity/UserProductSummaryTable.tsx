'use client'

import { useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  UserCircle,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import type { UserProductSummary } from '@/lib/types'

interface UserProductSummaryTableProps {
  summaries: UserProductSummary[]
}

const PAGE_SIZE = 20

function NetChangeCell({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="flex items-center gap-1 text-[var(--color-success)] tabular-nums">
        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
        +{value}
      </span>
    )
  }
  if (value < 0) {
    return (
      <span className="flex items-center gap-1 text-destructive tabular-nums">
        <TrendingDown className="h-3.5 w-3.5 shrink-0" />
        {value}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground tabular-nums">
      <Minus className="h-3.5 w-3.5 shrink-0" />0
    </span>
  )
}

export function UserProductSummaryTable({ summaries }: UserProductSummaryTableProps) {
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = summaries.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.product_name.toLowerCase().includes(q) ||
      (s.category ?? '').toLowerCase().includes(q)
    )
  })

  if (summaries.length === 0) {
    return (
      <Empty className="border">
        <EmptyMedia variant="icon"><UserCircle /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No activity yet</EmptyTitle>
          <EmptyDescription>
            Your ingress and egress totals will appear here once you record transactions.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by product or category..."
          aria-label="Search products"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }}
          className="pl-9"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <ArrowDownToLine className="h-3.5 w-3.5 text-[var(--color-success)]" />
                  My stock in
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <ArrowUpFromLine className="h-3.5 w-3.5 text-destructive" />
                  My stock out
                </span>
              </TableHead>
              <TableHead>My net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No products match your search.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((s) => (
                <TableRow key={s.product_id}>
                  <TableCell className="font-medium">{s.product_name}</TableCell>
                  <TableCell>
                    {s.category ? (
                      <Badge variant="secondary">{s.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[var(--color-success)] tabular-nums font-medium">
                    +{s.my_ingress}
                  </TableCell>
                  <TableCell className={cn('tabular-nums font-medium', s.my_egress > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                    {s.my_egress > 0 ? s.my_egress : '—'}
                  </TableCell>
                  <TableCell>
                    <NetChangeCell value={s.my_net} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No products match your search.</p>
        ) : (
          visible.map((s) => (
            <div key={s.product_id} className="rounded-md border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{s.product_name}</p>
                  {s.category && (
                    <Badge variant="secondary" className="mt-1">{s.category}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-[var(--color-success)] tabular-nums font-medium">
                  <ArrowDownToLine className="h-3.5 w-3.5 shrink-0" />
                  +{s.my_ingress}
                </span>
                <span className={cn(
                  'flex items-center gap-1 tabular-nums font-medium',
                  s.my_egress > 0 ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  <ArrowUpFromLine className="h-3.5 w-3.5 shrink-0" />
                  {s.my_egress > 0 ? s.my_egress : '0'}
                </span>
                <span className="text-muted-foreground">·</span>
                <NetChangeCell value={s.my_net} />
              </div>
            </div>
          ))
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            <ChevronDown className="h-4 w-4 mr-1.5" />
            Show more ({filtered.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  )
}
