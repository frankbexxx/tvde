/**
 * B002 / A014: Conteúdo visual por estado da viagem — clareza, sem depender só de logs.
 */
import { useEffect, useState } from 'react'
import { Spinner } from '../../components/ui/Spinner'
import { TripCard } from '../../components/cards/TripCard'
import { formatPickup, formatDestination } from '../../utils/format'
import { passengerTripStatusLabel, paymentStatusLabel } from '../../constants/tripStatusLabels'
import type { PassengerUxState } from './usePassengerUxState'
import type { TripDetailResponse } from '../../api/trips'

const ESTIMATE_FALLBACK = '4–6'

/** Segundos em `requested` antes de mostrar aviso de indisponibilidade (P24) e botão de retry (P36). */
export const PASSENGER_SEARCH_FALLBACK_AFTER_SEC = 10

function SearchingDriverPhase({
  tripCreatedAtIso,
  onRetrySearch,
  retrySearchPending,
}: {
  tripCreatedAtIso: string
  onRetrySearch?: () => void
  retrySearchPending?: boolean
}) {
  /** Relógio em efeito — evita `Date.now()` no render (react-hooks/purity). */
  const [nowMs, setNowMs] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNowMs(Date.now())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  const elapsedSec =
    nowMs == null
      ? 0
      : Math.max(0, (nowMs - new Date(tripCreatedAtIso).getTime()) / 1000)
  const showFallback = elapsedSec >= PASSENGER_SEARCH_FALLBACK_AFTER_SEC

  return (
    <div
      key="SEARCHING_DRIVER"
      className="flex flex-col items-center justify-center py-8 space-y-3 rounded-2xl border border-border bg-card transition-all duration-500 ease-out animate-in fade-in duration-300"
    >
      <p className="text-foreground text-lg font-semibold text-center px-2">
        {showFallback ? 'Sem motoristas disponíveis de momento' : 'A procurar motorista…'}
      </p>
      <p className="text-foreground/80 text-sm text-center max-w-sm px-4">
        {showFallback
          ? 'Não encontrámos um motorista na zona. Podes cancelar e voltar a pedir — ou esperar mais um pouco.'
          : 'Estamos a contactar motoristas na zona. Isto pode demorar um instante.'}
      </p>
      {showFallback && onRetrySearch ? (
        <button
          type="button"
          className="mt-1 rounded-xl border border-primary/45 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15 disabled:opacity-60 disabled:pointer-events-none transition-colors"
          disabled={retrySearchPending}
          onClick={onRetrySearch}
        >
          {retrySearchPending ? 'A processar…' : 'Tentar novamente'}
        </button>
      ) : null}
    </div>
  )
}

interface PassengerStatusCardProps {
  uxState: PassengerUxState | null
  activeTrip: TripDetailResponse | null | undefined
  /** A014: só no pedido inicial — spinner curto, separado do estado "à procura" */
  isSubmittingTrip?: boolean
  /** P36: cancelar pedido actual e criar novo com os mesmos pontos (após timeout de procura). */
  onRetrySearch?: () => void
  retrySearchPending?: boolean
}

export function PassengerStatusCard({
  uxState,
  activeTrip,
  isSubmittingTrip = false,
  onRetrySearch,
  retrySearchPending = false,
}: PassengerStatusCardProps) {
  if (isSubmittingTrip) {
    return (
      <div
        key="SUBMITTING"
        className="flex flex-col items-center justify-center py-8 space-y-3 rounded-2xl border border-border bg-card transition-all duration-500 ease-out animate-in fade-in duration-300"
      >
        <Spinner size="lg" />
        <p className="text-foreground text-base font-semibold">A enviar pedido…</p>
        <p className="text-foreground/80 text-sm text-center px-4">Aguarda um momento.</p>
      </div>
    )
  }

  if (!uxState || !activeTrip) return null

  switch (uxState) {
    case 'SEARCHING_DRIVER':
      return (
        <SearchingDriverPhase
          tripCreatedAtIso={activeTrip.created_at}
          onRetrySearch={onRetrySearch}
          retrySearchPending={retrySearchPending}
        />
      )

    case 'DRIVER_ASSIGNED': {
      const isAssignedOnly = activeTrip.status === 'assigned'
      if (isAssignedOnly) {
        return (
          <div
            key="DRIVER_ASSIGNED_ASSIGNED"
            className="space-y-4 rounded-2xl border border-primary/35 bg-primary/10 px-4 py-4 transition-all duration-500 ease-out animate-in fade-in duration-300"
          >
            <div>
              <p className="text-primary font-semibold text-lg">Motorista encontrado</p>
              <p className="text-foreground/80 text-sm mt-1">
                A obter localização — o mapa aparece em breve.
              </p>
            </div>
            <TripCard
              pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
              destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
              price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
              estimateFallback={ESTIMATE_FALLBACK}
              priceCaption="Estimativa (indicativa)"
            />
          </div>
        )
      }
      return (
        <div
          key="DRIVER_ASSIGNED_ACCEPTED"
          className="space-y-4 rounded-2xl border border-success/30 bg-success/15 px-4 py-4 transition-all duration-500 ease-out animate-in fade-in duration-300"
        >
          <p className="text-success font-semibold text-lg">Motorista a caminho</p>
          <TripCard
            pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
            destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
            price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
            estimateFallback={ESTIMATE_FALLBACK}
            priceCaption="Estimativa (indicativa)"
            driverName="Motorista TVDE"
            vehicleLabel="Veículo TVDE"
          />
        </div>
      )
    }

    case 'DRIVER_ARRIVING':
      return (
        <div
          key="DRIVER_ARRIVING"
          className="space-y-4 rounded-2xl border border-success/30 bg-success/15 px-4 py-4 transition-all duration-500 ease-out animate-in fade-in duration-300"
        >
          <div>
            <p className="text-success font-semibold text-lg">{passengerTripStatusLabel('arriving')}</p>
            <p className="text-foreground/80 text-sm mt-1">O motorista está próximo do ponto de recolha.</p>
          </div>
          <TripCard
            pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
            destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
            price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
            estimateFallback={ESTIMATE_FALLBACK}
            priceCaption="Estimativa (indicativa)"
            driverName="Motorista TVDE"
            vehicleLabel="Veículo TVDE"
          />
        </div>
      )

    case 'TRIP_ONGOING': {
      const ps = activeTrip.payment_status
      const payOngoing =
        ps === 'pending' || ps === 'processing' || ps === 'failed'
          ? paymentStatusLabel(ps)
          : null
      return (
        <div
          key="TRIP_ONGOING"
          className="space-y-4 rounded-2xl border border-secondary/40 bg-secondary/15 px-4 py-4 transition-all duration-500 ease-out animate-in fade-in duration-300"
        >
          <div>
            <p className="text-secondary-foreground font-semibold text-lg">Viagem em curso</p>
            {payOngoing ? (
              <p className="text-sm text-foreground/75 mt-1">{payOngoing}</p>
            ) : null}
          </div>
          <TripCard
            pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
            destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
            price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
            estimateFallback={ESTIMATE_FALLBACK}
            priceCaption="Estimativa (indicativa)"
            driverName="Motorista TVDE"
            vehicleLabel="Veículo TVDE"
          />
        </div>
      )
    }

    case 'TRIP_COMPLETED': {
      const payDone = paymentStatusLabel(activeTrip.payment_status)
      return (
        <div
          key="TRIP_COMPLETED"
          className="space-y-4 rounded-2xl border border-border bg-card px-4 py-4 transition-all duration-500 ease-out animate-in fade-in duration-300"
        >
          <div>
            <p className="text-foreground/85 font-semibold text-lg">Viagem concluída</p>
            {payDone ? (
              <p className="text-sm text-foreground/80 mt-1">{payDone}</p>
            ) : null}
          </div>
          <TripCard
            pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
            destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
            price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
            priceCaption="Preço final"
          />
        </div>
      )
    }

    default:
      return null
  }
}
