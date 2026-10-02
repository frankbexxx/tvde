import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { PartnerDriverRow } from '../../api/partner'
import i18n from '../../i18n'
import { PartnerDriverDetail } from './PartnerDriverDetail'

const driverId = '22222222-2222-2222-2222-222222222222'

const api = vi.hoisted(() => ({
  fetchPartnerDriver: vi.fn(),
  fetchPartnerTrips: vi.fn(),
  removeDriverFromFleet: vi.fn(),
}))

vi.mock('../../api/partner', async () => {
  const actual = await vi.importActual<typeof import('../../api/partner')>('../../api/partner')
  return {
    ...actual,
    fetchPartnerDriver: api.fetchPartnerDriver,
    fetchPartnerTrips: api.fetchPartnerTrips,
    removeDriverFromFleet: api.removeDriverFromFleet,
  }
})

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function driver(overrides: Partial<PartnerDriverRow> = {}): PartnerDriverRow {
  return {
    user_id: driverId,
    partner_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    status: 'rejected',
    is_available: false,
    user: { name: 'João Silva', phone: '+351911111111' },
    last_location: null,
    vehicle_plate: 'AA-00-AA',
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

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={[`/partner/drivers/${driverId}`]}>
      <Routes>
        <Route path="/partner/drivers/:userId" element={<PartnerDriverDetail />} />
        <Route path="/partner" element={<p>Lista da frota</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PartnerDriverDetail remover da frota', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    api.fetchPartnerTrips.mockResolvedValue([])
    api.fetchPartnerDriver.mockResolvedValue(driver())
    api.removeDriverFromFleet.mockReset()
  })

  it('abre a confirmação sem remover', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-remove-from-fleet')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-remove-from-fleet'))
    expect(screen.getByRole('dialog', { name: 'Remover este motorista da frota?' })).toBeInTheDocument()
    const dialog = screen.getByTestId('partner-driver-remove-dialog')
    expect(dialog).toHaveTextContent('Vais remover João Silva (+351911111111) desta frota.')
    expect(dialog).toHaveTextContent('A viatura AA-00-AA deixa de estar associada.')
    expect(dialog).toHaveTextContent('A conta do motorista não é apagada.')
    expect(dialog).not.toHaveTextContent(driverId)
    expect(dialog).not.toHaveTextContent('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    expect(api.removeDriverFromFleet).not.toHaveBeenCalled()
  })

  it('cancelar fecha sem pedido e o motorista continua na ficha', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-remove-from-fleet')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-remove-from-fleet'))
    fireEvent.click(screen.getByTestId('partner-driver-remove-cancel'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.removeDriverFromFleet).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'João Silva' })).toBeInTheDocument()
  })

  it('confirmar faz uma chamada e volta à frota', async () => {
    api.removeDriverFromFleet.mockResolvedValue(undefined)
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-remove-from-fleet')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-remove-from-fleet'))
    fireEvent.click(screen.getByTestId('partner-driver-remove-confirm'))
    await waitFor(() => {
      expect(screen.getByText('Lista da frota')).toBeInTheDocument()
    })
    expect(api.removeDriverFromFleet).toHaveBeenCalledTimes(1)
    expect(api.removeDriverFromFleet).toHaveBeenCalledWith(driverId)
  })

  it('não deixa repetir o pedido enquanto remove', async () => {
    const pending = deferred<void>()
    api.removeDriverFromFleet.mockReturnValue(pending.promise)
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-remove-from-fleet')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-remove-from-fleet'))
    fireEvent.click(screen.getByTestId('partner-driver-remove-confirm'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-remove-confirm')).toHaveTextContent('A remover…')
    })
    expect(screen.getByTestId('partner-driver-remove-confirm')).toBeDisabled()
    fireEvent.click(screen.getByTestId('partner-driver-remove-confirm'))
    expect(api.removeDriverFromFleet).toHaveBeenCalledTimes(1)
    pending.resolve()
    await waitFor(() => {
      expect(screen.getByText('Lista da frota')).toBeInTheDocument()
    })
  })

  it('se falhar mantém o motorista e permite tentar de novo', async () => {
    api.removeDriverFromFleet
      .mockRejectedValueOnce({ detail: 'driver_has_active_trip' })
      .mockResolvedValueOnce(undefined)
    renderDetail()
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-remove-from-fleet')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('partner-driver-remove-from-fleet'))
    fireEvent.click(screen.getByTestId('partner-driver-remove-confirm'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-driver-remove-error')).toHaveTextContent(
        'Motorista com viagem activa — conclui ou cancela antes de remover da frota.',
      )
    })
    expect(document.body).toHaveTextContent('João Silva')
    expect(screen.queryByText('Lista da frota')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('partner-driver-remove-confirm'))
    await waitFor(() => {
      expect(screen.getByText('Lista da frota')).toBeInTheDocument()
    })
    expect(api.removeDriverFromFleet).toHaveBeenCalledTimes(2)
  })
})
