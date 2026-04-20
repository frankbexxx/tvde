/**
 * Request card for driver - available trip to accept.
 * Pickup, estimate €, big ACEITAR button.
 * No IDs, no coords.
 */
interface RequestCardProps {
  pickup: string
  destination?: string
  /** Estado legível (ex.: pedido na fila). */
  statusLabel?: string
  estimatedPrice: number
  /** When estimatedPrice is 0, show this instead (e.g. "4–6") */
  estimateFallback?: string
  /** Linha curta acima da recolha (ex.: nova viagem na lista). */
  contextHint?: string
  onAccept: () => void
  loading?: boolean
}

export function RequestCard({
  pickup,
  destination,
  statusLabel,
  estimatedPrice,
  estimateFallback = '4–6',
  contextHint,
  onAccept,
  loading,
}: RequestCardProps) {
  const priceDisplay =
    estimatedPrice != null && estimatedPrice > 0
      ? `${estimatedPrice.toFixed(2)} €`
      : `${estimateFallback} €`

  return (
    <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-4 space-y-2 shadow-card transition-all duration-200">
      {contextHint ? (
        <p className="text-xs font-semibold text-primary">{contextHint}</p>
      ) : null}
      {statusLabel ? (
        <p className="text-xs font-medium text-foreground/70">
          Estado: <span className="text-foreground">{statusLabel}</span>
        </p>
      ) : null}
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/65">Recolha</p>
        <p className="text-lg font-semibold text-foreground">{pickup}</p>
      </div>
      {destination ? (
        <div className="space-y-0.5 pt-1">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/65">Destino</p>
          <p className="text-base font-semibold text-foreground/95">{destination}</p>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div>
          <p className="text-xs font-medium text-foreground/70">Estimativa (indicativa)</p>
          <span className="text-2xl font-bold text-foreground">{priceDisplay}</span>
        </div>
        <button
          type="button"
          onClick={onAccept}
          disabled={loading}
          className="min-h-[52px] min-w-[44px] px-6 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-lg shadow-floating hover:from-primary/95 hover:to-accent/95 hover:scale-105 active:scale-95 transition-all duration-150 ease-out disabled:opacity-50 disabled:hover:scale-100 touch-manipulation"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              A processar...
            </span>
          ) : (
            'ACEITAR'
          )}
        </button>
      </div>
    </div>
  )
}
