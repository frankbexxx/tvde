import type { StripeElementLocale } from '@stripe/stripe-js'

export function stripeElementsLocale(language: string | undefined): StripeElementLocale {
  return (language ?? '').toLowerCase().startsWith('en') ? 'en' : 'pt'
}
