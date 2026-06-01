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
  const filtersActive = filteredCount !== totalCount

  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-trips-export-screen">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Exportação CSV (UTF-8) alinhada com os filtros activos nas listas de viagens.
      </p>
      {filtersActive ? (
        <p className="text-xs text-foreground/85">
          Filtros activos: <span className="font-semibold tabular-nums">{filteredCount}</span> de{' '}
          <span className="font-semibold tabular-nums">{totalCount}</span> viagens.
        </p>
      ) : (
        <p className="text-xs text-foreground/85">
          Sem filtros — exporta todas as{' '}
          <span className="font-semibold tabular-nums">{totalCount}</span> viagens.
        </p>
      )}
      <button
        type="button"
        onClick={onDownloadCsv}
        className="w-full min-h-11 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 touch-manipulation"
      >
        {filtersActive ? `Exportar ${filteredCount} viagens (filtros)` : 'Exportar viagens (CSV)'}
      </button>
      {filtersActive ? (
        <button
          type="button"
          onClick={onDownloadAllCsv}
          className="w-full min-h-11 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
        >
          Exportar todas ({totalCount})
        </button>
      ) : null}
    </div>
  )
}
