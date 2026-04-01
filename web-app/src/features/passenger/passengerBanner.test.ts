import { describe, expect, it } from 'vitest'
import type { TripDetailResponse } from '../../api/trips'
import { getPassengerBannerState } from './passengerBanner'
import { passengerTripStatusLabel } from '../../constants/tripStatusLabels'

function minimalTrip(status: TripDetailResponse['status']): TripDetailResponse {
  return {
    trip_id: 't1',
    status,
    passenger_id: 'p1',
    origin_lat: 38.7,
    origin_lng: -9.3,
    destination_lat: 38.71,
    destination_lng: -9.31,
    estimated_price: 8.5,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

const onlineTrip = {
  creating: false,
  activeTripId: 't1',
  activeTripLoading: false,
  isOnline: true,
}

describe('getPassengerBannerState — messaging por estado da viagem', () => {
  it('assigned → Motorista atribuído', () => {
    const b = getPassengerBannerState({
      ...onlineTrip,
      activeTrip: minimalTrip('assigned'),
      uxState: 'DRIVER_ASSIGNED',
    })
    expect(b.label).toBe('Motorista atribuído')
    expect(b.subLabel).toBe(`Estado: ${passengerTripStatusLabel('assigned')}`)
  })

  it('accepted → Motorista a caminho (DRIVER_ASSIGNED branch)', () => {
    const b = getPassengerBannerState({
      ...onlineTrip,
      activeTrip: minimalTrip('accepted'),
      uxState: 'DRIVER_ASSIGNED',
    })
    expect(b.label).toBe('Motorista a caminho')
    expect(b.subLabel).toContain(passengerTripStatusLabel('accepted'))
  })

  it('arriving → texto de motorista quase a chegar', () => {
    const b = getPassengerBannerState({
      ...onlineTrip,
      activeTrip: minimalTrip('arriving'),
      uxState: 'DRIVER_ARRIVING',
    })
    expect(b.label).toBe(passengerTripStatusLabel('arriving'))
    expect(b.subLabel).toContain('Estado:')
  })

  it('ongoing → Viagem em curso', () => {
    const b = getPassengerBannerState({
      ...onlineTrip,
      activeTrip: minimalTrip('ongoing'),
      uxState: 'TRIP_ONGOING',
    })
    expect(b.label).toBe('Viagem em curso')
    expect(b.subLabel).toContain(passengerTripStatusLabel('ongoing'))
  })
})
