import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppHeaderBar } from './AppHeaderBar'
import { ScreenContainer } from './ScreenContainer'
import { DriverBottomNav } from '@/features/driver/DriverBottomNav'
import { PartnerBottomNav } from '@/features/partner/PartnerBottomNav'
import { PassengerBottomNav } from '@/features/passenger/PassengerBottomNav'
import {
  SAFE_AREA_BOTTOM_CLASS,
  SAFE_AREA_PB_CLASS,
  SAFE_AREA_TOP_CLASS,
  SCREEN_INSET_SCROLL_CLEARANCE_CLASS,
  SCREEN_SCROLL_CLEARANCE_CLASS,
} from './safeAreaInsets'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    sessionDisplayName: 'QA',
    sessionPhone: null,
    sessionRole: 'driver',
    token: null,
    isAuthenticated: true,
    logout: () => undefined,
  }),
  isBackofficeStaffRole: () => false,
}))

vi.mock('@/api/rotacional', () => ({
  fetchRotacionalMessages: async () => [],
}))

vi.mock('@/design-system/components/app/ProfileButton', () => ({
  ProfileButton: () => <button type="button">Conta</button>,
}))

vi.mock('@/design-system/components/app/SettingsButton', () => ({
  SettingsButton: () => <button type="button">Definições</button>,
}))

function countToken(value: string, token: string): number {
  return value.split(token).length - 1
}

describe('chrome Android safe areas', () => {
  it('define o inset inferior uma vez, sem somar env, variável nem teclado', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    const rule = css.slice(css.indexOf('.safe-area-pb {'), css.indexOf('.safe-area-pb {') + 220)
    expect(rule).toContain(
      'padding-bottom: max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px));',
    )
    expect(rule).not.toContain('+')
    expect(rule).not.toContain('keyboard-inset')
    expect(countToken(SAFE_AREA_TOP_CLASS, 'max(')).toBe(1)
    expect(countToken(SAFE_AREA_BOTTOM_CLASS, 'max(')).toBe(1)
    expect(SAFE_AREA_TOP_CLASS).not.toContain('+')
    expect(SCREEN_SCROLL_CLEARANCE_CLASS).not.toContain('env(safe-area-inset-bottom,0px)+var(')
  })

  it.each(['userCompact', 'default'] as const)(
    'header %s fica sticky com o inset superior uma vez',
    (variant) => {
      document.documentElement.style.setProperty('--safe-area-inset-top', '48px')
      document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px')
      render(<AppHeaderBar variant={variant} />)
      const header = screen.getByTestId('app-header')
      expect(header.className).toContain('sticky')
      expect(header.className).toContain('top-0')
      expect(countToken(header.className, SAFE_AREA_TOP_CLASS)).toBe(1)
      expect(header.className).not.toContain(SAFE_AREA_PB_CLASS)
      expect(header.className).not.toContain('safe-area-inset-bottom')
      expect(screen.getByAltText('V@mulá')).toBeVisible()
      document.documentElement.style.removeProperty('--safe-area-inset-top')
      document.documentElement.style.removeProperty('--safe-area-inset-bottom')
    },
  )

  it('header compacto mantém marca e dica visíveis sem insets', () => {
    document.documentElement.style.removeProperty('--safe-area-inset-top')
    document.documentElement.style.removeProperty('--safe-area-inset-bottom')
    render(<AppHeaderBar variant="userCompact" />)
    expect(screen.getByAltText('V@mulá')).toBeVisible()
    expect(screen.getByTestId('app-header-hint-text')).toBeVisible()
    expect(document.documentElement.style.getPropertyValue('--safe-area-inset-top')).toBe('')
    expect(document.documentElement.style.getPropertyValue('--safe-area-inset-bottom')).toBe('')
  })

  it('as três barras inferiores aplicam a classe de inset uma vez, fora dos separadores', () => {
    const { rerender } = render(
      <DriverBottomNav active="home" onSelect={() => undefined} />,
    )
    const assertOnce = (nav: HTMLElement) => {
      expect(countToken(nav.className, SAFE_AREA_PB_CLASS)).toBe(1)
      expect(nav.className).not.toContain(SAFE_AREA_BOTTOM_CLASS)
      for (const button of nav.querySelectorAll('button')) {
        expect(button.className).not.toContain(SAFE_AREA_PB_CLASS)
      }
    }
    assertOnce(screen.getByRole('navigation'))
    rerender(<PassengerBottomNav active="home" onSelect={() => undefined} />)
    assertOnce(screen.getByRole('navigation'))
    rerender(<PartnerBottomNav active="home" onSelect={() => undefined} />)
    assertOnce(screen.getByRole('navigation'))
  })

  it('o scroll chega ao último elemento e o inset da barra não se repete no contentor', () => {
    render(
      <ScreenContainer
        bottomBarVariant="flush"
        mainScrollId="chrome-scroll"
        bottomButton={<nav className={SAFE_AREA_PB_CLASS} data-testid="bottom-bar">tabs</nav>}
      >
        {Array.from({ length: 6 }, (_, index) => (
          <p key={index} data-testid={index === 5 ? 'chrome-last' : undefined}>
            Linha {index + 1}
          </p>
        ))}
      </ScreenContainer>,
    )
    const scroll = document.getElementById('chrome-scroll')
    expect(scroll).toContainElement(screen.getByTestId('chrome-last'))
    expect(countToken(scroll?.className ?? '', SCREEN_SCROLL_CLEARANCE_CLASS)).toBe(1)
    expect(scroll?.className).toContain('overflow-y-auto')
    const bar = screen.getByTestId('bottom-bar')
    const frame = bar.parentElement?.parentElement
    expect(frame?.className).toContain('fixed')
    expect(frame?.className).toContain('bottom-0')
    expect(frame?.className ?? '').not.toContain(SAFE_AREA_PB_CLASS)
    expect(bar.parentElement?.className ?? '').not.toContain(SAFE_AREA_PB_CLASS)
    expect(countToken(bar.className, SAFE_AREA_PB_CLASS)).toBe(1)
  })

  it('a variante inset reserva o sistema uma vez e o mapa imersivo não ganha essa folga', () => {
    const { rerender } = render(
      <ScreenContainer bottomBarVariant="inset" bottomButton={<button type="button">Acção</button>}>
        <p data-testid="inset-last">fim</p>
      </ScreenContainer>,
    )
    const insetScroll = screen.getByTestId('inset-last').parentElement
    expect(countToken(insetScroll?.className ?? '', SCREEN_INSET_SCROLL_CLEARANCE_CLASS)).toBe(1)
    expect(insetScroll?.className).not.toContain(SAFE_AREA_PB_CLASS)
    const insetFrame = screen.getByRole('button', { name: 'Acção' }).parentElement
    expect(insetFrame?.className ?? '').not.toContain(SAFE_AREA_PB_CLASS)

    rerender(
      <ScreenContainer
        contentVariant="driverImmersive"
        mainScrollable={false}
        bottomBarVariant="flush"
        bottomButton={<nav className={SAFE_AREA_PB_CLASS}>tabs</nav>}
      >
        <p data-testid="map-stage">mapa</p>
      </ScreenContainer>,
    )
    const mapColumn = screen.getByTestId('map-stage').parentElement
    expect(mapColumn?.className).toContain('pb-0')
    expect(mapColumn?.className).not.toContain('safe-area-inset-bottom')
  })
})
