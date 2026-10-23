import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleOAuthCallback } from './GoogleOAuthCallback'

const loginGoogle = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    loginGoogle,
    completeGoogleOnboarding: vi.fn(),
    linkGoogleAccount: vi.fn(),
  }),
}))

function Landed() {
  const { pathname } = useLocation()
  return <p data-testid="landed">{pathname}</p>
}

describe('GoogleOAuthCallback role home', () => {
  beforeEach(() => {
    loginGoogle.mockReset()
    sessionStorage.clear()
    sessionStorage.setItem(
      'tvde_google_oauth_pending',
      JSON.stringify({ state: 'state-1', flow: 'login', startedAt: Date.now() }),
    )
    sessionStorage.setItem('tvde_google_oauth_state', 'state-1')
  })

  it.each([
    ['passenger', '/passenger'],
    ['driver', '/driver'],
    ['partner', '/partner'],
    ['admin', '/admin'],
  ] as const)('conta %s entra em %s', async (role, path) => {
    loginGoogle.mockResolvedValue({ role, access_token: 'token', user_id: 'user-1' })
    render(
      <MemoryRouter initialEntries={['/auth/google/callback?code=abc&state=state-1']}>
        <Routes>
          <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />
          <Route path="/passenger" element={<Landed />} />
          <Route path="/driver" element={<Landed />} />
          <Route path="/partner" element={<Landed />} />
          <Route path="/admin" element={<Landed />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId('landed')).toHaveTextContent(path))
  })
})
