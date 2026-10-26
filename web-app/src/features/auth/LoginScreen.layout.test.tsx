import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import i18n from '../../i18n'
import { LoginScreen } from './LoginScreen'

vi.mock('../settings/LanguageSelector', () => ({
  LanguageSelector: () => null,
}))

vi.mock('../../api/auth', () => ({
  getConfig: async () => ({
    google_oauth_enabled: false,
    google_oauth_client_id: '',
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

describe('LoginScreen mobile layout', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    localStorage.clear()
  })

  it('usa scroll root com safe-area e centro expansível (sem m-auto no card)', () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )

    const root = screen.getByTestId('login-scroll-root')
    expect(root.className).toMatch(/overflow-y-auto/)
    expect(root.className).toMatch(/min-h-dvh/)
    expect(root.className).toMatch(/overscroll-y-contain/)
    expect(root.className).toMatch(/safe-area-inset-bottom/)
    expect(root.className).toMatch(/scroll-pb-/)

    const center = screen.getByTestId('login-scroll-center')
    expect(center.className).toMatch(/min-h-dvh/)
    expect(center.className).toMatch(/justify-center/)
    expect(center.className).not.toMatch(/\bm-auto\b/)
  })

  it('mantém rodapé de versão e checkbox legal no DOM', () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('app-build-label')).toBeInTheDocument()
    expect(screen.getByTestId('legal-accept-checkbox')).not.toBeChecked()
    expect(screen.getByText('Obrigatório para continuar.')).toBeInTheDocument()
    expect(screen.getByTestId('login-version-footer')).toContainElement(screen.getByTestId('app-build-label'))
  })

  it('recuperação de palavra-passe reutiliza o mesmo scroll root', () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByTestId('forgot-password'))
    expect(screen.getByTestId('login-scroll-root')).toBeInTheDocument()
    expect(screen.queryByTestId('login-scroll-center')).not.toBeInTheDocument()
  })

  it('preserva tabs de navegação entre perfis', () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="driver" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: 'Motorista', selected: true })).toHaveAttribute('href', '/driver')
    expect(screen.getByRole('tab', { name: 'Passageiro' })).toHaveAttribute('href', '/passenger')
  })
})
