import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { TripDetailResponse } from '../../api/trips'
import { ActiveTripActions } from './ActiveTripActions'
import * as driverTripActions from './driverTripActions'

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}))

const pollingCtx = vi.hoisted(() => ({ trip: null as TripDetailResponse | null }))

vi.mock('../../hooks/usePolling', () => ({
  usePolling: () => ({
    data: pollingCtx.trip,
    refetch: vi.fn(),
    isLoading: false,
    isRefreshing: false,
    lastSuccessAt: null,
    pollFault: false,
  }),
}))

vi.mock('./driverTripActions', () => ({
  driverPerformAccept: vi.fn(() => Promise.resolve({ trip_id: 'tid', status: 'accepted' as const })),
  driverPerformStartFromAccepted: vi.fn(() => Promise.resolve({ trip_id: 'tid', status: 'ongoing' as const })),
  driverPerformStartFromArriving: vi.fn(() => Promise.resolve({ trip_id: 'tid', status: 'ongoing' as const })),
  driverPerformComplete: vi.fn(() => Promise.resolve({ trip_id: 'tid', status: 'completed' as const })),
  driverPerformCancel: vi.fn(() => Promise.resolve({ trip_id: 'tid', status: 'cancelled' as const })),
}))

function minimalTrip(status: TripDetailResponse['status']): TripDetailResponse {
  return {
    trip_id: 'tid',
    status,
    passenger_id: 'p1',
    origin_lat: 0,
    origin_lng: 0,
    destination_lat: 1,
    destination_lng: 1,
    estimated_price: 10,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

/** ~44 m N of equator — dentro do raio de «Iniciar viagem» com origin 0,0. */
const DRIVER_NEAR_PICKUP_0 = { lat: 0.0004, lng: 0 }

function renderActions(
  driverLocation: { lat: number; lng: number } | null = DRIVER_NEAR_PICKUP_0,
  opts?: { tripDetailFallback?: TripDetailResponse | null }
) {
  const addLog = vi.fn()
  const setStatus = vi.fn()
  const onClear = vi.fn()
  const onSuccess = vi.fn()
  const onComplete = vi.fn()
  const onError = vi.fn()
  render(
    <ActiveTripActions
      tripId="tid"
      token="tok"
      tripDetailFallback={opts?.tripDetailFallback ?? null}
      driverLocation={driverLocation}
      addLog={addLog}
      setStatus={setStatus}
      statusOverride={null}
      onClearStatusOverride={onClear}
      onTripActionSuccess={onSuccess}
      onComplete={onComplete}
      onError={onError}
    />
  )
  return { addLog, setStatus, onComplete, onError }
}

describe('ActiveTripActions (RTL)', () => {
  beforeEach(() => {
    pollingCtx.trip = null
    vi.clearAllMocks()
  })

  it('estado accepted: botão Iniciar viagem chama sequência start (driverPerformStartFromAccepted)', async () => {
    pollingCtx.trip = minimalTrip('accepted')
    renderActions(DRIVER_NEAR_PICKUP_0)
    fireEvent.click(screen.getByRole('button', { name: /iniciar viagem/i }))
    await waitFor(() => {
      expect(driverTripActions.driverPerformStartFromAccepted).toHaveBeenCalledWith('tid', 'tok')
    })
    expect(driverTripActions.driverPerformComplete).not.toHaveBeenCalled()
  })

  it('estado assigned: mostra dica contextual antes da ação de aceitar', () => {
    pollingCtx.trip = minimalTrip('assigned')
    renderActions(DRIVER_NEAR_PICKUP_0)
    expect(screen.getByText(/aceita para começar a aproximação ao passageiro/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aceitar/i })).toBeInTheDocument()
  })

  it('estado arriving: botão Iniciar viagem chama sequência start arriving->ongoing', async () => {
    pollingCtx.trip = minimalTrip('arriving')
    renderActions(DRIVER_NEAR_PICKUP_0)
    fireEvent.click(screen.getByRole('button', { name: /iniciar viagem/i }))
    await waitFor(() => {
      expect(driverTripActions.driverPerformStartFromArriving).toHaveBeenCalledWith('tid', 'tok')
    })
    expect(driverTripActions.driverPerformStartFromAccepted).not.toHaveBeenCalled()
  })

  it('estado accepted: com motorista longe do pickup, Iniciar viagem desactivado e não chama API', () => {
    pollingCtx.trip = minimalTrip('accepted')
    renderActions({ lat: 2, lng: 2 })
    const btn = screen.getByRole('button', { name: /iniciar viagem/i })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(driverTripActions.driverPerformStartFromAccepted).not.toHaveBeenCalled()
  })

  it('poll sem trip ainda: com tripDetailFallback mostra links Pickup Waze/Maps (coordenadas do fallback)', () => {
    pollingCtx.trip = null
    const fb = minimalTrip('accepted')
    renderActions(DRIVER_NEAR_PICKUP_0, { tripDetailFallback: fb })
    const waze = screen.getByRole('link', { name: /pickup no waze/i })
    expect(waze).toHaveAttribute('href', expect.stringContaining('waze.com'))
    expect(waze.getAttribute('href')).toContain(encodeURIComponent(`${fb.origin_lat},${fb.origin_lng}`))
    expect(screen.getByRole('link', { name: /pickup no google maps/i })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps')
    )
  })

  it('poll sem trip e sem fallback: mostra estado de sincronização e não expõe CTA de iniciar', () => {
    pollingCtx.trip = null
    renderActions(DRIVER_NEAR_PICKUP_0, { tripDetailFallback: null })
    expect(screen.getByText(/a sincronizar estado da viagem/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /iniciar viagem/i })).not.toBeInTheDocument()
  })

  it('estado ongoing: botão Terminar viagem chama driverPerformComplete', async () => {
    pollingCtx.trip = minimalTrip('ongoing')
    renderActions()
    fireEvent.click(screen.getByRole('button', { name: /terminar viagem/i }))
    await waitFor(() => {
      expect(driverTripActions.driverPerformComplete).toHaveBeenCalledWith('tid', 'tok')
    })
    expect(driverTripActions.driverPerformStartFromAccepted).not.toHaveBeenCalled()
  })
})
