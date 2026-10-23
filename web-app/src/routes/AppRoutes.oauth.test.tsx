import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import i18n from '../i18n'
import { AppRoutes } from './index'
import { beginGoogleOAuthFlow, clearGoogleOAuthPending } from '../features/auth/googleOauthState'

const useAuthMock = vi.fn()
const loginGoogle = vi.fn()
const getStoredAccessTokenMock = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('../features/auth/LegalAcceptanceGate', () => ({
  LegalAcceptanceBoundary: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../components/layout/AppHeaderBar', () => ({
  AppHeaderBar: () => null,
}))

vi.mock('../features/passenger/PassengerDashboard', () => ({
  PassengerDashboard: () => <div data-testid="passenger-dashboard">passenger-home</div>,
}))

vi.mock('../features/driver/DriverDashboard', () => ({
  DriverDashboard: () => <div data-testid="driver-dashboard">driver-home</div>,
}))

vi.mock('../features/admin/AdminDashboard', () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard">admin-home</div>,
}))

vi.mock('../features/partner/PartnerLayout', () => ({
  PartnerLayout: () => <div data-testid="partner-dashboard">partner-home</div>,
}))

vi.mock('../api/auth', () => ({
  getConfig: async () => ({
    google_oauth_enabled: true,
    google_oauth_client_id: 'cid.apps.googleusercontent.com',
    otp_signup_enabled: false,
  }),
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('../features/settings/LanguageSelector', () => ({
  LanguageSelector: () => null,
}))

vi.mock('../utils/authStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/authStorage')>()
  return {
    ...actual,
    getStoredAccessToken: () => getStoredAccessTokenMock(),
  }
})

function baseAuth(overrides: Record<string, unknown> = {}) {
  return {
    isLoading: false,
    authBootstrapMode: 'login_session' as const,
    isAuthenticated: false,
    isAdmin: false,
    loadError: null,
    loadTokens: vi.fn(),
    splashPrimary: 'A arrancar…',
    appRouteRole: 'passenger' as const,
    sessionRole: 'passenger' as const,
    token: null,
    setAppRouteRole: vi.fn(),
    loginGoogle,
    completeGoogleOnboarding: vi.fn(),
    linkGoogleAccount: vi.fn(),
    ...overrides,
  }
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('AppRoutes Google OAuth callback', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    sessionStorage.clear()
    loginGoogle.mockReset()
    useAuthMock.mockReset()
    getStoredAccessTokenMock.mockReturnValue('session-jwt')
  })

  it('monta o callback com JWT válido no pathname OAuth', () => {
    const state = beginGoogleOAuthFlow('add_identity')
    useAuthMock.mockReturnValue(
      baseAuth({
        isAuthenticated: true,
        token: 'session-jwt',
        sessionRole: 'passenger',
      }),
    )
    renderAt(`/auth/google/callback?code=abc&state=${state}`)
    expect(screen.getByPlaceholderText('Palavra-passe para confirmar')).toBeInTheDocument()
    expect(screen.queryByTestId('passenger-dashboard')).not.toBeInTheDocument()
  })

  it('monta o callback sem JWT no pathname OAuth', () => {
    getStoredAccessTokenMock.mockReturnValue(null)
    const state = beginGoogleOAuthFlow('login')
    useAuthMock.mockReturnValue(baseAuth())
    renderAt(`/auth/google/callback?code=abc&state=${state}`)
    expect(screen.getByText(/concluir login com Google/i)).toBeInTheDocument()
    expect(screen.queryByTestId('passenger-dashboard')).not.toBeInTheDocument()
  })

  it('com JWT e pending add_identity mostra o formulário de confirmação', () => {
    const state = beginGoogleOAuthFlow('add_identity', '/passenger')
    useAuthMock.mockReturnValue(
      baseAuth({
        isAuthenticated: true,
        token: 'session-jwt',
      }),
    )
    renderAt(`/auth/google/callback?code=abc&state=${state}`)
    expect(screen.getByPlaceholderText('Palavra-passe para confirmar')).toBeInTheDocument()
    expect(loginGoogle).not.toHaveBeenCalled()
  })

  it('login normal continua a mostrar LoginScreen em /passenger sem sessão', () => {
    getStoredAccessTokenMock.mockReturnValue(null)
    useAuthMock.mockReturnValue(baseAuth())
    renderAt('/passenger')
    expect(screen.getByLabelText('Telemóvel')).toBeInTheDocument()
    expect(screen.queryByTestId('passenger-dashboard')).not.toBeInTheDocument()
  })

  it('callback inválido ou expirado não chama loginGoogle nem add identity', async () => {
    useAuthMock.mockReturnValue(
      baseAuth({
        isAuthenticated: true,
        token: 'session-jwt',
      }),
    )
    renderAt('/auth/google/callback?code=abc&state=unknown-state')
    expect(await screen.findByText(/não corresponde a esta sessão/i)).toBeInTheDocument()
    expect(loginGoogle).not.toHaveBeenCalled()
  })

  it('após pending consumido e logout não reapresenta o formulário add indevidamente', () => {
    getStoredAccessTokenMock.mockReturnValue(null)
    const state = beginGoogleOAuthFlow('add_identity')
    clearGoogleOAuthPending()
    useAuthMock.mockReturnValue(baseAuth())
    renderAt(`/auth/google/callback?code=abc&state=${state}`)
    expect(screen.queryByPlaceholderText('Palavra-passe para confirmar')).not.toBeInTheDocument()
    expect(screen.getByText(/não corresponde a esta sessão/i)).toBeInTheDocument()
  })

  it('rota /passenger autenticada continua a montar o dashboard', async () => {
    useAuthMock.mockReturnValue(
      baseAuth({
        isAuthenticated: true,
        token: 'session-jwt',
        sessionRole: 'passenger',
      }),
    )
    renderAt('/passenger')
    expect(await screen.findByTestId('passenger-dashboard')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Palavra-passe para confirmar')).not.toBeInTheDocument()
  })

  it('não monta callback enquanto AuthProvider ainda está a carregar', () => {
    const state = beginGoogleOAuthFlow('add_identity')
    useAuthMock.mockReturnValue(
      baseAuth({
        isLoading: true,
        isAuthenticated: true,
        token: 'session-jwt',
      }),
    )
    renderAt(`/auth/google/callback?code=abc&state=${state}`)
    expect(screen.getByText('A arrancar…')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Palavra-passe para confirmar')).not.toBeInTheDocument()
  })
})
