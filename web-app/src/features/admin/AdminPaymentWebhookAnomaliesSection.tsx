import { PB_WEBHOOK_ANOMALIES } from './adminHealthAnomalyPlaybooks'
import type { PaymentWebhookAnomaliesHealthBlock } from '../../api/admin'

export type PaymentWebhookAnomaliesUxState =
  | 'collection_disabled'
  | 'collection_active_empty'
  | 'anomalies_present'
  | 'data_unavailable'

export function resolvePaymentWebhookAnomaliesUxState(
  block: PaymentWebhookAnomaliesHealthBlock | null | undefined,
): PaymentWebhookAnomaliesUxState | null {
  if (!block) return null
  if (block.data_available === false) return 'data_unavailable'
  if (block.total_in_window > 0) return 'anomalies_present'
  if (block.persist_enabled) return 'collection_active_empty'
  return 'collection_disabled'
}

export function AdminPaymentWebhookAnomaliesSection(props: {
  block: PaymentWebhookAnomaliesHealthBlock | null | undefined
}) {
  const { block } = props
  if (!block) return null

  const ux = resolvePaymentWebhookAnomaliesUxState(block)
  const borderClass =
    ux === 'data_unavailable'
      ? 'border-warning/50 bg-warning/5'
      : 'border-info/40 bg-info/5'

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 touch-manipulation ${borderClass}`}
      data-testid="admin-health-webhook-anomalies"
      data-ux-state={ux ?? undefined}
    >
      <details className="rounded-lg border border-info/40 bg-info/10 px-2 py-1.5 text-xs">
        <summary className="cursor-pointer font-medium text-foreground select-none min-h-10 flex items-center py-1">
          O que se passa e o que fazer
        </summary>
        <p className="mt-2 text-foreground/85 leading-relaxed">{PB_WEBHOOK_ANOMALIES.what}</p>
        <ol className="mt-2 list-decimal pl-4 space-y-1.5 text-foreground/85">
          {PB_WEBHOOK_ANOMALIES.steps.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ol>
      </details>

      <p className="text-sm font-medium text-foreground">
        Anomalias webhook Stripe ({block.window_hours}h)
      </p>

      {ux === 'data_unavailable' ? (
        <p className="text-sm text-warning" data-testid="webhook-anomalies-unavailable-msg">
          <strong>Dados indisponíveis</strong> — a tabela <code className="text-xs">payment_anomalies</code>{' '}
          ainda não existe ou a migration PR1 não foi aplicada nesta base. Isto{' '}
          <strong>não</strong> significa zero anomalias; verificar deploy Alembic e logs{' '}
          <code className="text-xs">payment_webhook_anomalies_health_read_failed</code>.
        </p>
      ) : null}

      {ux === 'collection_disabled' && block.total_in_window === 0 ? (
        <p className="text-sm text-foreground/85" data-testid="webhook-anomalies-disabled-msg">
          <strong>Recolha desactivada</strong> (<code className="text-xs">ENABLE_PAYMENT_ANOMALY_PERSIST</code>
          ). Zero linhas na janela não prova ausência de problemas — usar logs Stripe e runbook L-PAY-02.
        </p>
      ) : null}

      {!block.persist_enabled && block.total_in_window > 0 ? (
        <p className="text-sm text-warning" data-testid="webhook-anomalies-historical-msg">
          Recolha <strong>actualmente desactivada</strong>; abaixo estão registos persistidos na janela de{' '}
          {block.window_hours}h (histórico recente).
        </p>
      ) : null}

      {ux === 'collection_active_empty' ? (
        <p className="text-sm text-foreground/85" data-testid="webhook-anomalies-empty-msg">
          Recolha activa: <strong>0 anomalias</strong> registadas nas últimas {block.window_hours} horas.
        </p>
      ) : null}

      {block.persist_enabled && ux !== 'data_unavailable' ? (
        <p className="text-xs text-muted-foreground">
          Recolha activa (flag ligada neste ambiente).
        </p>
      ) : null}

      {block.total_in_window > 0 ? (
        <div className="space-y-2 text-sm">
          <p className="text-foreground/90">
            Total na janela: <strong>{block.total_in_window}</strong>
          </p>
          {block.counts_by_type.length > 0 ? (
            <ul className="text-xs space-y-0.5 text-foreground/85">
              {block.counts_by_type.map((row) => (
                <li key={row.anomaly_type}>
                  {row.anomaly_type}: {row.count}
                </li>
              ))}
            </ul>
          ) : null}
          {Object.keys(block.counts_by_severity).length > 0 ? (
            <p className="text-xs text-foreground/80">
              Por severidade:{' '}
              {Object.entries(block.counts_by_severity)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ')}
            </p>
          ) : null}
          {block.recent.length > 0 ? (
            <ul className="space-y-2">
              {block.recent.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-border/80 bg-background p-2"
                >
                  <p className="text-xs font-medium text-foreground">
                    {row.anomaly_type} · {row.severity} · {row.created_at}
                  </p>
                  <p className="text-xs text-muted-foreground break-all">
                    {row.payment_intent_id ? `pi: ${row.payment_intent_id}` : null}
                    {row.stripe_event_id ? ` · evt: ${row.stripe_event_id}` : null}
                    {row.trip_id ? ` · trip: ${row.trip_id}` : null}
                  </p>
                  {Object.keys(row.payload).length > 0 ? (
                    <pre className="mt-1 text-xs text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-24">
                      {JSON.stringify(row.payload, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
