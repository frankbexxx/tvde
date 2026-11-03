import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PartnerHome } from './PartnerHome'
import { PartnerLayout } from './PartnerLayout'
import { PartnerShellProvider, usePartnerShell } from './partnerShellContext'
import {
  PARTNER_ALERT_OFFSET_CLASS,
  PARTNER_CONTENT_CLEARANCE_CLASS,
  SAFE_AREA_PB_CLASS,
} from '@/components/layout/safeAreaInsets'

vi.mock('../../api/partner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/partner')>()
  return {
    ...actual,
    fetchPartnerInboxMessages: vi.fn(async () => []),
  }
})

vi.mock('../../hooks/usePolling', () => ({
  usePolling: () => ({ data: null }),
}))

vi.mock('./partnerWorkspace', () => ({
  PartnerWorkspaceProvider: ({ children }: { children: React.ReactNode }) => children,
  usePartnerWorkspace: () => ({
    metrics: null,
    trips: [],
    drivers: [],
    vehicles: [],
    loading: false,
    error: null,
    load: vi.fn(),
    operationalAlertsSource: { drivers: [], trips: [], vehicles: [] },
  }),
}))

function countToken(value: string, token: string): number {
  return value.split(token).length - 1
}

function HomeProbe() {
  const shell = usePartnerShell()
  return (
    <>
      <button type="button" onClick={() => shell.openMenu('root')}>
        Abrir menu
      </button>
      <PartnerHome />
    </>
  )
}

describe('folga inferior do parceiro', () => {
  it('reserva a altura da barra mais o inset, e tira a reserva com o menu aberto', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })
    render(
      <PartnerShellProvider>
        <HomeProbe />
      </PartnerShellProvider>,
    )
    const alerts = screen.getByTestId('partner-home-alerts')
    expect(countToken(alerts.className, PARTNER_ALERT_OFFSET_CLASS)).toBe(1)
    expect(alerts.className).not.toContain(SAFE_AREA_PB_CLASS)
    expect(countToken(PARTNER_ALERT_OFFSET_CLASS, 'max(')).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(screen.getByTestId('partner-home-alerts').className).toContain('bottom-0')
    expect(screen.getByTestId('partner-home-alerts').className).not.toContain('safe-area-inset-bottom')
  })

  it('mantém o último conteúdo no scroll e não duplica o inset da barra', () => {
    render(
      <MemoryRouter initialEntries={['/partner']}>
        <Routes>
          <Route path="/partner" element={<PartnerLayout />}>
            <Route index element={<p data-testid="partner-last">Último</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    const scroller = screen.getByTestId('partner-shell-scroll')
    expect(scroller).toContainElement(screen.getByTestId('partner-last'))
    expect(countToken(scroller.className, PARTNER_CONTENT_CLEARANCE_CLASS)).toBe(1)
    const nav = screen.getByRole('navigation')
    expect(countToken(nav.className, SAFE_AREA_PB_CLASS)).toBe(1)
    expect(nav.parentElement?.className ?? '').not.toContain(SAFE_AREA_PB_CLASS)
    expect(scroller.className).not.toContain(SAFE_AREA_PB_CLASS)

    fireEvent.click(screen.getByTestId('partner-open-menu'))
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.getByTestId('partner-shell-scroll').className).not.toContain('safe-area-inset-bottom')
    expect(screen.getByTestId('partner-shell-scroll')).toContainElement(screen.getByTestId('partner-last'))
  })
})
