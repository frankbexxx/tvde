import { describe, expect, it } from 'vitest'
import { canDriverStartTripNearPickup } from './driverPickupGate'

describe('canDriverStartTripNearPickup', () => {
  const pickup = { lat: 0, lng: 0 }
  const near = { lat: 0.0004, lng: 0 }

  it('allows non-start states without location', () => {
    expect(canDriverStartTripNearPickup('ongoing', null, null)).toBe(true)
  })

  it('requires driver and pickup for accepted', () => {
    expect(canDriverStartTripNearPickup('accepted', null, pickup)).toBe(false)
    expect(canDriverStartTripNearPickup('accepted', near, null)).toBe(false)
    expect(canDriverStartTripNearPickup('accepted', near, pickup)).toBe(true)
  })
})
