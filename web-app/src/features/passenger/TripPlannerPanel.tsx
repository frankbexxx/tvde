import { memo } from 'react'
import { Spinner } from '../../components/ui/Spinner'
import type { TripDetailResponse } from '../../api/trips'
import { passengerTripStatusLabel, paymentStatusLabel } from '../../constants/tripStatusLabels'

export type PassengerUIState = 'idle' | 'planning' | 'confirming' | 'searching' | 'in_trip'

export type TripPlannerVisualWeight = 'default' | 'subdued'

function formatEta(durationSec: number): string {
  const m = Math.max(1, Math.round(durationSec / 60))
  return m === 1 ? '~1 min' : `~${m} min`
}

function formatDistance(distanceM: number): string {
  if (distanceM >= 1000) {
    return `${(distanceM / 1000).toFixed(1)} km`
  }
  return `${Math.round(distanceM)} m`
}

/** A021: painel secundário quando StatusHeader ou mapa têm foco */
export type PanelEmphasis = 'primary' | 'subdued'

export interface TripPlannerPanelProps {
  uiState: PassengerUIState
  emphasis?: PanelEmphasis
  hasPickup: boolean
  hasDropoff: boolean
  pickupAddress: string | null
  dropoffAddress: string | null
  pickupAddressLoading: boolean
  dropoffAddressLoading: boolean
  routeMeta: { durationSec: number; distanceM: number } | null
  routeMetaLoading: boolean
  activeTrip: TripDetailResponse | null
  /** Texto curto sob o estado (polling / última info válida). */
  tripPollHint?: string | null
  /** Distância aproximada ao motorista (accepted | arriving | ongoing). */
  driverTrackingHint?: string | null
  /** Pedido de viagem demorado (ação do utilizador). */
  slowRequestHint?: string | null
  /** Bloqueia confirmar / repor durante o POST do pedido. */
  confirmTripPending?: boolean
  onChooseMap: () => void
  onSetDestinationHint: () => void
  onReset: () => void
  onConfirmTrip: () => void
  /** A021: quando o foco está no header/mapa, o painel baixa contraste */
  visualWeight?: TripPlannerVisualWeight
  /** Sem cartão próprio — títulos/copy no bloco pai (fluxo unificado passageiro). */
  embedded?: boolean
}

/**
 * A019: painel inferior com copy e ações por estado UX (Uber-like).
 * A021: hierarquia visual, contraste sem text-muted fraco em bg-muted; densidade reduzida.
 */
function TripPlannerPanelInner({
  uiState,
  emphasis = 'primary',
  hasPickup,
  hasDropoff,
  pickupAddress,
  dropoffAddress,
  pickupAddressLoading,
  dropoffAddressLoading,
  routeMeta,
  routeMetaLoading,
  activeTrip,
  tripPollHint = null,
  driverTrackingHint = null,
  slowRequestHint = null,
  confirmTripPending = false,
  onChooseMap,
  onSetDestinationHint,
  onReset,
  onConfirmTrip,
  visualWeight = 'default',
  embedded = false,
}: TripPlannerPanelProps) {
  const isSubdued = visualWeight === 'subdued' || emphasis === 'subdued'

  const panelSurface = embedded
    ? 'border-0 bg-transparent shadow-none opacity-100'
    : (() => {
        if (isSubdued) {
          return 'border-border/70 bg-card/95 shadow-sm opacity-90'
        }
        if (uiState === 'planning' || uiState === 'confirming') {
          return 'border-border bg-card shadow-inner'
        }
        return 'bg-card border-border shadow-card'
      })()

  const emphasisWrap =
    embedded ? '' : isSubdued
      ? 'opacity-80 transition-opacity duration-500 ease-out'
      : 'transition-opacity duration-500 ease-out'

  const inTripPaymentLine =
    uiState === 'in_trip' && activeTrip ? paymentStatusLabel(activeTrip.payment_status) : null

  const pickupLine =
    !hasPickup
      ? 'Toca no mapa — recolha'
      : pickupAddressLoading
        ? 'A obter morada…'
        : (pickupAddress ?? 'Local selecionado')
  const dropLine =
    !hasDropoff
      ? 'Indica o destino (pesquisa em cima ou mapa)'
      : dropoffAddressLoading
        ? 'A obter morada…'
        : (dropoffAddress ?? 'Local selecionado')

  const inner = (
    <>
      {uiState === 'idle' && (
        <>
          {!embedded && (
            <>
              <p className="text-lg font-semibold text-foreground">Para onde vais?</p>
              <p className="text-sm text-foreground/80">
                Escolhe recolha e destino para pedir uma viagem
              </p>
              <p className="text-xs text-muted-foreground">Começa por indicar o destino</p>
            </>
          )}
          {embedded ? (
            <div
              className="rounded-lg bg-muted/40 border border-border/50 border-l-4 px-3 py-2"
              style={{ borderLeftColor: 'hsl(var(--color-flag-blue, 218 100% 23%))' }}
            >
              <p className="text-sm text-muted-foreground text-center leading-snug">
                Indica um destino para começar — pesquisa em cima ou abre o mapa com o botão.
              </p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onChooseMap}
            disabled={confirmTripPending}
            className="w-full min-h-[52px] rounded-full bg-primary text-primary-foreground py-3 text-base font-bold shadow-floating hover:opacity-95 transition-opacity disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:shadow-none disabled:pointer-events-none"
          >
            Pedir viagem
          </button>
        </>
      )}

      {uiState === 'planning' && (
        <>
          {!embedded && <p className="text-base font-semibold text-foreground">Percurso</p>}
          <p className="text-base font-medium text-foreground leading-snug">
            <span className="text-foreground/75">{pickupLine}</span>
            <span className="mx-1.5 text-foreground/50">→</span>
            <span className="text-foreground">{dropLine}</span>
          </p>
          <div className="flex flex-col gap-2 pt-1">
            {!hasDropoff && (
              <button
                type="button"
                onClick={onSetDestinationHint}
                className="w-full rounded-2xl border border-border bg-muted/50 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors"
              >
                Centrar mapa no destino
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              disabled={confirmTripPending}
              className="w-full rounded-2xl border border-border py-3 text-base font-medium text-foreground hover:bg-muted/60 transition-colors disabled:bg-muted/40 disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              Repor
            </button>
          </div>
        </>
      )}

      {uiState === 'confirming' && (
        <>
          {!embedded && <p className="text-base font-semibold text-foreground">Confirma a viagem</p>}
          <p className="text-base font-medium text-foreground leading-snug">
            <span className="text-foreground/80">{pickupAddress ?? '—'}</span>
            <span className="mx-1.5 text-foreground/45">→</span>
            <span className="text-foreground">{dropoffAddress ?? '—'}</span>
          </p>
          <div className="flex items-center gap-3 text-sm text-foreground/80 min-h-[1.25rem]">
            {routeMetaLoading ? (
              <span>A calcular percurso…</span>
            ) : routeMeta ? (
              <>
                <span className="font-medium">{formatDistance(routeMeta.distanceM)}</span>
                <span className="text-foreground/50">·</span>
                <span className="font-medium">{formatEta(routeMeta.durationSec)}</span>
              </>
            ) : (
              <span>Percurso estimado indisponível</span>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onConfirmTrip}
              disabled={confirmTripPending || routeMetaLoading}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-3 text-base font-semibold shadow-floating hover:opacity-95 transition-opacity duration-200 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:shadow-none disabled:pointer-events-none"
            >
              {confirmTripPending ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
                    aria-hidden
                  />
                  A confirmar…
                </span>
              ) : (
                'Confirmar viagem'
              )}
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={confirmTripPending}
              className="w-full rounded-2xl border border-border py-3 text-base font-medium text-foreground hover:bg-muted/60 transition-colors disabled:bg-muted/40 disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              Repor
            </button>
          </div>
        </>
      )}

      {uiState === 'searching' && (
        <div className="flex flex-col items-center gap-3 py-2">
          <Spinner size="lg" />
          <p className="text-base font-semibold text-foreground text-center">À procura de motorista…</p>
          <p className="text-sm text-foreground/75 text-center">
            {activeTrip ? `Pedido ${activeTrip.trip_id.slice(0, 8)}…` : 'A enviar o teu pedido…'}
          </p>
          {slowRequestHint ? (
            <p className="text-xs text-foreground/70 text-center px-2" aria-live="polite">
              {slowRequestHint}
            </p>
          ) : null}
        </div>
      )}

      {uiState === 'in_trip' && activeTrip && (
        <div className="space-y-1">
          <p className="text-sm text-foreground/85">
            Estado:{' '}
            <span className="text-foreground font-semibold">
              {passengerTripStatusLabel(activeTrip.status)}
            </span>
          </p>
          {inTripPaymentLine ? (
            <p className="text-sm text-foreground/80">Pagamento: {inTripPaymentLine}</p>
          ) : null}
          {driverTrackingHint ? (
            <p className="text-sm text-foreground font-medium pt-0.5" aria-live="polite">
              {driverTrackingHint}
            </p>
          ) : null}
          {tripPollHint ? (
            <p className="text-xs text-foreground/60 pt-0.5" aria-live="polite">
              {tripPollHint}
            </p>
          ) : null}
          <p className="text-sm text-foreground/80 pt-0.5">Acompanha o mapa e o estado acima.</p>
        </div>
      )}
    </>
  )

  if (embedded) {
    return (
      <div className={`space-y-3 ${emphasisWrap}`} aria-label="Planeamento da viagem">
        {inner}
      </div>
    )
  }

  return (
    <section
      className={`rounded-2xl border px-4 py-4 space-y-3 transition-all duration-300 ease-out ${panelSurface} ${emphasisWrap}`}
      aria-label="Planeamento da viagem"
    >
      {inner}
    </section>
  )
}

export const TripPlannerPanel = memo(TripPlannerPanelInner)
TripPlannerPanel.displayName = 'TripPlannerPanel'
