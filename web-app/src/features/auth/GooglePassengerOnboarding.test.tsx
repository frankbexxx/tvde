import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginScreen } from './LoginScreen'
import { GooglePassengerOnboarding } from './GooglePassengerOnboarding'
import { readGoogleOnboarding } from './googleOnboarding'
import ptAuth from '../../i18n/locales/pt/auth.json'
import enAuth from '../../i18n/locales/en/auth.json'

const loginGoogleIdToken = vi.fn()
const completeGoogleOnboarding = vi.fn()
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
    completeGoogleOnboarding,
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

const onboardingError = {
  status: 403,
  detail: {
    code: 'google_onboarding_required',
    name: 'Ana Example',
    email: 'ana@example.com',
  },
}

describe('Google passenger onboarding', () => {
  beforeEach(() => {
    loginGoogleIdToken.mockReset()
    completeGoogleOnboarding.mockReset()
    signIn.mockReset()
    signIn.mockResolvedValue({ idToken: 'header.payload.signature' })
    vi.stubGlobal('location', { ...window.location, assign: vi.fn() })
  })

  it('reads the onboarding contract and ignores a plain pending_approval', () => {
    expect(readGoogleOnboarding(onboardingError)).toEqual({
      name: 'Ana Example',
      email: 'ana@example.com',
      idToken: null,
    })
    expect(readGoogleOnboarding({ status: 403, detail: 'pending_approval' })).toBeNull()
  })

  it('opens the screen from a native Google response and submits the same id token', async () => {
    loginGoogleIdToken.mockRejectedValue(onboardingError)
    completeGoogleOnboarding.mockResolvedValue({ access_token: 'app-session', role: 'passenger' })

    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByTestId('google-sign-in'))

    const email = await screen.findByTestId('google-onboarding-email')
    expect(email).toHaveAttribute('readonly')
    expect(email).toHaveValue('ana@example.com')
    expect(screen.getByTestId('google-onboarding-name')).toHaveValue('Ana Example')

    const submit = screen.getByTestId('google-onboarding-submit')
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByTestId('google-onboarding-phone'), {
      target: { value: '912345678' },
    })
    expect(submit).toBeDisabled()
    fireEvent.click(screen.getByTestId('legal-accept-checkbox'))
    expect(submit).toBeEnabled()

    fireEvent.click(submit)
    await waitFor(() => expect(completeGoogleOnboarding).toHaveBeenCalledTimes(1))
    expect(completeGoogleOnboarding).toHaveBeenCalledWith({
      idToken: 'header.payload.signature',
      nonce: expect.stringMatching(/^[0-9a-f]{32}$/),
      name: 'Ana Example',
      phone: '+351912345678',
      acceptLegal: true,
    })
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/passenger'))
    expect(localStorage.getItem('google_id_token')).toBeNull()
  })

  it('shows the duplicate-phone message and does not open the shell', async () => {
    const onComplete = vi.fn().mockRejectedValue({ status: 409, detail: 'phone_already_used' })
    const onDone = vi.fn()
    render(
      <GooglePassengerOnboarding
        email="ana@example.com"
        suggestedName="Ana Example"
        idToken="header.payload.signature"
        nonce="abc"
        onComplete={onComplete}
        onLink={vi.fn()}
        onDone={onDone}
        onRestart={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('google-onboarding-phone'), {
      target: { value: '+351912345678' },
    })
    fireEvent.click(screen.getByTestId('legal-accept-checkbox'))
    fireEvent.click(screen.getByTestId('google-onboarding-submit'))
    expect(await screen.findByText('googleOnboardingPhoneTaken')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('asks for a fresh Google login when the id token is gone', () => {
    const onComplete = vi.fn()
    render(
      <GooglePassengerOnboarding
        email="ana@example.com"
        suggestedName="Ana Example"
        idToken=""
        onComplete={onComplete}
        onLink={vi.fn()}
        onDone={vi.fn()}
        onRestart={vi.fn()}
      />,
    )
    expect(screen.getByTestId('google-onboarding-restart')).toBeInTheDocument()
    expect(screen.queryByTestId('google-onboarding-submit')).not.toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('asks for the existing account password without naming its role', async () => {
    const onComplete = vi.fn().mockRejectedValue({
      status: 409,
      detail: { code: 'existing_account_link_required', proof: 'password' },
    })
    const onLink = vi.fn().mockResolvedValue({ access_token: 'app-session', role: 'super_admin' })
    const onDone = vi.fn()
    render(
      <GooglePassengerOnboarding
        email="ana@example.com"
        suggestedName="Ana Example"
        idToken="header.payload.signature"
        nonce="abc"
        onComplete={onComplete}
        onLink={onLink}
        onDone={onDone}
        onRestart={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('google-onboarding-phone'), {
      target: { value: '+351912345678' },
    })
    fireEvent.click(screen.getByTestId('legal-accept-checkbox'))
    fireEvent.click(screen.getByTestId('google-onboarding-submit'))
    expect(await screen.findByTestId('google-onboarding-password')).toBeInTheDocument()
    expect(screen.getByText('googleOnboardingLinkBody')).toBeInTheDocument()
    expect(screen.queryByText(/super_admin|admin/i)).not.toBeInTheDocument()
    fireEvent.change(screen.getByTestId('google-onboarding-password'), {
      target: { value: 'secret-pass' },
    })
    fireEvent.click(screen.getByTestId('google-onboarding-submit'))
    await waitFor(() => expect(onLink).toHaveBeenCalledTimes(1))
    expect(onLink).toHaveBeenCalledWith({
      idToken: 'header.payload.signature',
      nonce: 'abc',
      phone: '+351912345678',
      password: 'secret-pass',
      acceptLegal: true,
    })
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('opens the password step immediately when the login already requires it', async () => {
    const onComplete = vi.fn()
    const onLink = vi.fn().mockResolvedValue({ access_token: 'app-session', role: 'passenger' })
    const onDone = vi.fn()
    render(
      <GooglePassengerOnboarding
        email="ana@example.com"
        suggestedName="Ana Example"
        idToken="header.payload.signature"
        nonce="abc"
        onComplete={onComplete}
        onLink={onLink}
        onDone={onDone}
        onRestart={vi.fn()}
        initialLinkRequired
      />,
    )
    expect(screen.getByTestId('google-onboarding-password')).toBeInTheDocument()
    expect(screen.getByText('googleOnboardingLinkBody')).toBeInTheDocument()
    expect(screen.queryByText(/super_admin|superuser|privilegiad/i)).not.toBeInTheDocument()
    fireEvent.change(screen.getByTestId('google-onboarding-phone'), {
      target: { value: '+351912345678' },
    })
    fireEvent.change(screen.getByTestId('google-onboarding-password'), {
      target: { value: 'secret-pass' },
    })
    fireEvent.click(screen.getByTestId('legal-accept-checkbox'))
    fireEvent.click(screen.getByTestId('google-onboarding-submit'))
    await waitFor(() => expect(onLink).toHaveBeenCalledTimes(1))
    expect(onComplete).not.toHaveBeenCalled()
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  })

  it('stays on the password step when the password is wrong', async () => {
    const onLink = vi.fn().mockRejectedValue({ status: 401, detail: 'invalid_credentials' })
    const onDone = vi.fn()
    render(
      <GooglePassengerOnboarding
        email="ana@example.com"
        suggestedName="Ana Example"
        idToken="header.payload.signature"
        onComplete={vi.fn()}
        onLink={onLink}
        onDone={onDone}
        onRestart={vi.fn()}
        initialLinkRequired
      />,
    )
    fireEvent.change(screen.getByTestId('google-onboarding-phone'), {
      target: { value: '+351912345678' },
    })
    fireEvent.change(screen.getByTestId('google-onboarding-password'), {
      target: { value: 'wrong' },
    })
    fireEvent.click(screen.getByTestId('legal-accept-checkbox'))
    fireEvent.click(screen.getByTestId('google-onboarding-submit'))
    expect(await screen.findByText('googleOnboardingLinkPasswordInvalid')).toBeInTheDocument()
    expect(screen.queryByText(/super_admin|superuser|privilegiad/i)).not.toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('keeps the password prompt neutral in both locales', () => {
    expect(ptAuth.googleOnboardingLinkBody).toBe('Confirma a palavra-passe desta conta para continuar.')
    expect(enAuth.googleOnboardingLinkBody).toBe("Confirm this account's password to continue.")
    for (const text of [ptAuth.googleOnboardingLinkBody, enAuth.googleOnboardingLinkBody]) {
      expect(text).not.toMatch(/admin|superuser|super_admin|privilegi/i)
    }
  })
})
