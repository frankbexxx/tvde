import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { stripeElementsLocale } from './stripeLocale'

export function usePassengerStripePromise(): Promise<Stripe | null> | null {
  const { i18n } = useTranslation()
  const isMock = import.meta.env.VITE_STRIPE_MOCK === 'true'
  const publishable =
    typeof import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'string'
      ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.trim()
      : ''

  return useMemo(() => {
    if (isMock || !publishable) return null
    return loadStripe(publishable, { locale: stripeElementsLocale(i18n.language) })
  }, [isMock, publishable, i18n.language])
}
