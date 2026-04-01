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

function renderActions() {
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
    renderActions()
    fireEvent.click(screen.getByRole('button', { name: /iniciar viagem/i }))
    await waitFor(() => {
      expect(driverTripActions.driverPerformStartFromAccepted).toHaveBeenCalledWith('tid', 'tok')
    })
    expect(driverTripActions.driverPerformComplete).not.toHaveBeenCalled()
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
