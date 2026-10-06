import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { loadStripe } from '@stripe/stripe-js'
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { toast } from 'sonner'
import {
  createPaymentSetupIntent,
  deletePaymentMethod,
  formatPaymentMethodLabel,
  listPaymentMethods,
  registerPaymentMethodFromSetupIntent,
  setDefaultPaymentMethod,
  type PassengerPaymentMethod,
} from '../../api/payments'
import {
  BTN_COMPACT_HEIGHT,
  BTN_PRIMARY_RADIUS,
  BTN_SECONDARY,
  BTN_SECONDARY_RADIUS,
  INFO_BOX_BODY_COMPACT,
  INFO_BOX_TITLE_COMPACT,
  MAP_SHEET_GAP,
} from '../../components/layout/infoBoxTemplate'

type Props = {
  token: string
  onChanged?: () => void
}

function AddCardInner({
  token,
  clientSecret,
  setupIntentId,
  onDone,
  onCancel,
}: {
  token: string
  clientSecret: string
  setupIntentId: string
  onDone: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation('passenger')
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!stripe || !elements) return
      const card = elements.getElement(CardElement)
      if (!card) return
      setBusy(true)
      try {
        const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: { card },
        })
        if (error) {
          toast.error(error.message ?? t('payments.addFailed'))
          return
        }
        const sid = setupIntent?.id || setupIntentId
        if (setupIntent && setupIntent.status !== 'succeeded') {
          toast.message(t('payments.scaRequired'))
          return
        }
        await registerPaymentMethodFromSetupIntent(token, sid)
        toast.success(t('payments.cardSaved'))
        onDone()
      } catch {
        toast.error(t('payments.addFailed'))
      } finally {
        setBusy(false)
      }
    },
    [stripe, elements, clientSecret, setupIntentId, token, onDone, t]
  )

  return (
    <form onSubmit={(ev) => void submit(ev)} className={MAP_SHEET_GAP} data-testid="passenger-add-card-form">
      <div className={`${BTN_SECONDARY_RADIUS} border border-border bg-background px-2 py-2`}>
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!stripe || busy}
          className={`flex-1 ${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 touch-manipulation`}
        >
          {busy ? t('payments.saving') : t('payments.saveCard')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={`flex-1 min-w-0 ${BTN_SECONDARY}`}
        >
          {t('preview.clear')}
        </button>
      </div>
    </form>
  )
}

export function PassengerPaymentMethodsPanel({ token, onChanged }: Props) {
  const { t } = useTranslation('passenger')
  const [methods, setMethods] = useState<PassengerPaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [setup, setSetup] = useState<{ clientSecret: string; setupIntentId: string } | null>(null)
  const isMock = import.meta.env.VITE_STRIPE_MOCK === 'true'
  const publishable =
    typeof import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'string'
      ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.trim()
      : ''

  const stripePromise = useMemo(() => {
    if (!publishable || isMock) return null
    return loadStripe(publishable)
  }, [publishable, isMock])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setMethods(await listPaymentMethods(token))
    } catch {
      toast.error(t('payments.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const startAdd = async () => {
    try {
      const si = await createPaymentSetupIntent(token)
      if (isMock || si.client_secret.endsWith('_secret_mock')) {
        await registerPaymentMethodFromSetupIntent(token, si.setup_intent_id)
        toast.success(t('payments.cardSaved'))
        await reload()
        onChanged?.()
        return
      }
      setSetup({ clientSecret: si.client_secret, setupIntentId: si.setup_intent_id })
      setAdding(true)
    } catch {
      toast.error(t('payments.addFailed'))
    }
  }

  return (
    <div className="space-y-2" data-testid="passenger-payments-panel">
      <p className={INFO_BOX_TITLE_COMPACT}>{t('payments.title')}</p>
      <p className={`${INFO_BOX_BODY_COMPACT} text-muted-foreground`}>{t('payments.subtitle')}</p>
      {loading ? (
        <p className="text-xs text-muted-foreground">{t('payments.loading')}</p>
      ) : methods.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('payments.empty')}</p>
      ) : (
        <ul className="space-y-1.5">
          {methods.map((m) => (
            <li
              key={m.id}
              className={`${BTN_SECONDARY_RADIUS} border border-border bg-card px-2.5 py-2 flex flex-col gap-1.5`}
              data-testid="passenger-payment-method-row"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {formatPaymentMethodLabel(m)}
                </span>
                {m.is_default ? (
                  <span className="text-[10px] font-semibold uppercase text-success">
                    {t('payments.defaultBadge')}
                  </span>
                ) : null}
              </div>
              <div className="flex gap-2">
                {!m.is_default ? (
                  <button
                    type="button"
                    className={`flex-1 ${BTN_COMPACT_HEIGHT} ${BTN_SECONDARY_RADIUS} border border-border text-xs font-semibold touch-manipulation`}
                    onClick={() => {
                      void setDefaultPaymentMethod(token, m.id)
                        .then(() => reload())
                        .then(() => onChanged?.())
                        .catch(() => toast.error(t('payments.setDefaultFailed')))
                    }}
                  >
                    {t('payments.setDefault')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`flex-1 ${BTN_COMPACT_HEIGHT} ${BTN_SECONDARY_RADIUS} border border-destructive/40 text-xs font-semibold text-destructive touch-manipulation`}
                  onClick={() => {
                    void deletePaymentMethod(token, m.id)
                      .then(() => reload())
                      .then(() => onChanged?.())
                      .catch((err: { detail?: string }) => {
                        toast.error(
                          err?.detail === 'payment_method_in_use'
                            ? t('payments.inUse')
                            : t('payments.removeFailed')
                        )
                      })
                  }}
                >
                  {t('payments.remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && setup && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret }}>
          <AddCardInner
            token={token}
            clientSecret={setup.clientSecret}
            setupIntentId={setup.setupIntentId}
            onDone={() => {
              setAdding(false)
              setSetup(null)
              void reload().then(() => onChanged?.())
            }}
            onCancel={() => {
              setAdding(false)
              setSetup(null)
            }}
          />
        </Elements>
      ) : (
        <button
          type="button"
          data-testid="passenger-payments-add"
          onClick={() => void startAdd()}
          className={`w-full ${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} bg-primary text-sm font-semibold text-primary-foreground touch-manipulation`}
        >
          {t('payments.addCard')}
        </button>
      )}
    </div>
  )
}
