import { describe, expect, it } from 'vitest'
import {
  driverActiveTripUi,
  mergePassengerPolledWithPending,
  passengerTripStatusLabel,
  tripDetailFromCreateResponse,
} from './tripStatus'
import type { TripDetailResponse } from '../api/trips'

describe('unknown / incomplete data — UI helpers stay safe', () => {
  it('driverActiveTripUi falls back for unknown status', () => {
    const u = driverActiveTripUi('totally_unknown')
    expect(u.label).toBe('totally_unknown')
    expect(u.variant).toBe('idle')
  })

  it('passengerTripStatusLabel echoes unknown token', () => {
    expect(passengerTripStatusLabel('weird')).toBe('weird')
  })

  it('mergePassengerPolledWithPending handles trip with only required fields', () => {
    const minimal: TripDetailResponse = {
      trip_id: 'x',
      status: 'ongoing',
      passenger_id: '',
      origin_lat: 0,
      origin_lng: 0,
      destination_lat: 0,
      destination_lng: 0,
      estimated_price: 0,
      created_at: 'a',
      updated_at: 'b',
    }
    const pending = tripDetailFromCreateResponse(
      { trip_id: 'x', status: 'requested', estimated_price: 1, eta: 1 },
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 }
    )
    const merged = mergePassengerPolledWithPending(minimal, pending, 'x')
    expect(merged).not.toBeNull()
    expect(merged!.trip_id).toBe('x')
    expect(merged!.status).toBe('ongoing')
  })
})
