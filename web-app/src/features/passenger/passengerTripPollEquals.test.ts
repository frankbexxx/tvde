import { describe, expect, it } from 'vitest'
import {
  passengerTripPollEquals,
  selectPassengerPollForTrip,
  type PassengerTripPollResult,
} from './passengerTripPollEquals'
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
      tripId: 't1',
      notFound: false,
      trip: baseTrip({
        updated_at: 'a',
        driver_location: { lat: 1, lng: 2, timestamp: 1 },
      }),
    }
    const b: PassengerTripPollResult = {
      tripId: 't1',
      notFound: false,
      trip: baseTrip({
        updated_at: 'b',
        driver_location: { lat: 9, lng: 9, timestamp: 9 },
      }),
    }
    expect(passengerTripPollEquals(a, b)).toBe(true)
  })

  it('returns false when status changes', () => {
    const a: PassengerTripPollResult = { tripId: 't1', notFound: false, trip: baseTrip({ status: 'accepted' }) }
    const b: PassengerTripPollResult = { tripId: 't1', notFound: false, trip: baseTrip({ status: 'ongoing' }) }
    expect(passengerTripPollEquals(a, b)).toBe(false)
  })

  it('returns false when notFound differs', () => {
    const t = baseTrip()
    expect(
      passengerTripPollEquals(
        { tripId: 't1', notFound: false, trip: t },
        { tripId: 't1', notFound: true, trip: null }
      )
    ).toBe(false)
  })

  it('returns false when the polled trip id differs', () => {
    expect(
      passengerTripPollEquals(
        { tripId: 't1', notFound: true, trip: null },
        { tripId: 't2', notFound: true, trip: null }
      )
    ).toBe(false)
  })

  it('returns false when driver_rating changes', () => {
    const a: PassengerTripPollResult = {
      tripId: 't1',
      notFound: false,
      trip: baseTrip({ status: 'completed', driver_rating: null }),
    }
    const b: PassengerTripPollResult = {
      tripId: 't1',
      notFound: false,
      trip: baseTrip({ status: 'completed', driver_rating: 5 }),
    }
    expect(passengerTripPollEquals(a, b)).toBe(false)
  })
})

describe('selectPassengerPollForTrip (G4 stale poll)', () => {
  it('ignores a cancelled poll of the previous trip after switching active trip', () => {
    const stale: PassengerTripPollResult = {
      tripId: 't1',
      notFound: false,
      trip: baseTrip({ trip_id: 't1', status: 'cancelled' }),
    }
    expect(selectPassengerPollForTrip(stale, 't2')).toEqual({ trip: null, notFound: false })
  })

  it('ignores a 404 of the previous trip so it cannot clear the active trip', () => {
    const stale: PassengerTripPollResult = { tripId: 't1', notFound: true, trip: null }
    expect(selectPassengerPollForTrip(stale, 't2').notFound).toBe(false)
  })

  it('ignores a body whose trip_id does not match even when tripId matches', () => {
    const odd: PassengerTripPollResult = {
      tripId: 't2',
      notFound: false,
      trip: baseTrip({ trip_id: 't1', status: 'cancelled' }),
    }
    expect(selectPassengerPollForTrip(odd, 't2').trip).toBeNull()
  })

  it('passes through data for the active trip', () => {
    const trip = baseTrip({ trip_id: 't2', status: 'requested' })
    const poll: PassengerTripPollResult = { tripId: 't2', notFound: false, trip }
    expect(selectPassengerPollForTrip(poll, 't2')).toEqual({ trip, notFound: false })
    expect(selectPassengerPollForTrip({ tripId: 't2', notFound: true, trip: null }, 't2').notFound).toBe(
      true
    )
  })

  it('returns nothing without an active trip', () => {
    const poll: PassengerTripPollResult = { tripId: 't1', notFound: false, trip: baseTrip() }
    expect(selectPassengerPollForTrip(poll, null)).toEqual({ trip: null, notFound: false })
    expect(selectPassengerPollForTrip(null, 't1')).toEqual({ trip: null, notFound: false })
  })
})
