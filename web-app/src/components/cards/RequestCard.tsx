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
  vehicleCategoryLabel?: string | null
  onAccept: () => void
  /** Quando existe `offer_id` no backend, o motorista pode recusar a oferta. */
  offerId?: string | null
  onReject?: () => void
  loading?: boolean
  rejectLoading?: boolean
  acceptButtonTestId?: string
  rejectButtonTestId?: string
}

export function RequestCard({
  pickup,
  destination,
  statusLabel,
  estimatedPrice,
  estimateFallback = '4–6',
  contextHint,
  vehicleCategoryLabel,
  onAccept,
  offerId,
  onReject,
  loading,
  rejectLoading,
  acceptButtonTestId,
  rejectButtonTestId,
}: RequestCardProps) {
  const priceDisplay =
    estimatedPrice != null && estimatedPrice > 0
      ? `${estimatedPrice.toFixed(2)} €`
      : `${estimateFallback} €`

  return (
    <div
      className="rounded-2xl border border-border/80 border-l-4 border-l-info bg-card p-4 space-y-2 shadow-card transition-all duration-200"
    >
      {contextHint ? (
        <p className="text-xs font-semibold text-info">{contextHint}</p>
      ) : null}
      {statusLabel ? (
        <p className="text-xs font-medium text-foreground/70">
          Estado: <span className="text-foreground">{statusLabel}</span>
        </p>
      ) : null}
      {vehicleCategoryLabel ? (
        <p className="text-xs font-medium text-foreground/70">
          Categoria: <span className="text-foreground">{vehicleCategoryLabel}</span>
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
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-foreground/70">Estimativa (indicativa)</p>
          <span className="text-2xl font-bold text-foreground">{priceDisplay}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:min-w-[200px]">
          {offerId && onReject ? (
            <button
              type="button"
              onClick={onReject}
              disabled={Boolean(loading || rejectLoading)}
              data-testid={rejectButtonTestId}
              className="min-h-[48px] w-full sm:w-auto sm:min-w-[120px] rounded-full border-2 border-destructive/70 bg-transparent px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {rejectLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  A processar…
                </span>
              ) : (
                'REJEITAR'
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAccept}
            disabled={Boolean(loading || rejectLoading)}
            data-testid={acceptButtonTestId}
            className="min-h-[52px] min-w-[44px] px-6 rounded-full bg-info text-info-foreground font-bold text-lg shadow-floating hover:bg-info/90 hover:scale-105 active:scale-95 transition-all duration-150 ease-out disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 touch-manipulation"
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
    </div>
  )
}
