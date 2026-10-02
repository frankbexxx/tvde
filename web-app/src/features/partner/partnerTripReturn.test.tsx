import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n from '../../i18n'
import { PartnerTripDetail } from './PartnerTripDetail'
import { PartnerShellProvider, usePartnerShell } from './partnerShellContext'

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

function ShellProbe() {
  const shell = usePartnerShell()
  return (
    <div>
      <p data-testid="menu-state">
        {shell.menuOpen ? 'open' : 'closed'}:{shell.menuScreen}
      </p>
      <p data-testid="return-screen">{shell.tripsReturnScreen()}</p>
      <button type="button" onClick={() => shell.navigateMenu('trips_list')}>
        abrir lista
      </button>
      <button type="button" onClick={() => shell.navigateMenu('trips_summary')}>
        abrir resumo
      </button>
      <button type="button" onClick={() => shell.closeMenu()}>
        fechar menu
      </button>
    </div>
  )
}

function HomeMark() {
  return <p data-testid="partner-home">home</p>
}

describe('Partner trip return', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    api.fetchPartnerDrivers.mockResolvedValue([])
    api.fetchPartnerDriver.mockResolvedValue({
      user_id: 'drv-1',
      partner_id: 'p1',
      status: 'approved',
      is_available: false,
      user: { name: 'Motorista Teste', phone: '+351900000000' },
      last_location: null,
    })
    api.fetchPartnerTrip.mockResolvedValue({
      trip_id: 'trip-1',
      status: 'completed',
      passenger_id: 'pax-1',
      driver_id: 'drv-1',
      origin_lat: 38.72,
      origin_lng: -9.14,
      destination_lat: 38.73,
      destination_lng: -9.13,
      estimated_price: 10,
      final_price: 12,
      cancel_reason: null,
      created_at: '2026-07-23T08:00:00Z',
      started_at: null,
      completed_at: '2026-07-23T08:20:00Z',
      updated_at: '2026-07-23T08:20:00Z',
    })
  })

  it('keeps the trips screen after the menu closes', () => {
    render(
      <PartnerShellProvider>
        <ShellProbe />
      </PartnerShellProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'abrir lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'fechar menu' }))
    expect(screen.getByTestId('menu-state')).toHaveTextContent('closed:root')
    expect(screen.getByTestId('return-screen')).toHaveTextContent('trips_list')
  })

  it('opens the same trip and returns to the list that was open', async () => {
    render(
      <PartnerShellProvider>
        <MemoryRouter initialEntries={['/partner/trips/trip-1']}>
          <ShellProbe />
          <Routes>
            <Route path="/partner/trips/:tripId" element={<PartnerTripDetail />} />
            <Route path="/partner" element={<HomeMark />} />
          </Routes>
        </MemoryRouter>
      </PartnerShellProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'abrir lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'fechar menu' }))

    await waitFor(() => {
      expect(screen.getByTestId('partner-trip-detail-reference')).toHaveTextContent('trip-1')
    })
    expect(api.fetchPartnerTrip).toHaveBeenCalledWith('trip-1')
    const back = screen.getByTestId('partner-trip-back-to-trips')
    expect(back).toHaveTextContent('Voltar às viagens')
    expect(back.tagName).toBe('BUTTON')

    fireEvent.click(back)
    expect(screen.getByTestId('partner-home')).toBeInTheDocument()
    expect(screen.getByTestId('menu-state')).toHaveTextContent('open:trips_list')
    expect(api.fetchPartnerTrip).toHaveBeenCalledTimes(1)
  })

  it('returns to the summary when that was the open trips screen', async () => {
    render(
      <PartnerShellProvider>
        <MemoryRouter initialEntries={['/partner/trips/trip-1']}>
          <ShellProbe />
          <Routes>
            <Route path="/partner/trips/:tripId" element={<PartnerTripDetail />} />
            <Route path="/partner" element={<HomeMark />} />
          </Routes>
        </MemoryRouter>
      </PartnerShellProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'abrir resumo' }))
    fireEvent.click(screen.getByRole('button', { name: 'fechar menu' }))
    await waitFor(() => {
      expect(screen.getByTestId('partner-trip-back-to-trips')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('partner-trip-back-to-trips'))
    expect(screen.getByTestId('menu-state')).toHaveTextContent('open:trips_summary')
  })
})
