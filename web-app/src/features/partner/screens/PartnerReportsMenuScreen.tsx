import { PARTNER_TRIPS_CSV_COLUMNS, type PartnerMetrics } from '../../../api/partner'

type PartnerReportsMenuScreenProps = {
  metrics: PartnerMetrics | null
  onDownloadCsv: () => void
}

export function PartnerReportsMenuScreen({ metrics, onDownloadCsv }: PartnerReportsMenuScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Indicadores de alto nível e exportação. Relatórios avançados ficam para fases seguintes.
      </p>
      {metrics ? (
        <ul className="rounded-xl border border-border bg-background px-3 py-3 space-y-2 text-xs">
          <li>
            Taxa de conclusão (aprox.):{' '}
            <span className="font-semibold">
              {metrics.trips_total > 0
                ? `${Math.round((metrics.trips_completed / metrics.trips_total) * 100)}%`
                : '—'}
            </span>{' '}
            <span className="text-muted-foreground">(concluídas / total)</span>
          </li>
          <li>
            Viagens canceladas (registadas):{' '}
            <span className="font-semibold tabular-nums">{metrics.trips_cancelled}</span>
          </li>
          <li>
            Motoristas activos (GPS):{' '}
            <span className="font-semibold tabular-nums">{metrics.active_drivers}</span>
          </li>
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Colunas do CSV: {PARTNER_TRIPS_CSV_COLUMNS.join(', ')}.
      </p>
      <button
        type="button"
        onClick={onDownloadCsv}
        className="w-full min-h-11 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 touch-manipulation"
      >
        Descarregar CSV
      </button>
    </div>
  )
}
