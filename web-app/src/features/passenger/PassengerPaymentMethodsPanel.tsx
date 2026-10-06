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
import { Spinner } from '../../components/ui/Spinner'
import { stripeElementsLocale } from './stripeLocale'
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

function LoadingLine({ label, testId }: { label: string; testId: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-foreground/80" data-testid={testId} aria-live="polite">
      <Spinner size="sm" />
      <span>{label}</span>
    </div>
  )
}

function AddCardInner({
  token,
  clientSecret,
  setupIntentId,
  onDone,
  onCancel,
  onError,
}: {
  token: string
  clientSecret: string
  setupIntentId: string
  onDone: () => void
  onCancel: () => void
  onError: (message: string | null) => void
}) {
  const { t } = useTranslation('passenger')
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!stripe || !elements) return
      const card = elements.getElement(CardElement)
      if (!card) return
      onError(null)
      setBusy(true)
      try {
        const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: { card },
        })
        if (error) {
          const msg = error.message ?? t('payments.addFailed')
          onError(msg)
          toast.error(msg)
          return
        }
        const sid = setupIntent?.id || setupIntentId
        if (setupIntent && setupIntent.status !== 'succeeded') {
          onError(t('payments.scaRequired'))
          toast.message(t('payments.scaRequired'))
          return
        }
        await registerPaymentMethodFromSetupIntent(token, sid)
        toast.success(t('payments.cardSaved'))
        onDone()
      } catch {
        onError(t('payments.addFailed'))
        toast.error(t('payments.addFailed'))
      } finally {
        setBusy(false)
      }
    },
    [stripe, elements, clientSecret, setupIntentId, token, onDone, onError, t]
  )

  return (
    <form onSubmit={(ev) => void submit(ev)} className={MAP_SHEET_GAP} data-testid="passenger-add-card-form">
      {!ready ? <LoadingLine label={t('payments.opening')} testId="passenger-add-card-loading" /> : null}
      <div className={`${BTN_SECONDARY_RADIUS} border border-border bg-background px-2 py-2`}>
        <CardElement
          options={{ hidePostalCode: true }}
          onReady={() => setReady(true)}
          onLoadError={() => {
            onError(t('payments.formLoadFailed'))
            onCancel()
          }}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!stripe || !ready || busy}
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
  const { t, i18n } = useTranslation('passenger')
  const [methods, setMethods] = useState<PassengerPaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [starting, setStarting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setup, setSetup] = useState<{ clientSecret: string; setupIntentId: string } | null>(null)
  const isMock = import.meta.env.VITE_STRIPE_MOCK === 'true'
  const publishable =
    typeof import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'string'
      ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.trim()
      : ''
  const locale = stripeElementsLocale(i18n.language)

  const stripePromise = useMemo(() => {
    if (!publishable || isMock) return null
    return loadStripe(publishable, { locale })
  }, [publishable, isMock, locale])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setMethods(await listPaymentMethods(token))
      setLoadFailed(false)
    } catch {
      setLoadFailed(true)
      toast.error(t('payments.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const startAdd = async () => {
    if (starting) return
    setError(null)
    setStarting(true)
    try {
      const si = await createPaymentSetupIntent(token)
      if (isMock || si.client_secret.endsWith('_secret_mock')) {
        await registerPaymentMethodFromSetupIntent(token, si.setup_intent_id)
        toast.success(t('payments.cardSaved'))
        await reload()
        onChanged?.()
        return
      }
      if (!stripePromise) {
        setError(t('payments.formLoadFailed'))
        return
      }
      setSetup({ clientSecret: si.client_secret, setupIntentId: si.setup_intent_id })
      setAdding(true)
    } catch {
      setError(t('payments.addFailed'))
      toast.error(t('payments.addFailed'))
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="space-y-2" data-testid="passenger-payments-panel">
      <p className={INFO_BOX_TITLE_COMPACT}>{t('payments.title')}</p>
      <p className={`${INFO_BOX_BODY_COMPACT} text-muted-foreground`}>{t('payments.subtitle')}</p>
      {loading ? (
        <LoadingLine label={t('payments.loading')} testId="passenger-payments-loading" />
      ) : loadFailed ? (
        <div className="space-y-1.5" data-testid="passenger-payments-load-error">
          <p className="text-xs font-medium text-destructive" role="alert">
            {t('payments.loadFailed')}
          </p>
          <button
            type="button"
            onClick={() => void reload()}
            className={`w-full ${BTN_SECONDARY}`}
          >
            {t('payments.retry')}
          </button>
        </div>
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
                      setError(null)
                      void setDefaultPaymentMethod(token, m.id)
                        .then(() => reload())
                        .then(() => onChanged?.())
                        .catch(() => {
                          setError(t('payments.setDefaultFailed'))
                          toast.error(t('payments.setDefaultFailed'))
                        })
                    }}
                  >
                    {t('payments.setDefault')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`flex-1 ${BTN_COMPACT_HEIGHT} ${BTN_SECONDARY_RADIUS} border border-destructive/40 text-xs font-semibold text-destructive touch-manipulation`}
                  onClick={() => {
                    setError(null)
                    void deletePaymentMethod(token, m.id)
                      .then(() => reload())
                      .then(() => onChanged?.())
                      .catch((err: { detail?: string }) => {
                        const msg =
                          err?.detail === 'payment_method_in_use'
                            ? t('payments.inUse')
                            : t('payments.removeFailed')
                        setError(msg)
                        toast.error(msg)
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

      {error ? (
        <p
          className={`${BTN_SECONDARY_RADIUS} border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs font-medium text-destructive leading-snug`}
          role="alert"
          data-testid="passenger-payments-error"
        >
          {error}
        </p>
      ) : null}

      {adding && setup && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret, locale }}>
          <AddCardInner
            token={token}
            clientSecret={setup.clientSecret}
            setupIntentId={setup.setupIntentId}
            onError={setError}
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
          disabled={starting || loading}
          aria-busy={starting}
          className={`w-full ${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-70 touch-manipulation inline-flex items-center justify-center gap-2`}
        >
          {starting ? (
            <>
              <Spinner size="sm" />
              <span>{t('payments.opening')}</span>
            </>
          ) : (
            t('payments.addCard')
          )}
        </button>
      )}
    </div>
  )
}
