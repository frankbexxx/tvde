import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginMethodsSection } from './LoginMethodsSection'

const { translate } = vi.hoisted(() => ({
  translate: (key: string) => key,
}))

const getMeProfile = vi.fn()
const listMyIdentities = vi.fn()
const changeMyPassword = vi.fn()
const makeIdentityPrimary = vi.fn()
const revokeIdentity = vi.fn()
const addGoogleIdentity = vi.fn()
const signIn = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: translate,
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

function card(email: string) {
  const node = screen.getByText(email, { exact: false }).closest('li')
  if (!node) throw new Error(`missing card for ${email}`)
  return within(node)
}

const onlyIdentity = {
  active_count: 1,
  limit: 5,
  identities: [
    {
      id: 'only-id',
      provider: 'google',
      email: 'only@example.com',
      is_primary: true,
      is_verified: true,
      created_at: '2026-09-30T00:00:00Z',
    },
  ],
}

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

  it('hides revoke on the only primary and explains why', async () => {
    getMeProfile.mockResolvedValue({ has_custom_password: true })
    listMyIdentities.mockResolvedValue(onlyIdentity)
    render(<LoginMethodsSection token="session" onSessionEnded={vi.fn()} />)
    expect(await screen.findByText('only@example.com', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'profilePanel.loginMethods.revoke' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'profilePanel.loginMethods.makePrimary' })).not.toBeInTheDocument()
    expect(screen.getByText('profilePanel.loginMethods.revokeOnly')).toBeInTheDocument()
    expect(screen.queryByText('profilePanel.loginMethods.revokePrimary', { exact: true })).not.toBeInTheDocument()
  })

  it('offers revoke and make-primary only on the secondary method', async () => {
    getMeProfile.mockResolvedValue({ has_custom_password: true })
    listMyIdentities.mockResolvedValue(identities)
    render(<LoginMethodsSection token="session" onSessionEnded={vi.fn()} />)
    await screen.findByText('first@example.com', { exact: false })
    const primary = card('first@example.com')
    const secondary = card('second@example.com')
    expect(primary.queryByRole('button', { name: 'profilePanel.loginMethods.revoke' })).not.toBeInTheDocument()
    expect(primary.queryByRole('button', { name: 'profilePanel.loginMethods.makePrimary' })).not.toBeInTheDocument()
    expect(primary.getByText('profilePanel.loginMethods.revokePrimary', { exact: false })).toBeInTheDocument()
    expect(primary.getByText('profilePanel.loginMethods.revokePrimaryNext', { exact: false })).toBeInTheDocument()
    expect(secondary.getByRole('button', { name: 'profilePanel.loginMethods.revoke' })).toBeInTheDocument()
    expect(secondary.getByRole('button', { name: 'profilePanel.loginMethods.makePrimary' })).toBeInTheDocument()
  })

  it('updates revoke and make-primary after the primary changes', async () => {
    getMeProfile.mockResolvedValue({ has_custom_password: true })
    listMyIdentities.mockResolvedValue(identities)
    makeIdentityPrimary.mockResolvedValue({
      ...identities,
      identities: identities.identities.map((row) => ({ ...row, is_primary: row.id === 'google-id' })),
    })
    render(<LoginMethodsSection token="session" onSessionEnded={vi.fn()} />)
    await screen.findByText('second@example.com', { exact: false })
    fireEvent.change(screen.getByPlaceholderText('profilePanel.loginMethods.confirmLabel'), {
      target: { value: 'secret-pass' },
    })
    fireEvent.click(card('second@example.com').getByRole('button', { name: 'profilePanel.loginMethods.makePrimary' }))
    await waitFor(() =>
      expect(makeIdentityPrimary).toHaveBeenCalledWith('session', 'google-id', 'secret-pass')
    )
    await waitFor(() =>
      expect(
        card('second@example.com').queryByRole('button', { name: 'profilePanel.loginMethods.revoke' })
      ).not.toBeInTheDocument()
    )
    expect(
      card('second@example.com').getByText('profilePanel.loginMethods.revokePrimary', { exact: false })
    ).toBeInTheDocument()
    expect(
      card('first@example.com').getByRole('button', { name: 'profilePanel.loginMethods.revoke' })
    ).toBeInTheDocument()
    expect(
      card('first@example.com').getByRole('button', { name: 'profilePanel.loginMethods.makePrimary' })
    ).toBeInTheDocument()
  })

  it('confirms revoke and adds Google through Capacitor without replacing the session', async () => {
    getMeProfile.mockResolvedValue({ has_custom_password: true })
    listMyIdentities.mockResolvedValue(identities)
    revokeIdentity.mockResolvedValue(identities)
    addGoogleIdentity.mockResolvedValue(identities)
    signIn.mockResolvedValue({ idToken: 'google-id-token' })
    render(<LoginMethodsSection token="session" onSessionEnded={vi.fn()} />)
    await screen.findByText('second@example.com', { exact: false })
    fireEvent.change(screen.getByPlaceholderText('profilePanel.loginMethods.confirmLabel'), {
      target: { value: 'secret-pass' },
    })
    fireEvent.click(card('second@example.com').getByRole('button', { name: 'profilePanel.loginMethods.revoke' }))
    fireEvent.click(screen.getByText('profilePanel.loginMethods.confirmRevoke'))
    await waitFor(() =>
      expect(revokeIdentity).toHaveBeenCalledWith('session', 'google-id', 'secret-pass')
    )
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
