import { useState } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { RequestCard } from '../../components/cards/RequestCard'
import { DriverSideMenu, type DriverMenuScreen } from './DriverSideMenu'
import { defaultDriverDocumentsState } from '../../services/driverDocuments'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    sessionPhone: '+351900000000',
    sessionRole: 'driver',
    logout: () => undefined,
  }),
  isBackofficeStaffRole: () => false,
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

function MenuHarness() {
  const [screenName, setScreenName] = useState<DriverMenuScreen>('root')
  return (
    <DriverSideMenu
      open
      onOpenChange={() => undefined}
      screen={screenName}
      onScreenChange={setScreenName}
      sessionDisplayName="QA"
      history={[]}
      navPref="waze"
      vehicleCategories={['x']}
      driverDocuments={defaultDriverDocumentsState()}
      driverDocsGateEnabled={false}
      driverLocationForZones={null}
      onSelectNavPref={() => undefined}
      onToggleVehicleCategory={() => undefined}
      onPatchDriverDocument={() => undefined}
      onToggleDriverDocsGate={() => undefined}
      renderLegacyMenu={() => null}
    />
  )
}

describe('driver UX copy', () => {
  beforeEach(async () => {
    installMatchMedia()
    await i18n.changeLanguage('pt')
  })

  it('silence hides the box and does not say reject; accept stays', () => {
    const onAccept = vi.fn()
    const onDismiss = vi.fn()
    const onReject = vi.fn()
    render(
      <RequestCard
        pickup="Rua A"
        estimatedPrice={10}
        offerId="off-1"
        onAccept={onAccept}
        onReject={onReject}
        onDismiss={onDismiss}
        dismissPlacement="bottom-right-silence"
        acceptVariant="slide"
        acceptButtonTestId="driver-accept-copy"
      />,
    )
    const silence = screen.getByRole('button', { name: /silenciar esta caixa/i })
    expect(silence).toHaveAccessibleName('Silenciar esta caixa. A oferta continua.')
    expect(silence).not.toHaveAccessibleName(/rejeitar|recusar/i)
    fireEvent.click(silence)
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(onReject).not.toHaveBeenCalled()
    expect(screen.getByTestId('driver-accept-copy-track')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /recusar/i }))
    expect(onReject).toHaveBeenCalledOnce()
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('category intro names services without server, legacy or matching', () => {
    const intro = i18n.t('driver:opsMenu.categories.intro')
    expect(intro).toMatch(/pedidos deixam de aparecer/)
    expect(intro).not.toMatch(/servidor|legacy|matching/i)
    expect(i18n.t('driver:opsMenu.categories.electric')).toBe('Elétrico')
  })

  it('production documents hint is human and the DEV switch stays gated', () => {
    const hint = i18n.t('driver:opsMenu.docs.gateProdHint')
    expect(hint).toMatch(/revistos antes de ficares disponível/)
    expect(hint).not.toMatch(/servidor|DEV|backend/i)
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/driver/DriverDashboard.tsx'),
      'utf8',
    )
    expect(source).toMatch(/import\.meta\.env\.DEV \? \([\s\S]*gateDevHint[\s\S]*gateProdHint/)
  })

  it('the settings entry is Definições and opens the same screen', () => {
    render(
      <MemoryRouter>
        <LocaleProvider>
          <MenuHarness />
        </LocaleProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Registo de atividade' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Definições' }))
    expect(screen.getByTestId('driver-settings-screen')).toBeInTheDocument()
    expect(screen.getAllByText('Definições').length).toBeGreaterThan(0)
  })

  it('limit_reached says the driver can continue; blocked says they cannot', () => {
    const limit = i18n.t('driver:mapHome.drivingHoursLimitBody')
    const blocked = i18n.t('driver:mapHome.drivingHoursBlockedBody')
    expect(limit).toMatch(/Ainda podes ficar disponível/)
    expect(limit).not.toMatch(/enforcement|validação legal|feature flag/i)
    expect(blocked).toMatch(/Não podes ficar disponível/)
    expect(blocked).not.toMatch(/enforcement|validação legal/i)
    expect(i18n.t('driver:mapHome.drivingHoursLimitBodyAlt')).toBe(limit)
    expect(i18n.t('driver:mapHome.drivingHoursBlockedBodyAlt')).toBe(blocked)
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/driver/DriverDashboard.tsx'),
      'utf8',
    )
    expect(source).toMatch(
      /drivingCompliance\.blocked \? \([\s\S]*drivingHoursBlockedBody[\s\S]*limit_reached \? \([\s\S]*drivingHoursLimitBody/,
    )
  })
})
