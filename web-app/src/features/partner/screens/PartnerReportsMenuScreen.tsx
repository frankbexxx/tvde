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
  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-reports-screen">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Resumo operacional da frota e exportação CSV com os mesmos filtros das listas de viagens.
      </p>
      <ul className="rounded-xl border border-border bg-background px-3 py-3 space-y-2 text-xs">
        <li>
          Viagens na frota:{' '}
          <span className="font-semibold tabular-nums">{tripStats.total}</span>
          <span className="text-muted-foreground">
            {' '}
            ({tripStats.ongoing} em curso · {tripStats.completed} concluídas)
          </span>
        </li>
        <li>
          Canceladas / falhadas:{' '}
          <span className="font-semibold tabular-nums">
            {tripStats.cancelled} / {tripStats.failed}
          </span>
        </li>
        {metrics ? (
          <>
            <li>
              Taxa de conclusão (aprox.):{' '}
              <span className="font-semibold">
                {metrics.trips_total > 0
                  ? `${Math.round((metrics.trips_completed / metrics.trips_total) * 100)}%`
                  : '—'}
              </span>{' '}
              <span className="text-muted-foreground">(concluídas / total métricas)</span>
            </li>
            <li>
              Motoristas activos (GPS):{' '}
              <span className="font-semibold tabular-nums">{metrics.active_drivers}</span>
            </li>
          </>
        ) : null}
      </ul>
      <p className="text-xs text-muted-foreground">
        Colunas do CSV: {PARTNER_TRIPS_CSV_COLUMNS.join(', ')}.
      </p>
      <button
        type="button"
        onClick={onDownloadCsv}
        className="w-full min-h-11 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 touch-manipulation"
      >
        Descarregar CSV (filtros actuais)
      </button>
    </div>
  )
}
