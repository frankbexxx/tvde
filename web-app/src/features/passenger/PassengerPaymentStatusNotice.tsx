import { useTranslation } from 'react-i18next'
import { BTN_COMPACT_HEIGHT, BTN_SECONDARY_RADIUS } from '../../components/layout/infoBoxTemplate'

export type PassengerPaymentMethodStatus = 'loading' | 'ready' | 'error'

/** Visible on the main passenger sheet when Stripe is live and no default card is usable. */
export function PassengerPaymentStatusNotice({
  status,
  hasDefault,
  onAddCard,
  onRetry,
}: {
  status: PassengerPaymentMethodStatus
  hasDefault: boolean
  onAddCard: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation('passenger')
  if (status === 'loading' || (status === 'ready' && hasDefault)) return null
  const isError = status === 'error'
  return (
    <div
      className={`${BTN_SECONDARY_RADIUS} border px-2.5 py-2 flex items-center justify-between gap-2 ${
        isError ? 'border-destructive/40 bg-destructive/10' : 'border-warning/50 bg-warning/15'
      }`}
      role={isError ? 'alert' : 'status'}
      data-testid="passenger-payment-status-notice"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground break-words">
          {isError ? t('payments.statusError') : t('payments.none')}
        </p>
        {!isError ? (
          <p className="text-xs text-foreground/80 leading-snug break-words">{t('payments.noneHint')}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={isError ? onRetry : onAddCard}
        className={`${BTN_COMPACT_HEIGHT} shrink-0 ${BTN_SECONDARY_RADIUS} border border-border bg-background px-2.5 text-xs font-semibold touch-manipulation`}
        data-testid="passenger-payment-status-action"
      >
        {isError ? t('payments.retry') : t('payments.addCard')}
      </button>
    </div>
  )
}
