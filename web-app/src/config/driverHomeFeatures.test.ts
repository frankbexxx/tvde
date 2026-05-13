import { describe, expect, it } from 'vitest'
import { isDriverBottomNavEnabled, isDriverHomeTwoStepEnabled } from './driverHomeFeatures'

describe('isDriverHomeTwoStepEnabled', () => {
  it('é sempre false (shell único)', () => {
    expect(isDriverHomeTwoStepEnabled()).toBe(false)
  })
})

describe('isDriverBottomNavEnabled', () => {
  it('é sempre true', () => {
    expect(isDriverBottomNavEnabled()).toBe(true)
  })
})
