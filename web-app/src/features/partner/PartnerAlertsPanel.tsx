import { Link } from 'react-router-dom'
import { partnerAlertSeverityClass, type PartnerAlert } from './partnerAlerts'

export function PartnerAlertsPanel({ alerts }: { alerts: PartnerAlert[] }) {
  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="partner-alerts-empty">
        Sem alertas operacionais neste momento.
      </p>
    )
  }

  return (
    <ul className="space-y-2" data-testid="partner-alerts-panel">
      {alerts.slice(0, 12).map((a) => (
        <li
          key={a.id}
          className={`rounded-xl border px-3 py-2 text-sm ${partnerAlertSeverityClass(a.severity)}`}
        >
          <p className="font-medium text-foreground">{a.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>
          <Link to={a.href} className="text-xs text-primary underline mt-1 inline-block">
            Ver detalhe
          </Link>
        </li>
      ))}
    </ul>
  )
}
