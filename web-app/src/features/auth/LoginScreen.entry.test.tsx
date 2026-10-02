import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import i18n from '../../i18n'
import { LS_LAST_PHONE } from '../../utils/authStorage'
import { appBuildDisplayLine, appGitShortSha, appVersion } from '../../lib/appBuildMeta'
import { LoginScreen } from './LoginScreen'

vi.mock('../settings/LanguageSelector', () => ({
  LanguageSelector: () => null,
}))

vi.mock('../../api/auth', () => ({
  getConfig: async () => ({
    google_oauth_enabled: true,
    google_oauth_client_id: 'cid.apps.googleusercontent.com',
    otp_signup_enabled: false,
  }),
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginGoogleIdToken: vi.fn(),
    completeGoogleOnboarding: vi.fn(),
    linkGoogleAccount: vi.fn(),
  }),
  isBackofficeStaffRole: (role: string) => role === 'admin' || role === 'super_admin',
}))

const roles = ['passenger', 'driver', 'partner', 'admin'] as const

describe('LoginScreen entry', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    localStorage.clear()
    localStorage.setItem(LS_LAST_PHONE, '+351900000683')
  })

  it.each(roles)('explica o papel %s, deixa a palavra-passe vazia e mostra a versão real', async (role) => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole={role} />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Telemóvel')).toHaveValue('+351900000683')
    expect(screen.getByLabelText('Palavra-passe')).toHaveValue('')
    expect(screen.getByRole('tab', { name: 'Passageiro' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Motorista' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Parceiro' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Administrador' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
      role === 'admin' ? 'Administrador' : role === 'passenger' ? 'Passageiro' : role === 'driver' ? 'Motorista' : 'Parceiro',
    )
    expect(screen.getByText('Obrigatório para continuar.')).toBeInTheDocument()
    expect(screen.queryByText('Obrigatório para criar conta.')).not.toBeInTheDocument()
    expect(screen.queryByText(/beta mode/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('app-build-label')).toHaveTextContent(appBuildDisplayLine)
    expect(appBuildDisplayLine).toBe(`Versão ${appVersion} · build ${appGitShortSha}`)
    expect(screen.getByText(/indica esta versão e este build ao suporte/)).toBeInTheDocument()
  })

  it('mostra Continuar com Google nos quatro papéis', async () => {
    for (const role of roles) {
      const { unmount } = render(
        <MemoryRouter>
          <LoginScreen requestedRole={role} />
        </MemoryRouter>,
      )
      expect(await screen.findByTestId('google-sign-in')).toHaveTextContent('Continuar com Google')
      expect(screen.queryByText('Só para passageiro (v1).')).not.toBeInTheDocument()
      unmount()
    }
  })
})
