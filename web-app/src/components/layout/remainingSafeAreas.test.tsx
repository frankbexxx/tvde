import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import '@/i18n'
import i18n from '@/i18n'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { GooglePassengerOnboarding } from '@/features/auth/GooglePassengerOnboarding'
import { ProfileButton } from '@/design-system/components/app/ProfileButton'
import { SettingsButton } from '@/design-system/components/app/SettingsButton'
import { MapStage } from './MapStage'
import { TripPlannerPanel } from '@/features/passenger/TripPlannerPanel'
import {
  ADMIN_PAGE_CLASS,
  SAFE_AREA_BOTTOM_WITH_1_5REM,
  SAFE_AREA_BOTTOM_WITH_1REM,
  SAFE_AREA_SCROLL_PB_WITH_4_5REM,
  SAFE_AREA_SHEET_BOTTOM_CLASS,
  SAFE_AREA_TOP_WITH_1REM,
  SCREEN_INSET_SCROLL_CLEARANCE_CLASS,
} from './safeAreaInsets'

vi.mock('../../maps/MapView', () => ({
  MapView: () => <div data-testid="map-view-mock" />,
}))

vi.mock('@/api/auth', () => ({
  getConfig: async () => ({ google_oauth_enabled: false, otp_signup_enabled: false }),
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginGoogleIdToken: vi.fn(),
    completeGoogleOnboarding: vi.fn(),
    linkGoogleAccount: vi.fn(),
    isAuthenticated: true,
    logout: vi.fn(),
    appRouteRole: 'passenger',
  }),
  isBackofficeStaffRole: () => false,
}))

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => false,
}))

vi.mock('@/features/account/AccountPanel', () => ({
  AccountPanel: () => (
    <div data-testid="account-panel-stub">
      {Array.from({ length: 24 }, (_, index) => (
        <p key={index}>Linha de conta {index}</p>
      ))}
    </div>
  ),
}))

vi.mock('@/features/settings/AppAppearanceSettings', () => ({
  AppAppearanceSettings: () => <div>Aparência</div>,
}))

vi.mock('@/features/settings/ContextSwitch', () => ({
  ContextSwitch: () => <div>Modo</div>,
}))

vi.mock('@/components/ActivityPanel', () => ({
  ActivityPanel: () => <div>Registo</div>,
}))

vi.mock('@/components/legal/LegalLocaleNotice', () => ({
  LegalLocaleNotice: () => <p>Aviso legal</p>,
}))

vi.mock('@/components/legal/LegalConsumerRights', () => ({
  LegalConsumerRights: () => <p>Direitos</p>,
}))

vi.mock('@/context/ActiveTripContext', () => ({
  useActiveTrip: () => ({ passengerActiveTripId: null }),
}))

vi.mock('@/context/DevToolsCallbackContext', () => ({
  useDevToolsCallbacks: () => ({ notifyAfterDevMutation: () => undefined }),
}))

vi.mock('@/features/shared/DevTools', () => ({
  DevTools: () => null,
}))

vi.mock('@/features/settings/LanguageSelector', () => ({
  LanguageSelector: () => null,
}))

function count(value: string, needle: string) {
  return value.split(needle).length - 1
}

function expectSingleInset(className: string, side: 'top' | 'bottom') {
  expect(className).toContain(`env(safe-area-inset-${side},0px)`)
  expect(className).toContain(`var(--safe-area-inset-${side},0px)`)
  expect(className).not.toContain(`env(safe-area-inset-${side},0px)+var(`)
  expect(className).not.toContain('safe-area-pb')
}

describe('safe areas P1', () => {
  beforeEach(async () => {
    document.documentElement.style.removeProperty('--safe-area-inset-top')
    document.documentElement.style.removeProperty('--safe-area-inset-bottom')
    await i18n.changeLanguage('pt')
    localStorage.clear()
  })

  it('login: insets zero e Android na mesma fórmula, com scroll até ao rodapé', () => {
    render(
      <MemoryRouter>
        <LoginScreen requestedRole="passenger" />
      </MemoryRouter>,
    )
    const root = screen.getByTestId('login-scroll-root')
    expectSingleInset(root.className, 'top')
    expectSingleInset(root.className, 'bottom')
    expect(count(root.className, SAFE_AREA_TOP_WITH_1REM)).toBe(1)
    expect(count(root.className, SAFE_AREA_BOTTOM_WITH_1_5REM)).toBe(1)
    expect(count(root.className, SAFE_AREA_SCROLL_PB_WITH_4_5REM)).toBe(1)
    expect(root.className).not.toMatch(/(?:^|\s)py-4(?:\s|$)/)
    expect(root).toContainElement(screen.getByTestId('login-version-footer'))

    document.documentElement.style.setProperty('--safe-area-inset-top', '47px')
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '48px')
    expect(count(root.className, 'safe-area-inset-top')).toBe(2)
    expect(count(root.className, 'safe-area-inset-bottom')).toBe(4)
  })

  it('onboarding longo: o envio fica no scroll e o ecrã curto não repete o scroll-pb', () => {
    const longName = 'Nome '.repeat(40)
    const { unmount } = render(
      <GooglePassengerOnboarding
        email="ana@example.com"
        suggestedName={longName}
        idToken="token"
        onComplete={async () => undefined}
        onLink={async () => undefined}
        onDone={() => undefined}
        onRestart={() => undefined}
      />,
    )
    const root = screen.getByTestId('google-onboarding')
    expect(root.className).toMatch(/h-dvh/)
    expect(root.className).toMatch(/overflow-y-auto/)
    expect(count(root.className, SAFE_AREA_TOP_WITH_1REM)).toBe(1)
    expect(count(root.className, SAFE_AREA_BOTTOM_WITH_1REM)).toBe(1)
    expect(count(root.className, SAFE_AREA_SCROLL_PB_WITH_4_5REM)).toBe(1)
    expect(root).toContainElement(screen.getByTestId('google-onboarding-submit'))
    expect(screen.getByTestId('google-onboarding-name')).toHaveValue(longName)
    unmount()

    render(
      <GooglePassengerOnboarding
        email="ana@example.com"
        suggestedName="Ana"
        idToken="token"
        initialMode="choice"
        onComplete={async () => undefined}
        onLink={async () => undefined}
        onDone={() => undefined}
        onRestart={() => undefined}
      />,
    )
    const choice = screen.getByTestId('google-account-choice')
    expect(choice.className).not.toContain('scroll-pb-')
    expect(count(choice.className, SAFE_AREA_BOTTOM_WITH_1REM)).toBe(1)
  })

  it('sheets de perfil e definições: 1.5rem ou o inset, uma vez, com o último controlo no scroll', () => {
    render(<ProfileButton />)
    fireEvent.click(screen.getByRole('button', { name: /conta/i }))
    const profile = screen.getByRole('dialog')
    expect(profile.className).toContain(SAFE_AREA_SHEET_BOTTOM_CLASS)
    expect(count(profile.className, SAFE_AREA_BOTTOM_WITH_1_5REM)).toBe(1)
    expect(profile.className).toMatch(/overflow-y-auto/)
    expect(profile.className).not.toContain('safe-area-pb')
    expect(profile).toContainElement(screen.getByText('Linha de conta 23'))
    expect(profile).toContainElement(screen.getByTestId('profile-logout'))

    render(
      <I18nextProvider i18n={i18n}>
        <SettingsButton />
      </I18nextProvider>,
    )
    fireEvent.click(screen.getByTestId('open-settings'))
    const settings = screen.getAllByRole('dialog').at(-1)
    expect(settings).toBeTruthy()
    expect(settings?.className).toContain(SAFE_AREA_SHEET_BOTTOM_CLASS)
    expect(count(settings?.className ?? '', 'safe-area-inset-bottom')).toBe(2)
    expect(settings?.className).not.toContain('safe-area-pb')
    expect(settings).toContainElement(screen.getByText('Direitos'))
  })

  it('admin e mapa: o fundo reserva o inset uma vez e o CTA não recebe outro', async () => {
    expect(ADMIN_PAGE_CLASS).toContain(SAFE_AREA_BOTTOM_WITH_1REM)
    expect(ADMIN_PAGE_CLASS).not.toContain('safe-area-inset-top')
    expect(count(ADMIN_PAGE_CLASS, 'safe-area-inset-bottom')).toBe(2)
    const adminSource = readFileSync(resolve('src/features/admin/AdminDashboard.tsx'), 'utf8')
    expect(count(adminSource, 'ADMIN_PAGE_CLASS')).toBe(3)
    expect(adminSource).not.toContain('safe-area-pb')

    render(
      <MapStage
        testId="p1-map"
        map={{}}
        bottomOverlay={<div data-testid="map-sheet">folha</div>}
      />,
    )
    const overlay = screen.getByTestId('map-sheet').parentElement?.parentElement
    expect(overlay?.className).toContain(SCREEN_INSET_SCROLL_CLEARANCE_CLASS)
    expect(count(overlay?.className ?? '', SCREEN_INSET_SCROLL_CLEARANCE_CLASS)).toBe(1)
    expect(overlay?.className).not.toContain('pb-20')
    expect(overlay?.className).not.toContain('safe-area-pb')

    const passenger = readFileSync(resolve('src/features/passenger/PassengerDashboard.tsx'), 'utf8')
    expect(count(passenger, 'SCREEN_INSET_SCROLL_CLEARANCE_CLASS')).toBe(2)
    expect(passenger).not.toContain('pb-20')

    const driver = readFileSync(resolve('src/features/driver/DriverDashboard.tsx'), 'utf8')
    expect(count(driver, 'pb-20')).toBe(0)
    expect(driver).not.toContain('SCREEN_INSET_SCROLL_CLEARANCE_CLASS')

    render(
      <I18nextProvider i18n={i18n}>
        <TripPlannerPanel
          uiState="confirming"
          hasPickup
          hasDropoff
          pickupAddress="Origem"
          dropoffAddress={'Destino longo '.repeat(30)}
          pickupAddressLoading={false}
          dropoffAddressLoading={false}
          routeMeta={{ durationSec: 600, distanceM: 3200 }}
          routeMetaLoading={false}
          activeTrip={null}
          onChooseMap={() => undefined}
          onSetDestinationHint={() => undefined}
          onReset={() => undefined}
          onConfirmTrip={() => undefined}
        />
      </I18nextProvider>,
    )
    const cta = screen.getByTestId('passenger-confirm-cta-row')
    expect(cta.className).not.toContain('safe-area')
    expect(cta).toContainElement(screen.getByTestId('passenger-confirm-trip-cta'))
    expect(screen.getByText(/Destino longo/)).toBeInTheDocument()
  })
})
