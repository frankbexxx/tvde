import { describe, expect, it } from 'vitest'
import {
  isLikelyInPortugal,
  mapMtilerFeatureToSuggestion,
  mapNominatimItemToSuggestion,
  splitPlaceName,
} from './geocoding'

describe('splitPlaceName', () => {
  it('splits on first comma', () => {
    expect(splitPlaceName('Rua X, Lisboa, Portugal')).toEqual({
      primary: 'Rua X',
      secondary: 'Lisboa, Portugal',
    })
  })

  it('returns full string as primary when no comma', () => {
    expect(splitPlaceName('Lisboa')).toEqual({ primary: 'Lisboa', secondary: '' })
  })
})

describe('mapMtilerFeatureToSuggestion', () => {
  it('maps MapTiler-like feature', () => {
    const s = mapMtilerFeatureToSuggestion(
      {
        geometry: { coordinates: [-9.14, 38.72] },
        place_name: 'Alfama, Lisboa',
      },
      0
    )
    expect(s).toMatchObject({
      primary: 'Alfama',
      secondary: 'Lisboa',
      lat: 38.72,
      lng: -9.14,
    })
    expect(s?.id).toBeDefined()
  })

  it('returns null without coordinates', () => {
    expect(mapMtilerFeatureToSuggestion({ place_name: 'Somewhere' }, 0)).toBeNull()
  })

  it('filters out suggestions outside Portugal', () => {
    expect(
      mapMtilerFeatureToSuggestion(
        {
          geometry: { coordinates: [-43.2, -22.9] },
          place_name: 'Rua Caldas Xavier, Rio de Janeiro, Brasil',
        },
        0
      )
    ).toBeNull()
  })
})

describe('mapNominatimItemToSuggestion', () => {
  it('maps Nominatim-like item', () => {
    const s = mapNominatimItemToSuggestion(
      {
        place_id: 42,
        lat: '38.72',
        lon: '-9.14',
        display_name: 'Alfama, Lisboa, Portugal',
      },
      0
    )
    expect(s).toMatchObject({
      primary: 'Alfama',
      secondary: 'Lisboa, Portugal',
      lat: 38.72,
      lng: -9.14,
    })
    expect(s?.id).toContain('nom-42')
  })

  it('returns null without valid coordinates', () => {
    expect(
      mapNominatimItemToSuggestion(
        { lat: 'abc', lon: 'def', display_name: 'X' },
        0
      )
    ).toBeNull()
  })

  it('returns null without a display name', () => {
    expect(mapNominatimItemToSuggestion({ lat: '38.72', lon: '-9.14' }, 0)).toBeNull()
  })
})

describe('isLikelyInPortugal', () => {
  it('accepts mainland Portugal, Madeira and Azores coordinates', () => {
    expect(isLikelyInPortugal(-9.14, 38.72)).toBe(true)
    expect(isLikelyInPortugal(-16.92, 32.65)).toBe(true)
    expect(isLikelyInPortugal(-25.67, 37.74)).toBe(true)
  })

  it('rejects Brasil and Angola coordinates', () => {
    expect(isLikelyInPortugal(-43.2, -22.9)).toBe(false)
    expect(isLikelyInPortugal(13.23, -8.84)).toBe(false)
  })
})
