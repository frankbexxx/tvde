import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PaymentStatus } from '../../api/trips'
import { paymentStatusLabel } from '../../constants/tripStatusLabels'
import {
  BTN_COMPACT_HEIGHT,
  BTN_PRIMARY_RADIUS,
  INFO_BOX_BODY_COMPACT,
  MAP_SHEET_GAP,
} from './infoBoxTemplate'

export interface TripCompletedOverlayProps {
  paymentStatus?: PaymentStatus | null
  onContinue: () => void
  continueTestId?: string
  children?: ReactNode
  /** Pós-viagem sobre mapa — faixa baixa (TVDE 9). */
  compact?: boolean
}

/** G27 — overlay viagem concluída (motorista): pagamento + Continuar. */
export function TripCompletedOverlay({
  paymentStatus,
  onContinue,
  continueTestId = 'driver-trip-completed-continue',
  children,
}: TripCompletedOverlayProps) {
  const { t } = useTranslation('trip')
  const { t: tc } = useTranslation('common')
  const payLabel =
    paymentStatus && paymentStatus !== 'failed' ? paymentStatusLabel(paymentStatus) : null

  return (
    <div className={MAP_SHEET_GAP} data-testid="trip-completed-overlay">
      {children}
      {paymentStatus === 'failed' ? (
        <p className={`${INFO_BOX_BODY_COMPACT} text-destructive text-center`}>
          {t('completedOverlay.paymentFailed')}
        </p>
      ) : null}
      {payLabel ? (
        <p className={`${INFO_BOX_BODY_COMPACT} text-center`}>
          {t('completedOverlay.payment', { status: payLabel })}
        </p>
      ) : null}
      {paymentStatus === 'processing' ? (
        <p className={`${INFO_BOX_BODY_COMPACT} text-foreground/70 text-center leading-snug`}>
          {t('completedOverlay.processing')}
        </p>
      ) : null}
      <div className="flex justify-center pt-0.5">
        <button
          type="button"
          className={`${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 touch-manipulation`}
          data-testid={continueTestId}
          onClick={onContinue}
        >
          {tc('continue')}
        </button>
      </div>
    </div>
  )
}
