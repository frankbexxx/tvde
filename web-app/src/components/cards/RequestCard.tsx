/**
 * Request card for driver - available trip to accept.
 * Pickup, estimate €, ACEITAR (botão ou deslizar).
 * No IDs, no coords.
 */
import { useEffect, useState } from 'react'
import { SlideToAccept } from './SlideToAccept'
import { INFO_BOX_DRIVER_LARGE, BTN_COMPACT_HEIGHT, BTN_PRIMARY_RADIUS } from '../layout/infoBoxTemplate'

function offerSecondsRemaining(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null
  const ms = Date.parse(expiresAt) - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.ceil(ms / 1000))
}

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
  /** Fechar box localmente (sem reject API). */
  onDismiss?: () => void
  dismissButtonTestId?: string
  /** `top-right` listas; `bottom-right-silence` painel mapa (silenciar oferta). */
  dismissPlacement?: 'top-right' | 'top-left' | 'bottom-right-silence'
  /** ISO8601 — countdown «Expira em Xs». */
  expiresAt?: string | null
  loading?: boolean
  rejectLoading?: boolean
  acceptButtonTestId?: string
  rejectButtonTestId?: string
  /** `slide`: deslizar para aceitar (fluxo motorista); `button`: só botão (testes / fallback). */
  acceptVariant?: 'button' | 'slide'
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
  onDismiss,
  dismissButtonTestId = 'driver-offer-dismiss',
  dismissPlacement = 'top-right',
  expiresAt,
  loading,
  rejectLoading,
  acceptButtonTestId,
  rejectButtonTestId,
  acceptVariant = 'button',
}: RequestCardProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!expiresAt) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [expiresAt])

  const secondsLeft = offerSecondsRemaining(expiresAt)

  const slideCompact = acceptVariant === 'slide'
  const priceDisplay =
    estimatedPrice != null && estimatedPrice > 0
      ? `${estimatedPrice.toFixed(2)} €`
      : `${estimateFallback} €`

  const expiryLine =
    secondsLeft != null ? (
      <p
        className="text-xs font-medium text-foreground/70 tabular-nums"
        data-testid="driver-offer-expiry"
        aria-live="polite"
      >
        {secondsLeft > 0 ? `Expira em ${secondsLeft}s` : 'Oferta expirada'}
      </p>
    ) : null

  const dismissPosClass =
    dismissPlacement === 'bottom-right-silence'
      ? 'absolute right-2 bottom-2 z-10'
      : dismissPlacement === 'top-left'
        ? 'absolute left-2 top-2 z-10'
        : 'absolute right-2 top-2 z-10'

  const dismissButton =
    onDismiss != null ? (
      <button
        type="button"
        onClick={onDismiss}
        disabled={Boolean(loading || rejectLoading)}
        data-testid={dismissButtonTestId}
        aria-label="Silenciar oferta"
        className={
          dismissPlacement === 'bottom-right-silence'
            ? `${dismissPosClass} flex min-h-8 items-center justify-center rounded-md border border-destructive/60 bg-destructive/10 px-2 text-xs font-semibold text-destructive hover:bg-destructive/20 touch-manipulation`
            : `${dismissPosClass} flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground/70 hover:bg-muted touch-manipulation`
        }
      >
        {dismissPlacement === 'bottom-right-silence' ? 'Silenciar' : '×'}
      </button>
    ) : null

  const slideAccept = (
    <SlideToAccept
      density="compact"
      onConfirm={onAccept}
      disabled={Boolean(rejectLoading) || secondsLeft === 0}
      loading={Boolean(loading)}
      trackTestId={acceptButtonTestId ? `${acceptButtonTestId}-track` : undefined}
      testId={acceptButtonTestId ? `${acceptButtonTestId}-slide` : undefined}
    />
  )

  const tripDetails = (
    <>
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
      {expiryLine}
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/65">Recolha</p>
        <p
          className={
            slideCompact ? 'text-base font-semibold text-foreground' : 'text-lg font-semibold text-foreground'
          }
        >
          {pickup}
        </p>
      </div>
      {destination ? (
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/65">Destino</p>
          <p className="text-base font-semibold text-foreground/95">{destination}</p>
        </div>
      ) : null}
    </>
  )

  if (slideCompact) {
    const padClass =
      dismissPlacement === 'bottom-right-silence'
        ? 'p-2 pb-10'
        : dismissPlacement === 'top-left'
          ? 'p-2 pl-8 pr-8'
          : 'p-2 pr-8'
    return (
      <div className={`relative ${INFO_BOX_DRIVER_LARGE} ${padClass} space-y-1 transition-all duration-200`}>
        {dismissButton}
        {slideAccept}
        {tripDetails}
        <div>
          <p className="text-xs font-medium text-foreground/70">Estimativa (indicativa)</p>
          <span className="text-lg font-bold text-foreground">{priceDisplay}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${INFO_BOX_DRIVER_LARGE} p-4 space-y-2 transition-all duration-200`}>
      {dismissButton}
      {tripDetails}
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
            className={`${BTN_COMPACT_HEIGHT} min-w-[44px] px-4 ${BTN_PRIMARY_RADIUS} bg-info text-info-foreground font-semibold text-sm shadow-md hover:bg-info/90 hover:scale-105 active:scale-95 transition-all duration-150 ease-out disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 touch-manipulation`}
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
