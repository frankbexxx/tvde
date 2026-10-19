import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Stripe } from '@stripe/stripe-js'
import type { TripDetailResponse } from '../../api/trips'
import { PrimaryActionButton } from '../../components/layout/PrimaryActionButton'
import { BTN_SECONDARY_RADIUS } from '../../components/layout/infoBoxTemplate'
import {
  runPaymentIntentHandleNextAction,
  shouldShowPassengerPaymentAuthPrompt,
  shouldShowPassengerPaymentAuthSuccess,
} from './passengerPaymentIntentAuth'

type Props = {
  trip: TripDetailResponse
  stripePromise: Promise<Stripe | null> | null
  onPollRefresh: () => void
}

export function PassengerTripPaymentAuthPanel({ trip, stripePromise, onPollRefresh }: Props) {
  const { t } = useTranslation('passenger')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [localAuthSucceeded, setLocalAuthSucceeded] = useState(false)
  const inFlightRef = useRef(false)

  const showPrompt = shouldShowPassengerPaymentAuthPrompt(trip)
  const showSuccess = shouldShowPassengerPaymentAuthSuccess(trip, localAuthSucceeded)

  useEffect(() => {
    if (trip.payment_intent_status === 'requires_action') {
      setLocalAuthSucceeded(false)
    }
  }, [trip.payment_intent_status, trip.trip_id])

  useEffect(() => {
    if (
      trip.payment_intent_status === 'requires_capture' ||
      trip.payment_intent_status === 'succeeded'
    ) {
      setLocalAuthSucceeded(false)
      setError(false)
    }
  }, [trip.payment_intent_status])

  const authenticate = useCallback(async () => {
    if (inFlightRef.current || busy) return
    const clientSecret = trip.payment_intent_client_secret?.trim()
    if (!clientSecret || !stripePromise) {
      setError(true)
      return
    }
    inFlightRef.current = true
    setBusy(true)
    setError(false)
    try {
      const stripe = await stripePromise
      if (!stripe) {
        setError(true)
        return
      }
      const result = await runPaymentIntentHandleNextAction(stripe, clientSecret)
      if (!result.ok) {
        setError(true)
        return
      }
      setLocalAuthSucceeded(true)
      setError(false)
      onPollRefresh()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
      inFlightRef.current = false
    }
  }, [busy, onPollRefresh, stripePromise, trip.payment_intent_client_secret])

  if (showSuccess) {
    return (
      <div
        className={`${BTN_SECONDARY_RADIUS} border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2`}
        role="status"
        data-testid="passenger-payment-auth-success"
      >
        <p className="text-sm font-semibold text-foreground break-words">
          {t('payments.authSuccess')}
        </p>
      </div>
    )
  }

  if (!showPrompt) return null

  return (
    <div
      className={`${BTN_SECONDARY_RADIUS} border border-warning/50 bg-warning/15 px-2.5 py-2 space-y-2`}
      role="region"
      aria-labelledby="passenger-payment-auth-title"
      data-testid="passenger-payment-auth-banner"
    >
      <div>
        <p id="passenger-payment-auth-title" className="text-sm font-semibold text-foreground">
          {t('payments.authTitle')}
        </p>
        <p className="text-xs text-foreground/85 leading-snug mt-1">{t('payments.authBody')}</p>
      </div>
      {error ? (
        <p className="text-xs text-destructive leading-snug" role="alert" data-testid="passenger-payment-auth-error">
          {t('payments.authFailed')}
        </p>
      ) : null}
      <PrimaryActionButton
        variant="confirm"
        size="compact"
        className="w-full"
        disabled={busy || !stripePromise}
        onClick={() => void authenticate()}
      >
        <span data-testid="passenger-payment-auth-cta">
          {busy ? t('payments.authOpening') : t('payments.authCta')}
        </span>
      </PrimaryActionButton>
    </div>
  )
}
