import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdminAlertsResponse, AdminMetricsResponse, SystemHealthResponse, TripActiveItem } from '../../../api/admin'
import { ErrorBanner } from '../../../components/feedback/ErrorBanner'
import type { AdminDashboardUrlUpdate } from '../useAdminDashboardNavigation'

interface PendingUser {
  phone: string
  requested_role: string
}

type AgoraRefreshPhase = 'idle' | 'loading' | 'success' | 'error'

const AGORA_FEEDBACK_MS = 2500

export type AdminTabAgoraProps = {
  activeTrips: TripActiveItem[]
  adminAlerts: AdminAlertsResponse | null
  countHealthSignalRows: (h: SystemHealthResponse | null) => number
  health: SystemHealthResponse | null
  metrics: AdminMetricsResponse | null
  onRefresh: () => Promise<'ok' | 'error'>
  pending: PendingUser[]
  syncAdminUrl: (next: AdminDashboardUrlUpdate) => void
}

export function AdminTabAgora(props: AdminTabAgoraProps) {
  const { t } = useTranslation('admin')
  const {
    activeTrips,
    adminAlerts,
    countHealthSignalRows,
    health,
    metrics,
    onRefresh,
    pending,
    syncAdminUrl,
  } = props

  const [refreshPhase, setRefreshPhase] = useState<AgoraRefreshPhase>('idle')
  const feedbackTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current != null) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  const handleRefreshClick = async () => {
    if (refreshPhase === 'loading') return
    if (feedbackTimerRef.current != null) {
      window.clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
    setRefreshPhase('loading')
    const result = await onRefresh()
    setRefreshPhase(result === 'ok' ? 'success' : 'error')
    feedbackTimerRef.current = window.setTimeout(() => {
      setRefreshPhase('idle')
      feedbackTimerRef.current = null
    }, AGORA_FEEDBACK_MS)
  }

  return (
    <>
      <section className="space-y-4 mb-6" aria-labelledby="admin-agora-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="admin-agora-heading" className="text-lg font-semibold text-foreground">
            {t('headings.agora')}
          </h2>
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <button
              type="button"
              onClick={() => void handleRefreshClick()}
              disabled={refreshPhase === 'loading'}
              aria-busy={refreshPhase === 'loading'}
              data-testid="admin-agora-refresh"
              className="min-h-11 w-full px-4 py-2.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 disabled:opacity-60 disabled:pointer-events-none sm:w-auto shrink-0"
            >
              {refreshPhase === 'loading' ? 'A atualizar…' : 'Atualizar'}
            </button>
            {refreshPhase === 'success' ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400" data-testid="admin-agora-refresh-ok">
                Dados atualizados.
              </p>
            ) : null}
            {refreshPhase === 'error' ? (
              <ErrorBanner
                message="Não foi possível atualizar."
                testId="admin-agora-refresh-error"
                role="alert"
                className="text-xs"
              />
            ) : null}
          </div>
        </div>
        <p className="text-sm text-foreground/70 -mt-1 sm:-mt-2">
          Actualiza ao abrir esta tab e quando carregas em Atualizar. Usa as tabs abaixo para agir.
        </p>

        {(() => {
          const stuckN = health?.stuck_payments?.length ?? 0
          const signalRows = countHealthSignalRows(health)
          const hStatus = health?.status ?? '—'
          const degraded = hStatus === 'degraded' || signalRows > 0
          const activeN = metrics?.active_trips ?? activeTrips.length
          const pendingN = pending.length

          return (
            <>
              <div
                className={`rounded-2xl border px-4 py-3 shadow-card ${degraded
                  ? 'border-warning/60 bg-warning/10'
                  : 'border-border bg-card'
                  }`}
              >
                <p className="text-sm font-medium text-foreground">
                  Saúde API: <span className="text-foreground">{hStatus}</span>
                  {signalRows > 0 ? (
                    <span className="text-warning"> · {signalRows} linha(s) de anomalia</span>
                  ) : (
                    <span className="text-muted-foreground"> · sem linhas de anomalia</span>
                  )}
                </p>
                {stuckN > 0 ? (
                  <p className="text-sm text-destructive mt-1 font-medium">
                    Pagamentos presos (stuck): {stuckN} — ver Saúde ou Operações.
                  </p>
                ) : (
                  <p className="text-xs text-foreground/65 mt-1">Pagamentos presos: 0</p>
                )}
                {signalRows > 0 ? (
                  <p className="text-xs text-foreground/75 mt-2">
                    Em <strong>Saúde</strong>, cada bloco com linhas inclui «O que é · O que fazer (3 passos)» (SP-D).
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'trips', tripId: null, tripsList: 'active' })}
                  className="rounded-2xl border border-border bg-card px-3 py-3 text-left shadow-card hover:bg-muted/40 transition-colors"
                >
                  <p className="text-xs text-foreground/70">Viagens activas</p>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">{activeN}</p>
                </button>
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'pending', tripId: null })}
                  className="rounded-2xl border border-border bg-card px-3 py-3 text-left shadow-card hover:bg-muted/40 transition-colors"
                >
                  <p className="text-xs text-foreground/70">Pendentes aprovação</p>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">{pendingN}</p>
                </button>
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'metrics', tripId: null })}
                  className="rounded-2xl border border-border bg-card px-3 py-3 text-left shadow-card hover:bg-muted/40 transition-colors"
                >
                  <p className="text-xs text-foreground/70">Motoristas disponíveis</p>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">
                    {metrics?.drivers_available ?? '—'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'metrics', tripId: null })}
                  className="rounded-2xl border border-border bg-card px-3 py-3 text-left shadow-card hover:bg-muted/40 transition-colors"
                >
                  <p className="text-xs text-foreground/70">Em curso (métricas)</p>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">
                    {metrics?.trips_ongoing ?? '—'}
                  </p>
                </button>
              </div>

              {adminAlerts &&
                (adminAlerts.zero_drivers_available || adminAlerts.zero_trips_today) && (
                  <div className="rounded-xl border border-info/40 bg-info/10 px-3 py-2 text-sm text-foreground">
                    {adminAlerts.zero_drivers_available ? (
                      <p>Alerta métricas: nenhum motorista disponível agora.</p>
                    ) : null}
                    {adminAlerts.zero_trips_today ? (
                      <p className={adminAlerts.zero_drivers_available ? 'mt-1' : ''}>
                        Alerta métricas: zero viagens criadas hoje (UTC).
                      </p>
                    ) : null}
                  </div>
                )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'trips', tripId: null, tripsList: 'active' })}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                >
                  Ir para Viagens
                </button>
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'health', tripId: null })}
                  className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
                >
                  Ir para Saúde
                </button>
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'ops', tripId: null })}
                  className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
                >
                  Ir para Operações
                </button>
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'docs', tripId: null })}
                  className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
                >
                  Documentos
                </button>
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'metrics', tripId: null })}
                  className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
                >
                  Métricas
                </button>
              </div>
            </>
          )
        })()}
      </section>
    </>
  )
}
