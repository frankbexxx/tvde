import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminUser } from './useAdminUsersDirectory'
import { AdminTabDados, type AdminTabDadosProps } from './tabs/AdminTabDados'

const USER_ID = '2481222c-50f6-403f-aa59-8d386f1cd00a'
const PARTNER_ID = '11111111-2222-4333-8444-555555555555'
const MISSING_PARTNER = '99999999-8888-4777-8666-555555555555'

function user(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: USER_ID,
    phone: '+351912345678',
    name: 'Maria do Carmo Albuquerque da Silva Pereira',
    role: 'driver',
    status: 'active',
    requested_role: null,
    has_driver_profile: true,
    ...overrides,
  }
}

function props(over: Partial<AdminTabDadosProps> = {}): AdminTabDadosProps {
  return {
    copy: vi.fn(),
    dataLoading: false,
    dataSearch: '',
    driverStatusFeedback: null,
    driverStatusLoading: null,
    driversList: [
      { user_id: USER_ID, partner_id: PARTNER_ID, status: 'approved' },
    ],
    fetchDataVisibility: vi.fn(),
    handleApproveDriver: vi.fn(),
    handleRejectDriver: vi.fn(),
    partners: [
      {
        id: PARTNER_ID,
        name: 'Frota do Atlântico Largo de São Vicente',
        created_at: '2026-07-23T08:00:00Z',
      },
    ],
    setDataSearch: vi.fn(),
    users: [user()],
    ...over,
  }
}

describe('AdminTabDados driver identity', () => {
  it('mostra nome, estado e frota, com os ids por baixo', () => {
    render(<AdminTabDados {...props()} />)
    expect(screen.getByTestId(`admin-driver-name-${USER_ID}`)).toHaveTextContent(
      'Maria do Carmo Albuquerque da Silva Pereira',
    )
    expect(screen.getByTestId(`admin-driver-row-${USER_ID}`)).toHaveTextContent('+351912345678')
    expect(screen.getByTestId(`admin-driver-status-${USER_ID}`)).toHaveTextContent('Aprovado (approved)')
    expect(screen.getByTestId(`admin-driver-fleet-${USER_ID}`)).toHaveTextContent(
      'Frota: Frota do Atlântico Largo de São Vicente',
    )
    const row = screen.getByTestId(`admin-driver-row-${USER_ID}`)
    expect(row).toHaveTextContent(USER_ID)
    expect(row).toHaveTextContent(PARTNER_ID)
    expect(screen.getByTestId(`admin-driver-name-${USER_ID}`)).not.toHaveTextContent(USER_ID)
  })

  it('sem partner_id diz que não há frota e mantém o user id', () => {
    render(
      <AdminTabDados
        {...props({
          driversList: [{ user_id: USER_ID, partner_id: ' ', status: 'pending' }],
        })}
      />,
    )
    expect(screen.getByTestId(`admin-driver-name-${USER_ID}`)).toHaveTextContent(
      'Maria do Carmo Albuquerque da Silva Pereira',
    )
    expect(screen.getByTestId(`admin-driver-fleet-${USER_ID}`)).toHaveTextContent('Sem frota associada')
    expect(screen.getByTestId(`admin-driver-row-${USER_ID}`)).toHaveTextContent(USER_ID)
    expect(screen.getByTestId(`admin-driver-row-${USER_ID}`)).not.toHaveTextContent('partner_id')
    expect(screen.getByTestId(`admin-driver-fleet-${USER_ID}`).textContent).not.toMatch(/undefined|null/)
  })

  it('partner_id sem frota carregada não diz que não há frota', () => {
    render(
      <AdminTabDados
        {...props({
          driversList: [{ user_id: USER_ID, partner_id: MISSING_PARTNER, status: 'approved' }],
          partners: [],
        })}
      />,
    )
    expect(screen.getByTestId(`admin-driver-fleet-${USER_ID}`)).toHaveTextContent('Frota não identificada')
    expect(screen.getByTestId(`admin-driver-fleet-${USER_ID}`)).not.toHaveTextContent('Sem frota associada')
    expect(screen.getByTestId(`admin-driver-row-${USER_ID}`)).toHaveTextContent(MISSING_PARTNER)
  })

  it('pessoa carregada sem nome usa o mesmo fallback', () => {
    render(
      <AdminTabDados
        {...props({
          users: [user({ name: '  ', phone: 'null' })],
        })}
      />,
    )
    expect(screen.getByTestId(`admin-driver-name-${USER_ID}`)).toHaveTextContent(
      'Motorista sem nome disponível',
    )
    expect(screen.getByTestId(`admin-driver-row-${USER_ID}`).textContent).not.toMatch(/undefined|\bnull\b/)
  })

  it('sem pessoa correspondente usa fallback e não o uuid como título', () => {
    render(<AdminTabDados {...props({ users: [] })} />)
    const title = screen.getByTestId(`admin-driver-name-${USER_ID}`)
    expect(title).toHaveTextContent('Motorista sem nome disponível')
    expect(title).not.toHaveTextContent(USER_ID)
    expect(title.textContent).not.toMatch(/undefined|null/)
    expect(screen.getByTestId(`admin-driver-row-${USER_ID}`)).toHaveTextContent(USER_ID)
    expect(screen.queryByText('+351912345678')).not.toBeInTheDocument()
  })

  it('copiar envia o id completo, sem corte', () => {
    const copy = vi.fn()
    render(<AdminTabDados {...props({ copy })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiar user' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copiar frota' }))
    expect(copy).toHaveBeenNthCalledWith(1, USER_ID)
    expect(copy).toHaveBeenNthCalledWith(2, PARTNER_ID)
  })

  it('a pesquisa existente também encontra pelo nome e pela frota, e o id continua a filtrar', () => {
    const { rerender } = render(<AdminTabDados {...props({ dataSearch: 'Atlântico' })} />)
    expect(screen.getByTestId(`admin-driver-row-${USER_ID}`)).toBeInTheDocument()

    rerender(<AdminTabDados {...props({ dataSearch: USER_ID.slice(0, 8) })} />)
    expect(screen.getByTestId(`admin-driver-row-${USER_ID}`)).toBeInTheDocument()

    rerender(<AdminTabDados {...props({ dataSearch: 'não existe' })} />)
    expect(screen.queryByTestId(`admin-driver-row-${USER_ID}`)).not.toBeInTheDocument()
  })
})
