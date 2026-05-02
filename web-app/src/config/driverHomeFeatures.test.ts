import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDriverHomeTwoStepEnabled } from './driverHomeFeatures'

describe('isDriverHomeTwoStepEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false when env is unset', () => {
    vi.stubEnv('VITE_DRIVER_HOME_TWO_STEP', '')
    expect(isDriverHomeTwoStepEnabled()).toBe(false)
  })

  it('returns true when env is exactly true', () => {
    vi.stubEnv('VITE_DRIVER_HOME_TWO_STEP', 'true')
    expect(isDriverHomeTwoStepEnabled()).toBe(true)
  })
})
