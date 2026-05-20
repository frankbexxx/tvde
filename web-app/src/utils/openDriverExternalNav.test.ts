import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openDriverExternalNav, driverNavAppLabel } from './openDriverExternalNav'

vi.mock('../services/driverNavPreference', () => ({
  getDriverNavApp: vi.fn(() => 'waze'),
}))

describe('openDriverExternalNav', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn(() => ({ closed: false }) as Window))
  })

  it('abre URL Waze com coordenadas', () => {
    const open = vi.mocked(window.open)
    expect(openDriverExternalNav(38.7, -9.1, 'pickup')).toBe(true)
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining('waze.com'),
      '_blank',
      'noopener,noreferrer'
    )
    expect(open.mock.calls[0][0]).toContain(encodeURIComponent('38.7,-9.1'))
  })

  it('driverNavAppLabel reflecte preferência', () => {
    expect(driverNavAppLabel()).toBe('Waze')
  })
})
