import { useTranslation } from 'react-i18next'

type PartnerTripsExportScreenProps = {
  onDownloadCsv: () => void
  onDownloadAllCsv: () => void
  filteredCount: number
  totalCount: number
}

export function PartnerTripsExportScreen({
  onDownloadCsv,
  onDownloadAllCsv,
  filteredCount,
  totalCount,
}: PartnerTripsExportScreenProps) {
  const { t } = useTranslation('partner')
  const filtersActive = filteredCount !== totalCount

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
      <button
        type="button"
        onClick={onDownloadCsv}
        className="w-full min-h-11 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 touch-manipulation"
      >
        {filtersActive
          ? t('trips.exportScreen.exportFiltered', { count: filteredCount })
          : t('trips.exportScreen.exportDefault')}
      </button>
      {filtersActive ? (
        <button
          type="button"
          onClick={onDownloadAllCsv}
          className="w-full min-h-11 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
        >
          {t('trips.exportScreen.exportAll', { total: totalCount })}
        </button>
      ) : null}
    </div>
  )
}
