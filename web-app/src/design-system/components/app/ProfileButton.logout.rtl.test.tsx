import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ProfileButton } from './ProfileButton'

const logout = vi.fn()

const authState = {
  isAuthenticated: true,
  betaMode: false,
  logout,
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('@/features/account/AccountPanel', () => ({
  AccountPanel: () => <div data-testid="account-panel-stub" />,
}))

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => false,
}))

describe('ProfileButton logout (F-LOGOUT-ADMIN)', () => {
  beforeEach(() => {
    logout.mockReset()
    authState.isAuthenticated = true
    authState.betaMode = false
  })

  it('shows Sair when authenticated with betaMode false and calls logout', () => {
    render(<ProfileButton />)
    fireEvent.click(screen.getByRole('button', { name: /conta/i }))
    const signOut = screen.getByTestId('profile-logout')
    expect(signOut).toHaveTextContent(/sair|sign out/i)
    fireEvent.click(signOut)
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('hides Sair when not authenticated', () => {
    authState.isAuthenticated = false
    render(<ProfileButton />)
    fireEvent.click(screen.getByRole('button', { name: /conta/i }))
    expect(screen.queryByTestId('profile-logout')).not.toBeInTheDocument()
  })
})
