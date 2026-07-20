import { useTranslation } from 'react-i18next'
import type { PartnerCsvExportUi } from '../partnerCsvExport'

type PartnerTripsExportScreenProps = {
  onDownloadCsv: () => void
  onDownloadAllCsv: () => void
  filteredCount: number
  totalCount: number
  csvExport?: PartnerCsvExportUi
}

export function PartnerTripsExportScreen({
  onDownloadCsv,
  onDownloadAllCsv,
  filteredCount,
  totalCount,
  csvExport,
}: PartnerTripsExportScreenProps) {
  const { t } = useTranslation('partner')
  const filtersActive = filteredCount !== totalCount
  const exporting = Boolean(csvExport?.exporting)
  const exportError = csvExport?.error ?? null
  const exportSuccess = csvExport?.success ?? null

  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-trips-export-screen">
      <p className="text-xs text-muted-foreground leading-relaxed">{t('trips.exportHint')}</p>
      {filtersActive ? (
        <p className="text-xs text-foreground/85">
          {t('trips.exportScreen.filtersActive', { filtered: filteredCount, total: totalCount })}
        </p>
      ) : (
        <p className="text-xs text-foreground/85">
          {t('trips.exportScreen.noFilters', { total: totalCount })}
        </p>
      )}
      {exportError ? (
        <p className="text-sm text-destructive" data-testid="partner-trips-export-csv-error" role="alert">
          {exportError}
        </p>
      ) : null}
      {exportSuccess && !exportError ? (
        <p className="text-sm text-success" data-testid="partner-trips-export-csv-success" role="status">
          {exportSuccess}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onDownloadCsv}
        disabled={exporting}
        data-testid="partner-trips-export-csv-download"
        className="w-full min-h-11 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 touch-manipulation disabled:opacity-50"
      >
        {exporting
          ? t('reports.exportingCsv')
          : filtersActive
            ? t('trips.exportScreen.exportFiltered', { count: filteredCount })
            : t('trips.exportScreen.exportDefault')}
      </button>
      {filtersActive ? (
        <button
          type="button"
          onClick={onDownloadAllCsv}
          disabled={exporting}
          data-testid="partner-trips-export-csv-download-all"
          className="w-full min-h-11 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation disabled:opacity-50"
        >
          {exporting ? t('reports.exportingCsv') : t('trips.exportScreen.exportAll', { total: totalCount })}
        </button>
      ) : null}
    </div>
  )
}
