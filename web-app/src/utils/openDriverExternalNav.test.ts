import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  driverNavAppLabel,
  openDriverExternalNav,
  reserveDriverExternalNavWindow,
  warmDriverNavSessionIfNeeded,
} from './openDriverExternalNav'

vi.mock('../services/driverNavPreference', () => ({
  getDriverNavApp: vi.fn(() => 'waze'),
}))

describe('openDriverExternalNav', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn(() => ({ closed: false }) as Window))
  })

  it('abre URL Waze com coordenadas', () => {
    const open = vi.mocked(window.open)
    expect(openDriverExternalNav(38.7, -9.1)).toBe(true)
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining('waze.com'),
      '_blank',
      'noopener,noreferrer'
    )
    expect(open.mock.calls[0][0]).toContain(encodeURIComponent('38.7,-9.1'))
  })

  it('navega uma janela reservada sem chamar window.open novamente', () => {
    const open = vi.mocked(window.open)
    const reserved = {
      closed: false,
      close: vi.fn(),
      location: { href: '' },
      opener: {},
    } as unknown as Window

    expect(openDriverExternalNav(38.7, -9.1, reserved)).toBe(true)

    expect(open).not.toHaveBeenCalled()
    expect(reserved.location.href).toContain('waze.com')
    expect(reserved.location.href).toContain(encodeURIComponent('38.7,-9.1'))
  })

  it('devolve false quando o popup é bloqueado', () => {
    vi.stubGlobal('open', vi.fn(() => null))

    expect(openDriverExternalNav(38.7, -9.1)).toBe(false)
  })

  it('reserva janela de navegação no gesto do utilizador', () => {
    const reserved = {
      closed: false,
      close: vi.fn(),
      location: { href: '' },
      opener: {},
    } as unknown as Window
    vi.stubGlobal('open', vi.fn(() => reserved))
    const open = vi.mocked(window.open)

    expect(reserveDriverExternalNavWindow()).toBe(reserved)
    expect(open).toHaveBeenCalledWith('', '_blank')
    expect(reserved.opener).toBeNull()
  })

  it('driverNavAppLabel reflecte preferência', () => {
    expect(driverNavAppLabel()).toBe('Waze')
  })

  it('warmDriverNavSessionIfNeeded abre Waze uma vez', () => {
    sessionStorage.clear()
    const open = vi.mocked(window.open)
    warmDriverNavSessionIfNeeded()
    expect(open).toHaveBeenCalledWith('https://www.waze.com/', '_blank', 'noopener,noreferrer')
    open.mockClear()
    warmDriverNavSessionIfNeeded()
    expect(open).not.toHaveBeenCalled()
  })
})
