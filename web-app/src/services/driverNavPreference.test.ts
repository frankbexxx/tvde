import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDriverNavApp, setDriverNavApp, type DriverNavApp } from './driverNavPreference'

describe('driverNavPreference', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('defaults to waze when storage empty', () => {
    expect(getDriverNavApp()).toBe('waze')
  })

  it('persists preference', () => {
    const next: DriverNavApp = 'google_maps'
    setDriverNavApp(next)
    expect(getDriverNavApp()).toBe('google_maps')
    expect(localStorage.getItem('tvde_driver_nav_app')).toBe('google_maps')
  })
})
