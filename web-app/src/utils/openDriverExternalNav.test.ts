import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openDriverExternalNav, driverNavAppLabel, warmDriverNavSessionIfNeeded } from './openDriverExternalNav'

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
