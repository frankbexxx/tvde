/**
 * B002 / A014: Conteúdo visual por estado da viagem — clareza, sem depender só de logs.
 * USER-SHELL-B: moldura unificada via InfoPanel.
 */
import { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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

function tripCardFooter(
  activeTrip: TripDetailResponse,
  priceCaption: string,
  t: TFunction<'passenger'>,
) {
  return (
    <TripCard
      pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
      destination={formatDestination(activeTrip.destination_lat, activeTrip.destination_lng)}
      price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
      estimateFallback={ESTIMATE_FALLBACK}
      priceCaption={priceCaption}
      driverName={
        activeTrip.status === 'assigned' ? undefined : t('statusCard.driverName')
      }
      vehicleLabel={activeTrip.status === 'assigned' ? undefined : t('statusCard.vehicleLabel')}
    />
  )
}

function buildTripMetaLines(
  activeTrip: TripDetailResponse,
  trackingHint: string | null | undefined,
  pollHint: string | null | undefined,
  t: TFunction<'passenger'>,
): string[] {
  const lines: string[] = []
  const ps = activeTrip.payment_status
  if (ps === 'pending' || ps === 'processing' || ps === 'failed') {
    const pay = paymentStatusLabel(ps)
    if (pay) lines.push(t('trip:paymentLine', { status: pay }))
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
  const { t } = useTranslation('passenger')
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
        showFallback ? t('statusCard.searchingFallbackTitle') : t('statusCard.searchingTitle')
      }
      subtitle={
        showFallback
          ? t('statusCard.searchingFallbackSubtitle')
          : t('statusCard.searchingSubtitle')
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
            {retrySearchPending ? t('statusCard.retryPending') : t('statusCard.retry')}
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
  const { t } = useTranslation('passenger')

  if (isSubmittingTrip) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-8 space-y-3 ${INFO_BOX_PASSENGER}`}
        data-testid="passenger-info-panel-submitting"
      >
        <Spinner size="lg" />
        <p className="text-foreground text-base font-semibold">{t('statusCard.submittingTitle')}</p>
        <p className="text-foreground/80 text-sm text-center px-4">{t('statusCard.submittingSubtitle')}</p>
      </div>
    )
  }

  if (!uxState || !activeTrip) return null

  const metaForTrip = buildTripMetaLines(activeTrip, trackingHint, pollHint, t)
  const estimateCaption = t('statusCard.estimateCaption')

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
            title={t('statusCard.driverFound')}
            subtitle={t('statusCard.driverLocating')}
            meta={metaForTrip.length > 0 ? metaForTrip : undefined}
            testId="passenger-info-panel-assigned"
            footer={compact ? undefined : tripCardFooter(activeTrip, estimateCaption, t)}
          />
        )
      }
      return (
        <InfoPanel
          compact={compact}
          tone="success"
          title={t('statusCard.driverEnRoute')}
          meta={metaForTrip.length > 0 ? metaForTrip : undefined}
          testId="passenger-info-panel-en-route"
          footer={compact ? undefined : tripCardFooter(activeTrip, estimateCaption, t)}
        />
      )
    }

    case 'DRIVER_ARRIVING':
      return (
        <InfoPanel
          compact={compact}
          tone="success"
          title={passengerTripStatusLabel('arriving')}
          subtitle={compact ? undefined : t('statusCard.driverNearPickup')}
          meta={metaForTrip.length > 0 ? metaForTrip : undefined}
          testId="passenger-info-panel-arriving"
          footer={compact ? undefined : tripCardFooter(activeTrip, estimateCaption, t)}
        />
      )

    case 'TRIP_ONGOING':
      return (
        <InfoPanel
          compact={compact}
          tone="secondary"
          title={t('statusCard.tripOngoing')}
          meta={metaForTrip.length > 0 ? metaForTrip : undefined}
          testId="passenger-info-panel-ongoing"
          footer={compact ? undefined : tripCardFooter(activeTrip, estimateCaption, t)}
        />
      )

    case 'TRIP_COMPLETED': {
      const payDone = paymentStatusLabel(activeTrip.payment_status)
      return (
        <InfoPanel
          compact={compact}
          tone="neutral"
          title={t('statusCard.tripCompleted')}
          meta={payDone ? [t('trip:paymentLine', { status: payDone })] : undefined}
          testId="passenger-info-panel-completed"
          footer={compact ? undefined : tripCardFooter(activeTrip, t('statusCard.finalPriceCaption'), t)}
        />
      )
    }

    default:
      return null
  }
}

export const PassengerStatusCard = memo(PassengerStatusCardInner)
PassengerStatusCard.displayName = 'PassengerStatusCard'
