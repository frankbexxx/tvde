import { describe, expect, it } from 'vitest'
import { passengerTripPollEquals, type PassengerTripPollResult } from './passengerTripPollEquals'
import type { TripDetailResponse } from '../../api/trips'

function baseTrip(over: Partial<TripDetailResponse> = {}): TripDetailResponse {
  return {
    trip_id: 't1',
    status: 'accepted',
    passenger_id: 'p1',
    origin_lat: 38.7,
    origin_lng: -9.1,
    destination_lat: 38.8,
    destination_lng: -9.2,
    estimated_price: 10,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('passengerTripPollEquals', () => {
  it('returns true when only updated_at and driver_location differ', () => {
    const a: PassengerTripPollResult = {
      notFound: false,
      trip: baseTrip({
        updated_at: 'a',
        driver_location: { lat: 1, lng: 2, timestamp: 1 },
      }),
    }
    const b: PassengerTripPollResult = {
      notFound: false,
      trip: baseTrip({
        updated_at: 'b',
        driver_location: { lat: 9, lng: 9, timestamp: 9 },
      }),
    }
    expect(passengerTripPollEquals(a, b)).toBe(true)
  })

  it('returns false when status changes', () => {
    const a: PassengerTripPollResult = { notFound: false, trip: baseTrip({ status: 'accepted' }) }
    const b: PassengerTripPollResult = { notFound: false, trip: baseTrip({ status: 'ongoing' }) }
    expect(passengerTripPollEquals(a, b)).toBe(false)
  })

  it('returns false when notFound differs', () => {
    const t = baseTrip()
    expect(passengerTripPollEquals({ notFound: false, trip: t }, { notFound: true, trip: null })).toBe(
      false
    )
  })
})
