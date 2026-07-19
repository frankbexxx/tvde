import type { AdminAuditTrailItem } from '../../api/admin'
import {
  adminAuditEventLabel,
  formatAdminTripTimestamp,
  isTripRelevantAuditEvent,
  sanitizeAdminAuditPayload,
} from './adminTripSupportLabels'

export type AdminTripAuditTimelineProps = {
  rows: AdminAuditTrailItem[] | undefined
  loading: boolean
  error: string | null
  onRetry?: () => void
}

export function AdminTripAuditTimeline(props: AdminTripAuditTimelineProps) {
  const { rows, loading, error, onRetry } = props
  const visible = (rows ?? []).filter(isTripRelevantAuditEvent)

  return (
    <div
      className="rounded-xl border border-border bg-background/60 p-3 space-y-2"
      data-testid="admin-trip-audit-timeline"
    >
      <h3 className="text-xs font-semibold text-foreground">Linha temporal (acções Admin)</h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Eventos <code className="text-foreground/80">admin.*</code> com esta viagem como entidade (últimos 50).
        Não inclui acções do Driver/Passenger.
      </p>
      {loading ? <p className="text-xs text-muted-foreground">A carregar…</p> : null}
      {error ? (
        <div className="space-y-1">
          <p className="text-xs text-destructive">{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-info underline"
            >
              Tentar de novo
            </button>
          ) : null}
        </div>
      ) : null}
      {!loading && !error && rows !== undefined ? (
        visible.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem acções Admin registadas para esta viagem.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {visible.map((row) => {
              const safe = sanitizeAdminAuditPayload(row.payload ?? {})
              const when = formatAdminTripTimestamp(row.occurred_at) ?? row.occurred_at
              return (
                <li
                  key={row.id}
                  className="rounded-lg border border-border/70 bg-card/50 p-2 text-xs space-y-1"
                  data-testid="admin-trip-audit-row"
                >
                  <p className="font-medium text-foreground">{adminAuditEventLabel(row.event_type)}</p>
                  <p className="text-muted-foreground">{when}</p>
                  {Object.keys(safe).length > 0 ? (
                    <pre className="text-[11px] text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-28 overflow-y-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(safe, null, 2)}
                    </pre>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )
      ) : null}
    </div>
  )
}
