import { useTranslation } from 'react-i18next'
import { AdminPaymentWebhookAnomaliesSection } from '../AdminPaymentWebhookAnomaliesSection'
import { AdminOrphanPaymentIntentsSection } from '../AdminOrphanPaymentIntentsSection'
import { HealthAnomalyBlock } from '../AdminHealthAnomalyBlocks'
import {
  healthBlockKey,
  PB_DRIVERS_UNAVAILABLE,
  PB_INCONSISTENT_FINANCIAL,
  PB_MISSING_PAYMENT,
  PB_STUCK_PAYMENTS,
  PB_TRIPS_ACCEPTED_LONG,
  PB_TRIPS_ONGOING_LONG,
} from '../adminHealthAnomalyPlaybooks'
import {
  countCriticalHealthSignalRows,
  countInformationalHealthSignalRows,
} from '../adminDashboardHelpers'
import { adminHealthStatusLabel } from '../adminCopy'

import type { SystemHealthResponse } from '../../../api/admin'
import type { AdminDashboardUrlUpdate } from '../useAdminDashboardNavigation'

export type AdminTabHealthProps = {
  fetchHealth: () => void | Promise<void>
  health: SystemHealthResponse | null
  syncAdminUrl: (next: AdminDashboardUrlUpdate) => void
  token?: string | null
  isSuperAdmin?: boolean
}

export function AdminTabHealth(props: AdminTabHealthProps) {
  const { t } = useTranslation('admin')
  const { fetchHealth, health, syncAdminUrl, token = null, isSuperAdmin = false } = props

  const criticalCount = countCriticalHealthSignalRows(health)
  const infoCount = countInformationalHealthSignalRows(health)
  const infoWarnings = health?.informational_warnings ?? []

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
          <h2 className="text-lg font-semibold text-foreground">{t('headings.health')}</h2>
          <button
            type="button"
            onClick={() => fetchHealth()}
            className="min-h-11 w-full px-4 py-2.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 sm:w-auto shrink-0"
          >
            Atualizar
          </button>
        </div>
        {health ? (
          <div className="space-y-4">
            <p
              className={`font-medium ${health.status === 'ok' ? 'text-success' : 'text-warning'}`}
              data-testid="admin-health-status"
            >
              {adminHealthStatusLabel(health.status).primary}
              <span className="block text-xs font-normal text-muted-foreground">
                Estado técnico: {health.status}
              </span>
            </p>

            {criticalCount > 0 || health.status === 'degraded' ? (
              <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-foreground flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>Há problemas nesta leitura.</strong> Em cada bloco em Problemas, abre «O que se
                  passa e o que fazer».
                </span>
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'ops', tripId: null })}
                  className="shrink-0 inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-muted/40"
                >
                  Ir para Operações
                </button>
              </div>
            ) : null}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Problemas</h3>
              {health.warnings.length > 0 && (
                <ul className="text-sm text-warning space-y-1">
                  {health.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              <HealthAnomalyBlock
                key={healthBlockKey('accepted', health.trips_accepted_too_long)}
                title="Viagens aceites há muito tempo"
                rows={health.trips_accepted_too_long}
                onOpenTrip={(tripId: string) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_TRIPS_ACCEPTED_LONG}
                variant="critical"
              />
              <HealthAnomalyBlock
                key={healthBlockKey('ongoing', health.trips_ongoing_too_long)}
                title="Viagens em curso há muito tempo"
                rows={health.trips_ongoing_too_long}
                onOpenTrip={(tripId: string) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_TRIPS_ONGOING_LONG}
                variant="critical"
              />
              <HealthAnomalyBlock
                key={healthBlockKey('stuck_pi', health.stuck_payments)}
                title="Pagamentos que não avançaram"
                rows={health.stuck_payments}
                onOpenTrip={(tripId: string) => syncAdminUrl({ tab: 'trips', tripId })}
                pageSize={25}
                playbook={PB_STUCK_PAYMENTS}
                variant="critical"
              />
              <HealthAnomalyBlock
                key={healthBlockKey('missing_pay', health.missing_payment_records ?? [])}
                title="Viagens sem registo de pagamento"
                rows={health.missing_payment_records ?? []}
                onOpenTrip={(tripId: string) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_MISSING_PAYMENT}
                variant="critical"
              />
              <HealthAnomalyBlock
                key={healthBlockKey('inconsistent', health.inconsistent_financial_state ?? [])}
                title="Estado financeiro inconsistente"
                rows={health.inconsistent_financial_state ?? []}
                onOpenTrip={(tripId: string) => syncAdminUrl({ tab: 'trips', tripId })}
                pageSize={25}
                playbook={PB_INCONSISTENT_FINANCIAL}
                variant="critical"
              />
              {criticalCount === 0 && health.warnings.length === 0 ? (
                <p className="text-sm text-foreground/75">Nenhum problema crítico nesta leitura.</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Informações</h3>
              <AdminPaymentWebhookAnomaliesSection
                block={health.payment_webhook_anomalies}
              />
              <AdminOrphanPaymentIntentsSection token={token} isSuperAdmin={isSuperAdmin} />
              {infoWarnings.length > 0 && (
                <ul className="text-sm text-foreground/80 space-y-1">
                  {infoWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              <HealthAnomalyBlock
                key={healthBlockKey('offline', health.drivers_unavailable_too_long)}
                title="Motoristas offline há muito (sem viagem ativa)"
                rows={health.drivers_unavailable_too_long}
                onOpenTrip={(tripId: string) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_DRIVERS_UNAVAILABLE}
                variant="informational"
                demoAccountField="is_test_account"
              />
            </div>

            {(() => {
              const wh = health.payment_webhook_anomalies
              const webhookBlocksGlobalAllClear =
                wh != null &&
                (wh.data_available === false ||
                  !wh.persist_enabled ||
                  wh.total_in_window > 0)
              return (
                criticalCount === 0 &&
                infoCount === 0 &&
                health.warnings.length === 0 &&
                infoWarnings.length === 0 &&
                !webhookBlocksGlobalAllClear
              )
            })() ? (
              <p className="text-foreground/75">Nada a assinalar nesta leitura.</p>
            ) : null}
          </div>
        ) : (
          <p className="text-foreground/75">A carregar a última verificação…</p>
        )}
      </section>
    </>
  )
}
