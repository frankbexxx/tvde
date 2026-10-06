export type CardField = 'number' | 'expiry' | 'cvc'

/** Stripe confirmCardSetup validation codes → field that owns the message. */
export function cardFieldForErrorCode(code: string | undefined): CardField | null {
  if (!code) return null
  if (code.includes('number') || code === 'card_declined_invalid_number') return 'number'
  if (code.includes('expiry')) return 'expiry'
  if (code.includes('cvc')) return 'cvc'
  return null
}
