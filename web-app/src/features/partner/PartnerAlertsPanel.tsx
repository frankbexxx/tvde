import { Link } from 'react-router-dom'
import { BTN_SECONDARY_RADIUS } from '../../components/layout/infoBoxTemplate'
import { partnerAlertSeverityClass, type PartnerAlert } from './partnerAlerts'
import { usePartnerShell } from './partnerShellContext'

export function PartnerAlertsPanel({ alerts }: { alerts: PartnerAlert[] }) {
  const { openMenu } = usePartnerShell()

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
          className={`${BTN_SECONDARY_RADIUS} border px-3 py-2 text-sm shadow-sm ${partnerAlertSeverityClass(a.severity)}`}
          data-testid={`partner-alert-${a.id}`}
        >
          <p className="font-medium text-foreground">{a.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>
          {a.menuScreen ? (
            <button
              type="button"
              data-testid={`partner-alert-cta-${a.id}`}
              className="text-xs text-primary underline mt-1 inline-block"
              onClick={() => openMenu(a.menuScreen!, 'fleet')}
            >
              {a.ctaLabel ?? 'Ver detalhe'}
            </button>
          ) : a.href ? (
            <Link
              to={a.href}
              data-testid={`partner-alert-link-${a.id}`}
              className="text-xs text-primary underline mt-1 inline-block"
            >
              {a.ctaLabel ?? 'Ver detalhe'}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
