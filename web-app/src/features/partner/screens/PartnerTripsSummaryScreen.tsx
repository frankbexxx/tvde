import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PartnerDriverRow, PartnerTripRow } from '../../../api/partner'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { PartnerTripLinkLabel } from '../PartnerTripLinkLabel'

type PartnerTripsSummaryScreenProps = {
  tripStats: {
    total: number
    ongoing: number
    completed: number
    cancelled: number
    failed: number
  }
  recentTrips: PartnerTripRow[]
  drivers?: readonly PartnerDriverRow[]
}

export function PartnerTripsSummaryScreen({
  tripStats,
  recentTrips,
  drivers = [],
}: PartnerTripsSummaryScreenProps) {
  const { t } = useTranslation('partner')

  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-trips-summary-screen">
      <div className="rounded-xl border border-border bg-background px-3 py-2 space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">{t('trips.summaryTotal')}</span>{' '}
          <span className="font-semibold tabular-nums">{tripStats.total}</span>
        </p>
        <p>
          <span className="text-muted-foreground">{t('trips.summaryOngoing')}</span>{' '}
          <span className="font-semibold tabular-nums">{tripStats.ongoing}</span>
        </p>
        <p>
          <span className="text-muted-foreground">{t('trips.summaryRatio')}</span>{' '}
          <span className="font-semibold tabular-nums">
            {tripStats.completed} · {tripStats.cancelled} · {tripStats.failed}
          </span>
        </p>
      </div>
      {recentTrips.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/80">{t('trips.recentUpdates')}</p>
          <ul className="space-y-2">
            {recentTrips.map((trip) => (
              <li key={trip.trip_id}>
                <Link
                  to={`/partner/trips/${encodeURIComponent(trip.trip_id)}`}
                  className="block min-w-0 rounded-lg border border-border/80 bg-card px-3 py-2 text-xs text-primary hover:underline"
                >
                  <PartnerTripLinkLabel trip={trip} drivers={drivers} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          title={t('trips.emptySummary')}
          description={t('trips.emptySummaryHint')}
          testId="partner-trips-summary-empty"
        />
      )}
    </div>
  )
}
