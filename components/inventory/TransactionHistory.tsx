'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Search, ChevronDown } from 'lucide-react'
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
import type { InventoryTransaction } from '@/lib/types'
import { DeleteTransactionButton } from './DeleteTransactionButton'

function txMeta(type: InventoryTransaction['transaction_type']) {
  switch (type) {
    case 'ingress':
      return {
        icon: <ArrowDownToLine className="h-4 w-4" />,
        color: 'text-[var(--success)]',
        bg: 'bg-[var(--success)]/10',
        badgeClass: 'bg-[var(--success)]/10 text-[var(--success)]',
        label: 'Stock in',
        sign: '+',
      }
    case 'egress':
      return {
        icon: <ArrowUpFromLine className="h-4 w-4" />,
        color: 'text-destructive',
        bg: 'bg-destructive/10',
        badgeClass: 'bg-destructive/10 text-destructive',
        label: 'Stock out',
        sign: '-',
      }
    case 'adjustment':
      return {
        icon: <SlidersHorizontal className="h-4 w-4" />,
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
        badgeClass: 'bg-amber-500/10 text-amber-600',
        label: 'Adjustment',
        sign: '-',
      }
  }
}

interface TransactionHistoryProps {
  transactions: InventoryTransaction[]
  currentUserId: string | null
}

const PAGE_SIZE = 20

export function TransactionHistory({ transactions, currentUserId }: TransactionHistoryProps) {
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = transactions.filter((t) => {
    const productName = t.product?.name ?? ''
    const category = t.product?.category ?? ''
    const q = search.toLowerCase()
    return (
      productName.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q)
    )
  })

  if (transactions.length === 0) {
    return (
      <Empty className="border">
        <EmptyMedia variant="icon">
          <ArrowDownToLine />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No transactions yet</EmptyTitle>
          <EmptyDescription>
            Record your first stock movement using the form above.
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
              <TableHead className="w-8" />
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">By</TableHead>
              <TableHead className="text-right">Date</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No transactions match your search.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((t) => {
                const meta = txMeta(t.transaction_type)
                return (
                <TableRow key={t.id}>
                  <TableCell>
                    <span className={meta.color}>{meta.icon}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{t.product?.name ?? '—'}</p>
                      {t.product?.category && (
                        <p className="text-xs text-muted-foreground">{t.product.category}</p>
                      )}
                      {t.notes && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">{t.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn(meta.badgeClass)}>
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {meta.sign}{t.quantity}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {t.profile?.name ?? t.profile?.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                    {format(new Date(t.transaction_date), 'MMM d, HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    {t.user_id === currentUserId && (
                      <DeleteTransactionButton id={t.id} productName={t.product?.name ?? 'item'} />
                    )}
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No transactions match your search.
          </p>
        ) : (
          visible.map((t) => {
            const meta = txMeta(t.transaction_type)
            return (
            <div key={t.id} className="flex items-start gap-3 rounded-md border bg-card p-4">
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  meta.bg,
                  meta.color,
                )}
              >
                {meta.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate">{t.product?.name ?? '—'}</p>
                  <div className="shrink-0 flex items-center gap-1">
                    <span className={cn('text-sm font-semibold tabular-nums', meta.color)}>
                      {meta.sign}{t.quantity}
                    </span>
                    {t.user_id === currentUserId && (
                      <DeleteTransactionButton id={t.id} productName={t.product?.name ?? 'item'} />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(t.transaction_date), 'MMM d, yyyy HH:mm')}
                  {t.profile && (
                    <> · {t.profile.name ?? t.profile.email}</>
                  )}
                </p>
                {t.notes && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">{t.notes}</p>
                )}
              </div>
            </div>
          )})
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
