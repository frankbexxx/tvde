import { describe, expect, it } from 'vitest'
import type { DriverLocationUploadOrigin } from './driverLocationUpload'
import { sendDriverLocation } from './locationService'

/**
 * Contract: origin is required (no default device_gps).
 * Typecheck enforces call sites; this test documents the runtime API shape.
 */
describe('sendDriverLocation origin contract (G2-DRV-GPS-08B)', () => {
  it('accepts all explicit DriverLocationUploadOrigin values at compile time', () => {
    const origins: DriverLocationUploadOrigin[] = [
      'device_gps',
      'presentation_fallback',
      'demo',
      'mock',
      'unavailable',
    ]
    expect(origins).toHaveLength(5)
    expect(typeof sendDriverLocation).toBe('function')
  })
})
