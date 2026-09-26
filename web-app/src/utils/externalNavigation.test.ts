import { describe, expect, it } from 'vitest'
import {
  googleMapsAppUrl,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  isValidNavCoordinate,
  wazeAppUrl,
  wazeNavigateUrl,
} from './externalNavigation'

describe('externalNavigation', () => {
  it('aceita coordenadas finitas dentro dos limites', () => {
    expect(isValidNavCoordinate(38.7223, -9.1393)).toBe(true)
    expect(isValidNavCoordinate(0, 0)).toBe(true)
  })

  it('rejeita coordenadas inválidas', () => {
    expect(isValidNavCoordinate(Number.NaN, -9)).toBe(false)
    expect(isValidNavCoordinate(91, 0)).toBe(false)
    expect(isValidNavCoordinate(0, 181)).toBe(false)
    expect(isValidNavCoordinate(Number.POSITIVE_INFINITY, 0)).toBe(false)
  })

  it('wazeNavigateUrl inclui coordenadas e navigate', () => {
    const u = wazeNavigateUrl(38.7223, -9.1393)
    expect(u).toContain('https://waze.com/ul')
    expect(u).toContain('navigate=yes')
    expect(u).toContain(encodeURIComponent('38.7223,-9.1393'))
  })

  it('wazeAppUrl usa o scheme da app', () => {
    const u = wazeAppUrl(38.7, -9.1)
    expect(u.startsWith('waze://?ll=')).toBe(true)
    expect(u).toContain(encodeURIComponent('38.7,-9.1'))
    expect(u).toContain('navigate=yes')
  })

  it('googleMapsDirectionsUrl aponta para destination', () => {
    const u = googleMapsDirectionsUrl(38.7, -9.1)
    expect(u).toContain('https://www.google.com/maps/dir/')
    expect(u).toContain(`destination=${encodeURIComponent('38.7,-9.1')}`)
    expect(u).toContain('travelmode=driving')
  })

  it('googleMapsAppUrl usa google.navigation', () => {
    const u = googleMapsAppUrl(38.7, -9.1)
    expect(u.startsWith('google.navigation:q=')).toBe(true)
    expect(u).toContain('mode=d')
    expect(u).toContain(encodeURIComponent('38.7,-9.1'))
  })

  it('googleMapsSearchUrl codifica o ponto e recusa coordenadas inválidas', () => {
    expect(googleMapsSearchUrl(38.7, -9.1)).toContain(
      `query=${encodeURIComponent('38.7,-9.1')}`
    )
    expect(googleMapsSearchUrl(99, 0)).toBeNull()
  })
})
