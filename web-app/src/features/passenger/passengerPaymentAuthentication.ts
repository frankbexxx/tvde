import type { TripDetailResponse } from '../../api/trips'

/** True when passenger must complete Stripe SCA before driver can capture (STRIPE-LIVE-01). */
export function isPaymentAuthenticationRequired(
  trip: TripDetailResponse | null | undefined
): boolean {
  if (!trip) return false
  return (
    trip.status === 'ongoing' &&
    trip.payment_status === 'processing' &&
    trip.payment_intent_status === 'requires_action'
  )
}
