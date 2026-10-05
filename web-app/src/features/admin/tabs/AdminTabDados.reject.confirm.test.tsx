import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from '../../../i18n'
import type { AdminUser } from '../useAdminUsersDirectory'
import { AdminTabDados, type AdminTabDadosProps } from './AdminTabDados'

const USER_ID = 'drv-pending'
const reason = 'Documentação incompleta para operar'

const ana: AdminUser = {
  id: USER_ID,
  phone: '+351912345678',
  name: 'Ana Silva',
  role: 'driver',
  status: 'active',
  requested_role: null,
  has_driver_profile: true,
}

function baseProps(over: Partial<AdminTabDadosProps> = {}): AdminTabDadosProps {
  return {
    copy: vi.fn(),
    dataLoading: false,
    dataSearch: '',
    driverStatusFeedback: null,
    driverStatusLoading: null,
    driversList: [{ user_id: USER_ID, partner_id: 'p1', status: 'pending' }],
    fetchDataVisibility: vi.fn(),
    handleApproveDriver: vi.fn(),
    handleRejectDriver: vi.fn(async () => true),
    partners: [{ id: 'p1', name: 'Frota Teste', created_at: '2026-01-01T00:00:00Z' }],
    setDataSearch: vi.fn(),
    users: [ana],
    ...over,
  }
}

describe('AdminTabDados reject confirmation', () => {
  it('abre a confirmação sem pedir a rejeição', async () => {
    await i18n.changeLanguage('pt')
    const handleRejectDriver = vi.fn(async () => true)
    render(<AdminTabDados {...baseProps({ handleRejectDriver })} />)
    fireEvent.click(screen.getByTestId(`admin-driver-reject-${USER_ID}`))
    const dialog = screen.getByRole('dialog', { name: 'Rejeitar este motorista?' })
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Ana Silva · +351912345678')
    expect(handleRejectDriver).not.toHaveBeenCalled()
  })

  it('cancelar fecha sem pedido', async () => {
    await i18n.changeLanguage('pt')
    const handleRejectDriver = vi.fn(async () => true)
    render(<AdminTabDados {...baseProps({ handleRejectDriver })} />)
    fireEvent.click(screen.getByTestId(`admin-driver-reject-${USER_ID}`))
    fireEvent.click(screen.getByTestId('admin-driver-reject-dialog-cancel'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(handleRejectDriver).not.toHaveBeenCalled()
  })

  it('motivo curto não pede a rejeição', async () => {
    await i18n.changeLanguage('pt')
    const handleRejectDriver = vi.fn(async () => true)
    render(<AdminTabDados {...baseProps({ handleRejectDriver })} />)
    fireEvent.click(screen.getByTestId(`admin-driver-reject-${USER_ID}`))
    fireEvent.change(screen.getByTestId('admin-driver-reject-dialog-reason'), {
      target: { value: 'curto' },
    })
    fireEvent.click(screen.getByTestId('admin-driver-reject-dialog-confirm'))
    expect(handleRejectDriver).not.toHaveBeenCalled()
    expect(screen.getByTestId('admin-driver-reject-dialog-error')).toHaveTextContent(
      'O motivo precisa de pelo menos 10 caracteres.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('confirmar faz uma chamada com o motivo', async () => {
    await i18n.changeLanguage('pt')
    const handleRejectDriver = vi.fn(async () => true)
    render(<AdminTabDados {...baseProps({ handleRejectDriver })} />)
    fireEvent.click(screen.getByTestId(`admin-driver-reject-${USER_ID}`))
    fireEvent.change(screen.getByTestId('admin-driver-reject-dialog-reason'), {
      target: { value: reason },
    })
    fireEvent.click(screen.getByTestId('admin-driver-reject-dialog-confirm'))
    await waitFor(() => expect(handleRejectDriver).toHaveBeenCalledTimes(1))
    expect(handleRejectDriver).toHaveBeenCalledWith(USER_ID, reason)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('loading não duplica a chamada', async () => {
    await i18n.changeLanguage('pt')
    let release: (value: boolean) => void = () => undefined
    const handleRejectDriver = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve
        }),
    )
    render(<AdminTabDados {...baseProps({ handleRejectDriver })} />)
    fireEvent.click(screen.getByTestId(`admin-driver-reject-${USER_ID}`))
    fireEvent.change(screen.getByTestId('admin-driver-reject-dialog-reason'), {
      target: { value: reason },
    })
    fireEvent.click(screen.getByTestId('admin-driver-reject-dialog-confirm'))
    fireEvent.click(screen.getByTestId('admin-driver-reject-dialog-confirm'))
    expect(handleRejectDriver).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('admin-driver-reject-dialog-confirm')).toHaveTextContent('A rejeitar…')
    release(true)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(handleRejectDriver).toHaveBeenCalledTimes(1)
  })

  it('erro backend mantém o diálogo e o contexto', async () => {
    await i18n.changeLanguage('pt')
    const handleRejectDriver = vi
      .fn<(id: string, reason: string) => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    render(<AdminTabDados {...baseProps({ handleRejectDriver })} />)
    fireEvent.click(screen.getByTestId(`admin-driver-reject-${USER_ID}`))
    fireEvent.change(screen.getByTestId('admin-driver-reject-dialog-reason'), {
      target: { value: reason },
    })
    fireEvent.click(screen.getByTestId('admin-driver-reject-dialog-confirm'))
    expect(await screen.findByTestId('admin-driver-reject-dialog-error')).toHaveTextContent(
      'Erro ao rejeitar o motorista',
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Ana Silva · +351912345678')
    fireEvent.click(screen.getByTestId('admin-driver-reject-dialog-confirm'))
    await waitFor(() => expect(handleRejectDriver).toHaveBeenCalledTimes(2))
    expect(handleRejectDriver).toHaveBeenNthCalledWith(1, USER_ID, reason)
    expect(handleRejectDriver).toHaveBeenNthCalledWith(2, USER_ID, reason)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
