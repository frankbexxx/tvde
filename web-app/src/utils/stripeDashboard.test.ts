import { describe, expect, it } from 'vitest'
import { stripePaymentIntentDashboardUrls } from './stripeDashboard'

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
})
