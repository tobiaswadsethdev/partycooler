'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import { AlertItem } from './AlertItem'
import { resolveAllAlerts } from '@/lib/actions/alerts'
import type { Alert } from '@/lib/types'

interface AlertsListProps {
  alerts: Alert[]
}

export function AlertsList({ alerts }: AlertsListProps) {
  const [resolvingAll, setResolvingAll] = useState(false)

  const active = alerts.filter((a) => !a.is_resolved)
  const resolved = alerts.filter((a) => a.is_resolved)

  async function handleResolveAll() {
    setResolvingAll(true)
    const result = await resolveAllAlerts()
    setResolvingAll(false)
    if (result.success) {
      toast.success('All alerts resolved')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Tabs defaultValue="active">
      <div className="flex items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger value="active">
            Active
            {active.length > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-xs font-medium text-destructive-foreground">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved
            {resolved.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {resolved.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {active.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResolveAll}
            disabled={resolvingAll}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {resolvingAll ? 'Resolving…' : 'Resolve all'}
          </Button>
        )}
      </div>

      <TabsContent value="active" className="mt-4 space-y-2">
        {active.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <CheckCircle2 />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>All clear</EmptyTitle>
              <EmptyDescription>
                No active alerts. Stock levels are above reorder thresholds.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          active.map((alert) => <AlertItem key={alert.id} alert={alert} />)
        )}
      </TabsContent>

      <TabsContent value="resolved" className="mt-4 space-y-2">
        {resolved.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <AlertTriangle />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No resolved alerts</EmptyTitle>
              <EmptyDescription>
                Resolved alerts will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          resolved.map((alert) => <AlertItem key={alert.id} alert={alert} />)
        )}
      </TabsContent>
    </Tabs>
  )
}
