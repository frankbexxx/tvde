/** Links read-only para o Stripe Dashboard (W2-D). Sem segredos. */

export function stripePaymentIntentDashboardUrls(paymentIntentId: string): {
  live: string
  test: string
} | null {
  const pi = paymentIntentId.trim()
  if (!pi.startsWith('pi_')) return null
  const enc = encodeURIComponent(pi)
  return {
    live: `https://dashboard.stripe.com/payments/${enc}`,
    test: `https://dashboard.stripe.com/test/payments/${enc}`,
  }
}
