import { describe, expect, it } from 'vitest'
import { googleMapsDirectionsUrl, wazeNavigateUrl } from './externalNavigation'

describe('externalNavigation', () => {
  it('wazeNavigateUrl inclui coordenadas e navigate', () => {
    const u = wazeNavigateUrl(38.7223, -9.1393)
    expect(u).toContain('waze.com')
    expect(u).toContain('navigate=yes')
    expect(u).toContain(encodeURIComponent('38.7223,-9.1393'))
  })

  it('googleMapsDirectionsUrl aponta para destination', () => {
    const u = googleMapsDirectionsUrl(38.7, -9.1)
    expect(u).toContain('google.com/maps')
    expect(u).toContain('destination=')
  })
})
