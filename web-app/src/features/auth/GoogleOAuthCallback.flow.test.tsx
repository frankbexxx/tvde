import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../i18n'
import { GoogleOAuthCallback } from './GoogleOAuthCallback'
import {
  beginGoogleOAuthFlow,
  GOOGLE_OAUTH_PENDING_TTL_MS,
  GOOGLE_OAUTH_STATE_KEY,
  resolveGoogleOAuthPending,
  saveGoogleOAuthPending,
} from './googleOauthState'

const loginGoogle = vi.fn()
const addGoogleIdentity = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    loginGoogle,
    completeGoogleOnboarding: vi.fn(),
    linkGoogleAccount: vi.fn(),
  }),
}))

vi.mock('@/api/auth', () => ({
  addGoogleIdentity: (...args: unknown[]) => addGoogleIdentity(...args),
}))

vi.mock('../../utils/authStorage', () => ({
  getStoredAccessToken: vi.fn(() => null),
}))

import { getStoredAccessToken } from '../../utils/authStorage'

const PASSWORD_PLACEHOLDER = 'Palavra-passe para confirmar'
const ADD_GOOGLE_LABEL = 'Adicionar Google'

function Landed() {
  const { pathname } = useLocation()
  return <p data-testid="landed">{pathname}</p>
}

function renderCallback(query: string, extraRoutes = true) {
  render(
    <MemoryRouter initialEntries={[`/auth/google/callback${query}`]}>
      <Routes>
        <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />
        {extraRoutes ? (
          <>
            <Route path="/passenger" element={<Landed />} />
            <Route path="/passenger/account" element={<Landed />} />
          </>
        ) : null}
      </Routes>
    </MemoryRouter>,
  )
}

describe('GoogleOAuthCallback flow routing', () => {
  beforeEach(() => {
    loginGoogle.mockReset()
    addGoogleIdentity.mockReset()
    vi.mocked(getStoredAccessToken).mockReturnValue(null)
    sessionStorage.clear()
  })

  it('add identity: shows password step and never calls loginGoogle', () => {
    const state = beginGoogleOAuthFlow('add_identity', '/passenger/account')
    renderCallback(`?code=abc&state=${state}`)
    expect(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER)).toBeInTheDocument()
    expect(loginGoogle).not.toHaveBeenCalled()
  })

  it('add identity: survives reload (pending JSON + same URL)', () => {
    const state = beginGoogleOAuthFlow('add_identity')
    expect(resolveGoogleOAuthPending(state)?.flow).toBe('add_identity')
    renderCallback(`?code=abc&state=${state}`)
    expect(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER)).toBeInTheDocument()
    expect(resolveGoogleOAuthPending(state)?.flow).toBe('add_identity')
    expect(loginGoogle).not.toHaveBeenCalled()
  })

  it('login: calls loginGoogle and not addGoogleIdentity', async () => {
    const state = beginGoogleOAuthFlow('login')
    loginGoogle.mockResolvedValue({ role: 'passenger', access_token: 't', user_id: 'u1' })
    renderCallback(`?code=abc&state=${state}`)
    await waitFor(() => expect(loginGoogle).toHaveBeenCalledWith('abc', expect.stringContaining('/auth/google/callback'), false))
    expect(addGoogleIdentity).not.toHaveBeenCalled()
  })

  it('missing pending: rejects callback and does not exchange', async () => {
    sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, 'orphan-state')
    renderCallback('?code=abc&state=orphan-state')
    expect(await screen.findByText(/não corresponde a esta sessão/i)).toBeInTheDocument()
    expect(loginGoogle).not.toHaveBeenCalled()
  })

  it('expired pending: rejects without exchange', () => {
    saveGoogleOAuthPending({
      state: 'old',
      flow: 'add_identity',
      startedAt: Date.now() - GOOGLE_OAUTH_PENDING_TTL_MS - 1000,
    })
    sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, 'old')
    renderCallback('?code=abc&state=old')
    expect(screen.getByText(/não corresponde a esta sessão/i)).toBeInTheDocument()
    expect(loginGoogle).not.toHaveBeenCalled()
  })

  it('logged-in session: blocks login exchange (no onboarding / new user)', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue('existing-jwt')
    const state = beginGoogleOAuthFlow('login')
    renderCallback(`?code=abc&state=${state}`)
    expect(await screen.findByText(/adicionar Google expirou/i)).toBeInTheDocument()
    expect(loginGoogle).not.toHaveBeenCalled()
  })

  it('logged-in session: add identity still uses password step, not exchange', () => {
    vi.mocked(getStoredAccessToken).mockReturnValue('existing-jwt')
    const state = beginGoogleOAuthFlow('add_identity', '/passenger/account')
    renderCallback(`?code=abc&state=${state}`)
    expect(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER)).toBeInTheDocument()
    expect(loginGoogle).not.toHaveBeenCalled()
  })

  it('409 login path: shows onboarding choice without auto navigation', async () => {
    const state = beginGoogleOAuthFlow('login')
    loginGoogle.mockRejectedValue({
      detail: {
        code: 'google_account_choice_required',
        email: 'a@b.com',
        name: 'A',
        id_token: 'id.jwt',
      },
    })
    renderCallback(`?code=abc&state=${state}`)
    await waitFor(() => expect(loginGoogle).toHaveBeenCalled())
    expect(screen.getByTestId('google-choice-create')).toBeInTheDocument()
  })

  it('oauth cancel login: copy and back to login', async () => {
    beginGoogleOAuthFlow('login')
    renderCallback('?error=access_denied')
    expect(screen.getByText(/Login Google cancelado/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Voltar ao início de sessão/i }))
    await waitFor(() => expect(screen.getByTestId('landed')).toHaveTextContent('/passenger'))
    expect(sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY)).toBeNull()
  })

  it('oauth cancel add identity: copy and back to account returnPath', async () => {
    beginGoogleOAuthFlow('add_identity', '/passenger/account')
    renderCallback('?error=access_denied')
    expect(screen.getByText(/Associação Google cancelada/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Voltar à conta/i }))
    await waitFor(() => expect(screen.getByTestId('landed')).toHaveTextContent('/passenger/account'))
    expect(sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY)).toBeNull()
  })

  it('login exchange failure shows API message not state mismatch', async () => {
    const state = beginGoogleOAuthFlow('login')
    loginGoogle.mockRejectedValue({ detail: 'identity_revoked' })
    renderCallback(`?code=abc&state=${state}`)
    await waitFor(() => expect(loginGoogle).toHaveBeenCalled())
    expect(await screen.findByText(/já não está activo/i)).toBeInTheDocument()
    expect(screen.queryByText(/não corresponde a esta sessão/i)).not.toBeInTheDocument()
  })

  it('add identity submit calls POST identities API path helper', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue('existing-jwt')
    addGoogleIdentity.mockResolvedValue({ identities: [] })
    const state = beginGoogleOAuthFlow('add_identity', '/passenger/account')
    renderCallback(`?code=abc&state=${state}`)
    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), {
      target: { value: 'secret-pass' },
    })
    fireEvent.click(screen.getByRole('button', { name: ADD_GOOGLE_LABEL }))
    await waitFor(() =>
      expect(addGoogleIdentity).toHaveBeenCalledWith('existing-jwt', {
        password: 'secret-pass',
        code: 'abc',
        redirectUri: expect.stringContaining('/auth/google/callback'),
      }),
    )
    await waitFor(() => expect(screen.getByTestId('landed')).toHaveTextContent('/passenger/account'))
    expect(loginGoogle).not.toHaveBeenCalled()
  })

  it('add identity 409 shows translated error without loginGoogle', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue('existing-jwt')
    addGoogleIdentity.mockRejectedValue({ detail: { code: 'identity_email_taken' } })
    const state = beginGoogleOAuthFlow('add_identity')
    renderCallback(`?code=abc&state=${state}`)
    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), {
      target: { value: 'secret-pass' },
    })
    fireEvent.click(screen.getByRole('button', { name: ADD_GOOGLE_LABEL }))
    await waitFor(() => expect(addGoogleIdentity).toHaveBeenCalled())
    expect(screen.getByText(/outra conta/i)).toBeInTheDocument()
    expect(loginGoogle).not.toHaveBeenCalled()
  })
})
