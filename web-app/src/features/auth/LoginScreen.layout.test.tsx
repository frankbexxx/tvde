import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import i18n from '../../i18n'
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
  isBackofficeStaffRole: () => false,
}))

describe('LoginScreen mobile layout (UX-LOGIN-MOB-02)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    localStorage.clear()
  })

  it('usa um único scroll root com safe-area (sem min-h-dvh aninhado)', () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )

    const root = screen.getByTestId('login-scroll-root')
    expect(root.className).toMatch(/overflow-y-auto/)
    expect(root.className).toMatch(/h-dvh/)
    expect(root.className).toMatch(/max-h-dvh/)
    expect(root.className).toMatch(/overscroll-y-contain/)
    expect(root.className).toMatch(/safe-area-inset-bottom/)
    expect(root.className).toMatch(/scroll-pb-/)
    expect(root.className).not.toMatch(/justify-center/)

    const card = screen.getByTestId('login-card')
    expect(card.className).toMatch(/shrink-0/)
    expect(card.className).toMatch(/mx-auto/)
    expect(card.className).not.toMatch(/overflow-hidden/)
  })

  it('rodapé legal e versão ficam dentro do card após Entrar', () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )

    const submit = screen.getByRole('button', { name: 'Entrar' })
    const footer = screen.getByTestId('login-version-footer')
    const lre = screen.getByTestId('lre-link-public')

    expect(submit.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(footer.contains(lre)).toBe(true)
  })
})
