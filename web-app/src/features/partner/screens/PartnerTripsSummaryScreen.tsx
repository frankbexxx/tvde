import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PartnerTripRow } from '../../../api/partner'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { partnerTripStatusLabel } from '../partnerLabels'

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
                  className="block rounded-lg border border-border/80 bg-card px-3 py-2 text-xs font-medium text-primary hover:underline"
                >
                  {trip.trip_id.slice(0, 8)}… · {partnerTripStatusLabel(trip.status)}
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
