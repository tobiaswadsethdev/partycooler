'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowDownToLine, ArrowUpFromLine, Search, Activity, ChevronDown } from 'lucide-react'
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
import type { ActivityLog as ActivityLogType } from '@/lib/types'

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  stock_in: {
    label: 'Stock in',
    icon: <ArrowDownToLine className="h-3.5 w-3.5" />,
    color: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  },
  stock_out: {
    label: 'Stock out',
    icon: <ArrowUpFromLine className="h-3.5 w-3.5" />,
    color: 'bg-destructive/10 text-destructive',
  },
}

function getActionMeta(action: string) {
  return ACTION_LABELS[action] ?? {
    label: action.replace(/_/g, ' '),
    icon: null,
    color: 'bg-muted text-muted-foreground',
  }
}

interface ActivityLogProps {
  logs: ActivityLogType[]
  currentUserId?: string
}

const PAGE_SIZE = 20

export function ActivityLog({ logs, currentUserId }: ActivityLogProps) {
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase()
    return (
      log.action.toLowerCase().includes(q) ||
      (log.entity_type ?? '').toLowerCase().includes(q) ||
      (log.product?.name ?? '').toLowerCase().includes(q) ||
      JSON.stringify(log.details ?? '').toLowerCase().includes(q)
    )
  })

  if (logs.length === 0) {
    return (
      <Empty className="border">
        <EmptyMedia variant="icon"><Activity /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No activity yet</EmptyTitle>
          <EmptyDescription>
            Transactions will appear here once recorded.
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
          placeholder="Search activity..."
          aria-label="Search activity log"
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
              <TableHead>Details</TableHead>
              <TableHead>By</TableHead>
              <TableHead className="text-right">Date</TableHead>
              {currentUserId && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={currentUserId ? 5 : 4} className="text-center text-muted-foreground py-8">
                  No activity matches your search.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((log) => {
                const meta = getActionMeta(log.action)
                const qty = (log.details as Record<string, unknown>)?.quantity
                const notes = (log.details as Record<string, unknown>)?.notes as string | null

                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('flex w-fit items-center gap-1', meta.color)}
                      >
                        {meta.icon}
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.product?.name && (
                        <div className="font-medium text-foreground">{log.product.name}</div>
                      )}
                      <div>
                        {qty != null && (
                          <span className="font-medium text-foreground tabular-nums">
                            {log.action === 'stock_in' ? '+' : '-'}{String(qty)} units
                          </span>
                        )}
                        {notes && <span className="ml-2">{notes}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(log.details as Record<string, unknown>)?.paid_by_pant
                        ? 'Pant'
                        : (log.profile?.name ?? log.profile?.email ?? '—')}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                      {format(new Date(log.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                    {currentUserId && (
                      <TableCell>
                        {log.user_id === currentUserId && log.entity_id
                          ? <DeleteTransactionButton id={log.entity_id} />
                          : null}
                      </TableCell>
                    )}
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
          <p className="text-center text-muted-foreground py-8">No activity matches your search.</p>
        ) : (
          visible.map((log) => {
            const meta = getActionMeta(log.action)
            const qty = (log.details as Record<string, unknown>)?.quantity
            const notes = (log.details as Record<string, unknown>)?.notes as string | null

            return (
              <div key={log.id} className="flex items-start gap-3 rounded-md border bg-card p-4">
                <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.color)}>
                  {meta.icon ?? <Activity className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {log.product?.name ?? meta.label}
                      </p>
                      {log.product?.name && (
                        <p className="text-xs text-muted-foreground">{meta.label}</p>
                      )}
                    </div>
                    {qty != null && (
                      <span className={cn('shrink-0 text-sm font-semibold tabular-nums', meta.color)}>
                        {log.action === 'stock_in' ? '+' : '-'}{String(qty)}
                      </span>
                    )}
                  </div>
                  {notes && <p className="text-sm text-muted-foreground truncate">{notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                    {(log.details as Record<string, unknown>)?.paid_by_pant
                      ? <> · Pant</>
                      : log.profile && <> · {log.profile.name ?? log.profile.email}</>
                    }
                  </p>
                </div>
                {currentUserId && log.user_id === currentUserId && log.entity_id && (
                  <DeleteTransactionButton id={log.entity_id} />
                )}
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
