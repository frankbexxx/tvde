import { Spinner } from '../../components/ui/Spinner'
import type { TripDetailResponse } from '../../api/trips'

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

export interface TripPlannerPanelProps {
  uiState: PassengerUIState
  hasPickup: boolean
  hasDropoff: boolean
  pickupAddress: string | null
  dropoffAddress: string | null
  pickupAddressLoading: boolean
  dropoffAddressLoading: boolean
  routeMeta: { durationSec: number; distanceM: number } | null
  routeMetaLoading: boolean
  activeTrip: TripDetailResponse | null
  onChooseMap: () => void
  onSetDestinationHint: () => void
  onReset: () => void
  onConfirmTrip: () => void
  /** A021: quando o foco está no header/mapa, o painel baixa contraste */
  visualWeight?: TripPlannerVisualWeight
}

/**
 * A019: painel inferior com copy e acções por estado UX (Uber-like).
 * A021: hierarquia visual, contraste e densidade.
 */
export function TripPlannerPanel({
  uiState,
  hasPickup,
  hasDropoff,
  pickupAddress,
  dropoffAddress,
  pickupAddressLoading,
  dropoffAddressLoading,
  routeMeta,
  routeMetaLoading,
  activeTrip,
  onChooseMap,
  onSetDestinationHint,
  onReset,
  onConfirmTrip,
  visualWeight = 'default',
}: TripPlannerPanelProps) {
  const isSubdued = visualWeight === 'subdued'

  const panelSurface = (() => {
    if (isSubdued) {
      return 'border-border/70 bg-card/95 shadow-sm opacity-90'
    }
    if (uiState === 'planning' || uiState === 'confirming') {
      return 'border-border bg-card shadow-inner'
    }
    return 'bg-card border-border shadow-card'
  })()

  return (
    <section
      className={`rounded-2xl border px-4 py-4 space-y-3 transition-all duration-300 ease-out ${panelSurface}`}
      aria-label="Planeamento da viagem"
    >
      {uiState === 'idle' && (
        <>
          <p className="text-lg font-semibold text-foreground">Para onde vais?</p>
          <p className="text-sm text-foreground/80">
            Escolhe recolha e destino no mapa quando estiveres pronto.
          </p>
          <button
            type="button"
            onClick={onChooseMap}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-3 text-base font-semibold shadow-floating hover:opacity-95 transition-opacity"
          >
            Escolher no mapa
          </button>
        </>
      )}

      {uiState === 'planning' && (
        <>
          <p className="text-sm font-semibold text-foreground/90">No mapa</p>
          <div className="min-h-[2.75rem] flex items-center">
            <p className="text-base font-medium text-foreground leading-snug">
              {!hasPickup && 'Toca no mapa para escolher o ponto de recolha.'}
              {hasPickup && !hasDropoff && (
                <>
                  {pickupAddressLoading ? (
                    <span className="text-foreground/80">A obter morada…</span>
                  ) : (
                    <span>{pickupAddress ?? 'Recolha'}</span>
                  )}
                  <span className="text-foreground/70 mx-1.5">→</span>
                  <span className="text-foreground/80">toca no mapa para o destino</span>
                </>
              )}
              {hasPickup && hasDropoff && (
                <>
                  {pickupAddressLoading || dropoffAddressLoading ? (
                    <span className="text-foreground/80">A obter moradas…</span>
                  ) : (
                    <span>
                      {pickupAddress ?? '—'}
                      <span className="text-foreground/65 mx-1.5">→</span>
                      {dropoffAddress ?? '—'}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            {!hasDropoff && (
              <button
                type="button"
                onClick={onSetDestinationHint}
                className="w-full rounded-2xl border border-border bg-muted/40 py-3 text-base font-medium text-foreground hover:bg-muted/60 transition-colors"
              >
                Definir destino
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-2xl border border-border py-3 text-base font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Repor
            </button>
          </div>
        </>
      )}

      {uiState === 'confirming' && (
        <>
          <p className="text-base font-semibold text-foreground">Confirma a viagem</p>
          <p className="text-base font-medium text-foreground leading-snug">
            <span className="text-foreground/80 font-normal">Itinerário: </span>
            {pickupAddress ?? '—'}
            <span className="text-foreground/65 mx-1">→</span>
            {dropoffAddress ?? '—'}
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
              className="w-full rounded-2xl bg-primary text-primary-foreground py-3 text-base font-semibold shadow-floating hover:opacity-95 transition-opacity"
            >
              Confirmar viagem
            </button>
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-2xl border border-border py-3 text-base font-medium text-foreground hover:bg-muted/50 transition-colors"
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
          <p className="text-sm text-foreground/80 text-center">
            {activeTrip ? `Pedido ${activeTrip.trip_id.slice(0, 8)}…` : 'A enviar o teu pedido…'}
          </p>
        </div>
      )}

      {uiState === 'in_trip' && activeTrip && (
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Viagem em curso</p>
          <p className="text-sm text-foreground/85">
            Estado: <span className="text-foreground font-semibold">{activeTrip.status}</span>
          </p>
          <p className="text-sm text-foreground/80 pt-0.5">Acompanha o mapa e o estado acima.</p>
        </div>
      )}
    </section>
  )
}
