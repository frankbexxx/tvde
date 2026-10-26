import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import i18n from '../../i18n'
import { LoginScreen } from './LoginScreen'
import { appBuildDisplayLine } from '../../lib/appBuildMeta'

vi.mock('../settings/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector-stub">lang</div>,
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
  isBackofficeStaffRole: () => false,
}))

describe('LoginScreen content (UX-LOGIN-MOB-02)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    localStorage.clear()
  })

  it('renderiza todos os blocos do ecrã de autenticação', async () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('language-selector-stub')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Passageiro' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Motorista' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Parceiro' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Administrador' })).toBeInTheDocument()

    expect(screen.getByTestId('legal-accept-checkbox')).toBeInTheDocument()
    expect(screen.getByTestId('legal-terms-link')).toBeInTheDocument()
    expect(screen.getByTestId('legal-privacy-link')).toBeInTheDocument()

    expect(await screen.findByTestId('google-sign-in')).toBeInTheDocument()
    expect(screen.getByLabelText('Telemóvel')).toBeInTheDocument()
    expect(screen.getByLabelText('Palavra-passe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByTestId('forgot-password')).toBeInTheDocument()

    expect(screen.getByTestId('login-version-footer')).toBeInTheDocument()
    expect(screen.getByTestId('app-build-label')).toHaveTextContent(appBuildDisplayLine)

    expect(screen.getByTestId('legal-consumer-rights-public')).toBeInTheDocument()
    expect(screen.getByTestId('lre-link-public')).toHaveTextContent('Livro de Reclamações')
    expect(screen.getByTestId('ral-caccl-link-public')).toBeInTheDocument()
    expect(screen.getByTestId('ral-cniacc-link-public')).toBeInTheDocument()
  })

  it('não usa o wrapper login-scroll-center (regressão UX-LOGIN-MOB-01)', () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('login-scroll-center')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-scroll-root')).toBeInTheDocument()
    expect(screen.getByTestId('login-card')).toBeInTheDocument()
  })

  it('recuperação de palavra-passe mantém scroll root único', () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('forgot-password'))
    expect(screen.getByTestId('login-scroll-root')).toBeInTheDocument()
    expect(screen.queryByTestId('login-card')).not.toBeInTheDocument()
  })
})
