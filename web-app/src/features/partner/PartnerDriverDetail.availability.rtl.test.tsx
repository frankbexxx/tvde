import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { PartnerDriverRow } from '../../api/partner'
import i18n from '../../i18n'
import { PartnerDriverDetail } from './PartnerDriverDetail'

const api = vi.hoisted(() => ({
  fetchPartnerDriver: vi.fn(),
  fetchPartnerTrips: vi.fn(),
  fetchPartnerDriverZoneBudgetToday: vi.fn(),
  fetchPartnerDriverZoneSessionOpen: vi.fn(),
  patchPartnerDriverAvailability: vi.fn(),
}))

const toastApi = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('../../api/partner', async () => {
  const actual = await vi.importActual<typeof import('../../api/partner')>('../../api/partner')
  return {
    ...actual,
    fetchPartnerDriver: api.fetchPartnerDriver,
    fetchPartnerTrips: api.fetchPartnerTrips,
    fetchPartnerDriverZoneBudgetToday: api.fetchPartnerDriverZoneBudgetToday,
    fetchPartnerDriverZoneSessionOpen: api.fetchPartnerDriverZoneSessionOpen,
    patchPartnerDriverAvailability: api.patchPartnerDriverAvailability,
  }
})

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastApi.success(...args),
    error: (...args: unknown[]) => toastApi.error(...args),
  },
}))

function baseDriver(overrides: Partial<PartnerDriverRow> = {}): PartnerDriverRow {
  return {
    user_id: 'drv-1',
    partner_id: 'p1',
    status: 'approved',
    is_available: false,
    user: { name: 'Motorista Teste', phone: '+351900000000' },
    last_location: null,
    active_trip_id: null,
    active_trip_status: null,
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

function renderDetail(userId = 'drv-1') {
  return render(
    <MemoryRouter initialEntries={[`/partner/drivers/${userId}`]}>
      <Routes>
        <Route path="/partner/drivers/:userId" element={<PartnerDriverDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PartnerDriverDetail availability controls', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.fetchPartnerTrips.mockResolvedValue([])
    api.fetchPartnerDriverZoneBudgetToday.mockRejectedValue(new Error('skip'))
    api.fetchPartnerDriverZoneSessionOpen.mockRejectedValue(new Error('skip'))
    api.fetchPartnerDriver.mockResolvedValue(baseDriver())
    api.patchPartnerDriverAvailability.mockReset()
    toastApi.success.mockReset()
    toastApi.error.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('offline: chip Offline, Colocar online enabled, Já offline disabled', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-status')).toHaveTextContent(
        'Estado actual: Offline'
      )
    })
    const onlineBtn = screen.getByTestId('partner-driver-availability-online')
    const offlineBtn = screen.getByTestId('partner-driver-availability-offline')
    expect(onlineBtn).toHaveTextContent('Colocar online')
    expect(onlineBtn).toBeEnabled()
    expect(offlineBtn).toHaveTextContent('Já offline')
    expect(offlineBtn).toBeDisabled()
  })

  it('click Online: PATCH 200 actualiza chip e feedback local sem Atualizar', async () => {
    api.patchPartnerDriverAvailability.mockResolvedValue(
      baseDriver({ is_available: true })
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-online')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-availability-online'))
    await waitFor(() => {
      expect(api.patchPartnerDriverAvailability).toHaveBeenCalledWith('drv-1', true)
    })
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-status')).toHaveTextContent(
        'Estado actual: Online'
      )
    })
    expect(screen.getByTestId('partner-driver-availability-feedback')).toHaveTextContent(
      'Motorista colocado online'
    )
    expect(toastApi.success).toHaveBeenCalledWith('Motorista colocado online')
    expect(screen.getByTestId('partner-driver-availability-online')).toHaveTextContent(
      'Já online'
    )
    expect(screen.getByTestId('partner-driver-availability-online')).toBeDisabled()
    expect(api.fetchPartnerDriver).toHaveBeenCalledTimes(1)
  })

  it('click Offline: PATCH 200 actualiza chip e feedback local', async () => {
    api.fetchPartnerDriver.mockResolvedValue(baseDriver({ is_available: true }))
    api.patchPartnerDriverAvailability.mockResolvedValue(
      baseDriver({ is_available: false })
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-status')).toHaveTextContent(
        'Estado actual: Online'
      )
    })
    fireEvent.click(screen.getByTestId('partner-driver-availability-offline'))
    await waitFor(() => {
      expect(api.patchPartnerDriverAvailability).toHaveBeenCalledWith('drv-1', false)
    })
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-status')).toHaveTextContent(
        'Estado actual: Offline'
      )
    })
    expect(screen.getByTestId('partner-driver-availability-feedback')).toHaveTextContent(
      'Motorista colocado offline'
    )
    expect(toastApi.success).toHaveBeenCalledWith('Motorista colocado offline')
  })

  it('PATCH 409 driver_has_active_trip: erro local PT e chip Offline', async () => {
    api.patchPartnerDriverAvailability.mockRejectedValue({
      detail: 'driver_has_active_trip',
    })
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-online')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-availability-online'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-error')).toHaveTextContent(
        'Não é possível colocar online: motorista tem uma viagem activa.'
      )
    })
    expect(screen.getByTestId('partner-driver-availability-status')).toHaveTextContent(
      'Estado actual: Offline'
    )
    expect(screen.queryByTestId('partner-driver-availability-feedback')).toBeNull()
    expect(screen.queryByTestId('partner-driver-availability-vehicles-cta')).toBeNull()
    expect(screen.getByTestId('partner-driver-availability-online')).toHaveTextContent(
      'Colocar online'
    )
    expect(screen.getByTestId('partner-driver-availability-online')).toBeEnabled()
  })

  it('PATCH 409 no_active_vehicle: mensagem PT + CTA viaturas', async () => {
    api.patchPartnerDriverAvailability.mockRejectedValue({
      detail: 'no_active_vehicle',
    })
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-online')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-availability-online'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-error')).toHaveTextContent(
        'Não é possível colocar online: o motorista não tem viatura activa atribuída.'
      )
    })
    expect(screen.getByTestId('partner-driver-availability-error')).not.toHaveTextContent(
      'no_active_vehicle'
    )
    const cta = screen.getByTestId('partner-driver-availability-vehicles-cta')
    expect(cta).toHaveTextContent('Ver viaturas da frota')
    expect(cta).toHaveAttribute('href', '/partner')
    expect(screen.getByTestId('partner-driver-availability-status')).toHaveTextContent(
      'Estado actual: Offline'
    )
  })

  it('PATCH 409 vehicle_documents_blocked: mensagem PT sem snake_case', async () => {
    api.patchPartnerDriverAvailability.mockRejectedValue({
      detail: 'vehicle_documents_blocked',
    })
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-online')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-availability-online'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-error')).toHaveTextContent(
        /documentos em falta|expirados|rejeitados/i
      )
    })
    expect(screen.getByTestId('partner-driver-availability-error')).not.toHaveTextContent(
      'vehicle_documents_blocked'
    )
    expect(screen.getByTestId('partner-driver-availability-vehicles-cta')).toBeInTheDocument()
  })

  it('PATCH 409 código desconhecido: fallback raw detail sem CTA', async () => {
    api.patchPartnerDriverAvailability.mockRejectedValue({
      detail: 'some_unknown_gate',
    })
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-online')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-availability-online'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-error')).toHaveTextContent(
        'some_unknown_gate'
      )
    })
    expect(screen.queryByTestId('partner-driver-availability-vehicles-cta')).toBeNull()
  })

  it('busy: botões disabled durante promise', async () => {
    const pending = deferred<PartnerDriverRow>()
    api.patchPartnerDriverAvailability.mockReturnValue(pending.promise)
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-online')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-availability-online'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-online')).toHaveTextContent('…')
    })
    expect(screen.getByTestId('partner-driver-availability-online')).toBeDisabled()
    expect(screen.getByTestId('partner-driver-availability-offline')).toBeDisabled()
    pending.resolve(baseDriver({ is_available: true }))
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-availability-status')).toHaveTextContent(
        'Estado actual: Online'
      )
    })
  })
})
