import type { PartnerMetrics } from '../../../api/partner'
import { getTheme } from '@/hooks/useTheme'
import { themeUsesFlagAccent } from '@/design-system/ambianceMeta'
import { cn } from '@/lib/utils'
import {
  PARTNER_KPI_CARD,
  PARTNER_KPI_FLAG_ACCENT,
  PARTNER_SECTION_TITLE,
} from '../../../components/layout/infoBoxTemplate'

type PartnerHomeDashboardProps = {
  metrics: PartnerMetrics | null
  onRefresh: () => void
}

export function PartnerHomeDashboard({
  metrics,
  onRefresh,
}: PartnerHomeDashboardProps) {
  const kpiAccent = themeUsesFlagAccent(getTheme()) ? PARTNER_KPI_FLAG_ACCENT : ''

  return (
    <div className="space-y-4" data-testid="partner-home-dashboard">
      {metrics ? (
        <section className="space-y-2">
          <p className={PARTNER_SECTION_TITLE}>Resumo operacional</p>
          <div className="grid grid-cols-2 gap-3">
            <div className={cn(PARTNER_KPI_CARD, kpiAccent)}>
              <p className="text-xs text-muted-foreground">Viagens hoje</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{metrics.trips_today}</p>
            </div>
            <div className={PARTNER_KPI_CARD}>
              <p className="text-xs text-muted-foreground">Total viagens</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{metrics.trips_total}</p>
            </div>
            <div className={PARTNER_KPI_CARD}>
              <p className="text-xs text-muted-foreground">Concluídas</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{metrics.trips_completed}</p>
            </div>
            <div className={PARTNER_KPI_CARD}>
              <p className="text-xs text-muted-foreground">Canceladas</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{metrics.trips_cancelled}</p>
            </div>
            <div className={PARTNER_KPI_CARD}>
              <p className="text-xs text-muted-foreground">Motoristas ativos (GPS)</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{metrics.active_drivers}</p>
            </div>
            <div className={PARTNER_KPI_CARD}>
              <p className="text-xs text-muted-foreground">Total motoristas</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{metrics.total_drivers}</p>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={onRefresh}
        className="w-full rounded-xl bg-secondary py-2 text-sm font-medium text-secondary-foreground"
      >
        Atualizar
      </button>
    </div>
  )
}
