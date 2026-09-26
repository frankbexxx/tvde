import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canOpenExternalUrl, openExternalUrl } from './openExternalApp'

const plugin = vi.hoisted(() => ({
  canOpenUrl: vi.fn(async () => ({ value: true })),
  openUrl: vi.fn(async () => ({ completed: true })),
  then: vi.fn(() => {
    throw new Error('AppLauncher.then() is not implemented on android')
  }),
}))

const native = vi.hoisted(() => ({ value: true }))

vi.mock('@capacitor/app-launcher', () => ({
  AppLauncher: plugin,
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => native.value,
  },
}))

describe('openExternalApp', () => {
  beforeEach(() => {
    native.value = true
    plugin.canOpenUrl.mockClear()
    plugin.openUrl.mockClear()
    plugin.then.mockClear()
    plugin.canOpenUrl.mockResolvedValue({ value: true })
    plugin.openUrl.mockResolvedValue({ completed: true })
  })

  it('não trata o plugin como Promise e chama openUrl nele', async () => {
    await expect(openExternalUrl('waze://?ll=1,2&navigate=yes')).resolves.toBe(true)
    expect(plugin.then).not.toHaveBeenCalled()
    expect(plugin.openUrl).toHaveBeenCalledWith({ url: 'waze://?ll=1,2&navigate=yes' })
  })

  it('canOpenUrl também corre no plugin, sem await do objecto', async () => {
    await expect(canOpenExternalUrl('google.navigation:q=1,2&mode=d')).resolves.toBe(true)
    expect(plugin.then).not.toHaveBeenCalled()
    expect(plugin.canOpenUrl).toHaveBeenCalledWith({ url: 'google.navigation:q=1,2&mode=d' })
  })

  it('na web abre HTTPS num separador e não toca no plugin', async () => {
    native.value = false
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window)
    await expect(openExternalUrl('https://waze.com/ul?ll=1,2&navigate=yes')).resolves.toBe(true)
    expect(plugin.openUrl).not.toHaveBeenCalled()
    expect(plugin.then).not.toHaveBeenCalled()
    open.mockRestore()
  })
})
