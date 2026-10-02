import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import type { TripDetailResponse } from '../../api/trips'
import { PassengerStatusCard } from './PassengerStatusCard'
import { passengerDriverVehicleCopy } from './passengerDriverVehicle'

const DRIVER_ID = '2481222c-50f6-403f-aa59-8d386f1cd00a'

function trip(overrides: Partial<TripDetailResponse> = {}): TripDetailResponse {
  return {
    trip_id: 'trip-1',
    status: 'ongoing',
    passenger_id: 'pax',
    driver_id: DRIVER_ID,
    origin_lat: 38.7,
    origin_lng: -9.1,
    destination_lat: 38.8,
    destination_lng: -9.2,
    estimated_price: 10,
    created_at: '2026-09-24T08:00:00.000Z',
    updated_at: '2026-09-24T08:00:00.000Z',
    ...overrides,
  }
}

function renderCard(activeTrip: TripDetailResponse, uxState: 'DRIVER_ASSIGNED' | 'TRIP_ONGOING' | 'SEARCHING_DRIVER' = 'TRIP_ONGOING') {
  return render(
    <I18nextProvider i18n={i18n}>
      <PassengerStatusCard uxState={uxState} activeTrip={activeTrip} />
    </I18nextProvider>,
  )
}

describe('passenger driver and vehicle', () => {
  it('mostra nome, marca, modelo, cor e matrícula', async () => {
    await i18n.changeLanguage('pt')
    renderCard(
      trip({
        driver_display_name: 'João Silva',
        vehicle_make: 'Toyota',
        vehicle_model: 'Corolla',
        vehicle_color: 'branca',
        vehicle_plate: '12-AB-34',
      }),
    )
    expect(screen.getByText('João Silva')).toBeTruthy()
    expect(screen.getByText('Toyota Corolla · branca · 12-AB-34')).toBeTruthy()
    expect(document.body.textContent).not.toContain(DRIVER_ID)
  })

  it('mostra só o nome quando a viatura não vem', async () => {
    await i18n.changeLanguage('pt')
    renderCard(trip({ driver_display_name: 'João Silva', vehicle_plate: null }))
    expect(screen.getByText('João Silva')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/·|undefined|null/)
    expect(document.body.textContent).not.toContain(DRIVER_ID)
  })

  it('usa o fallback quando há viatura e falta o nome', async () => {
    await i18n.changeLanguage('pt')
    renderCard(trip({ vehicle_plate: '12-AB-34', driver_display_name: '  ' }))
    expect(screen.getByText('Atribuído')).toBeTruthy()
    expect(screen.getByText('12-AB-34')).toBeTruthy()
    expect(document.body.textContent).not.toContain(DRIVER_ID)
  })

  it('não mostra identificador quando não há nome nem viatura', async () => {
    await i18n.changeLanguage('pt')
    renderCard(trip())
    expect(screen.getByText('Atribuído')).toBeTruthy()
    expect(document.body.textContent).not.toContain(DRIVER_ID)
    expect(document.body.textContent).not.toMatch(/Motorista TVDE|Veículo TVDE/)
  })

  it('não antecipa identidade enquanto procura motorista', async () => {
    await i18n.changeLanguage('pt')
    renderCard(
      trip({
        status: 'requested',
        driver_display_name: 'João Silva',
        vehicle_plate: '12-AB-34',
      }),
      'SEARCHING_DRIVER',
    )
    expect(screen.queryByText('João Silva')).toBeNull()
    expect(screen.queryByText('12-AB-34')).toBeNull()
    expect(screen.queryByText('Atribuído')).toBeNull()
  })

  it('em assigned sem dados não inventa nome nem mostra o id', () => {
    const copy = passengerDriverVehicleCopy({
      status: 'assigned',
      driverName: null,
      vehiclePlate: null,
      assignedFallback: 'Atribuído',
    })
    expect(copy).toEqual({ driverName: null, vehicleLabel: null })
    expect(JSON.stringify(copy)).not.toContain(DRIVER_ID)
  })
})
