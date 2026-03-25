'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, CheckCircle2, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { resolveAlert, deleteAlert } from '@/lib/actions/alerts'
import type { Alert } from '@/lib/types'

interface AlertItemProps {
  alert: Alert
}

export function AlertItem({ alert }: AlertItemProps) {
  const [resolving, setResolving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleResolve() {
    setResolving(true)
    const result = await resolveAlert(alert.id)
    setResolving(false)
    if (result.success) {
      toast.success('Alert marked as resolved')
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteAlert(alert.id)
    setDeleting(false)
    if (!result.success) {
      toast.error(result.error)
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border bg-card p-4 transition-opacity',
        alert.is_resolved && 'opacity-60'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          alert.is_resolved
            ? 'bg-muted text-muted-foreground'
            : 'bg-destructive/10 text-destructive'
        )}
      >
        {alert.is_resolved ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">
            {alert.product?.name ?? 'Unknown product'}
          </p>
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              alert.is_resolved
                ? 'bg-muted text-muted-foreground'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {alert.alert_type === 'low_stock' ? 'Low stock' : 'Expiry warning'}
          </Badge>
          {alert.is_resolved && (
            <Badge variant="secondary" className="text-xs">Resolved</Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          {alert.product?.category && (
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {alert.product.category}
            </span>
          )}
          <span>Created {format(new Date(alert.created_at), 'MMM d, yyyy')}</span>
          {alert.resolved_at && (
            <span>Resolved {format(new Date(alert.resolved_at), 'MMM d, yyyy')}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {!alert.is_resolved && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResolve}
            disabled={resolving}
          >
            {resolving ? 'Resolving…' : 'Resolve'}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete alert</span>
        </Button>
      </div>
    </div>
  )
}
