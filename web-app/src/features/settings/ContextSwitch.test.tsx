import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ContextSwitch } from './ContextSwitch'

const setAppRouteRole = vi.fn()
let auth: {
  appRouteRole: 'passenger' | 'driver' | 'partner' | 'admin'
  sessionRole: string
  setAppRouteRole: typeof setAppRouteRole
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) =>
      ({
        rolePassenger: 'Passageiro',
        roleDriver: 'Motorista',
        rolePartner: 'Parceiro',
        roleAdmin: 'Admin',
        roleSuperAdmin: 'Admin / Superadmin',
      })[k] ?? k,
  }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => auth,
}))

function renderSwitch() {
  return render(
    <MemoryRouter>
      <ContextSwitch />
    </MemoryRouter>
  )
}

describe('ContextSwitch', () => {
  beforeEach(() => {
    setAppRouteRole.mockReset()
    auth = { appRouteRole: 'passenger', sessionRole: 'passenger', setAppRouteRole }
  })

  it('passenger vê só Passageiro', () => {
    renderSwitch()
    expect(screen.getByTestId('context-passenger')).toBeTruthy()
    expect(screen.queryByTestId('context-driver')).toBeNull()
    expect(screen.queryByTestId('context-partner')).toBeNull()
    expect(screen.queryByTestId('context-admin')).toBeNull()
  })

  it('driver vê Passageiro e Motorista e a troca não mexe no role', () => {
    auth = { appRouteRole: 'driver', sessionRole: 'driver', setAppRouteRole }
    renderSwitch()
    fireEvent.click(screen.getByTestId('context-passenger'))
    expect(setAppRouteRole).toHaveBeenCalledWith('passenger')
    expect(auth.sessionRole).toBe('driver')
  })

  it('partner vê Passageiro e Parceiro', () => {
    auth = { appRouteRole: 'partner', sessionRole: 'partner', setAppRouteRole }
    renderSwitch()
    expect(screen.getByTestId('context-passenger')).toBeTruthy()
    expect(screen.getByTestId('context-partner')).toHaveTextContent('Parceiro')
    expect(screen.queryByTestId('context-admin')).toBeNull()
  })

  it('admin vê Passageiro e Admin', () => {
    auth = { appRouteRole: 'admin', sessionRole: 'admin', setAppRouteRole }
    renderSwitch()
    expect(screen.getByTestId('context-admin')).toHaveTextContent('Admin')
  })

  it('superadmin vê Passageiro e Admin/Superadmin', () => {
    auth = { appRouteRole: 'admin', sessionRole: 'super_admin', setAppRouteRole }
    renderSwitch()
    expect(screen.getByTestId('context-admin')).toHaveTextContent('Admin / Superadmin')
  })
})
