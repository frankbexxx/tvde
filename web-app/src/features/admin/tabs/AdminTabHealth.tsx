import { HealthAnomalyBlock, healthBlockKey, PB_DRIVERS_UNAVAILABLE, PB_INCONSISTENT_FINANCIAL, PB_MISSING_PAYMENT, PB_STUCK_PAYMENTS, PB_TRIPS_ACCEPTED_LONG, PB_TRIPS_ONGOING_LONG } from '../AdminHealthAnomalyBlocks'
import { countHealthSignalRows } from '../adminDashboardHelpers'

type AdminTabHealthProps = Record<string, any>

export function AdminTabHealth(props: AdminTabHealthProps) {
  const {
    fetchHealth,
    health,
    syncAdminUrl,
  } = props

  return (
    <>
        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
            <h2 className="text-lg font-semibold text-foreground">Saúde do sistema</h2>
            <button
              type="button"
              onClick={() => fetchHealth()}
              className="min-h-11 w-full px-4 py-2.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 sm:w-auto shrink-0"
            >
              Atualizar
            </button>
          </div>
          {health ? (
            <div className="space-y-3">
              {countHealthSignalRows(health) + health.warnings.length > 0 ? (
                <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-foreground flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>Há anomalias ou avisos.</strong> Expande «O que é · O que fazer» em cada bloco abaixo.
                  </span>
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'ops', tripId: null })}
                    className="shrink-0 inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-muted/40"
                  >
                    Ir para Operações (cron / recuperar)
                  </button>
                </div>
              ) : null}
              <p
                className={`font-medium ${health.status === 'ok' ? 'text-success' : 'text-warning'
                  }`}
              >
                Status: {health.status}
              </p>
              {health.warnings.length > 0 && (
                <ul className="text-sm text-warning space-y-1">
                  {health.warnings.map((w: any, i: any) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              <HealthAnomalyBlock
                key={healthBlockKey('accepted', health.trips_accepted_too_long)}
                title="Viagens accepted há muito"
                rows={health.trips_accepted_too_long}
                onOpenTrip={(tripId: any) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_TRIPS_ACCEPTED_LONG}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('ongoing', health.trips_ongoing_too_long)}
                title="Viagens ongoing há muito"
                rows={health.trips_ongoing_too_long}
                onOpenTrip={(tripId: any) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_TRIPS_ONGOING_LONG}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('offline', health.drivers_unavailable_too_long)}
                title="Motoristas offline há muito (sem viagem ativa)"
                rows={health.drivers_unavailable_too_long}
                onOpenTrip={(tripId: any) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_DRIVERS_UNAVAILABLE}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('stuck_pi', health.stuck_payments)}
                title="Pagamentos bloqueados (processing)"
                rows={health.stuck_payments}
                onOpenTrip={(tripId: any) => syncAdminUrl({ tab: 'trips', tripId })}
                pageSize={25}
                playbook={PB_STUCK_PAYMENTS}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('missing_pay', health.missing_payment_records ?? [])}
                title="Viagens sem registo de pagamento"
                rows={health.missing_payment_records ?? []}
                onOpenTrip={(tripId: any) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_MISSING_PAYMENT}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('inconsistent', health.inconsistent_financial_state ?? [])}
                title="Estado financeiro inconsistente"
                rows={health.inconsistent_financial_state ?? []}
                onOpenTrip={(tripId: any) => syncAdminUrl({ tab: 'trips', tripId })}
                pageSize={25}
                playbook={PB_INCONSISTENT_FINANCIAL}
              />
              {health.status === 'ok' &&
                health.warnings.length === 0 &&
                health.trips_accepted_too_long.length === 0 &&
                health.trips_ongoing_too_long.length === 0 &&
                health.drivers_unavailable_too_long.length === 0 &&
                health.stuck_payments.length === 0 &&
                (health.missing_payment_records ?? []).length === 0 &&
                (health.inconsistent_financial_state ?? []).length === 0 && (
                  <p className="text-foreground/75">Tudo OK.</p>
                )}
            </div>
          ) : (
            <p className="text-foreground/75">Carregar saúde...</p>
          )}
        </section>
    </>
  )
}
