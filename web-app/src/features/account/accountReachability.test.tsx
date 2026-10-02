import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { AppHeaderBar } from '@/components/layout/AppHeaderBar'
import { ProfileButton } from '@/design-system/components/app/ProfileButton'
import { DriverSideMenu, type DriverMenuScreen } from '@/features/driver/DriverSideMenu'
import { PartnerBottomNav } from '@/features/partner/PartnerBottomNav'
import { PartnerShellProvider, usePartnerShell } from '@/features/partner/partnerShellContext'
import { PartnerSideMenu } from '@/features/partner/PartnerSideMenu'
import { PartnerProfileScreen } from '@/features/partner/screens/PartnerProfileScreen'
import { PassengerBottomNav, type PassengerShellTab } from '@/features/passenger/PassengerBottomNav'
import { passengerBottomNavTransition } from '@/features/passenger/passengerMenuNav'
import { PassengerSideMenu, type PassengerMenuScreen } from '@/features/passenger/PassengerSideMenu'
import { defaultDriverDocumentsState } from '@/services/driverDocuments'

const { authState, me } = vi.hoisted(() => ({
  authState: {
    token: 'session',
    sessionRole: 'passenger',
    sessionPhone: '+351900000683',
    sessionDisplayName: 'QA',
    betaMode: false,
    logout: vi.fn(),
    refreshSessionProfile: vi.fn(async () => undefined),
  },
  me: {
    user_id: 'eb41db81-b1c0-4dc9-b0cd-7b2b530753d6',
    phone: '+351900000683',
    name: 'QA',
    has_custom_password: true,
  },
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
  isBackofficeStaffRole: (role: string) => role === 'admin' || role === 'super_admin',
}))

vi.mock('@/api/auth', () => ({
  getMeProfile: async () => me,
  listMyIdentities: async () => ({
    active_count: 1,
    limit: 5,
    identities: [
      {
        id: 'identity-1',
        provider: 'email',
        email: 'qa.identity.profile@example.com',
        is_primary: true,
        is_verified: true,
        created_at: '2026-09-30T00:00:00Z',
      },
    ],
  }),
  patchMeProfile: async () => me,
  changeMyPassword: async () => undefined,
}))

vi.mock('@/api/rotacional', () => ({
  fetchRotacionalMessages: async () => [],
}))

vi.mock('@/design-system/components/app/SettingsButton', () => ({
  SettingsButton: () => null,
}))

function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

function PassengerEntry() {
  const [open, setOpen] = useState(false)
  const [screenName, setScreenName] = useState<PassengerMenuScreen>('root')
  const [highlight, setHighlight] = useState<string | null>(null)
  const active: PassengerShellTab = !open
    ? 'home'
    : screenName === 'history' || screenName === 'history_detail'
      ? 'history'
      : screenName === 'account'
        ? 'account'
        : 'menu'
  return (
    <>
      <PassengerSideMenu
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setScreenName('root')
            setHighlight(null)
          }
        }}
        screen={screenName}
        onScreenChange={setScreenName}
        menuRootHighlight={highlight}
        history={[]}
        historyLoading={false}
        historyPollFault={false}
        historyDetail={null}
        historyDetailLoading={false}
        historyDetailError={null}
        onHistoryTripSelect={() => undefined}
      />
      <PassengerBottomNav
        active={active}
        onSelect={(tab) => {
          const next = passengerBottomNavTransition(tab, open)
          setOpen(next.menuOpen)
          if (next.screen) {
            setScreenName(next.screen)
            setHighlight(next.highlight)
          }
        }}
      />
    </>
  )
}

function PartnerEntry() {
  const shell = usePartnerShell()
  return (
    <>
      <PartnerSideMenu
        open={shell.menuOpen}
        onOpenChange={(next) => (next ? shell.openMenu('root') : shell.closeMenu())}
        screen={shell.menuScreen}
        onNavigate={shell.navigateMenu}
        onBack={shell.goBackMenu}
        renderScreen={(menuScreen) => (menuScreen === 'profile' ? <PartnerProfileScreen /> : null)}
      />
      <PartnerBottomNav
        active={shell.menuOpen ? 'menu' : 'home'}
        onSelect={(tab) => {
          if (tab === 'menu') shell.openMenu('root')
          if (tab === 'home') shell.closeMenu()
        }}
      />
    </>
  )
}

function DriverEntry() {
  const [open, setOpen] = useState(true)
  const [menuScreen, setMenuScreen] = useState<DriverMenuScreen>('root')
  return (
    <>
      <ProfileButton />
      <DriverSideMenu
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setMenuScreen('root')
        }}
        screen={menuScreen}
        onScreenChange={setMenuScreen}
        sessionDisplayName="QA"
        history={[]}
        navPref="waze"
        vehicleCategories={[]}
        driverDocuments={defaultDriverDocumentsState()}
        driverDocsGateEnabled={false}
        driverLocationForZones={null}
        onSelectNavPref={() => undefined}
        onToggleVehicleCategory={() => undefined}
        onPatchDriverDocument={() => undefined}
        onToggleDriverDocsGate={() => undefined}
        renderLegacyMenu={() => null}
      />
    </>
  )
}

async function expectCanonicalAccount() {
  const panel = await screen.findByTestId('account-panel')
  const view = within(panel)
  const toggle = view.getByRole('button', { name: 'Métodos de início de sessão' })
  const profile = view.getByText('Perfil')
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(toggle).toHaveAttribute('aria-controls', 'account-login-methods')
  expect(toggle.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(view.getByText('Alterar palavra-passe')).toBeInTheDocument()
  expect(view.queryByText('qa.identity.profile@example.com')).not.toBeInTheDocument()
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(await view.findByText('qa.identity.profile@example.com', { exact: false })).toBeInTheDocument()
  expect(view.getByLabelText('Palavra-passe para confirmar')).toBeInTheDocument()
}

function fakeJwt(sub: string) {
  const enc = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${enc({ alg: 'none' })}.${enc({ sub })}.x`
}

describe('canonical account reachability', () => {
  beforeEach(() => {
    installMatchMedia()
    authState.token = 'session'
    authState.sessionRole = 'passenger'
    authState.betaMode = false
    me.has_custom_password = true
  })

  it('passenger bottom nav Conta opens profile, password and login methods', async () => {
    render(<PassengerEntry />)
    expect(screen.getByTestId('passenger-bottom-nav-account')).toHaveTextContent('Conta')
    fireEvent.click(screen.getByTestId('passenger-bottom-nav-account'))
    await expectCanonicalAccount()
    const confirm = await screen.findByLabelText('Palavra-passe para confirmar')
    expect(confirm).toHaveValue('')
    expect(confirm.tagName).toBe('INPUT')
    fireEvent.change(confirm, { target: { value: 'segredo' } })
    expect(screen.getByLabelText('Palavra-passe para confirmar')).toHaveValue('segredo')
    expect(screen.getByText('Palavra-passe para confirmar')).toBeVisible()
  })

  it('partner menu Conta opens the same account', async () => {
    authState.sessionRole = 'partner'
    render(
      <PartnerShellProvider>
        <PartnerEntry />
      </PartnerShellProvider>,
    )
    fireEvent.click(screen.getByTestId('partner-open-menu'))
    const row = await screen.findByTestId('partner-menu-profile')
    expect(row).toHaveTextContent('Conta')
    expect(row).not.toHaveTextContent('Perfil')
    fireEvent.click(row)
    await expectCanonicalAccount()
  })

  it('driver profile summary opens Conta without the short account code', async () => {
    authState.sessionRole = 'driver'
    authState.token = fakeJwt('eb41db81-b1c0-4dc9-b0cd-7b2b530753d6')
    render(<DriverEntry />)
    fireEvent.click(await screen.findByRole('button', { name: 'Perfil' }))
    const profile = await screen.findByTestId('driver-menu-profile-screen')
    expect(within(profile).getByText('QA')).toBeInTheDocument()
    expect(within(profile).getByText('+351900000683')).toBeInTheDocument()
    expect(within(profile).queryByText(/530753d6/)).not.toBeInTheDocument()
    expect(within(profile).queryByText('Conta (detalhe)')).not.toBeInTheDocument()
    fireEvent.click(within(profile).getByRole('button', { name: 'Conta' }))
    await expectCanonicalAccount()
  })

  it('admin header Conta opens the same account', async () => {
    authState.sessionRole = 'admin'
    render(<AppHeaderBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Conta' }))
    await expectCanonicalAccount()
  })

  it('without a password the same passenger Conta shows Definir palavra-passe', async () => {
    me.has_custom_password = false
    render(<PassengerEntry />)
    fireEvent.click(screen.getByTestId('passenger-bottom-nav-account'))
    fireEvent.click(await screen.findByTestId('account-login-methods-toggle'))
    expect(await screen.findByText('Definir palavra-passe')).toBeInTheDocument()
    expect(screen.queryByText('Alterar palavra-passe')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revogar' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('account-panel')).toBeInTheDocument())
  })
})
