import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import type { PartnerTripRow } from '../../api/partner'
import { VISIBILITY_VISIBLE_EVENT } from '../../constants/events'
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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function TripSwitcher() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      data-testid="switch-trip"
      onClick={() => void navigate('/partner/trips/trip-2')}
    >
      switch
    </button>
  )
}

function renderDetail(tripId = 'trip-1') {
  return render(
    <MemoryRouter initialEntries={[`/partner/trips/${tripId}`]}>
      <TripSwitcher />
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
    api.fetchPartnerDriver.mockResolvedValue({
      user_id: 'drv-1',
      partner_id: 'p1',
      status: 'approved',
      is_available: false,
      user: { name: 'Motorista Teste', phone: '+351900000000' },
      last_location: null,
    })
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

  it('remove dados antigos quando o refresh perde acesso à viagem', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText('pax-1')).toBeInTheDocument()
      expect(screen.getByText('+351900000000')).toBeInTheDocument()
    })

    api.fetchPartnerTrip.mockRejectedValueOnce({ status: 404, detail: 'not_found' })
    fireEvent.click(screen.getByTestId('partner-trip-detail-refresh'))

    await waitFor(() => {
      expect(screen.getByText('not_found')).toBeInTheDocument()
      expect(screen.queryByText('pax-1')).not.toBeInTheDocument()
      expect(screen.queryByText('+351900000000')).not.toBeInTheDocument()
    })
  })

  it('ignora resposta pendente da viagem anterior após navegar para outra', async () => {
    const firstTrip = deferred<PartnerTripRow>()
    api.fetchPartnerTrip.mockImplementation((tripId: string) =>
      tripId === 'trip-1'
        ? firstTrip.promise
        : Promise.resolve(baseTrip({ trip_id: 'trip-2', status: 'completed' }))
    )
    renderDetail()
    await waitFor(() => expect(api.fetchPartnerTrip).toHaveBeenCalledWith('trip-1'))

    fireEvent.click(screen.getByTestId('switch-trip'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'trip-2' })).toBeInTheDocument()
    })

    await act(async () => {
      firstTrip.resolve(baseTrip({ trip_id: 'trip-1', status: 'assigned' }))
      await firstTrip.promise
    })
    expect(screen.getByRole('heading', { name: 'trip-2' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'trip-1' })).not.toBeInTheDocument()
  })

  it('mantém a resposta do refresh mais recente quando pedidos terminam fora de ordem', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-trip-detail-status')).toHaveTextContent('ongoing')
    })
    const staleRefresh = deferred<PartnerTripRow>()
    api.fetchPartnerTrip
      .mockReturnValueOnce(staleRefresh.promise)
      .mockResolvedValueOnce(
        baseTrip({ status: 'completed', completed_at: '2026-07-23T09:00:00Z' })
      )

    fireEvent.click(screen.getByTestId('partner-trip-detail-refresh'))
    await waitFor(() => expect(api.fetchPartnerTrip).toHaveBeenCalledTimes(2))
    fireEvent(window, new CustomEvent(VISIBILITY_VISIBLE_EVENT))
    await waitFor(() => {
      expect(screen.getByTestId('partner-trip-detail-status')).toHaveTextContent('completed')
    })

    await act(async () => {
      staleRefresh.resolve(baseTrip({ status: 'ongoing' }))
      await staleRefresh.promise
    })
    expect(screen.getByTestId('partner-trip-detail-status')).toHaveTextContent('completed')
  })

  it('não deixa um poll pendente desfazer uma reatribuição concluída', async () => {
    api.fetchPartnerTrip.mockResolvedValue(baseTrip({ status: 'assigned' }))
    api.fetchPartnerDrivers.mockResolvedValue([
      {
        user_id: 'drv-1',
        partner_id: 'p1',
        status: 'approved',
        is_available: false,
        user: { name: 'Motorista Um', phone: null },
        last_location: null,
      },
      {
        user_id: 'drv-2',
        partner_id: 'p1',
        status: 'approved',
        is_available: true,
        user: { name: 'Motorista Dois', phone: null },
        last_location: null,
      },
    ])
    api.postPartnerTripReassign.mockResolvedValue(
      baseTrip({ status: 'assigned', driver_id: 'drv-2' })
    )
    renderDetail()
    await waitFor(() => expect(screen.getByText('drv-1')).toBeInTheDocument())
    const staleRefresh = deferred<PartnerTripRow>()
    api.fetchPartnerTrip.mockReturnValueOnce(staleRefresh.promise)

    fireEvent.click(screen.getByTestId('partner-trip-detail-refresh'))
    await waitFor(() => expect(api.fetchPartnerTrip).toHaveBeenCalledTimes(2))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'drv-2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reatribuir viagem' }))
    await waitFor(() => expect(screen.getByText('drv-2')).toBeInTheDocument())

    await act(async () => {
      staleRefresh.resolve(baseTrip({ status: 'assigned', driver_id: 'drv-1' }))
      await staleRefresh.promise
    })
    expect(screen.getByText('drv-2')).toBeInTheDocument()
  })
})
