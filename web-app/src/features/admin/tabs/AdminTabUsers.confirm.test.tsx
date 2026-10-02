import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from '../../../i18n'
import type { AdminUser } from '../useAdminUsersDirectory'
import { AdminTabUsers, type AdminTabUsersProps } from './AdminTabUsers'

const ana: AdminUser = {
  id: 'user-ana',
  phone: '+351912345678',
  name: 'Ana Silva',
  role: 'driver',
  status: 'active',
  requested_role: null,
  has_driver_profile: true,
}

const reason = 'motivo de teste'

function props(over: Partial<AdminTabUsersProps> = {}): AdminTabUsersProps {
  return {
    blockConfirmId: null,
    bulkSelectedIds: {},
    cancelEdit: vi.fn(),
    deleteConfirmId: null,
    editName: ana.name,
    editOriginalName: ana.name,
    editOriginalPhone: ana.phone,
    editPhone: ana.phone,
    editingId: null,
    fetchUsersMore: vi.fn(),
    filteredSortedUsers: [ana],
    handleBlockUser: vi.fn(),
    handleBulkBlock: vi.fn(),
    handleClearUserPassword: vi.fn(async () => true as const),
    handleDelete: vi.fn(async () => true as const),
    handleDemote: vi.fn(),
    handlePromote: vi.fn(),
    handleSaveUserName: vi.fn(),
    handleSaveUserPhone: vi.fn(),
    handleUnblockUser: vi.fn(),
    isSuperAdminSession: true,
    loadUserAuditTrailIfNeeded: vi.fn(),
    setBlockConfirmId: vi.fn(),
    setBulkSelectedIds: vi.fn(),
    setDeleteConfirmId: vi.fn(),
    setEditName: vi.fn(),
    setEditPhone: vi.fn(),
    setUnblockConfirmId: vi.fn(),
    setUsersFilter: vi.fn(),
    setUsersSort: vi.fn(),
    startEdit: vi.fn(),
    token: 'tok',
    unblockConfirmId: null,
    userAuditError: {},
    userAuditLoading: null,
    userAuditRows: {},
    users: [ana],
    usersFilter: '',
    usersHasMore: false,
    usersLoadingMore: false,
    usersSort: 'name',
    ...over,
  }
}

describe('AdminTabUsers delete and password confirmation', () => {
  it('eliminar abre a confirmação sem pedido', async () => {
    await i18n.changeLanguage('pt')
    const handleDelete = vi.fn(async () => true as const)
    function Harness() {
      const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
      return <AdminTabUsers {...props({ handleDelete, deleteConfirmId, setDeleteConfirmId })} />
    }
    render(<Harness />)
    fireEvent.click(screen.getByTestId('admin-user-delete-user-ana'))
    expect(screen.getByRole('dialog', { name: 'Eliminar esta conta?' })).toBeInTheDocument()
    expect(screen.getByText(/Ana Silva \(\+351912345678\), com o papel Motorista/)).toBeInTheDocument()
    expect(screen.getByText(/não pode ser desfeita/)).toBeInTheDocument()
    expect(handleDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
  })

  it('cancelar eliminar não pede e a conta continua visível', async () => {
    await i18n.changeLanguage('pt')
    const handleDelete = vi.fn(async () => true as const)
    const setDeleteConfirmId = vi.fn()
    render(<AdminTabUsers {...props({ handleDelete, setDeleteConfirmId, deleteConfirmId: 'user-ana' })} />)
    fireEvent.click(screen.getByTestId('admin-user-delete-dialog-cancel'))
    expect(handleDelete).not.toHaveBeenCalled()
    expect(setDeleteConfirmId).toHaveBeenCalledWith(null)
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
  })

  it('motivo curto não pede a eliminação', async () => {
    await i18n.changeLanguage('pt')
    const handleDelete = vi.fn(async () => true as const)
    render(<AdminTabUsers {...props({ handleDelete, deleteConfirmId: 'user-ana' })} />)
    fireEvent.change(screen.getByTestId('admin-user-delete-dialog-reason'), { target: { value: 'curto' } })
    fireEvent.click(screen.getByTestId('admin-user-delete-dialog-confirm'))
    expect(handleDelete).not.toHaveBeenCalled()
    expect(screen.getByTestId('admin-user-delete-dialog-error')).toHaveTextContent(
      'O motivo precisa de pelo menos 10 caracteres.',
    )
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
  })

  it('confirmar eliminar faz uma chamada com o mesmo motivo', async () => {
    await i18n.changeLanguage('pt')
    const handleDelete = vi.fn(async () => true as const)
    render(<AdminTabUsers {...props({ handleDelete, deleteConfirmId: 'user-ana' })} />)
    fireEvent.change(screen.getByTestId('admin-user-delete-dialog-reason'), { target: { value: reason } })
    fireEvent.click(screen.getByTestId('admin-user-delete-dialog-confirm'))
    await waitFor(() => expect(handleDelete).toHaveBeenCalledTimes(1))
    expect(handleDelete).toHaveBeenCalledWith('user-ana', reason)
  })

  it('erro ao eliminar mantém a conta e permite tentar outra vez', async () => {
    await i18n.changeLanguage('pt')
    const handleDelete = vi
      .fn<(userId: string, governanceReason: string) => Promise<true | string>>()
      .mockResolvedValueOnce('Não é possível eliminar: o utilizador tem viagens como passageiro.')
      .mockResolvedValueOnce(true)
    render(<AdminTabUsers {...props({ handleDelete, deleteConfirmId: 'user-ana' })} />)
    fireEvent.change(screen.getByTestId('admin-user-delete-dialog-reason'), { target: { value: reason } })
    fireEvent.click(screen.getByTestId('admin-user-delete-dialog-confirm'))
    expect(await screen.findByTestId('admin-user-delete-dialog-error')).toHaveTextContent('tem viagens')
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('admin-user-delete-dialog-confirm'))
    await waitFor(() => expect(handleDelete).toHaveBeenCalledTimes(2))
    expect(handleDelete).toHaveBeenNthCalledWith(2, 'user-ana', reason)
  })

  it('retirar palavra-passe abre sem pedido, cancela sem pedido e confirma uma vez', async () => {
    await i18n.changeLanguage('pt')
    const handleClearUserPassword = vi.fn(async () => true as const)
    const view = render(
      <AdminTabUsers
        {...props({ handleClearUserPassword, editingId: ana.id, isSuperAdminSession: true })}
      />,
    )
    fireEvent.click(screen.getByTestId('admin-user-password-clear'))
    expect(screen.getByRole('dialog', { name: 'Retirar a palavra-passe?' })).toBeInTheDocument()
    expect(screen.getByText(/Ana Silva \(\+351912345678\)/)).toBeInTheDocument()
    expect(screen.getByText(/Não é criada uma palavra-passe nova/)).toBeInTheDocument()
    expect(screen.getByText(/sessões já abertas continuam válidas/)).toBeInTheDocument()
    expect(handleClearUserPassword).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('admin-user-password-dialog-cancel'))
    expect(handleClearUserPassword).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('admin-user-password-clear'))
    fireEvent.change(screen.getByTestId('admin-user-password-dialog-reason'), { target: { value: reason } })
    fireEvent.click(screen.getByTestId('admin-user-password-dialog-confirm'))
    fireEvent.click(screen.getByTestId('admin-user-password-dialog-confirm'))
    await waitFor(() => expect(handleClearUserPassword).toHaveBeenCalledTimes(1))
    expect(handleClearUserPassword).toHaveBeenCalledWith(ana.id, reason)
    view.unmount()
  })

  it('erro ao retirar a palavra-passe mantém o diálogo e permite tentar outra vez', async () => {
    await i18n.changeLanguage('pt')
    const handleClearUserPassword = vi
      .fn<(userId: string, governanceReason: string) => Promise<true | string>>()
      .mockResolvedValueOnce('Erro ao retirar a palavra-passe')
      .mockResolvedValueOnce(true)
    render(
      <AdminTabUsers {...props({ handleClearUserPassword, editingId: ana.id })} />,
    )
    fireEvent.click(screen.getByTestId('admin-user-password-clear'))
    fireEvent.change(screen.getByTestId('admin-user-password-dialog-reason'), { target: { value: reason } })
    fireEvent.click(screen.getByTestId('admin-user-password-dialog-confirm'))
    expect(await screen.findByTestId('admin-user-password-dialog-error')).toHaveTextContent(
      'Erro ao retirar a palavra-passe',
    )
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('admin-user-password-dialog-confirm'))
    await waitFor(() => expect(handleClearUserPassword).toHaveBeenCalledTimes(2))
  })

  it('sem administrador principal o botão de palavra-passe não aparece', async () => {
    await i18n.changeLanguage('pt')
    render(
      <AdminTabUsers
        {...props({ editingId: ana.id, isSuperAdminSession: false })}
      />,
    )
    expect(screen.queryByTestId('admin-user-password-clear')).not.toBeInTheDocument()
    expect(screen.getByText(/não inclui esta acção/)).toBeInTheDocument()
  })

  it('o segundo clique durante o pedido não repete a eliminação', async () => {
    await i18n.changeLanguage('pt')
    let release: (value: true) => void = () => undefined
    const handleDelete = vi.fn(
      () =>
        new Promise<true>((resolve) => {
          release = resolve
        }),
    )
    render(<AdminTabUsers {...props({ handleDelete, deleteConfirmId: 'user-ana' })} />)
    fireEvent.change(screen.getByTestId('admin-user-delete-dialog-reason'), { target: { value: reason } })
    fireEvent.click(screen.getByTestId('admin-user-delete-dialog-confirm'))
    fireEvent.click(screen.getByTestId('admin-user-delete-dialog-confirm'))
    expect(handleDelete).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('admin-user-delete-dialog-confirm')).toHaveTextContent('A eliminar…')
    release(true)
    await waitFor(() => expect(handleDelete).toHaveBeenCalledTimes(1))
  })
})
