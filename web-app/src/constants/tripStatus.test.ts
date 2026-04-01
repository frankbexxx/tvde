import { describe, expect, it } from 'vitest'
import {
  tripStateRank,
  isActiveTripStatus,
  isFinalTripStatus,
  isPrePickupStatus,
  mergeDriverPolledWithOverride,
  mergePassengerPolledWithPending,
  tripDetailFromCreateResponse,
} from './tripStatus'
import type { TripDetailResponse } from '../api/trips'

describe('tripStateRank', () => {
  it('orders lifecycle before terminal states', () => {
    expect(tripStateRank('requested')).toBeLessThan(tripStateRank('ongoing'))
    expect(tripStateRank('ongoing')).toBeLessThan(tripStateRank('completed'))
    expect(tripStateRank('unknown')).toBe(-1)
  })
})

describe('isActiveTripStatus / isFinalTripStatus / isPrePickupStatus', () => {
  it('classifies terminal vs active', () => {
    expect(isActiveTripStatus('ongoing')).toBe(true)
    expect(isFinalTripStatus('completed')).toBe(true)
    expect(isPrePickupStatus('requested')).toBe(true)
    expect(isPrePickupStatus('accepted')).toBe(false)
  })
})

describe('mergeDriverPolledWithOverride', () => {
  it('uses override when poll is behind or missing', () => {
    expect(mergeDriverPolledWithOverride(undefined, 'accepted', 'accepted')).toBe('accepted')
    expect(mergeDriverPolledWithOverride('accepted', 'ongoing', 'accepted')).toBe('ongoing')
  })

  it('prefers server when caught up or ahead', () => {
    expect(mergeDriverPolledWithOverride('ongoing', 'accepted', 'accepted')).toBe('ongoing')
    expect(mergeDriverPolledWithOverride('cancelled', 'ongoing', 'accepted')).toBe('cancelled')
  })
})

describe('mergePassengerPolledWithPending', () => {
  const pending = tripDetailFromCreateResponse(
    {
      trip_id: 't1',
      status: 'requested',
      estimated_price: 10,
      eta: 1,
    },
    { lat: 1, lng: 2 },
    { lat: 3, lng: 4 }
  )

  it('shows pending until poll matches or exceeds', () => {
    expect(mergePassengerPolledWithPending(null, pending, 't1')).toEqual(pending)
    const polled = { ...pending, status: 'requested' as const }
    expect(mergePassengerPolledWithPending(polled, pending, 't1')).toBe(polled)
  })

  it('ignores pending for wrong trip id', () => {
    const polled: TripDetailResponse = { ...pending, trip_id: 'other', status: 'ongoing' }
    expect(mergePassengerPolledWithPending(polled, pending, 'other')).toBe(polled)
  })
})

describe('tripDetailFromCreateResponse', () => {
  it('builds a minimal TripDetailResponse', () => {
    const d = tripDetailFromCreateResponse(
      { trip_id: 'x', status: 'requested', estimated_price: 5, eta: 2 },
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 }
    )
    expect(d.trip_id).toBe('x')
    expect(d.status).toBe('requested')
    expect(d.origin_lat).toBe(1)
    expect(d.destination_lat).toBe(2)
  })
})
