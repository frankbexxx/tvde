import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from '../../../i18n'
import { AdminTabPending } from './AdminTabPending'

const phone = '+351912345678'

function renderPending(
  handleApprove: (value: string) => void | Promise<void | boolean> = vi.fn(async () => true),
  role = 'driver',
) {
  render(
    <AdminTabPending
      handleApprove={handleApprove}
      pending={[{ phone, requested_role: role }]}
    />,
  )
  return handleApprove
}

describe('AdminTabPending approval confirmation', () => {
  it('abre a confirmação sem pedir a aprovação', async () => {
    await i18n.changeLanguage('pt')
    const handleApprove = renderPending()
    fireEvent.click(screen.getByTestId(`admin-pending-approve-${phone}`))
    expect(screen.getByRole('dialog', { name: 'Aprovar esta conta?' })).toBeInTheDocument()
    expect(screen.getByText(/Vais aprovar o telemóvel \+351912345678 como Motorista/)).toBeInTheDocument()
    expect(handleApprove).not.toHaveBeenCalled()
    expect(screen.getByText(phone)).toBeInTheDocument()
  })

  it('cancelar fecha sem pedido e a conta continua na lista', async () => {
    await i18n.changeLanguage('pt')
    const handleApprove = renderPending()
    fireEvent.click(screen.getByTestId(`admin-pending-approve-${phone}`))
    fireEvent.click(screen.getByTestId('admin-pending-approve-cancel'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(handleApprove).not.toHaveBeenCalled()
    expect(screen.getByText(phone)).toBeInTheDocument()
    expect(screen.getByText('driver')).toBeInTheDocument()
  })

  it('confirmar faz uma chamada com o mesmo telefone', async () => {
    await i18n.changeLanguage('pt')
    const handleApprove = renderPending()
    fireEvent.click(screen.getByTestId(`admin-pending-approve-${phone}`))
    fireEvent.click(screen.getByTestId('admin-pending-approve-confirm'))
    await waitFor(() => expect(handleApprove).toHaveBeenCalledTimes(1))
    expect(handleApprove).toHaveBeenCalledWith(phone)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('um segundo clique durante o pedido não repete a chamada', async () => {
    await i18n.changeLanguage('pt')
    let release: (value: boolean) => void = () => undefined
    const handleApprove = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve
        }),
    )
    renderPending(handleApprove)
    fireEvent.click(screen.getByTestId(`admin-pending-approve-${phone}`))
    fireEvent.click(screen.getByTestId('admin-pending-approve-confirm'))
    fireEvent.click(screen.getByTestId('admin-pending-approve-confirm'))
    expect(handleApprove).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('admin-pending-approve-confirm')).toHaveTextContent('A aprovar…')
    release(true)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(handleApprove).toHaveBeenCalledTimes(1)
  })

  it('erro mantém a confirmação e permite tentar outra vez', async () => {
    await i18n.changeLanguage('pt')
    const handleApprove = vi
      .fn<(value: string) => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    renderPending(handleApprove, 'passenger')
    fireEvent.click(screen.getByTestId(`admin-pending-approve-${phone}`))
    fireEvent.click(screen.getByTestId('admin-pending-approve-confirm'))
    expect(await screen.findByTestId('admin-pending-approve-error')).toHaveTextContent('Erro ao aprovar')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/como Passageiro/)).toBeInTheDocument()
    expect(screen.getByText(phone)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('admin-pending-approve-confirm'))
    await waitFor(() => expect(handleApprove).toHaveBeenCalledTimes(2))
    expect(handleApprove).toHaveBeenNthCalledWith(1, phone)
    expect(handleApprove).toHaveBeenNthCalledWith(2, phone)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
