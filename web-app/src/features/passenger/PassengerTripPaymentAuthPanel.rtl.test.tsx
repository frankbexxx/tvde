import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import type { TripDetailResponse } from '../../api/trips'
import { PassengerTripPaymentAuthPanel } from './PassengerTripPaymentAuthPanel'
import * as authModule from './passengerPaymentIntentAuth'

function wrap(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

vi.mock('./passengerPaymentIntentAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof authModule>()
  return {
    ...actual,
    runPaymentIntentHandleNextAction: vi.fn(),
  }
})

function trip(over: Partial<TripDetailResponse> = {}): TripDetailResponse {
  return {
    trip_id: 't1',
    status: 'ongoing',
    passenger_id: 'p1',
    origin_lat: 0,
    origin_lng: 0,
    destination_lat: 1,
    destination_lng: 1,
    estimated_price: 4.5,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    payment_status: 'processing',
    payment_intent_status: 'requires_action',
    payment_intent_client_secret: 'pi_test_client_secret_value',
    ...over,
  } as TripDetailResponse
}

const stripeResolved = Promise.resolve({ handleNextAction: vi.fn() } as unknown as import('@stripe/stripe-js').Stripe)

describe('PassengerTripPaymentAuthPanel', () => {
  beforeEach(() => {
    vi.mocked(authModule.runPaymentIntentHandleNextAction).mockReset()
  })

  it('shows CTA for requires_action + secret', () => {
    wrap(
      <PassengerTripPaymentAuthPanel trip={trip()} stripePromise={stripeResolved} onPollRefresh={vi.fn()} />
    )
    expect(screen.getByTestId('passenger-payment-auth-banner')).toBeInTheDocument()
    expect(screen.getByTestId('passenger-payment-auth-cta')).toHaveTextContent(/Autenticar pagamento/i)
  })

  it('success: calls Stripe once and shows success copy', async () => {
    vi.mocked(authModule.runPaymentIntentHandleNextAction).mockResolvedValue({
      ok: true,
      status: 'requires_capture',
    })
    const onPollRefresh = vi.fn()
    wrap(
      <PassengerTripPaymentAuthPanel trip={trip()} stripePromise={stripeResolved} onPollRefresh={onPollRefresh} />
    )
    fireEvent.click(screen.getByTestId('passenger-payment-auth-cta').closest('button')!)
    await waitFor(() => {
      expect(authModule.runPaymentIntentHandleNextAction).toHaveBeenCalledTimes(1)
      expect(onPollRefresh).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('passenger-payment-auth-success')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('passenger-payment-auth-cta')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('pi_test_client_secret_value')
  })

  it('error: human message and retry', async () => {
    vi.mocked(authModule.runPaymentIntentHandleNextAction).mockResolvedValue({
      ok: false,
      userMessage: true,
    })
    wrap(
      <PassengerTripPaymentAuthPanel trip={trip()} stripePromise={stripeResolved} onPollRefresh={vi.fn()} />
    )
    fireEvent.click(screen.getByTestId('passenger-payment-auth-cta').closest('button')!)
    await waitFor(() => {
      expect(screen.getByTestId('passenger-payment-auth-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('passenger-payment-auth-cta').closest('button')).not.toBeDisabled()
  })

  it('disables CTA while authenticating', async () => {
    let resolveAuth!: (v: authModule.PaymentIntentAuthRunResult) => void
    vi.mocked(authModule.runPaymentIntentHandleNextAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAuth = resolve
        })
    )
    wrap(
      <PassengerTripPaymentAuthPanel trip={trip()} stripePromise={stripeResolved} onPollRefresh={vi.fn()} />
    )
    fireEvent.click(screen.getByTestId('passenger-payment-auth-cta').closest('button')!)
    await waitFor(() => {
      expect(screen.getByTestId('passenger-payment-auth-cta').closest('button')).toBeDisabled()
    })
    fireEvent.click(screen.getByTestId('passenger-payment-auth-cta').closest('button')!)
    expect(authModule.runPaymentIntentHandleNextAction).toHaveBeenCalledTimes(1)
    resolveAuth({ ok: true, status: 'requires_capture' })
    await waitFor(() => {
      expect(screen.getByTestId('passenger-payment-auth-success')).toBeInTheDocument()
    })
  })

  it('requires_capture from poll shows success without CTA', () => {
    wrap(
      <PassengerTripPaymentAuthPanel
        trip={trip({ payment_intent_status: 'requires_capture', payment_intent_client_secret: null })}
        stripePromise={stripeResolved}
        onPollRefresh={vi.fn()}
      />
    )
    expect(screen.getByTestId('passenger-payment-auth-success')).toBeInTheDocument()
    expect(screen.queryByTestId('passenger-payment-auth-cta')).not.toBeInTheDocument()
  })

  it('succeeded does not show auth UI', () => {
    wrap(
      <PassengerTripPaymentAuthPanel
        trip={trip({ payment_intent_status: 'succeeded', payment_intent_client_secret: null })}
        stripePromise={stripeResolved}
        onPollRefresh={vi.fn()}
      />
    )
    expect(screen.queryByTestId('passenger-payment-auth-banner')).not.toBeInTheDocument()
    expect(screen.queryByTestId('passenger-payment-auth-success')).not.toBeInTheDocument()
  })
})
