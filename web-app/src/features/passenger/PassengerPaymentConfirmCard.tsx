import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { toast } from 'sonner'

type PassengerPaymentConfirmCardProps = {
  clientSecret: string
  onConfirmed: () => void | Promise<void>
}

function ConfirmInner({
  clientSecret,
  onConfirmed,
}: PassengerPaymentConfirmCardProps) {
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
    <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-3">
      <div className="rounded-lg border border-border bg-background px-3 py-3">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || busy}
        data-testid="passenger-payment-confirm-submit"
        className="w-full min-h-[44px] rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50"
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
        className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground"
      >
        <p className="font-medium">Pagamento simulado</p>
        <p className="mt-1 text-muted-foreground leading-snug">
          Stripe está em modo mock — não é preciso introduzir cartão neste ambiente.
        </p>
      </section>
    )
  }

  if (!publishable || !stripePromise) {
    return (
      <section
        data-testid="passenger-payment-missing-publishable"
        className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-foreground"
      >
        <p className="font-medium">Confirmação de cartão indisponível</p>
        <p className="mt-1 text-muted-foreground leading-snug">
          Define <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_STRIPE_PUBLISHABLE_KEY</code>{' '}
          no build para autorizar o pagamento aqui.
        </p>
      </section>
    )
  }

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
      data-testid="passenger-payment-confirm-card"
    >
      <h3 className="text-base font-semibold text-foreground">Autorizar pagamento</h3>
      <p className="mt-1 text-sm text-muted-foreground leading-snug">
        O motorista aceitou a viagem. Confirma o cartão para continuar.
      </p>
      <div className="mt-4">
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <ConfirmInner clientSecret={clientSecret} onConfirmed={onConfirmed} />
        </Elements>
      </div>
    </section>
  )
}
