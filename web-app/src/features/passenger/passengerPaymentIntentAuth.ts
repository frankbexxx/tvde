import type { Stripe } from '@stripe/stripe-js'
import type { TripDetailResponse } from '../../api/trips'


/** Show 3DS CTA: ongoing trip, processing payment, PI needs action + secret from poll. */
export function shouldShowPassengerPaymentAuthPrompt(
  trip: TripDetailResponse | null | undefined
): boolean {
  if (!trip) return false
  if (trip.status !== 'ongoing' || trip.payment_status !== 'processing') return false
  if (trip.payment_intent_status !== 'requires_action') return false
  const secret = trip.payment_intent_client_secret?.trim()
  return Boolean(secret)
}

/** After SCA or poll: driver may complete (no re-open 3DS). */
export function shouldShowPassengerPaymentAuthSuccess(
  trip: TripDetailResponse | null | undefined,
  localAuthSucceeded: boolean
): boolean {
  if (localAuthSucceeded) return true
  if (!trip) return false
  if (trip.status !== 'ongoing' || trip.payment_status !== 'processing') return false
  return trip.payment_intent_status === 'requires_capture'
}

export function isPaymentAuthenticationRequired(
  trip: TripDetailResponse | null | undefined
): boolean {
  return shouldShowPassengerPaymentAuthPrompt(trip)
}

export type PaymentIntentAuthRunResult =
  | { ok: true; status: string }
  | { ok: false; userMessage: true }

/** Server-confirmed PI in requires_action — complete SCA on client (Stripe.js v9). */
export async function runPaymentIntentHandleNextAction(
  stripe: Stripe,
  clientSecret: string
): Promise<PaymentIntentAuthRunResult> {
  const { error, paymentIntent } = await stripe.handleNextAction({ clientSecret })
  if (error) {
    return { ok: false, userMessage: true }
  }
  const status = paymentIntent?.status ?? ''
  if (status === 'requires_capture' || status === 'succeeded') {
    return { ok: true, status }
  }
  if (status === 'requires_action') {
    return { ok: false, userMessage: true }
  }
  return { ok: true, status }
}
