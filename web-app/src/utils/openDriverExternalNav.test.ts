import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openDriverExternalNav, driverNavAppLabel } from './openDriverExternalNav'
import { getDriverNavApp } from '../services/driverNavPreference'
import { canOpenExternalUrl, isNativePlatform, openExternalUrl } from './openExternalApp'

vi.mock('../services/driverNavPreference', () => ({
  getDriverNavApp: vi.fn(() => 'waze'),
}))

vi.mock('./openExternalApp', () => ({
  isNativePlatform: vi.fn(() => false),
  canOpenExternalUrl: vi.fn(async () => false),
  openExternalUrl: vi.fn(async () => true),
}))

describe('openDriverExternalNav', () => {
  beforeEach(() => {
    vi.mocked(getDriverNavApp).mockReturnValue('waze')
    vi.mocked(isNativePlatform).mockReturnValue(false)
    vi.mocked(canOpenExternalUrl).mockResolvedValue(false)
    vi.mocked(openExternalUrl).mockResolvedValue(true)
    vi.mocked(openExternalUrl).mockClear()
    vi.mocked(canOpenExternalUrl).mockClear()
  })

  it('na web abre o URL HTTPS do Waze', async () => {
    await expect(openDriverExternalNav(38.7, -9.1)).resolves.toBe(true)
    expect(openExternalUrl).toHaveBeenCalledWith(expect.stringContaining('https://waze.com/ul'))
    expect(canOpenExternalUrl).not.toHaveBeenCalled()
  })

  it('na web abre Google Maps HTTPS quando a preferência é maps', async () => {
    vi.mocked(getDriverNavApp).mockReturnValue('google_maps')
    await openDriverExternalNav(38.7, -9.1)
    const url = vi.mocked(openExternalUrl).mock.calls[0][0] as string
    expect(url).toContain('https://www.google.com/maps/dir/')
    expect(url).toContain(encodeURIComponent('38.7,-9.1'))
  })

  it('no Android abre o deep link Waze quando a app existe', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(true)
    vi.mocked(canOpenExternalUrl).mockResolvedValue(true)
    await expect(openDriverExternalNav(38.7, -9.1)).resolves.toBe(true)
    expect(canOpenExternalUrl).toHaveBeenCalledWith(expect.stringContaining('waze://'))
    expect(openExternalUrl).toHaveBeenCalledWith(expect.stringContaining('waze://'))
  })

  it('no Android cai no HTTPS se a app Waze não existir', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(true)
    vi.mocked(canOpenExternalUrl).mockResolvedValue(false)
    await openDriverExternalNav(38.7, -9.1)
    expect(openExternalUrl).toHaveBeenCalledWith(expect.stringContaining('https://waze.com/ul'))
  })

  it('no Android abre google.navigation quando a app existe', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(true)
    vi.mocked(getDriverNavApp).mockReturnValue('google_maps')
    vi.mocked(canOpenExternalUrl).mockResolvedValue(true)
    await openDriverExternalNav(38.7, -9.1)
    expect(openExternalUrl).toHaveBeenCalledWith(expect.stringContaining('google.navigation:'))
  })

  it('no Android cai no HTTPS do Maps se a app não existir', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(true)
    vi.mocked(getDriverNavApp).mockReturnValue('google_maps')
    await openDriverExternalNav(38.7, -9.1)
    expect(openExternalUrl).toHaveBeenCalledWith(
      expect.stringContaining('https://www.google.com/maps/dir/')
    )
  })

  it('não abre nada com coordenadas inválidas', async () => {
    await expect(openDriverExternalNav(Number.NaN, 1)).resolves.toBe(false)
    await expect(openDriverExternalNav(91, 0)).resolves.toBe(false)
    expect(openExternalUrl).not.toHaveBeenCalled()
  })

  it('driverNavAppLabel reflecte preferência', () => {
    expect(driverNavAppLabel()).toBe('Waze')
    vi.mocked(getDriverNavApp).mockReturnValue('google_maps')
    expect(driverNavAppLabel()).toBe('Google Maps')
  })
})
