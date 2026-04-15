import { describe, expect, it } from 'vitest'
import {
  isStripeDashboardPaymentIntentId,
  stripePaymentIntentDashboardUrls,
} from './stripeDashboard'

describe('stripePaymentIntentDashboardUrls', () => {
  it('builds live and test URLs for pi_', () => {
    const u = stripePaymentIntentDashboardUrls('pi_3ABC123')
    expect(u).not.toBeNull()
    expect(u!.live).toContain('dashboard.stripe.com/payments/')
    expect(u!.live).toContain('pi_3ABC123')
    expect(u!.test).toContain('/test/payments/')
  })

  it('returns null for non pi_', () => {
    expect(stripePaymentIntentDashboardUrls('ch_123')).toBeNull()
    expect(stripePaymentIntentDashboardUrls('')).toBeNull()
  })

  it('returns null for fixture / mock payment intent ids', () => {
    expect(stripePaymentIntentDashboardUrls('pi_test_123')).toBeNull()
    expect(stripePaymentIntentDashboardUrls('pi_mock_abc')).toBeNull()
  })
})

describe('isStripeDashboardPaymentIntentId', () => {
  it('matches real-looking pi_ ids', () => {
    expect(isStripeDashboardPaymentIntentId('pi_3T5wPa8jcCqT4zTo1yQFBpjg')).toBe(true)
  })

  it('rejects mock and placeholder ids', () => {
    expect(isStripeDashboardPaymentIntentId('pi_test_123')).toBe(false)
    expect(isStripeDashboardPaymentIntentId('pi_mock_x')).toBe(false)
  })
})
