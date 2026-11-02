import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@/i18n'
import {
  AppMenuBody,
  AppMenuHeader,
  AppMenuLogoutRow,
  AppMenuRow,
  AppSideMenuSheet,
} from './AppMenuShell'

const TOP_INSET = 'pt-[max(env(safe-area-inset-top,0px),var(--safe-area-inset-top,0px))]'
const BOTTOM_INSET = 'pb-[max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px))]'

function renderMenu() {
  render(
    <AppSideMenuSheet
      open
      onOpenChange={() => undefined}
      testId="driver-side-menu"
      srTitle="Menu"
      srDescription="Documentos e sessão"
      closeOnDismiss={() => undefined}
    >
      <AppMenuHeader title="Documentos" onBack={() => undefined} onClose={() => undefined} closeTestId="driver-close-menu" />
      <AppMenuBody>
        {Array.from({ length: 12 }, (_, index) => (
          <AppMenuRow
            key={index}
            label={`Entrada ${index + 1}`}
            icon={<span aria-hidden>i</span>}
            onClick={() => undefined}
            testId={`menu-row-${index + 1}`}
          />
        ))}
        <AppMenuLogoutRow onClick={() => undefined} testId="menu-logout" />
      </AppMenuBody>
    </AppSideMenuSheet>,
  )
}

describe('AppMenuShell safe areas', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--safe-area-inset-top')
    document.documentElement.style.removeProperty('--safe-area-inset-bottom')
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })
  })

  it('aplica o inset uma vez na coluna e deixa o último controlo no scroll', () => {
    renderMenu()
    const frame = screen.getByTestId('app-menu-safe-frame')
    expect(frame.className).toContain(TOP_INSET)
    expect(frame.className).toContain(BOTTOM_INSET)
    expect(frame.className.indexOf(TOP_INSET)).toBe(frame.className.lastIndexOf(TOP_INSET))
    expect(frame.className.indexOf(BOTTOM_INSET)).toBe(frame.className.lastIndexOf(BOTTOM_INSET))

    const header = screen.getByRole('button', { name: i18n.t('back') }).parentElement?.parentElement
    expect(header?.className ?? '').not.toContain('safe-area-inset')
    expect(screen.getByTestId('menu-logout').className).not.toContain('safe-area-inset')

    const body = screen.getByTestId('menu-logout').parentElement
    expect(body?.className).toContain('overflow-y-auto')
    expect(body?.className).toContain('min-h-0')
    expect(body).toContainElement(screen.getByTestId('menu-row-12'))
    expect(body).toContainElement(screen.getByTestId('menu-logout'))
  })

  it('mantém título, voltar, fechar e sair acessíveis sem insets definidos', () => {
    renderMenu()
    expect(screen.getByText('Documentos')).toBeVisible()
    expect(screen.getByRole('button', { name: i18n.t('back') })).toBeVisible()
    expect(screen.getByTestId('driver-close-menu')).toBeVisible()
    expect(screen.getByTestId('menu-logout')).toBeVisible()
    expect(document.documentElement.style.getPropertyValue('--safe-area-inset-top')).toBe('')
    expect(document.documentElement.style.getPropertyValue('--safe-area-inset-bottom')).toBe('')
  })
})
