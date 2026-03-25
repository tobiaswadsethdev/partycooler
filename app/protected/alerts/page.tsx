import { getAlerts } from '@/lib/actions/alerts'
import { AlertsList } from '@/components/alerts/AlertsList'

export default async function AlertsPage() {
  const alerts = await getAlerts()
  const activeCount = alerts.filter((a) => !a.is_resolved).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Alerts</h2>
        <p className="text-muted-foreground" role="status" aria-live="polite">
          {activeCount > 0
            ? `${activeCount} active ${activeCount === 1 ? 'alert' : 'alerts'} — products below reorder threshold`
            : 'All stock levels are healthy'}
        </p>
      </div>

      <AlertsList alerts={alerts} />
    </div>
  )
}
