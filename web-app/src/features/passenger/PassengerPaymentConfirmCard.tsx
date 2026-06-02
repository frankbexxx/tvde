import { useCallback, useMemo, useState, type FormEvent } from 'react'
import i18n from '../../i18n'
import { loadStripe } from '@stripe/stripe-js'
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { toast } from 'sonner'
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
  clientSecret: string
  onConfirmed: () => void | Promise<void>
  /** Quando cartão indisponível (mock / sem publishable key) — continuar viagem. */
  onSkip?: () => void | Promise<void>
}

function ConfirmInner({
  clientSecret,
  onConfirmed,
}: Pick<PassengerPaymentConfirmCardProps, 'clientSecret' | 'onConfirmed'>) {
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
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card },
        })
        if (error) {
          toast.error(error.message ?? 'Pagamento recusado.')
          return
        }
        const st = paymentIntent?.status
        if (
          st === 'succeeded' ||
          st === 'requires_capture' ||
          st === 'processing'
        ) {
          toast.success('Cartão autorizado.')
          await onConfirmed()
        } else if (st === 'requires_action') {
          toast.message('Confirmação adicional necessária — segue as instruções do teu banco.')
        } else {
          toast.message(`Estado do pagamento: ${st ?? 'desconhecido'}`)
          await onConfirmed()
        }
      } finally {
        setBusy(false)
      }
    },
    [stripe, elements, clientSecret, onConfirmed]
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
        {busy ? 'A confirmar…' : 'Autorizar cartão'}
      </button>
    </form>
  )
}

/** Stripe Elements para confirmar PI quando ENABLE_CONFIRM_ON_ACCEPT + GET devolve client_secret. */
export function PassengerPaymentConfirmCard({
  clientSecret,
  onConfirmed,
  onSkip,
}: PassengerPaymentConfirmCardProps) {
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
        <p className="font-medium">Pagamento simulado</p>
        <p className="text-muted-foreground leading-snug">Sem cartão real neste ambiente (DEV).</p>
        {onSkip ? (
          <button
            type="button"
            data-testid="passenger-payment-mock-continue"
            onClick={() => void onSkip()}
            className={`w-full ${BTN_COMPACT_HEIGHT} ${BTN_SECONDARY_RADIUS} border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation`}
          >
            Continuar (simulado)
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
        <p className="font-medium">Cartão indisponível</p>
        <p className="text-muted-foreground leading-snug">
          Pagamento por cartão não está configurado neste build. A viagem pode continuar se o backend
          não exigir autorização imediata.
        </p>
        {onSkip ? (
          <button
            type="button"
            data-testid="passenger-payment-skip-unconfigured"
            onClick={() => void onSkip()}
            className={`w-full ${BTN_COMPACT_HEIGHT} ${BTN_SECONDARY_RADIUS} border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation`}
          >
            Continuar sem cartão
          </button>
        ) : null}
      </section>
    )
  }

  return (
    <section className={`${INFO_BOX_PASSENGER} p-2 ${MAP_SHEET_GAP}`} data-testid="passenger-payment-confirm-card">
      <h3 className={INFO_BOX_TITLE_COMPACT}>Autorizar pagamento</h3>
      <p className={INFO_BOX_BODY_COMPACT}>Motorista aceitou — confirma o cartão.</p>
      <Elements
        stripe={stripePromise}
        options={{ clientSecret, locale: i18n.language === 'en' ? 'en' : 'pt' }}
      >
        <ConfirmInner clientSecret={clientSecret} onConfirmed={onConfirmed} />
      </Elements>
    </section>
  )
}
