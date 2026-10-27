/**
 * G2-DRV-GPS-08: whether a client-side location fix may be POSTed to /drivers/location.
 * Decision is by origin, not by lat/lng (real GPS in Oeiras is allowed).
 */

export type DriverLocationUploadOrigin =
  | 'device_gps'
  | 'presentation_fallback'
  | 'demo'
  | 'mock'
  | 'unavailable'

export function shouldUploadDriverLocation(origin: DriverLocationUploadOrigin): boolean {
  if (origin === 'device_gps') return true
  // Playwright / CI only (VITE_E2E) — never in production or staging static/APK builds.
  if (origin === 'mock') {
    return import.meta.env.VITE_E2E === 'true'
  }
  return false
}

export function resolveDriverLocationUploadOrigin(opts: {
  mockSimulated: boolean
  geolocationOrigin: DriverLocationUploadOrigin
}): DriverLocationUploadOrigin {
  if (opts.mockSimulated) return 'mock'
  return opts.geolocationOrigin
}
