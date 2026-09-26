import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginScreen } from './LoginScreen'
import { sha256Hex } from './googleOauthState'

const loginGoogleIdToken = vi.fn()
const signIn = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt' } }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}))

vi.mock('./capacitorPlatform', () => ({
  isCapacitorNative: () => true,
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
    loginGoogleIdToken,
    completeGoogleOnboarding: vi.fn(),
    linkGoogleAccount: vi.fn(),
  }),
  isBackofficeStaffRole: () => false,
}))

vi.mock('../settings/LanguageSelector', () => ({
  LanguageSelector: () => null,
}))

vi.mock('../../design-system/components/brand/BrandStripe', () => ({
  BrandStripe: () => null,
}))

vi.mock('../../components/legal/LegalLocaleNotice', () => ({
  LegalLocaleNotice: () => null,
}))

vi.mock('../../components/legal/LegalConsumerRights', () => ({
  LegalConsumerRights: () => null,
}))

vi.mock('@capawesome/capacitor-google-sign-in', () => ({
  GoogleSignIn: {
    initialize: vi.fn(async () => undefined),
    signIn: (...args: unknown[]) => signIn(...args),
  },
}))

describe('native Google nonce wiring', () => {
  beforeEach(() => {
    loginGoogleIdToken.mockReset()
    signIn.mockReset()
    loginGoogleIdToken.mockResolvedValue({ access_token: 'not-logged', role: 'passenger' })
    signIn.mockResolvedValue({ idToken: 'header.payload.signature' })
    vi.stubGlobal('location', { ...window.location, assign: vi.fn() })
  })

  it('passes sha256 hex to the plugin and the raw nonce to the backend', async () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByTestId('google-sign-in'))
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1))
    const pluginNonce = signIn.mock.calls[0][0].nonce as string
    await waitFor(() => expect(loginGoogleIdToken).toHaveBeenCalledTimes(1))
    const backendNonce = loginGoogleIdToken.mock.calls[0][1] as string
    expect(backendNonce).toMatch(/^[0-9a-f]{32}$/)
    expect(pluginNonce).toMatch(/^[0-9a-f]{64}$/)
    expect(pluginNonce).not.toBe(backendNonce)
    expect(pluginNonce).toBe(await sha256Hex(backendNonce))
  })
})
