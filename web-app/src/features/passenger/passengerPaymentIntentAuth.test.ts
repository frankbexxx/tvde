import { describe, expect, it, vi } from 'vitest'
import type { TripDetailResponse } from '../../api/trips'
import {
  isPaymentAuthenticationRequired,
  runPaymentIntentHandleNextAction,
  shouldShowPassengerPaymentAuthPrompt,
  shouldShowPassengerPaymentAuthSuccess,
} from './passengerPaymentIntentAuth'

function trip(partial: Partial<TripDetailResponse>): TripDetailResponse {
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
    ...partial,
  } as TripDetailResponse
}

describe('shouldShowPassengerPaymentAuthPrompt', () => {
  it('is true for requires_action with client secret', () => {
    expect(
      shouldShowPassengerPaymentAuthPrompt(
        trip({
          payment_intent_status: 'requires_action',
          payment_intent_client_secret: 'pi_test_secret',
        })
      )
    ).toBe(true)
  })

  it('is false without client secret', () => {
    expect(
      shouldShowPassengerPaymentAuthPrompt(
        trip({ payment_intent_status: 'requires_action', payment_intent_client_secret: null })
      )
    ).toBe(false)
  })

  it('is false for requires_capture', () => {
    expect(
      shouldShowPassengerPaymentAuthPrompt(
        trip({
          payment_intent_status: 'requires_capture',
          payment_intent_client_secret: 'pi_test_secret',
        })
      )
    ).toBe(false)
  })

  it('is false for succeeded', () => {
    expect(
      shouldShowPassengerPaymentAuthPrompt(
        trip({
          payment_intent_status: 'succeeded',
          payment_intent_client_secret: 'pi_test_secret',
        })
      )
    ).toBe(false)
  })
})

describe('shouldShowPassengerPaymentAuthSuccess', () => {
  it('is true when poll shows requires_capture', () => {
    expect(
      shouldShowPassengerPaymentAuthSuccess(
        trip({ payment_intent_status: 'requires_capture' }),
        false
      )
    ).toBe(true)
  })

  it('is true with local flag', () => {
    expect(shouldShowPassengerPaymentAuthSuccess(trip({ payment_intent_status: 'requires_action' }), true)).toBe(
      true
    )
  })
})

describe('isPaymentAuthenticationRequired', () => {
  it('matches prompt visibility', () => {
    expect(
      isPaymentAuthenticationRequired(
        trip({
          payment_intent_status: 'requires_action',
          payment_intent_client_secret: 'sec',
        })
      )
    ).toBe(true)
  })
})

describe('runPaymentIntentHandleNextAction', () => {
  it('calls handleNextAction once with clientSecret', async () => {
    const handleNextAction = vi.fn().mockResolvedValue({
      paymentIntent: { status: 'requires_capture' },
    })
    const stripe = { handleNextAction } as unknown as import('@stripe/stripe-js').Stripe
    const result = await runPaymentIntentHandleNextAction(stripe, 'pi_cs_test')
    expect(handleNextAction).toHaveBeenCalledTimes(1)
    expect(handleNextAction).toHaveBeenCalledWith({ clientSecret: 'pi_cs_test' })
    expect(result).toEqual({ ok: true, status: 'requires_capture' })
  })

  it('returns userMessage on Stripe error', async () => {
    const stripe = {
      handleNextAction: vi.fn().mockResolvedValue({
        error: { message: 'User cancelled authentication.' },
      }),
    } as unknown as import('@stripe/stripe-js').Stripe
    const result = await runPaymentIntentHandleNextAction(stripe, 'pi_cs_test')
    expect(result).toEqual({ ok: false, userMessage: true })
  })
})
