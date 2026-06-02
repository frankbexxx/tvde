/**
 * B002 / A014: Conteúdo visual por estado da viagem — clareza, sem depender só de logs.
 * USER-SHELL-B: moldura unificada via InfoPanel.
 */
import { memo, useEffect, useState } from 'react'
import { Spinner } from '../../components/ui/Spinner'
import { TripCard } from '../../components/cards/TripCard'
import { InfoPanel } from '../../components/layout/InfoPanel'
import { formatPickup, formatDestination } from '../../utils/format'
import { passengerTripStatusLabel, paymentStatusLabel } from '../../constants/tripStatusLabels'
import type { PassengerUxState } from './usePassengerUxState'
import type { TripDetailResponse } from '../../api/trips'
import { passengerPaymentDisclosureSearching } from '../../constants/passengerPaymentCopy'
import { BTN_SECONDARY, INFO_BOX_PASSENGER } from '../../components/layout/infoBoxTemplate'

const ESTIMATE_FALLBACK = '4–6'

/**
 * Segundos em `requested` antes de mostrar aviso de indisponibilidade (P24) e botão de retry (P36).
 */
export const PASSENGER_SEARCH_FALLBACK_AFTER_SEC = 25

function tripCardFooter(activeTrip: TripDetailResponse, priceCaption: string) {
  return (
    <TripCard
      pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
      destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
      price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
      estimateFallback={ESTIMATE_FALLBACK}
      priceCaption={priceCaption}
      driverName={
        activeTrip.status === 'assigned' ? undefined : 'Motorista TVDE'
      }
      vehicleLabel={activeTrip.status === 'assigned' ? undefined : 'Veículo TVDE'}
    />
  )
}

function buildTripMetaLines(
  activeTrip: TripDetailResponse,
  trackingHint: string | null | undefined,
  pollHint: string | null | undefined,
): string[] {
  const lines: string[] = []
  const ps = activeTrip.payment_status
  if (ps === 'pending' || ps === 'processing' || ps === 'failed') {
    const pay = paymentStatusLabel(ps)
    if (pay) lines.push(`Pagamento: ${pay}`)
  }
  if (trackingHint?.trim()) lines.push(trackingHint.trim())
  if (pollHint?.trim()) lines.push(pollHint.trim())
  return lines
}

function SearchingDriverPhase({
  tripCreatedAtIso,
  onRetrySearch,
  retrySearchPending,
  compact = false,
}: {
  tripCreatedAtIso: string
  onRetrySearch?: () => void
  retrySearchPending?: boolean
  compact?: boolean
}) {
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

  const meta = !showFallback ? [passengerPaymentDisclosureSearching()] : undefined

  return (
    <InfoPanel
      compact={compact}
      tone={showFallback ? 'empty' : 'waiting'}
      centered
      title={
        showFallback ? 'Sem motoristas disponíveis de momento' : 'A procurar motorista…'
      }
      subtitle={
        showFallback
          ? 'Não encontrámos um motorista na zona. Podes cancelar e voltar a pedir — ou esperar mais um pouco.'
          : 'Estamos a contactar motoristas na zona. Pode demorar um instante.'
      }
      meta={meta}
      testId={showFallback ? 'passenger-info-panel-empty' : 'passenger-info-panel-searching'}
      actions={
        showFallback && onRetrySearch ? (
          <button
            type="button"
            className={`mt-1 ${BTN_SECONDARY}`}
            disabled={retrySearchPending}
            onClick={onRetrySearch}
          >
            {retrySearchPending ? 'A processar…' : 'Tentar novamente'}
          </button>
        ) : undefined
      }
    />
  )
}

export interface PassengerStatusCardProps {
  uxState: PassengerUxState | null
  activeTrip: TripDetailResponse | null | undefined
  isSubmittingTrip?: boolean
  onRetrySearch?: () => void
  retrySearchPending?: boolean
  /** G15/G23: distância estimada ao motorista. */
  trackingHint?: string | null
  /** Poll / sincronização (só falhas ou stall — não «A actualizar…» em cada poll). */
  pollHint?: string | null
  /** Caixa sobre mapa — texto e cartão mais compactos. */
  compact?: boolean
}

function PassengerStatusCardInner({
  uxState,
  activeTrip,
  isSubmittingTrip = false,
  onRetrySearch,
  retrySearchPending = false,
  trackingHint = null,
  pollHint = null,
  compact = false,
}: PassengerStatusCardProps) {
  if (isSubmittingTrip) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-8 space-y-3 ${INFO_BOX_PASSENGER}`}
        data-testid="passenger-info-panel-submitting"
      >
        <Spinner size="lg" />
        <p className="text-foreground text-base font-semibold">A enviar pedido…</p>
        <p className="text-foreground/80 text-sm text-center px-4">Aguarda um momento.</p>
      </div>
    )
  }

  if (!uxState || !activeTrip) return null

  const metaForTrip = buildTripMetaLines(activeTrip, trackingHint, pollHint)

  switch (uxState) {
    case 'SEARCHING_DRIVER':
      return (
        <SearchingDriverPhase
          tripCreatedAtIso={activeTrip.created_at}
          onRetrySearch={onRetrySearch}
          retrySearchPending={retrySearchPending}
          compact={compact}
        />
      )

    case 'DRIVER_ASSIGNED': {
      const isAssignedOnly = activeTrip.status === 'assigned'
      if (isAssignedOnly) {
        return (
          <InfoPanel
            compact={compact}
            tone="primary"
            title="Motorista encontrado"
            subtitle="A obter localização — o mapa aparece em breve."
            meta={metaForTrip.length > 0 ? metaForTrip : undefined}
            testId="passenger-info-panel-assigned"
            footer={compact ? undefined : tripCardFooter(activeTrip, 'Estimativa (indicativa)')}
          />
        )
      }
      return (
        <InfoPanel
          compact={compact}
          tone="success"
          title="Motorista a caminho"
          meta={metaForTrip.length > 0 ? metaForTrip : undefined}
          testId="passenger-info-panel-en-route"
          footer={compact ? undefined : tripCardFooter(activeTrip, 'Estimativa (indicativa)')}
        />
      )
    }

    case 'DRIVER_ARRIVING':
      return (
        <InfoPanel
          compact={compact}
          tone="success"
          title={passengerTripStatusLabel('arriving')}
          subtitle={compact ? undefined : 'O motorista está próximo do ponto de recolha.'}
          meta={metaForTrip.length > 0 ? metaForTrip : undefined}
          testId="passenger-info-panel-arriving"
          footer={compact ? undefined : tripCardFooter(activeTrip, 'Estimativa (indicativa)')}
        />
      )

    case 'TRIP_ONGOING':
      return (
        <InfoPanel
          compact={compact}
          tone="secondary"
          title="Viagem em curso"
          meta={metaForTrip.length > 0 ? metaForTrip : undefined}
          testId="passenger-info-panel-ongoing"
          footer={compact ? undefined : tripCardFooter(activeTrip, 'Estimativa (indicativa)')}
        />
      )

    case 'TRIP_COMPLETED': {
      const payDone = paymentStatusLabel(activeTrip.payment_status)
      return (
        <InfoPanel
          compact={compact}
          tone="neutral"
          title="Viagem concluída"
          meta={payDone ? [`Pagamento: ${payDone}`] : undefined}
          testId="passenger-info-panel-completed"
          footer={compact ? undefined : tripCardFooter(activeTrip, 'Preço final')}
        />
      )
    }

    default:
      return null
  }
}

export const PassengerStatusCard = memo(PassengerStatusCardInner)
PassengerStatusCard.displayName = 'PassengerStatusCard'
