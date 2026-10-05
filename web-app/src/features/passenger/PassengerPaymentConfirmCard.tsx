import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import { loadStripe } from '@stripe/stripe-js'
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { toast } from 'sonner'
import { attachTripPaymentMethod } from '../../api/trips'
import {
  BTN_COMPACT_HEIGHT,
  BTN_PRIMARY_RADIUS,
  BTN_SECONDARY_RADIUS,
  INFO_BOX_BODY_COMPACT,
  INFO_BOX_PASSENGER,
  INFO_BOX_TITLE_COMPACT,
  MAP_SHEET_GAP,
} from '../../components/layout/infoBoxTemplate'

type PassengerPaymentConfirmCardProps = {
  tripId: string
  clientSecret: string
  token: string
  onConfirmed: () => void | Promise<void>
  /** Quando cartão indisponível (mock / sem publishable key) — continuar viagem. */
  onSkip?: () => void | Promise<void>
}

function ConfirmInner({
  tripId,
  clientSecret,
  token,
  onConfirmed,
}: Pick<
  PassengerPaymentConfirmCardProps,
  'tripId' | 'clientSecret' | 'token' | 'onConfirmed'
>) {
  const { t } = useTranslation('passenger')
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!stripe || !elements) return
      const card = elements.getElement(CardElement)
      if (!card) return
      setBusy(true)
      try {
        // Attach PaymentMethod without confirming the €0.50 placeholder.
        // Confirm+capture happen at trip complete with the final amount (SCA then if needed).
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card,
        })
        if (pmError || !paymentMethod?.id) {
          toast.error(pmError?.message ?? t('paymentConfirm.declined'))
          return
        }
        await attachTripPaymentMethod(tripId, paymentMethod.id, token)

        // If Stripe already asked for SCA on a prior confirm attempt, finish it.
        const { error: actionError, paymentIntent } = await stripe.retrievePaymentIntent(
          clientSecret
        )
        if (!actionError && paymentIntent?.status === 'requires_action') {
          const { error: handleError, paymentIntent: after } =
            await stripe.confirmCardPayment(clientSecret)
          if (handleError) {
            toast.error(handleError.message ?? t('paymentConfirm.extraAuthRequired'))
            return
          }
          const st = after?.status
          if (st === 'requires_action') {
            toast.message(t('paymentConfirm.extraAuthRequired'))
            return
          }
        }

        toast.success(t('paymentConfirm.cardAuthorized'))
        await onConfirmed()
      } catch {
        toast.error(t('paymentConfirm.attachFailed'))
      } finally {
        setBusy(false)
      }
    },
    [stripe, elements, clientSecret, tripId, token, onConfirmed, t]
  )

  return (
    <form onSubmit={(ev) => void handleSubmit(ev)} className={MAP_SHEET_GAP}>
      <div className={`${BTN_SECONDARY_RADIUS} border border-border bg-background px-2 py-2`}>
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || busy}
        data-testid="passenger-payment-confirm-submit"
        className={`w-full ${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} bg-primary text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50 touch-manipulation`}
      >
        {busy ? t('paymentConfirm.confirming') : t('paymentConfirm.authorizeCard')}
      </button>
    </form>
  )
}

/** Stripe Elements: guardar cartão no PaymentIntent (sem confirmar o valor placeholder). */
export function PassengerPaymentConfirmCard({
  tripId,
  clientSecret,
  token,
  onConfirmed,
  onSkip,
}: PassengerPaymentConfirmCardProps) {
  const { t } = useTranslation('passenger')
  const publishable =
    typeof import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'string'
      ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.trim()
      : ''

  const stripePromise = useMemo(() => {
    if (!publishable) return null
    return loadStripe(publishable)
  }, [publishable])

  const isMockSecret =
    clientSecret.endsWith('_secret_mock') ||
    import.meta.env.VITE_STRIPE_MOCK === 'true'

  if (isMockSecret) {
    return (
      <section
        data-testid="passenger-payment-mock-banner"
        className={`${INFO_BOX_PASSENGER} px-2 py-2 ${INFO_BOX_BODY_COMPACT} space-y-2`}
      >
        <p className="font-medium">{t('paymentConfirm.mockTitle')}</p>
        <p className="text-muted-foreground leading-snug">{t('paymentConfirm.mockBody')}</p>
        {onSkip ? (
          <button
            type="button"
            data-testid="passenger-payment-mock-continue"
            onClick={() => void onSkip()}
            className={`w-full ${BTN_COMPACT_HEIGHT} ${BTN_SECONDARY_RADIUS} border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation`}
          >
            {t('paymentConfirm.mockContinue')}
          </button>
        ) : null}
      </section>
    )
  }

  if (!publishable || !stripePromise) {
    return (
      <section
        data-testid="passenger-payment-missing-publishable"
        className={`${INFO_BOX_PASSENGER} border-dashed px-2 py-2 ${INFO_BOX_BODY_COMPACT} space-y-2`}
      >
        <p className="font-medium">{t('paymentConfirm.unavailableTitle')}</p>
        <p className="text-muted-foreground leading-snug">
          {t('paymentConfirm.unavailableBody')}
        </p>
        {onSkip ? (
          <button
            type="button"
            data-testid="passenger-payment-skip-unconfigured"
            onClick={() => void onSkip()}
            className={`w-full ${BTN_COMPACT_HEIGHT} ${BTN_SECONDARY_RADIUS} border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation`}
          >
            {t('paymentConfirm.continueWithoutCard')}
          </button>
        ) : null}
      </section>
    )
  }

  return (
    <section className={`${INFO_BOX_PASSENGER} p-2 ${MAP_SHEET_GAP}`} data-testid="passenger-payment-confirm-card">
      <h3 className={INFO_BOX_TITLE_COMPACT}>{t('paymentConfirm.authorizeTitle')}</h3>
      <p className={INFO_BOX_BODY_COMPACT}>{t('paymentConfirm.authorizeSubtitle')}</p>
      <Elements
        stripe={stripePromise}
        options={{ clientSecret, locale: i18n.language === 'en' ? 'en' : 'pt' }}
      >
        <ConfirmInner
          tripId={tripId}
          clientSecret={clientSecret}
          token={token}
          onConfirmed={onConfirmed}
        />
      </Elements>
    </section>
  )
}
