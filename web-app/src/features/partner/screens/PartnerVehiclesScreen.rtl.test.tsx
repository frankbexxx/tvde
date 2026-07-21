import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PartnerDriverRow, PartnerVehicleRow } from '../../../api/partner'
import i18n from '../../../i18n'
import { PartnerVehiclesScreen } from './PartnerVehiclesScreen'

const vehicle: PartnerVehicleRow = {
  id: 'veh-1',
  partner_id: 'p1',
  plate: '12-AB-34',
  plate_normalized: '12AB34',
  make: 'Toyota',
  model: 'Corolla',
  year: 2020,
  color: 'preto',
  service_categories: ['x'],
  status: 'active',
  created_at: '2026-07-20T00:00:00Z',
  updated_at: '2026-07-20T00:00:00Z',
  assigned_driver_id: null,
  assigned_driver_name: null,
}

const driver: PartnerDriverRow = {
  user_id: 'drv-1',
  partner_id: 'p1',
  status: 'approved',
  is_available: true,
  user: { name: 'Test Driver', phone: '+351900000001' },
  last_location: null,
}

const api = vi.hoisted(() => ({
  fetchPartnerVehicles: vi.fn(),
  fetchPartnerDrivers: vi.fn(),
  createPartnerVehicle: vi.fn(),
  patchPartnerVehicle: vi.fn(),
  assignPartnerVehicle: vi.fn(),
  unassignPartnerVehicle: vi.fn(),
  fetchPartnerVehicleDocuments: vi.fn(),
}))

vi.mock('../../../api/partner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/partner')>()
  return {
    ...actual,
    fetchPartnerVehicles: api.fetchPartnerVehicles,
    fetchPartnerDrivers: api.fetchPartnerDrivers,
    createPartnerVehicle: api.createPartnerVehicle,
    patchPartnerVehicle: api.patchPartnerVehicle,
    assignPartnerVehicle: api.assignPartnerVehicle,
    unassignPartnerVehicle: api.unassignPartnerVehicle,
    fetchPartnerVehicleDocuments: api.fetchPartnerVehicleDocuments,
  }
})

describe('PartnerVehiclesScreen (PARTNER-FLEET-2B)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    api.fetchPartnerDrivers.mockResolvedValue([driver])
    api.fetchPartnerVehicleDocuments.mockResolvedValue([])
    await i18n.changeLanguage('pt')
  })

  it('mostra empty state quando não há viaturas', async () => {
    api.fetchPartnerVehicles.mockResolvedValue([])
    render(<PartnerVehiclesScreen />)
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicles-empty')).toBeInTheDocument()
    })
  })

  it('lista viatura com matrícula/marca/modelo e sem motorista', async () => {
    api.fetchPartnerVehicles.mockResolvedValue([vehicle])
    render(<PartnerVehiclesScreen />)
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-plate')).toHaveTextContent('12-AB-34')
    })
    expect(screen.getByTestId('partner-vehicle-make-model')).toHaveTextContent(/Toyota Corolla/)
    expect(screen.getByTestId('partner-vehicle-categories')).toHaveTextContent(/X/)
    expect(screen.getByTestId('partner-vehicle-assigned')).toHaveTextContent(/sem motorista/i)
  })

  it('usa chips das mesmas categorias do Driver e envia lista no create', async () => {
    api.fetchPartnerVehicles.mockResolvedValue([])
    api.createPartnerVehicle.mockResolvedValue({
      ...vehicle,
      service_categories: ['x', 'xl', 'pet'],
    })
    render(<PartnerVehiclesScreen />)
    await waitFor(() => expect(screen.getByTestId('partner-vehicles-empty')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('partner-vehicles-toggle-create'))
    expect(screen.getByTestId('partner-vehicle-field-categories')).toBeInTheDocument()
    expect(screen.queryByTestId('partner-vehicle-field-service-category')).not.toBeInTheDocument()
    for (const key of ['x', 'xl', 'pet', 'comfort', 'black', 'electric', 'van']) {
      expect(screen.getByTestId(`partner-vehicle-category-${key}`)).toBeInTheDocument()
    }

    fireEvent.change(screen.getByTestId('partner-vehicle-field-plate'), {
      target: { value: '12-AB-34' },
    })
    fireEvent.change(screen.getByTestId('partner-vehicle-field-make'), {
      target: { value: 'Toyota' },
    })
    fireEvent.change(screen.getByTestId('partner-vehicle-field-model'), {
      target: { value: 'Corolla' },
    })
    fireEvent.click(screen.getByTestId('partner-vehicle-category-xl'))
    fireEvent.click(screen.getByTestId('partner-vehicle-category-pet'))

    api.fetchPartnerVehicles.mockResolvedValue([
      { ...vehicle, service_categories: ['x', 'xl', 'pet'] },
    ])
    fireEvent.click(screen.getByTestId('partner-vehicles-create-submit'))

    await waitFor(() => {
      expect(api.createPartnerVehicle).toHaveBeenCalledWith(
        expect.objectContaining({
          service_categories: expect.arrayContaining(['x', 'xl', 'pet']),
        })
      )
    })
  })

  it('criar viatura chama API e mostra sucesso', async () => {
    api.fetchPartnerVehicles.mockResolvedValue([])
    api.createPartnerVehicle.mockResolvedValue(vehicle)
    render(<PartnerVehiclesScreen />)
    await waitFor(() => expect(screen.getByTestId('partner-vehicles-empty')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('partner-vehicles-toggle-create'))
    fireEvent.change(screen.getByTestId('partner-vehicle-field-plate'), {
      target: { value: '12-AB-34' },
    })
    fireEvent.change(screen.getByTestId('partner-vehicle-field-make'), {
      target: { value: 'Toyota' },
    })
    fireEvent.change(screen.getByTestId('partner-vehicle-field-model'), {
      target: { value: 'Corolla' },
    })

    api.fetchPartnerVehicles.mockResolvedValue([vehicle])
    fireEvent.click(screen.getByTestId('partner-vehicles-create-submit'))

    await waitFor(() => {
      expect(api.createPartnerVehicle).toHaveBeenCalledWith(
        expect.objectContaining({
          plate: '12-AB-34',
          make: 'Toyota',
          model: 'Corolla',
        })
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicles-success')).toBeInTheDocument()
    })
  })

  it('editar viatura chama patch API', async () => {
    api.fetchPartnerVehicles.mockResolvedValue([vehicle])
    api.patchPartnerVehicle.mockResolvedValue({ ...vehicle, color: 'branco' })
    render(<PartnerVehiclesScreen />)
    await waitFor(() => expect(screen.getByTestId('partner-vehicle-edit')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('partner-vehicle-edit'))
    fireEvent.change(screen.getByTestId('partner-vehicle-field-color'), {
      target: { value: 'branco' },
    })
    fireEvent.click(screen.getByTestId('partner-vehicle-save'))

    await waitFor(() => {
      expect(api.patchPartnerVehicle).toHaveBeenCalledWith(
        'veh-1',
        expect.objectContaining({ color: 'branco' })
      )
    })
  })

  it('assign mostra associação; unassign remove', async () => {
    const assigned = {
      ...vehicle,
      assigned_driver_id: 'drv-1',
      assigned_driver_name: 'Test Driver',
    }
    api.fetchPartnerVehicles.mockResolvedValue([vehicle])
    api.assignPartnerVehicle.mockResolvedValue(assigned)
    api.unassignPartnerVehicle.mockResolvedValue(vehicle)

    const onFleetChanged = vi.fn()
    render(<PartnerVehiclesScreen onFleetChanged={onFleetChanged} />)
    await waitFor(() => expect(screen.getByTestId('partner-vehicle-assign-select')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('partner-vehicle-assign-select'), {
      target: { value: 'drv-1' },
    })
    api.fetchPartnerVehicles.mockResolvedValue([assigned])
    fireEvent.click(screen.getByTestId('partner-vehicle-assign'))

    await waitFor(() => {
      expect(api.assignPartnerVehicle).toHaveBeenCalledWith('veh-1', 'drv-1')
    })
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-assigned')).toHaveTextContent(/Test Driver/)
    })
    expect(onFleetChanged).toHaveBeenCalled()

    api.fetchPartnerVehicles.mockResolvedValue([vehicle])
    fireEvent.click(screen.getByTestId('partner-vehicle-unassign'))
    await waitFor(() => {
      expect(api.unassignPartnerVehicle).toHaveBeenCalledWith('veh-1')
    })
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-assigned')).toHaveTextContent(/sem motorista/i)
    })
  })

  it('mostra erro claro em 409 plate_already_exists e vehicle_already_assigned', async () => {
    api.fetchPartnerVehicles.mockResolvedValue([])
    api.createPartnerVehicle.mockRejectedValue({
      status: 409,
      detail: 'plate_already_exists',
    })
    render(<PartnerVehiclesScreen />)
    await waitFor(() => expect(screen.getByTestId('partner-vehicles-empty')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('partner-vehicles-toggle-create'))
    fireEvent.change(screen.getByTestId('partner-vehicle-field-plate'), {
      target: { value: 'DUP-01' },
    })
    fireEvent.change(screen.getByTestId('partner-vehicle-field-make'), {
      target: { value: 'VW' },
    })
    fireEvent.change(screen.getByTestId('partner-vehicle-field-model'), {
      target: { value: 'Golf' },
    })
    fireEvent.click(screen.getByTestId('partner-vehicles-create-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicles-error')).toHaveTextContent(
        /matrícula já existe/i
      )
    })

    api.fetchPartnerVehicles.mockResolvedValue([vehicle])
    api.assignPartnerVehicle.mockRejectedValue({
      status: 409,
      detail: 'vehicle_already_assigned',
    })
    fireEvent.click(screen.getByTestId('partner-vehicles-refresh'))
    await waitFor(() => expect(screen.getByTestId('partner-vehicle-row')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('partner-vehicle-assign-select'), {
      target: { value: 'drv-1' },
    })
    fireEvent.click(screen.getByTestId('partner-vehicle-assign'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicles-error')).toHaveTextContent(
        /já está associada a outro motorista/i
      )
    })
  })

  it('botão Documentos está visível e só carrega painel ao abrir (lazy)', async () => {
    api.fetchPartnerVehicles.mockResolvedValue([vehicle])
    render(<PartnerVehiclesScreen />)
    await waitFor(() => expect(screen.getByTestId('partner-vehicle-docs-toggle')).toBeInTheDocument())
    expect(screen.getByTestId('partner-vehicle-docs-toggle')).toHaveTextContent(/documentos/i)
    expect(screen.queryByTestId('partner-vehicle-docs-panel')).not.toBeInTheDocument()
    expect(api.fetchPartnerVehicleDocuments).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('partner-vehicle-docs-toggle'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-docs-panel')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(api.fetchPartnerVehicleDocuments).toHaveBeenCalledWith('veh-1')
    })
  })
})
