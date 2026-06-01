import { Link } from 'react-router-dom'
import type { PartnerTripRow } from '../../../api/partner'

type PartnerTripsSummaryScreenProps = {
  tripStats: {
    total: number
    ongoing: number
    completed: number
    cancelled: number
    failed: number
  }
  recentTrips: PartnerTripRow[]
}

export function PartnerTripsSummaryScreen({ tripStats, recentTrips }: PartnerTripsSummaryScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-trips-summary-screen">
      <div className="rounded-xl border border-border bg-background px-3 py-2 space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Total:</span>{' '}
          <span className="font-semibold tabular-nums">{tripStats.total}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Em curso:</span>{' '}
          <span className="font-semibold tabular-nums">{tripStats.ongoing}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Concluídas / Canceladas / Falhadas:</span>{' '}
          <span className="font-semibold tabular-nums">
            {tripStats.completed} · {tripStats.cancelled} · {tripStats.failed}
          </span>
        </p>
      </div>
      {recentTrips.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/80">Últimas actualizações</p>
          <ul className="space-y-2">
            {recentTrips.map((t) => (
              <li key={t.trip_id}>
                <Link
                  to={`/partner/trips/${encodeURIComponent(t.trip_id)}`}
                  className="block rounded-lg border border-border/80 bg-card px-3 py-2 text-xs font-medium text-primary hover:underline"
                >
                  {t.trip_id.slice(0, 8)}… · {t.status}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sem viagens carregadas.</p>
      )}
    </div>
  )
}
