/**
 * B002: Central visual component for passenger UX state.
 * Shows semantic content per state — no empty screens, no error flicker.
 */
import { Spinner } from '../../components/ui/Spinner'
import { TripCard } from '../../components/cards/TripCard'
import { formatPickup, formatDestination } from '../../utils/format'
import type { PassengerUxState } from './usePassengerUxState'
import type { TripDetailResponse } from '../../api/trips'

const ESTIMATE_FALLBACK = '4–6'

interface PassengerStatusCardProps {
  uxState: PassengerUxState | null
  activeTrip: TripDetailResponse | null | undefined
}

export function PassengerStatusCard({ uxState, activeTrip }: PassengerStatusCardProps) {
  if (!uxState || !activeTrip) return null

  switch (uxState) {
    case 'SEARCHING_DRIVER':
      return (
        <div className="flex flex-col items-center justify-center py-6 space-y-3 rounded-2xl border border-border bg-muted transition-opacity duration-300">
          <Spinner size="lg" />
          <p className="text-foreground text-base font-medium">
            À procura de motorista...
          </p>
          <p className="text-muted-foreground text-sm">
            Estamos a encontrar o motorista mais próximo.
          </p>
        </div>
      )

    case 'DRIVER_ASSIGNED':
      return (
        <div className="space-y-4 rounded-2xl border border-success/30 bg-success/10 px-4 py-4 transition-opacity duration-300">
          <p className="text-success font-medium">Motorista a caminho</p>
          <TripCard
            pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
            destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
            price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
            estimateFallback={ESTIMATE_FALLBACK}
            driverName="O seu motorista está a caminho"
          />
        </div>
      )

    case 'DRIVER_ARRIVING':
      return (
        <div className="space-y-4 rounded-2xl border border-success/30 bg-success/10 px-4 py-4 transition-opacity duration-300">
          <p className="text-success font-medium">Motorista chegou</p>
          <TripCard
            pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
            destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
            price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
            estimateFallback={ESTIMATE_FALLBACK}
            driverName="O seu motorista está à sua espera"
          />
        </div>
      )

    case 'TRIP_ONGOING':
      return (
        <div className="space-y-4 rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-4 transition-opacity duration-300">
          <p className="text-secondary font-medium">Em viagem</p>
          <TripCard
            pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
            destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
            price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
            estimateFallback={ESTIMATE_FALLBACK}
          />
        </div>
      )

    case 'TRIP_COMPLETED':
      return (
        <div className="space-y-4 rounded-2xl border border-border bg-muted px-4 py-4 transition-opacity duration-300">
          <p className="text-muted-foreground font-medium">Viagem concluída</p>
          <TripCard
            pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
            destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
            price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
          />
        </div>
      )

    default:
      return null
  }
}
