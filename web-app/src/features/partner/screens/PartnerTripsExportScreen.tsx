import { PARTNER_TRIPS_CSV_COLUMNS } from '../../../api/partner'

type PartnerTripsExportScreenProps = {
  onDownloadCsv: () => void
}

export function PartnerTripsExportScreen({ onDownloadCsv }: PartnerTripsExportScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-trips-export-screen">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Descarrega todas as viagens da frota em CSV (UTF-8).
      </p>
      <p className="text-xs text-muted-foreground">
        Colunas: {PARTNER_TRIPS_CSV_COLUMNS.join(', ')}.
      </p>
      <button
        type="button"
        onClick={onDownloadCsv}
        className="w-full min-h-11 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 touch-manipulation"
      >
        Exportar viagens (CSV)
      </button>
    </div>
  )
}
