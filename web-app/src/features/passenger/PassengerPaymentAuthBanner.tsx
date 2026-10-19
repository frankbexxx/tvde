import { useTranslation } from 'react-i18next'
import { BTN_SECONDARY_RADIUS } from '../../components/layout/infoBoxTemplate'

/** Phase 1: notice only — Stripe handleNextAction in a later phase. */
export function PassengerPaymentAuthBanner() {
  const { t } = useTranslation('passenger')
  return (
    <div
      className={`${BTN_SECONDARY_RADIUS} border border-warning/50 bg-warning/15 px-2.5 py-2`}
      role="status"
      data-testid="passenger-payment-auth-banner"
    >
      <p className="text-sm font-semibold text-foreground break-words">
        {t('payments.authRequiredBanner')}
      </p>
    </div>
  )
}
