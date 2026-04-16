import { describe, expect, it } from 'vitest'
import { parseAdminDashboardQuery } from './adminDashboardQuery'

describe('parseAdminDashboardQuery', () => {
  it('defaults to pending when empty', () => {
    expect(parseAdminDashboardQuery(new URLSearchParams())).toEqual({
      tab: 'pending',
      tripId: null,
      tripsList: 'active',
    })
  })

  it('parses tab=health', () => {
    const sp = new URLSearchParams('tab=health')
    expect(parseAdminDashboardQuery(sp)).toEqual({ tab: 'health', tripId: null, tripsList: 'active' })
  })

  it('forces trips when tripId is set', () => {
    const sp = new URLSearchParams('tab=health&tripId=abc-123')
    expect(parseAdminDashboardQuery(sp)).toEqual({ tab: 'trips', tripId: 'abc-123', tripsList: 'active' })
  })

  it('accepts trip_id alias', () => {
    const sp = new URLSearchParams('trip_id=uuid-here')
    expect(parseAdminDashboardQuery(sp)).toEqual({ tab: 'trips', tripId: 'uuid-here', tripsList: 'active' })
  })

  it('parses tripsList=history for trips tab', () => {
    const sp = new URLSearchParams('tab=trips&tripsList=history')
    expect(parseAdminDashboardQuery(sp)).toEqual({ tab: 'trips', tripId: null, tripsList: 'history' })
  })

  it('ignores invalid tab', () => {
    const sp = new URLSearchParams('tab=nope')
    expect(parseAdminDashboardQuery(sp)).toEqual({ tab: 'pending', tripId: null, tripsList: 'active' })
  })
})
