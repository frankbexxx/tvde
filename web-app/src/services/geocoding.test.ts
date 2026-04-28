import { describe, expect, it } from 'vitest'
import {
  isLikelyInPortugal,
  mapMtilerFeatureToSuggestion,
  mapNominatimItemToSuggestion,
  rankSuggestionForQuery,
  reorderGeocodeSuggestions,
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

describe('ranking helpers', () => {
  it('boosts entries that match postal code and house number', () => {
    const query = 'Rua Caldas Xavier, 3 Oeiras 2780-010'
    const exact = {
      id: 'a',
      lat: 38.7,
      lng: -9.3,
      primary: 'Rua Caldas Xavier, 3',
      secondary: '2780-010 Oeiras, Lisboa',
    }
    const similar = {
      id: 'b',
      lat: 38.7,
      lng: -9.3,
      primary: 'Rua Caldas Xavier',
      secondary: '2700-027 Amadora, Lisboa',
    }
    expect(rankSuggestionForQuery(query, exact)).toBeGreaterThan(rankSuggestionForQuery(query, similar))
  })

  it('reorders suggestions by query relevance while preserving ties', () => {
    const query = 'Rua Caldas Xavier 2780-010'
    const out = reorderGeocodeSuggestions(query, [
      {
        id: '1',
        lat: 0,
        lng: 0,
        primary: 'Rua Caldas Xavier',
        secondary: '2700-027 Amadora',
      },
      {
        id: '2',
        lat: 0,
        lng: 0,
        primary: 'Rua Caldas Xavier, 3',
        secondary: '2780-010 Oeiras',
      },
    ])
    expect(out[0].id).toBe('2')
    expect(out[1].id).toBe('1')
  })
})
