import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDriverBottomNavEnabled, isDriverHomeTwoStepEnabled } from './driverHomeFeatures'

describe('isDriverHomeTwoStepEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false when env is unset', () => {
    vi.stubEnv('VITE_DRIVER_BOTTOM_NAV', '')
    vi.stubEnv('VITE_DRIVER_HOME_TWO_STEP', '')
    expect(isDriverHomeTwoStepEnabled()).toBe(false)
  })

  it('returns true when env is exactly true', () => {
    vi.stubEnv('VITE_DRIVER_BOTTOM_NAV', '')
    vi.stubEnv('VITE_DRIVER_HOME_TWO_STEP', 'true')
    expect(isDriverHomeTwoStepEnabled()).toBe(true)
  })

  it('returns false when bottom nav is on even if two-step env is true', () => {
    vi.stubEnv('VITE_DRIVER_BOTTOM_NAV', 'true')
    vi.stubEnv('VITE_DRIVER_HOME_TWO_STEP', 'true')
    expect(isDriverHomeTwoStepEnabled()).toBe(false)
  })
})

describe('isDriverBottomNavEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false when env is unset', () => {
    vi.stubEnv('VITE_DRIVER_BOTTOM_NAV', '')
    expect(isDriverBottomNavEnabled()).toBe(false)
  })

  it('returns true when env is exactly true', () => {
    vi.stubEnv('VITE_DRIVER_BOTTOM_NAV', 'true')
    expect(isDriverBottomNavEnabled()).toBe(true)
  })
})
