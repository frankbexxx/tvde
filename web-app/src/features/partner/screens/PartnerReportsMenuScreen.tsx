import { useTranslation } from 'react-i18next'
import { PARTNER_TRIPS_CSV_COLUMNS, type PartnerMetrics } from '../../../api/partner'
import type { PartnerCsvExportUi } from '../partnerCsvExport'

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
  csvExport?: PartnerCsvExportUi
}

export function PartnerReportsMenuScreen({
  metrics,
  tripStats,
  onDownloadCsv,
  csvExport,
}: PartnerReportsMenuScreenProps) {
  const { t } = useTranslation('partner')
  const exporting = Boolean(csvExport?.exporting)
  const exportError = csvExport?.error ?? null
  const exportSuccess = csvExport?.success ?? null

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
            <li data-testid="partner-reports-completed-today">
              {t('reports.completedToday')}{' '}
              <span className="font-semibold tabular-nums">
                {metrics.trips_completed_today ?? 0}
              </span>
            </li>
            <li data-testid="partner-reports-revenue-today" title={t('reports.revenueHint')}>
              {t('reports.revenueToday')}{' '}
              <span className="font-semibold tabular-nums">
                {(metrics.revenue_completed_today ?? 0).toFixed(2)}
              </span>
            </li>
          </>
        ) : null}
      </ul>
      <p className="text-xs text-muted-foreground">
        {t('reports.csvColumnsPrefix')} {PARTNER_TRIPS_CSV_COLUMNS.join(', ')}.
      </p>
      {exportError ? (
        <p className="text-sm text-destructive" data-testid="partner-reports-csv-error" role="alert">
          {exportError}
        </p>
      ) : null}
      {exportSuccess && !exportError ? (
        <p className="text-sm text-success" data-testid="partner-reports-csv-success" role="status">
          {exportSuccess}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onDownloadCsv}
        disabled={exporting}
        data-testid="partner-reports-csv-download"
        className="w-full min-h-11 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 touch-manipulation disabled:opacity-50"
      >
        {exporting ? t('reports.exportingCsv') : t('reports.downloadCsv')}
      </button>
    </div>
  )
}
