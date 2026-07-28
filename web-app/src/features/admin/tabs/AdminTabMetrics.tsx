import { useTranslation } from 'react-i18next'
import { EmptyState } from '../../../components/feedback/EmptyState'
import type { AdminMetricsResponse, AdminUsageSummaryResponse, WeeklyReportRow } from '../../../api/admin'
import type { AdminDashboardUrlUpdate } from '../useAdminDashboardNavigation'

export type AdminTabMetricsProps = {
  fetchMetrics: () => void | Promise<void>
  fetchUsage: () => void | Promise<void>
  metrics: AdminMetricsResponse | null
  syncAdminUrl: (next: AdminDashboardUrlUpdate) => void
  usage: AdminUsageSummaryResponse | null
}

export function AdminTabMetrics(props: AdminTabMetricsProps) {
  const { t } = useTranslation('admin')
  const {
    fetchMetrics,
    fetchUsage,
    metrics,
    syncAdminUrl,
    usage,
  } = props

  return (
    <>
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('headings.metrics')}</h2>
        <button
          type="button"
          onClick={() => fetchMetrics()}
          className="mb-3 inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40"
        >
          Atualizar
        </button>
        {metrics ? (
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
              <p className="text-foreground/70">Viagens ativas</p>
              <p className="font-bold text-foreground">{metrics.active_trips}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
              <p className="text-foreground/70">Motoristas disponíveis</p>
              <p className="font-bold text-foreground">{metrics.drivers_available}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
              <p className="text-foreground/70">Motoristas ocupados</p>
              <p className="font-bold text-foreground">{metrics.drivers_busy}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
              <p className="text-foreground/70">À espera de motorista</p>
              <p className="font-bold text-foreground">{metrics.trips_requested}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
              <p className="text-foreground/70">Em viagem</p>
              <p className="font-bold text-foreground">{metrics.trips_ongoing}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
              <p className="text-foreground/70">Concluídas hoje</p>
              <p className="font-bold text-foreground">{metrics.trips_completed_today}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card sm:col-span-2">
              <p className="text-foreground/70">Total criadas / aceites / concluídas</p>
              <p className="font-bold text-foreground">
                {metrics.trips_created_total} / {metrics.trips_accepted_total} /{' '}
                {metrics.trips_completed_total}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-foreground/75">Carregar métricas...</p>
        )}

        {metrics ? (
          <p className="text-sm text-foreground/80 -mt-2">
            Os totais são agregados. Para ver{' '}
            <span className="font-medium text-foreground">viagens concluídas / canceladas</span> em lista:{' '}
            <button
              type="button"
              className="text-info underline font-medium"
              onClick={() => syncAdminUrl({ tab: 'trips', tripId: null, tripsList: 'history' })}
            >
              Viagens → Histórico
            </button>{' '}
            (últimas 50).
          </p>
        ) : null}

        <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-foreground">Operação (uso + alertas)</h3>
            <button
              type="button"
              onClick={() => void fetchUsage()}
              className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40"
            >
              Atualizar
            </button>
          </div>
          {usage ? (
            <>
              {(usage.alerts.zero_drivers_available || usage.alerts.zero_trips_today) && (
                <div className="text-sm text-warning bg-warning/10 border border-warning/20 px-3 py-2 rounded-lg">
                  <p className="font-medium">Alertas</p>
                  <ul className="list-disc pl-5">
                    {usage.alerts.zero_drivers_available && <li>Zero motoristas disponíveis</li>}
                    {usage.alerts.zero_trips_today && <li>Zero viagens criadas hoje</li>}
                  </ul>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Weekly report</p>
                {usage.weekly.length === 0 ? (
                  <EmptyState title="Sem dados." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-foreground/70">
                          <th className="py-1 pr-2">Semana</th>
                          <th className="py-1 pr-2">Criadas</th>
                          <th className="py-1">Concluídas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.weekly.map((r: WeeklyReportRow) => (
                          <tr key={r.week_start} className="border-t border-border/60">
                            <td className="py-1 pr-2 font-mono text-xs">{r.week_start.slice(0, 10)}</td>
                            <td className="py-1 pr-2">{r.trips_created}</td>
                            <td className="py-1">{r.trips_completed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Carregar uso...</p>
          )}
        </div>
      </section>
    </>
  )
}
