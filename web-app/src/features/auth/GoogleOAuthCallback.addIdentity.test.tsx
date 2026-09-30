import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleOAuthCallback } from './GoogleOAuthCallback'
import { ADD_IDENTITY_INTENT, GOOGLE_OAUTH_INTENT_KEY, GOOGLE_OAUTH_STATE_KEY } from './googleOauthState'

const loginGoogle = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'pt' } }),
}))

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
    sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, 'state-1')
    sessionStorage.setItem(GOOGLE_OAUTH_INTENT_KEY, ADD_IDENTITY_INTENT)
    render(
      <MemoryRouter initialEntries={['/auth/google/callback?code=abc&state=state-1']}>
        <GoogleOAuthCallback />
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText('profilePanel.loginMethods.confirmLabel')).toBeInTheDocument()
    expect(loginGoogle).not.toHaveBeenCalled()
    expect(screen.queryByText('Criar nova conta')).not.toBeInTheDocument()
  })
})
