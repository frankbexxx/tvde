import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusHeader } from '../../components/layout/StatusHeader'
import { passengerTripStatusLabel } from '../../constants/tripStatusLabels'
import type { TripDetailResponse } from '../../api/trips'
import type { PassengerUxState } from './usePassengerUxState'
import { getPassengerBannerState } from './passengerBanner'

function minimalTrip(status: TripDetailResponse['status']): TripDetailResponse {
  return {
    trip_id: 't1',
    status,
    passenger_id: 'p1',
    origin_lat: 38.7,
    origin_lng: -9.3,
    destination_lat: 38.71,
    destination_lng: -9.31,
    estimated_price: 8,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function renderBanner(uxState: PassengerUxState, activeTrip: TripDetailResponse) {
  const b = getPassengerBannerState({
    creating: false,
    activeTripId: 't1',
    activeTripLoading: false,
    activeTrip,
    uxState,
    isOnline: true,
  })
  render(<StatusHeader label={b.label} subLabel={b.subLabel} variant={b.variant} />)
}

/**
 * Textos alinhados com getPassengerBannerState + StatusHeader (ecrã passageiro).
 * API `assigned` → "Motorista atribuído"; `accepted` → "Motorista a caminho" (/caminho/).
 */
describe('Passenger banner messaging (RTL)', () => {
  it('motorista atribuído (estado API assigned)', () => {
    renderBanner('DRIVER_ASSIGNED', minimalTrip('assigned'))
    expect(screen.getByRole('status')).toHaveTextContent('Motorista atribuído')
  })

  it('motorista a caminho (estado API accepted)', () => {
    renderBanner('DRIVER_ASSIGNED', minimalTrip('accepted'))
    expect(screen.getByRole('status')).toHaveTextContent('Motorista a caminho')
  })

  it('arriving: cópia de estado da viagem', () => {
    renderBanner('DRIVER_ARRIVING', minimalTrip('arriving'))
    expect(screen.getByRole('status')).toHaveTextContent(passengerTripStatusLabel('arriving'))
  })

  it('ongoing: viagem em curso', () => {
    renderBanner('TRIP_ONGOING', minimalTrip('ongoing'))
    expect(screen.getByRole('status')).toHaveTextContent('Viagem em curso')
  })
})
