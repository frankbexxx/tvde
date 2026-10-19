import { describe, expect, it } from 'vitest'
import type { TripDetailResponse } from '../../api/trips'
import { isPaymentAuthenticationRequired } from './passengerPaymentAuthentication'

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

describe('isPaymentAuthenticationRequired', () => {
  it('is true for ongoing + processing + requires_action', () => {
    expect(
      isPaymentAuthenticationRequired(
        trip({ payment_intent_status: 'requires_action' })
      )
    ).toBe(true)
  })

  it('is false for requires_capture', () => {
    expect(
      isPaymentAuthenticationRequired(
        trip({ payment_intent_status: 'requires_capture' })
      )
    ).toBe(false)
  })

  it('is false when trip not ongoing', () => {
    expect(
      isPaymentAuthenticationRequired(
        trip({ status: 'accepted', payment_intent_status: 'requires_action' })
      )
    ).toBe(false)
  })
})
