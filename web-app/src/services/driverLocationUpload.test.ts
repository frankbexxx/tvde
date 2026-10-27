import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  resolveDriverLocationUploadOrigin,
  shouldUploadDriverLocation,
} from './driverLocationUpload'

describe('shouldUploadDriverLocation', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows device_gps', () => {
    expect(shouldUploadDriverLocation('device_gps')).toBe(true)
  })

  it('blocks presentation_fallback (Oeiras UI)', () => {
    expect(shouldUploadDriverLocation('presentation_fallback')).toBe(false)
  })

  it('blocks demo', () => {
    expect(shouldUploadDriverLocation('demo')).toBe(false)
  })

  it('blocks unavailable', () => {
    expect(shouldUploadDriverLocation('unavailable')).toBe(false)
  })

  it('blocks mock when VITE_E2E is not true (including vitest default)', () => {
    vi.stubEnv('VITE_E2E', '')
    expect(shouldUploadDriverLocation('mock')).toBe(false)
  })

  it('allows mock only when VITE_E2E=true', () => {
    vi.stubEnv('VITE_E2E', 'true')
    expect(shouldUploadDriverLocation('mock')).toBe(true)
  })
})

describe('resolveDriverLocationUploadOrigin', () => {
  it('prefers mock simulation over geolocation origin', () => {
    expect(
      resolveDriverLocationUploadOrigin({
        mockSimulated: true,
        geolocationOrigin: 'device_gps',
      })
    ).toBe('mock')
  })

  it('uses geolocation origin when not simulating', () => {
    expect(
      resolveDriverLocationUploadOrigin({
        mockSimulated: false,
        geolocationOrigin: 'presentation_fallback',
      })
    ).toBe('presentation_fallback')
  })
})
