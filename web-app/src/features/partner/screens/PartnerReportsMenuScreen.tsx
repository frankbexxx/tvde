import { useTranslation } from 'react-i18next'
import { PARTNER_TRIPS_CSV_COLUMNS, type PartnerMetrics } from '../../../api/partner'

type TripStats = {
  total: number
  ongoing: number
  completed: number
  cancelled: number
  failed: number
}

type PartnerReportsMenuScreenProps = {
  metrics: PartnerMetrics | null
  tripStats: TripStats
  onDownloadCsv: () => void
}

export function PartnerReportsMenuScreen({
  metrics,
  tripStats,
  onDownloadCsv,
}: PartnerReportsMenuScreenProps) {
  const { t } = useTranslation('partner')

  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-reports-screen">
      <p className="text-xs text-muted-foreground leading-relaxed">{t('reports.intro')}</p>
      <ul className="rounded-xl border border-border bg-background px-3 py-3 space-y-2 text-xs">
        <li>
          {t('reports.fleetTrips')}{' '}
          <span className="font-semibold tabular-nums">{tripStats.total}</span>
          <span className="text-muted-foreground">
            {' '}
            {t('reports.ongoingStats', {
              ongoing: tripStats.ongoing,
              completed: tripStats.completed,
            })}
          </span>
        </li>
        <li>
          {t('reports.cancelledFailed')}{' '}
          <span className="font-semibold tabular-nums">
            {tripStats.cancelled} / {tripStats.failed}
          </span>
        </li>
        {metrics ? (
          <>
            <li>
              {t('reports.completionRate')}{' '}
              <span className="font-semibold">
                {metrics.trips_total > 0
                  ? `${Math.round((metrics.trips_completed / metrics.trips_total) * 100)}%`
                  : '—'}
              </span>{' '}
              <span className="text-muted-foreground">{t('reports.completionHint')}</span>
            </li>
            <li>
              {t('reports.activeDriversGps')}{' '}
              <span className="font-semibold tabular-nums">{metrics.active_drivers}</span>
            </li>
          </>
        ) : null}
      </ul>
      <p className="text-xs text-muted-foreground">
        {t('reports.csvColumnsPrefix')} {PARTNER_TRIPS_CSV_COLUMNS.join(', ')}.
      </p>
      <button
        type="button"
        onClick={onDownloadCsv}
        className="w-full min-h-11 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 touch-manipulation"
      >
        {t('reports.downloadCsv')}
      </button>
    </div>
  )
}
