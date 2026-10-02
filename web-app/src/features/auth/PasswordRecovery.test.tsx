import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../i18n'
import i18n from '../../i18n'
import { PasswordRecovery } from './PasswordRecovery'

const requestPasswordRecovery = vi.fn()
const verifyPasswordRecovery = vi.fn()
const completePasswordRecovery = vi.fn()

vi.mock('../../api/auth', () => ({
  requestPasswordRecovery: (...args: unknown[]) => requestPasswordRecovery(...args),
  verifyPasswordRecovery: (...args: unknown[]) => verifyPasswordRecovery(...args),
  completePasswordRecovery: (...args: unknown[]) => completePasswordRecovery(...args),
}))

describe('PasswordRecovery', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    requestPasswordRecovery.mockReset()
    verifyPasswordRecovery.mockReset()
    completePasswordRecovery.mockReset()
    requestPasswordRecovery.mockResolvedValue({ status: 'accepted' })
    verifyPasswordRecovery.mockResolvedValue({ reset_token: 'prova-de-teste' })
    completePasswordRecovery.mockResolvedValue({ status: 'accepted' })
  })

  it('percorre telefone, código, palavra-passe e volta ao login', async () => {
    const onBack = vi.fn()
    render(<PasswordRecovery initialPhone="+351912345678" onBack={onBack} />)
    expect(screen.getByText('Recuperar palavra-passe')).toBeInTheDocument()
    expect(screen.getByLabelText('Telemóvel')).toHaveValue('+351912345678')
    fireEvent.click(screen.getByTestId('recovery-send'))
    expect(await screen.findByText(/Se existir uma conta associada/)).toBeInTheDocument()
    expect(requestPasswordRecovery).toHaveBeenCalledWith('+351912345678')
    fireEvent.change(screen.getByTestId('recovery-code'), { target: { value: '654321' } })
    fireEvent.click(screen.getByTestId('recovery-verify'))
    expect(await screen.findByLabelText('Nova palavra-passe')).toBeInTheDocument()
    expect(screen.getByLabelText('Repetir palavra-passe')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('recovery-password'), { target: { value: 'NovaPass12' } })
    fireEvent.change(screen.getByTestId('recovery-confirm'), { target: { value: 'outra' } })
    fireEvent.click(screen.getByTestId('recovery-save'))
    expect(await screen.findByTestId('recovery-error')).toHaveTextContent('As palavras-passe não coincidem.')
    expect(completePasswordRecovery).not.toHaveBeenCalled()
    fireEvent.change(screen.getByTestId('recovery-confirm'), { target: { value: 'NovaPass12' } })
    fireEvent.click(screen.getByTestId('recovery-save'))
    expect(await screen.findByTestId('recovery-success')).toHaveTextContent(
      'Palavra-passe actualizada. Já podes iniciar sessão.',
    )
    expect(completePasswordRecovery).toHaveBeenCalledWith('prova-de-teste', 'NovaPass12', 'NovaPass12')
    fireEvent.click(screen.getByTestId('recovery-back'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('mostra o código inválido e o canal indisponível sem falar de conta', async () => {
    requestPasswordRecovery.mockRejectedValueOnce({ status: 503, detail: 'otp_auth_unavailable' })
    render(<PasswordRecovery initialPhone="+351912345678" onBack={vi.fn()} />)
    fireEvent.click(screen.getByTestId('recovery-send'))
    expect(await screen.findByTestId('recovery-error')).toHaveTextContent(
      'Neste momento não conseguimos enviar o código. Tenta mais tarde.',
    )
    expect(screen.queryByText(/não está registado|não encontrada/i)).not.toBeInTheDocument()

    requestPasswordRecovery.mockResolvedValueOnce({ status: 'accepted' })
    fireEvent.click(screen.getByTestId('recovery-send'))
    await screen.findByTestId('recovery-code')
    verifyPasswordRecovery.mockRejectedValueOnce({ status: 401, detail: 'invalid_otp' })
    fireEvent.change(screen.getByTestId('recovery-code'), { target: { value: '000000' } })
    fireEvent.click(screen.getByTestId('recovery-verify'))
    await waitFor(() =>
      expect(screen.getByTestId('recovery-error')).toHaveTextContent(
        'O código não é válido ou já expirou.',
      ),
    )
  })
})
