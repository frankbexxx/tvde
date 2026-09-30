import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginMethodsSection } from './LoginMethodsSection'

const getMeProfile = vi.fn()
const listMyIdentities = vi.fn()
const changeMyPassword = vi.fn()
const makeIdentityPrimary = vi.fn()
const revokeIdentity = vi.fn()
const addGoogleIdentity = vi.fn()
const signIn = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt' },
  }),
}))

vi.mock('@/features/auth/capacitorPlatform', () => ({
  isCapacitorNative: () => true,
}))

vi.mock('@capawesome/capacitor-google-sign-in', () => ({
  GoogleSignIn: {
    initialize: vi.fn(async () => undefined),
    signIn: (...args: unknown[]) => signIn(...args),
  },
}))

vi.mock('@/api/auth', () => ({
  getMeProfile: (...args: unknown[]) => getMeProfile(...args),
  listMyIdentities: (...args: unknown[]) => listMyIdentities(...args),
  changeMyPassword: (...args: unknown[]) => changeMyPassword(...args),
  makeIdentityPrimary: (...args: unknown[]) => makeIdentityPrimary(...args),
  revokeIdentity: (...args: unknown[]) => revokeIdentity(...args),
  addGoogleIdentity: (...args: unknown[]) => addGoogleIdentity(...args),
  getConfig: async () => ({
    google_oauth_enabled: true,
    google_oauth_client_id: 'cid.apps.googleusercontent.com',
  }),
}))

const identities = {
  active_count: 2,
  limit: 5,
  identities: [
    {
      id: 'primary-id',
      provider: 'email',
      email: 'first@example.com',
      is_primary: true,
      is_verified: true,
      created_at: '2026-09-30T00:00:00Z',
    },
    {
      id: 'google-id',
      provider: 'google',
      email: 'second@example.com',
      is_primary: false,
      is_verified: true,
      created_at: '2026-09-30T00:00:01Z',
    },
  ],
}

describe('LoginMethodsSection', () => {
  beforeEach(() => {
    getMeProfile.mockReset()
    listMyIdentities.mockReset()
    changeMyPassword.mockReset()
    makeIdentityPrimary.mockReset()
    revokeIdentity.mockReset()
    addGoogleIdentity.mockReset()
    signIn.mockReset()
  })

  it('asks to set a password and hides identity actions when there is none', async () => {
    getMeProfile.mockResolvedValue({ has_custom_password: false })
    listMyIdentities.mockResolvedValue({ identities: [], active_count: 0, limit: 5 })
    render(<LoginMethodsSection token="session" onSessionEnded={vi.fn()} />)
    expect(await screen.findByText('profilePanel.loginMethods.setPassword')).toBeInTheDocument()
    expect(screen.queryByText('profilePanel.loginMethods.revoke')).not.toBeInTheDocument()
    expect(screen.queryByText('profilePanel.loginMethods.addGoogle')).not.toBeInTheDocument()
  })

  it('shows the primary badge and changes primary with the typed password', async () => {
    getMeProfile.mockResolvedValue({ has_custom_password: true })
    listMyIdentities.mockResolvedValue(identities)
    makeIdentityPrimary.mockResolvedValue({
      ...identities,
      identities: identities.identities.map((row) => ({ ...row, is_primary: row.id === 'google-id' })),
    })
    render(<LoginMethodsSection token="session" onSessionEnded={vi.fn()} />)
    expect(
      await screen.findByText('profilePanel.loginMethods.primary', { exact: false })
    ).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('profilePanel.loginMethods.confirmLabel'), {
      target: { value: 'secret-pass' },
    })
    fireEvent.click(screen.getByText('profilePanel.loginMethods.makePrimary'))
    await waitFor(() =>
      expect(makeIdentityPrimary).toHaveBeenCalledWith('session', 'google-id', 'secret-pass')
    )
  })

  it('confirms revoke and adds Google through Capacitor without replacing the session', async () => {
    getMeProfile.mockResolvedValue({ has_custom_password: true })
    listMyIdentities.mockResolvedValue(identities)
    revokeIdentity.mockResolvedValue(identities)
    addGoogleIdentity.mockResolvedValue(identities)
    signIn.mockResolvedValue({ idToken: 'google-id-token' })
    render(<LoginMethodsSection token="session" onSessionEnded={vi.fn()} />)
    await screen.findByText('profilePanel.loginMethods.primary', { exact: false })
    fireEvent.change(screen.getByPlaceholderText('profilePanel.loginMethods.confirmLabel'), {
      target: { value: 'secret-pass' },
    })
    fireEvent.click(screen.getAllByText('profilePanel.loginMethods.revoke')[0])
    fireEvent.click(screen.getByText('profilePanel.loginMethods.confirmRevoke'))
    await waitFor(() => expect(revokeIdentity).toHaveBeenCalled())
    fireEvent.change(screen.getByPlaceholderText('profilePanel.loginMethods.confirmLabel'), {
      target: { value: 'secret-pass' },
    })
    fireEvent.click(screen.getByText('profilePanel.loginMethods.addGoogle'))
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(addGoogleIdentity).toHaveBeenCalledWith(
        'session',
        expect.objectContaining({ password: 'secret-pass', idToken: 'google-id-token' })
      )
    )
  })
})
