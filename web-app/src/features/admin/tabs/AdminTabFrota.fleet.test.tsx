import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import '../../../i18n'
import { AdminTabFrota, type AdminTabFrotaProps } from './AdminTabFrota'

const porto = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Frota Porto',
  created_at: '2026-10-01T10:00:00.000Z',
}
const lisboa = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Frota Lisboa Norte',
  created_at: '2026-10-02T10:00:00.000Z',
}

function props(overrides: Partial<AdminTabFrotaProps> = {}): AdminTabFrotaProps {
  return {
    dataLoading: false,
    frotaAssignDriverId: '',
    frotaAssignMode: 'select',
    frotaAssignOk: null,
    frotaAssignPartnerId: '',
    frotaLoading: null,
    frotaManagerName: '',
    frotaManagerPhone: '',
    frotaOk: null,
    frotaOrgName: 'Frota Lisboa Norte',
    frotaPartnerId: '',
    handleAssignDriverToFrota: vi.fn(),
    handleCreateFrotaManager: vi.fn(),
    handleCreateFrotaOrg: vi.fn(),
    handleUnassignDriverFromFrota: vi.fn(),
    partners: [lisboa, porto],
    setFrotaAssignDriverId: vi.fn(),
    setFrotaAssignMode: vi.fn(),
    setFrotaAssignOk: vi.fn(),
    setFrotaAssignPartnerId: vi.fn(),
    setFrotaManagerName: vi.fn(),
    setFrotaManagerPhone: vi.fn(),
    setFrotaOk: vi.fn(),
    setFrotaOrgName: vi.fn(),
    setFrotaPartnerId: vi.fn(),
    users: [],
    ...overrides,
  }
}

describe('AdminTabFrota criação de frota e gestor', () => {
  it('cria a frota pelo nome e não mostra o identificador no passo do gestor', () => {
    const current = props()
    render(<AdminTabFrota {...current} />)
    fireEvent.click(screen.getByTestId('admin-frota-create-org'))
    expect(current.handleCreateFrotaOrg).toHaveBeenCalledTimes(1)

    const manager = within(screen.getByTestId('admin-frota-manager'))
    expect(manager.getByRole('heading', { name: '2. Gestor da frota' })).toBeInTheDocument()
    expect(manager.getByLabelText('Frota')).toBeInTheDocument()
    expect(manager.queryByText(/partner_id|UUID|cola um UUID/i)).not.toBeInTheDocument()
    expect(manager.queryByPlaceholderText(/xxxx/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modo manual' })).toBeInTheDocument()
  })

  it('mostra a frota acabada de criar já seleccionada', () => {
    render(<AdminTabFrota {...props({ frotaPartnerId: lisboa.id, partners: [lisboa, porto] })} />)
    const manager = within(screen.getByTestId('admin-frota-manager'))
    expect(screen.getByTestId('admin-frota-partner-select')).toHaveValue(lisboa.id)
    expect(manager.getByText('Frota: Frota Lisboa Norte')).toBeInTheDocument()
    expect(manager.getByRole('option', { name: 'Frota Lisboa Norte' })).toBeInTheDocument()
    expect(manager.getByRole('option', { name: 'Frota Porto' })).toBeInTheDocument()
  })

  it('ao escolher outra frota guarda o id dessa frota', () => {
    const current = props({ frotaPartnerId: lisboa.id })
    render(<AdminTabFrota {...current} />)
    fireEvent.change(screen.getByTestId('admin-frota-partner-select'), { target: { value: porto.id } })
    expect(current.setFrotaPartnerId).toHaveBeenCalledWith(porto.id)
  })

  it('sem frotas pede para criar primeiro e não deixa criar o gestor', () => {
    render(<AdminTabFrota {...props({ partners: [], frotaPartnerId: '' })} />)
    expect(screen.getByText('Cria primeiro uma frota.')).toBeInTheDocument()
    expect(screen.getByTestId('admin-frota-create-manager')).toBeDisabled()
  })

  it('criar o gestor usa o passo actual e fica indisponível enquanto o pedido corre', () => {
    const current = props({
      frotaPartnerId: lisboa.id,
      frotaManagerName: 'Ana Gestor',
      frotaManagerPhone: '+351900000000',
    })
    const { rerender } = render(<AdminTabFrota {...current} />)
    fireEvent.click(screen.getByTestId('admin-frota-create-manager'))
    expect(current.handleCreateFrotaManager).toHaveBeenCalledTimes(1)
    expect(current.setFrotaPartnerId).not.toHaveBeenCalled()

    rerender(<AdminTabFrota {...current} frotaLoading="manager" />)
    expect(screen.getByTestId('admin-frota-create-manager')).toBeDisabled()
    expect(screen.getByTestId('admin-frota-create-org')).toBeDisabled()
    expect(screen.getByTestId('admin-frota-partner-select')).toHaveValue(lisboa.id)
  })
})
