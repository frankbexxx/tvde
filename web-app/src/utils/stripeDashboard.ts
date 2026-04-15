/** Links read-only para o Stripe Dashboard (W2-D). Sem segredos. */

/** IDs de fixture / mock que não têm página útil no Stripe. */
export function isStripeDashboardPaymentIntentId(paymentIntentId: string): boolean {
  const pi = paymentIntentId.trim()
  if (!pi.startsWith('pi_')) return false
  if (pi.toLowerCase().includes('mock')) return false
  if (pi === 'pi_test_123') return false
  return true
}

export function stripePaymentIntentDashboardUrls(paymentIntentId: string): {
  live: string
  test: string
} | null {
  const pi = paymentIntentId.trim()
  if (!isStripeDashboardPaymentIntentId(pi)) return null
  const enc = encodeURIComponent(pi)
  return {
    live: `https://dashboard.stripe.com/payments/${enc}`,
    test: `https://dashboard.stripe.com/test/payments/${enc}`,
  }
}
