import { describe, expect, it } from 'vitest'
import { isCapacitorNative } from './capacitorPlatform'

describe('capacitor platform', () => {
  it('is not native in the browser test runner', () => {
    expect(isCapacitorNative()).toBe(false)
  })
})
