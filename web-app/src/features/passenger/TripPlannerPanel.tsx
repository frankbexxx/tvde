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
}

/**
 * A019: painel inferior com copy e acções por estado UX (Uber-like).
 * Não chama API — só UI + callbacks.
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
}: TripPlannerPanelProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card shadow-card px-4 py-4 space-y-3"
      aria-label="Planeamento da viagem"
    >
      {uiState === 'idle' && (
        <>
          <p className="text-lg font-semibold text-foreground">Para onde vais?</p>
          <p className="text-sm text-muted-foreground">
            Escolhe recolha e destino no mapa quando estiveres pronto.
          </p>
          <button
            type="button"
            onClick={onChooseMap}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-base font-semibold hover:opacity-95 transition-opacity"
          >
            Escolher no mapa
          </button>
        </>
      )}

      {uiState === 'planning' && (
        <>
          <p className="text-sm font-medium text-muted-foreground">Recolha</p>
          <p className="text-base text-foreground min-h-[1.5rem]">
            {!hasPickup
              ? 'Toca no mapa para escolher recolha'
              : pickupAddressLoading
                ? 'A obter morada…'
                : (pickupAddress ?? 'Local selecionado')}
          </p>
          <p className="text-sm font-medium text-muted-foreground pt-1">Destino</p>
          <p className="text-base text-foreground min-h-[1.5rem]">
            {!hasDropoff
              ? 'Ainda não definido — toca no mapa'
              : dropoffAddressLoading
                ? 'A obter morada…'
                : (dropoffAddress ?? 'Local selecionado')}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            {!hasDropoff && (
              <button
                type="button"
                onClick={onSetDestinationHint}
                className="w-full rounded-xl border border-border bg-muted/60 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors"
              >
                Definir destino
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-xl border border-border py-3 text-base font-medium text-foreground hover:bg-muted/80 transition-colors"
            >
              Repor
            </button>
          </div>
        </>
      )}

      {uiState === 'confirming' && (
        <>
          <p className="text-base font-semibold text-foreground">Confirma a viagem</p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">De </span>
              <span className="text-foreground">{pickupAddress ?? '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Para </span>
              <span className="text-foreground">{dropoffAddress ?? '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground min-h-[1.25rem]">
            {routeMetaLoading ? (
              <span>A calcular percurso…</span>
            ) : routeMeta ? (
              <>
                <span>{formatDistance(routeMeta.distanceM)}</span>
                <span>·</span>
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
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-base font-semibold hover:opacity-95 transition-opacity"
            >
              Confirmar viagem
            </button>
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-xl border border-border py-3 text-base font-medium text-foreground hover:bg-muted/80 transition-colors"
            >
              Repor
            </button>
          </div>
        </>
      )}

      {uiState === 'searching' && (
        <div className="flex flex-col items-center gap-3 py-2">
          <Spinner size="lg" />
          <p className="text-base font-medium text-foreground text-center">À procura de motorista…</p>
          <p className="text-sm text-muted-foreground text-center">
            {activeTrip ? `Pedido ${activeTrip.trip_id.slice(0, 8)}…` : 'A enviar o teu pedido…'}
          </p>
        </div>
      )}

      {uiState === 'in_trip' && activeTrip && (
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Viagem em curso</p>
          <p className="text-sm text-muted-foreground">
            Estado: <span className="text-foreground font-medium">{activeTrip.status}</span>
          </p>
          <p className="text-xs text-muted-foreground pt-1">
            Acompanha o mapa e o estado acima para mais detalhes.
          </p>
        </div>
      )}
    </section>
  )
}
