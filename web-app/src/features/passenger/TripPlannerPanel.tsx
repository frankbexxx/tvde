import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Spinner } from '../../components/ui/Spinner'
import type { TripDetailResponse } from '../../api/trips'
import { passengerTripStatusLabel, paymentStatusLabel } from '../../constants/tripStatusLabels'
import { passengerPaymentDisclosureSearching } from '../../constants/passengerPaymentCopy'
import {
  BTN_COMPACT_HEIGHT,
  BTN_PRIMARY_RADIUS,
  BTN_SECONDARY,
  BTN_SECONDARY_RADIUS,
  INFO_BOX_BODY_COMPACT,
  INFO_BOX_TITLE_COMPACT,
  MAP_SHEET_GAP,
  SURFACE_RADIUS,
} from '../../components/layout/infoBoxTemplate'

export type PassengerUIState = 'idle' | 'planning' | 'confirming' | 'searching' | 'in_trip'

export type TripPlannerVisualWeight = 'default' | 'subdued'

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
  /**
   * Em confirmação: bloqueia o botão «Confirmar viagem» e mostra aviso (ex.: recolha ≈ destino).
   */
  confirmBlockedReason?: string | null
  onChooseMap: () => void
  onSetDestinationHint: () => void
  onReset: () => void
  onEditDestination?: () => void
  onConfirmTrip: () => void
  /** A021: quando o foco está no header/mapa, o painel baixa contraste */
  visualWeight?: TripPlannerVisualWeight
  /** Sem cartão próprio — títulos/copy no bloco pai (fluxo unificado passageiro). */
  embedded?: boolean
  /**
   * Com `PassengerStatusCard` + `StatusHeader`, omitir a linha «Estado: …» e a cópia genérica do mapa
   * em `in_trip`, mantendo pagamento / distância ao motorista / polling.
   */
  inTripSuppressEstadoEcho?: boolean
  /**
   * Quando o cartão de estado já mostra a mesma linha de pagamento (ex. `TRIP_ONGOING` pendente/a processar/falhado).
   */
  inTripSuppressPaymentEcho?: boolean
  /** Pagamento, distância e poll já no InfoPanel (PassengerStatusCard). */
  inTripSuppressMetaEcho?: boolean
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
  confirmBlockedReason = null,
  onChooseMap,
  onSetDestinationHint,
  onReset,
  onEditDestination,
  onConfirmTrip,
  visualWeight = 'default',
  embedded = false,
  inTripSuppressEstadoEcho = false,
  inTripSuppressPaymentEcho = false,
  inTripSuppressMetaEcho = false,
}: TripPlannerPanelProps) {
  const { t } = useTranslation('passenger')
  const isSubdued = visualWeight === 'subdued' || emphasis === 'subdued'

  const formatEta = (durationSec: number): string => {
    const m = Math.max(1, Math.round(durationSec / 60))
    return m === 1 ? t('planner.etaOneMin') : t('planner.etaMinutes', { count: m })
  }

  const formatDistance = (distanceM: number): string => {
    if (distanceM >= 1000) {
      return t('planner.distanceKm', { value: (distanceM / 1000).toFixed(1) })
    }
    return t('planner.distanceM', { value: Math.round(distanceM) })
  }

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
      ? embedded
        ? t('planner.pickupUndefinedEmbedded')
        : t('planner.pickupPrompt')
      : pickupAddressLoading
        ? t('planner.addressLoading')
        : (pickupAddress ?? t('planner.locationSelected'))
  const dropLine =
    !hasDropoff
      ? t('planner.dropoffPrompt')
      : dropoffAddressLoading
        ? t('planner.addressLoading')
        : (dropoffAddress ?? t('planner.locationSelected'))

  const inner = (
    <>
      {uiState === 'idle' && (
        <>
          {!embedded && (
            <>
              <p className="text-lg font-semibold text-foreground">{t('planner.idleTitle')}</p>
              <p className="text-sm text-foreground/80">
                {t('planner.idleBody')}
              </p>
              <p className="text-sm text-muted-foreground">{t('planner.idleMapHint')}</p>
            </>
          )}
          <button
            type="button"
            onClick={onChooseMap}
            disabled={confirmTripPending}
            className={`w-full ${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} bg-info text-info-foreground text-sm font-bold shadow-floating hover:bg-info/90 transition-opacity disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:shadow-none disabled:pointer-events-none touch-manipulation`}
          >
            {embedded ? t('planner.choosePickupMapEmbedded') : t('planner.choosePickupMap')}
          </button>
        </>
      )}

      {uiState === 'planning' && (
        <>
          {!embedded && <p className="text-base font-semibold text-foreground">{t('planner.routeTitle')}</p>}
          {(embedded ? hasPickup && hasDropoff : true) ? (
            <p className={`${INFO_BOX_BODY_COMPACT} font-medium text-foreground leading-snug`}>
              <span className="text-foreground/75">{pickupLine}</span>
              <span className="mx-1.5 text-foreground/50">→</span>
              <span className="text-foreground">{dropLine}</span>
            </p>
          ) : null}
          <div className="flex flex-col gap-2 pt-1">
            {hasPickup && !hasDropoff && !embedded && (
              <button
                type="button"
                onClick={onSetDestinationHint}
                className={`w-full ${BTN_SECONDARY_RADIUS} border border-border bg-muted/50 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors`}
              >
                {t('planner.tapMapForDestination')}
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              disabled={confirmTripPending}
              className={`w-full ${BTN_SECONDARY}`}
            >
              {t('planner.reset')}
            </button>
          </div>
        </>
      )}

      {uiState === 'confirming' && (
        <>
          {!embedded && <p className={INFO_BOX_TITLE_COMPACT}>{t('planner.confirmTripTitle')}</p>}
          <p className={`${INFO_BOX_BODY_COMPACT} font-medium text-foreground leading-snug`}>
            <span className="text-foreground/80">{pickupAddress ?? '—'}</span>
            <span className="mx-1.5 text-foreground/45">→</span>
            <span className="text-foreground">{dropoffAddress ?? '—'}</span>
          </p>
          <div className="flex items-center gap-2 text-xs text-foreground/80 min-h-[1rem]">
            {routeMetaLoading ? (
              <span>{t('planner.calculatingRoute')}</span>
            ) : routeMeta ? (
              <>
                <span className="font-medium">{formatDistance(routeMeta.distanceM)}</span>
                <span className="text-foreground/50">·</span>
                <span className="font-medium">{formatEta(routeMeta.durationSec)}</span>
              </>
            ) : (
              <span>{t('planner.routeUnavailable')}</span>
            )}
          </div>
          <p
            className="text-xs text-foreground/60 leading-snug"
            data-testid="passenger-payment-disclosure-confirming"
          >
            {t('planner.paymentMockShort')}
          </p>
          {confirmBlockedReason ? (
            <div
              className={`${BTN_SECONDARY_RADIUS} border border-warning/50 bg-warning/15 px-2 py-1.5 text-xs text-foreground leading-snug`}
              role="status"
              data-testid="passenger-confirm-blocked-hint"
            >
              {confirmBlockedReason}
            </div>
          ) : null}
          <div className="flex flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={onConfirmTrip}
              disabled={confirmTripPending || routeMetaLoading || Boolean(confirmBlockedReason)}
              className={`flex-1 ${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} bg-success text-success-foreground px-3 text-sm font-semibold shadow-md hover:bg-success/90 transition-opacity disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed touch-manipulation`}
            >
              {confirmTripPending ? t('planner.confirming') : t('planner.confirmTrip')}
            </button>
            {onEditDestination ? (
              <button
                type="button"
                onClick={onEditDestination}
                disabled={confirmTripPending}
                className={`${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} border border-border bg-muted/40 px-3 text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 touch-manipulation`}
              >
                {t('planner.edit')}
              </button>
            ) : null}
          </div>
        </>
      )}

      {uiState === 'searching' && (
        <div className="flex flex-col items-center gap-3 py-2">
          <Spinner size="lg" />
          <p className="text-base font-semibold text-foreground text-center">{t('planner.searchingTitle')}</p>
          <p className="text-sm text-foreground/75 text-center">
            {activeTrip
              ? t('planner.searchingTrip', { id: activeTrip.trip_id.slice(0, 8) })
              : t('planner.searchingSending')}
          </p>
          <p
            className="text-xs text-foreground/65 text-center max-w-sm px-3 leading-snug"
            data-testid="passenger-payment-disclosure-searching"
          >
            {passengerPaymentDisclosureSearching()}
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
          {!inTripSuppressEstadoEcho ? (
            <p className="text-sm text-foreground/85">
              {t('trip:stateLine', {
                status: passengerTripStatusLabel(activeTrip.status),
              })}
            </p>
          ) : null}
          {inTripPaymentLine && !inTripSuppressPaymentEcho && !inTripSuppressMetaEcho ? (
            <p className="text-sm text-foreground/80">
              {t('trip:paymentLine', { status: inTripPaymentLine })}
            </p>
          ) : null}
          {driverTrackingHint && !inTripSuppressMetaEcho ? (
            <p className="text-sm text-foreground font-medium pt-0.5" aria-live="polite">
              {driverTrackingHint}
            </p>
          ) : null}
          {tripPollHint && !inTripSuppressMetaEcho ? (
            <p className="text-xs text-foreground/60 pt-0.5" aria-live="polite">
              {tripPollHint}
            </p>
          ) : null}
          {!inTripSuppressEstadoEcho ? (
            <p className="text-sm text-foreground/80 pt-0.5">{t('planner.followMapHint')}</p>
          ) : null}
        </div>
      )}
    </>
  )

  if (embedded) {
    return (
      <div className={MAP_SHEET_GAP} aria-label={t('planner.ariaLabel')}>
        {inner}
      </div>
    )
  }

  return (
    <section
      className={`${SURFACE_RADIUS} border px-3 py-3 ${MAP_SHEET_GAP} transition-all duration-300 ease-out ${panelSurface} ${emphasisWrap}`}
      aria-label={t('planner.ariaLabel')}
    >
      {inner}
    </section>
  )
}

export const TripPlannerPanel = memo(TripPlannerPanelInner)
TripPlannerPanel.displayName = 'TripPlannerPanel'
