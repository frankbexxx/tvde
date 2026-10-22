import { useCallback, useState } from 'react'
import {
  getOrphanPaymentIntentsPreview,
  type OrphanPaymentIntentPreviewResponse,
} from '../../api/admin'
import { PB_ORPHAN_PAYMENT_INTENTS } from './adminHealthAnomalyPlaybooks'

export function AdminOrphanPaymentIntentsSection(props: {
  token: string | null
  isSuperAdmin: boolean
}) {
  const { token, isSuperAdmin } = props
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<OrphanPaymentIntentPreviewResponse | null>(null)

  const runPreview = useCallback(async () => {
    if (!token) {
      setError('Sessão inválida.')
      return
    }
    if (!isSuperAdmin) {
      setError('Só super_admin pode executar este preview.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getOrphanPaymentIntentsPreview(token, {
        window_days: 7,
        grace_minutes: 5,
        limit: 100,
      })
      setLast(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Falha na consulta.')
    } finally {
      setLoading(false)
    }
  }, [token, isSuperAdmin])

  return (
    <div
      className="rounded-xl border border-info/40 bg-info/5 p-3 space-y-2 touch-manipulation"
      data-testid="admin-health-orphan-pis"
    >
      <details className="rounded-lg border border-info/40 bg-info/10 px-2 py-1.5 text-xs">
        <summary className="cursor-pointer font-medium text-foreground select-none min-h-10 flex items-center py-1">
          O que se passa e o que fazer
        </summary>
        <p className="mt-2 text-foreground/85 leading-relaxed">{PB_ORPHAN_PAYMENT_INTENTS.what}</p>
        <ol className="mt-2 list-decimal pl-4 space-y-1.5 text-foreground/85">
          {PB_ORPHAN_PAYMENT_INTENTS.steps.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ol>
      </details>

      <p className="text-sm font-medium text-foreground">PaymentIntents órfãos (preview Stripe TEST)</p>
      <p className="text-xs text-muted-foreground">
        Consulta manual read-only. Resultado vazio ou parcial{' '}
        <strong>não</strong> garante ausência de órfãos na conta Stripe.
      </p>

      <button
        type="button"
        disabled={loading || !isSuperAdmin}
        onClick={() => void runPreview()}
        className="min-h-11 px-4 py-2 text-sm rounded-xl border border-border bg-card hover:bg-muted/40 disabled:opacity-50"
        data-testid="orphan-pis-preview-btn"
      >
        {loading ? 'A consultar…' : 'Consultar PaymentIntents órfãos'}
      </button>

      {!isSuperAdmin ? (
        <p className="text-xs text-warning">Requer papel super_admin.</p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" data-testid="orphan-pis-error">
          {error}
        </p>
      ) : null}

      {last ? (
        <div className="space-y-2 text-sm" data-testid="orphan-pis-result">
          <p className="text-xs text-muted-foreground">
            Última consulta: {last.scanned_at} · run {last.scan_run_id.slice(0, 8)}… · estado{' '}
            <strong>{last.scan_status}</strong>
          </p>

          {last.skipped ? (
            <p className="text-sm text-warning" data-testid="orphan-pis-skipped">
              Consulta ignorada: <strong>{last.skip_reason}</strong>
              {last.skip_message ? ` — ${last.skip_message}` : null}
            </p>
          ) : null}

          {last.scan_status === 'partial' || last.has_more ? (
            <p className="text-xs text-warning">
              Resultados parciais (limite atingido). Usar paginação API com{' '}
              <code className="text-xs">starting_after={last.next_starting_after ?? '…'}</code> numa
              ferramenta ops se necessário.
            </p>
          ) : null}

          {last.errors.length > 0 ? (
            <ul className="text-xs text-destructive list-disc pl-4">
              {last.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          ) : null}

          {!last.skipped && last.confirmed_orphans.length === 0 && last.inconclusive.length === 0 ? (
            <p className="text-sm text-foreground/85" data-testid="orphan-pis-empty">
              Nenhum órfão confirmado nem inconclusivo TVDE nesta página — não equivale a «zero órfãos
              globais».
            </p>
          ) : null}

          {last.confirmed_orphans.length > 0 ? (
            <div>
              <p className="font-medium text-foreground">Órfãos confirmados ({last.confirmed_orphans.length})</p>
              <ul className="mt-1 space-y-2">
                {last.confirmed_orphans.map((row) => (
                  <li
                    key={row.payment_intent_id}
                    className="rounded-lg border border-warning/40 bg-background p-2 text-xs"
                  >
                    <p>
                      {row.payment_intent_id} · {row.stripe_status} · {row.orphan_class}
                    </p>
                    <p className="text-muted-foreground break-all">trip: {row.trip_id_metadata}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {last.inconclusive.length > 0 ? (
            <div>
              <p className="font-medium text-foreground">Inconclusivos ({last.inconclusive.length})</p>
              <ul className="mt-1 space-y-1 text-xs text-foreground/85">
                {last.inconclusive.map((row) => (
                  <li key={`${row.payment_intent_id}-${row.finding_kind}`}>
                    {row.payment_intent_id}: {row.finding_kind} — {row.detail}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
