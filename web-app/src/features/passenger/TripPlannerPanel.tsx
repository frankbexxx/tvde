import { Spinner } from '../../components/ui/Spinner'
import type { TripDetailResponse } from '../../api/trips'

export type PassengerUIState = 'idle' | 'planning' | 'confirming' | 'searching' | 'in_trip'

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
  onChooseMap: () => void
  onSetDestinationHint: () => void
  onReset: () => void
  onConfirmTrip: () => void
}

/**
 * A019: painel inferior com copy e acções por estado UX (Uber-like).
 * A021: contraste sem text-muted em bg fraco; densidade reduzida.
 */
export function TripPlannerPanel({
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
  onChooseMap,
  onSetDestinationHint,
  onReset,
  onConfirmTrip,
}: TripPlannerPanelProps) {
  const isSubdued = emphasis === 'subdued'
  const panelSurface =
    uiState === 'planning' || uiState === 'confirming'
      ? 'border-border bg-card'
      : 'bg-card border-border'

  const emphasisWrap = isSubdued
    ? 'opacity-80 transition-opacity duration-500 ease-out'
    : 'transition-opacity duration-500 ease-out'

  const pickupLine =
    !hasPickup
      ? 'Toca no mapa — recolha'
      : pickupAddressLoading
        ? 'A obter morada…'
        : (pickupAddress ?? 'Local selecionado')
  const dropLine =
    !hasDropoff
      ? 'Toca no mapa — destino'
      : dropoffAddressLoading
        ? 'A obter morada…'
        : (dropoffAddress ?? 'Local selecionado')

  return (
    <section
      className={`rounded-2xl border shadow-card px-4 py-4 space-y-3 ${panelSurface} ${emphasisWrap}`}
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
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-base font-semibold shadow-floating hover:opacity-95 transition-opacity"
          >
            Escolher no mapa
          </button>
        </>
      )}

      {uiState === 'planning' && (
        <>
          <p className="text-base font-semibold text-foreground">Percurso</p>
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
                className="w-full rounded-xl border border-border bg-muted/50 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors"
              >
                Centrar mapa no destino
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-xl border border-border py-3 text-base font-medium text-foreground hover:bg-muted/60 transition-colors"
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
                <span>{formatEta(routeMeta.durationSec)}</span>
              </>
            ) : (
              <span>Percurso estimado indisponível</span>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onConfirmTrip}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-base font-semibold shadow-floating hover:opacity-95 transition-opacity"
            >
              Confirmar viagem
            </button>
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-xl border border-border py-3 text-base font-medium text-foreground hover:bg-muted/60 transition-colors"
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
        </div>
      )}

      {uiState === 'in_trip' && activeTrip && (
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Viagem em curso</p>
          <p className="text-sm text-foreground/80">
            Estado: <span className="text-foreground font-medium">{activeTrip.status}</span>
          </p>
          <p className="text-xs text-foreground/70 pt-1">Vê o mapa e o estado no topo.</p>
        </div>
      )}
    </section>
  )
}
