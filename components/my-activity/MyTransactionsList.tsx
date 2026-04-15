'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowDownToLine, ArrowUpFromLine, ClipboardList, ChevronDown, Search } from 'lucide-react'
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
import { DeleteTransactionButton } from '@/components/inventory/DeleteTransactionButton'
import { cn } from '@/lib/utils'
import type { InventoryTransaction } from '@/lib/types'

interface MyTransactionsListProps {
  transactions: InventoryTransaction[]
}

const PAGE_SIZE = 20

function typeMeta(type: InventoryTransaction['transaction_type']) {
  if (type === 'ingress') return { label: 'Stock in', icon: <ArrowDownToLine className="h-3.5 w-3.5" />, color: 'bg-[var(--color-success)]/10 text-[var(--color-success)]' }
  if (type === 'egress')  return { label: 'Stock out', icon: <ArrowUpFromLine className="h-3.5 w-3.5" />, color: 'bg-destructive/10 text-destructive' }
  return { label: 'Adjustment', icon: null, color: 'bg-muted text-muted-foreground' }
}

export function MyTransactionsList({ transactions }: MyTransactionsListProps) {
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase()
    return (
      (t.product?.name ?? '').toLowerCase().includes(q) ||
      t.transaction_type.toLowerCase().includes(q) ||
      (t.notes ?? '').toLowerCase().includes(q)
    )
  })

  if (transactions.length === 0) {
    return (
      <Empty className="border">
        <EmptyMedia variant="icon"><ClipboardList /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No transactions yet</EmptyTitle>
          <EmptyDescription>
            Your recorded transactions will appear here.
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
          placeholder="Search transactions..."
          aria-label="Search transactions"
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
              <TableHead>Action</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No transactions match your search.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((t) => {
                const meta = typeMeta(t.transaction_type)
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant="secondary" className={cn('flex w-fit items-center gap-1', meta.color)}>
                        {meta.icon}
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{t.product?.name ?? '—'}</TableCell>
                    <TableCell className="tabular-nums">{t.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.notes ?? '—'}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                      {format(new Date(t.transaction_date), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <DeleteTransactionButton id={t.id} productName={t.product?.name} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No transactions match your search.</p>
        ) : (
          visible.map((t) => {
            const meta = typeMeta(t.transaction_type)
            return (
              <div key={t.id} className="flex items-start gap-3 rounded-md border bg-card p-4">
                <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.color)}>
                  {meta.icon ?? <ClipboardList className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{t.product?.name ?? '—'}</span>
                    <span className={cn('shrink-0 text-sm font-semibold tabular-nums', meta.color)}>
                      {t.transaction_type === 'ingress' ? '+' : t.transaction_type === 'egress' ? '-' : ''}{t.quantity}
                    </span>
                  </div>
                  {t.notes && <p className="text-sm text-muted-foreground truncate">{t.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(t.transaction_date), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <DeleteTransactionButton id={t.id} productName={t.product?.name} />
              </div>
            )
          })
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
