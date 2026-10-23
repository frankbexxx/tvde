import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../i18n'
import { GoogleOAuthCallback } from './GoogleOAuthCallback'
import { beginGoogleOAuthFlow } from './googleOauthState'

const loginGoogle = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    loginGoogle,
    completeGoogleOnboarding: vi.fn(),
    linkGoogleAccount: vi.fn(),
  }),
}))

describe('GoogleOAuthCallback add identity', () => {
  beforeEach(() => {
    loginGoogle.mockReset()
    sessionStorage.clear()
  })

  it('asks for the password and does not start login or onboarding', () => {
    const state = beginGoogleOAuthFlow('add_identity')
    render(
      <MemoryRouter initialEntries={[`/auth/google/callback?code=abc&state=${state}`]}>
        <GoogleOAuthCallback />
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText('Palavra-passe para confirmar')).toBeInTheDocument()
    expect(loginGoogle).not.toHaveBeenCalled()
    expect(screen.queryByText('Criar nova conta')).not.toBeInTheDocument()
  })
})
