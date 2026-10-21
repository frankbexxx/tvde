import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import ptCommon from '@/i18n/locales/pt/common.json'
import enCommon from '@/i18n/locales/en/common.json'
import i18n from '@/i18n'
import { LoginMethodsSection } from './LoginMethodsSection'

const getMeProfile = vi.fn()
const listMyIdentities = vi.fn()

vi.mock('@/features/auth/capacitorPlatform', () => ({
  isCapacitorNative: () => false,
}))

vi.mock('@/api/auth', () => ({
  getMeProfile: (...args: unknown[]) => getMeProfile(...args),
  listMyIdentities: (...args: unknown[]) => listMyIdentities(...args),
  changeMyPassword: vi.fn(),
  makeIdentityPrimary: vi.fn(),
  revokeIdentity: vi.fn(),
  addGoogleIdentity: vi.fn(),
  getConfig: async () => ({
    google_oauth_enabled: true,
    google_oauth_client_id: 'cid.apps.googleusercontent.com',
  }),
}))

describe('LoginMethodsSection empty identity list (i18n)', () => {
  beforeEach(() => {
    getMeProfile.mockReset()
    listMyIdentities.mockReset()
    void i18n.changeLanguage('pt')
  })

  it('shows PT empty copy when password is set and identities are empty', async () => {
    getMeProfile.mockResolvedValue({ has_custom_password: true })
    listMyIdentities.mockResolvedValue({ identities: [], active_count: 0, limit: 5 })
    render(<LoginMethodsSection token="session" onSessionEnded={vi.fn()} />)
    expect(await screen.findByText(ptCommon.profilePanel.loginMethods.empty)).toBeInTheDocument()
  })

  it('does not show empty copy when identities exist', async () => {
    getMeProfile.mockResolvedValue({ has_custom_password: true })
    listMyIdentities.mockResolvedValue({
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
    })
    render(<LoginMethodsSection token="session" onSessionEnded={vi.fn()} />)
    await screen.findByText('only@example.com', { exact: false })
    expect(screen.queryByText(ptCommon.profilePanel.loginMethods.empty)).not.toBeInTheDocument()
  })

  it('shows EN empty copy when language is English', async () => {
    await i18n.changeLanguage('en')
    getMeProfile.mockResolvedValue({ has_custom_password: true })
    listMyIdentities.mockResolvedValue({ identities: [], active_count: 0, limit: 5 })
    render(<LoginMethodsSection token="session" onSessionEnded={vi.fn()} />)
    expect(await screen.findByText(enCommon.profilePanel.loginMethods.empty)).toBeInTheDocument()
  })
})
