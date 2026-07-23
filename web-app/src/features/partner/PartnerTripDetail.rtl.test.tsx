import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import type { PartnerDriverRow, PartnerTripRow } from '../../api/partner'
import i18n from '../../i18n'
import { PartnerTripDetail } from './PartnerTripDetail'

const api = vi.hoisted(() => ({
  fetchPartnerTrip: vi.fn(),
  fetchPartnerDrivers: vi.fn(),
  fetchPartnerDriver: vi.fn(),
  postPartnerTripReassign: vi.fn(),
}))

vi.mock('../../api/partner', async () => {
  const actual = await vi.importActual<typeof import('../../api/partner')>('../../api/partner')
  return {
    ...actual,
    fetchPartnerTrip: api.fetchPartnerTrip,
    fetchPartnerDrivers: api.fetchPartnerDrivers,
    fetchPartnerDriver: api.fetchPartnerDriver,
    postPartnerTripReassign: api.postPartnerTripReassign,
  }
})

vi.mock('../../services/geocoding', () => ({
  reverseGeocode: vi.fn().mockResolvedValue(null),
}))

function baseTrip(overrides: Partial<PartnerTripRow> = {}): PartnerTripRow {
  return {
    trip_id: 'trip-1',
    status: 'ongoing',
    passenger_id: 'pax-1',
    driver_id: 'drv-1',
    origin_lat: 38.72,
    origin_lng: -9.14,
    destination_lat: 38.73,
    destination_lng: -9.13,
    estimated_price: 10,
    final_price: null,
    cancel_reason: null,
    created_at: '2026-07-23T08:00:00Z',
    started_at: '2026-07-23T08:05:00Z',
    completed_at: null,
    updated_at: '2026-07-23T08:05:00Z',
    ...overrides,
  }
}

function driver(userId: string): PartnerDriverRow {
  return {
    user_id: userId,
    partner_id: 'p1',
    status: 'approved',
    is_available: false,
    user: { name: `Motorista ${userId}`, phone: '+351900000000' },
    last_location: null,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

function renderDetail(tripId = 'trip-1') {
  return render(
    <MemoryRouter initialEntries={[`/partner/trips/${tripId}`]}>
      <Routes>
        <Route path="/partner/trips/:tripId" element={<PartnerTripDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderSwitchableDetail() {
  return render(
    <MemoryRouter initialEntries={['/partner/trips/trip-1']}>
      <Link to="/partner/trips/trip-2">trip-2</Link>
      <Routes>
        <Route path="/partner/trips/:tripId" element={<PartnerTripDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PartnerTripDetail (OPS-UX-1B)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.fetchPartnerDrivers.mockResolvedValue([])
    api.fetchPartnerDriver.mockResolvedValue(driver('drv-1'))
    api.fetchPartnerTrip.mockResolvedValue(baseTrip())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('mostra Actualizar e refetch soft mantém dados', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-trip-detail-status')).toHaveTextContent('ongoing')
    })
    expect(api.fetchPartnerTrip).toHaveBeenCalledTimes(1)

    api.fetchPartnerTrip.mockResolvedValueOnce(baseTrip({ status: 'ongoing', updated_at: '2026-07-23T08:10:00Z' }))
    fireEvent.click(screen.getByTestId('partner-trip-detail-refresh'))
    await waitFor(() => {
      expect(api.fetchPartnerTrip).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByTestId('partner-trip-detail-status')).toHaveTextContent('ongoing')
    expect(screen.getByTestId('partner-trip-detail-last-updated')).toBeInTheDocument()
  })

  it('polling leve em viagem activa (~12s)', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-trip-detail-status')).toHaveTextContent('ongoing')
    })
    expect(api.fetchPartnerTrip).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(12_000)
    await waitFor(() => {
      expect(api.fetchPartnerTrip.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('completed não faz polling automático', async () => {
    api.fetchPartnerTrip.mockResolvedValue(baseTrip({ status: 'completed', completed_at: '2026-07-23T09:00:00Z' }))
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-trip-detail-status')).toHaveTextContent('completed')
    })
    const callsAfterLoad = api.fetchPartnerTrip.mock.calls.length
    await vi.advanceTimersByTimeAsync(30_000)
    expect(api.fetchPartnerTrip).toHaveBeenCalledTimes(callsAfterLoad)
  })

  it('erro no soft refresh mostra mensagem e mantém dados', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-trip-detail-status')).toHaveTextContent('ongoing')
    })

    api.fetchPartnerTrip.mockRejectedValueOnce({ detail: 'rede_indisponivel' })
    fireEvent.click(screen.getByTestId('partner-trip-detail-refresh'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-trip-detail-error')).toHaveTextContent(/rede_indisponivel/i)
    })
    expect(screen.getByTestId('partner-trip-detail-status')).toHaveTextContent('ongoing')
  })

  it('ignora resposta atrasada da viagem anterior após mudar de rota', async () => {
    const staleTrip = deferred<PartnerTripRow>()
    api.fetchPartnerTrip.mockImplementation((tripId: string) =>
      tripId === 'trip-1'
        ? staleTrip.promise
        : Promise.resolve(baseTrip({ trip_id: 'trip-2', passenger_id: 'pax-2' }))
    )

    renderSwitchableDetail()
    await waitFor(() => {
      expect(api.fetchPartnerTrip).toHaveBeenCalledWith('trip-1')
    })
    fireEvent.click(screen.getByRole('link', { name: 'trip-2' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('trip-2')
    })

    await act(async () => {
      staleTrip.resolve(baseTrip({ trip_id: 'trip-1', passenger_id: 'pax-1' }))
      await staleTrip.promise
    })

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('trip-2')
    expect(screen.getByText('pax-2')).toBeInTheDocument()
    expect(screen.queryByText('pax-1')).toBeNull()
  })

  it('não deixa refresh atrasado desfazer uma reatribuição concluída', async () => {
    const staleRefresh = deferred<PartnerTripRow>()
    const assignedToFirst = baseTrip({ status: 'assigned', driver_id: 'drv-1' })
    const assignedToSecond = baseTrip({ status: 'assigned', driver_id: 'drv-2' })
    api.fetchPartnerTrip
      .mockResolvedValueOnce(assignedToFirst)
      .mockReturnValueOnce(staleRefresh.promise)
    api.fetchPartnerDrivers.mockResolvedValue([driver('drv-1'), driver('drv-2')])
    api.fetchPartnerDriver.mockImplementation((driverId: string) =>
      Promise.resolve(driver(driverId))
    )
    api.postPartnerTripReassign.mockResolvedValue(assignedToSecond)

    renderDetail()
    await waitFor(() => {
      expect(screen.getByText('drv-1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('partner-trip-detail-refresh'))
    await waitFor(() => {
      expect(api.fetchPartnerTrip).toHaveBeenCalledTimes(2)
    })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'drv-2' } })
    fireEvent.click(screen.getByRole('button', { name: /reatribuir viagem/i }))
    await waitFor(() => {
      expect(screen.getByText('drv-2')).toBeInTheDocument()
    })

    await act(async () => {
      staleRefresh.resolve(assignedToFirst)
      await staleRefresh.promise
    })

    expect(screen.getByText('drv-2')).toBeInTheDocument()
    expect(api.postPartnerTripReassign).toHaveBeenCalledWith('trip-1', 'drv-2')
  })
})
