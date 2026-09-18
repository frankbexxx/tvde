import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  forwardGeocodeSearch,
  isLikelyInPortugal,
  mapMtilerFeatureToSuggestion,
  mapNominatimItemToSuggestion,
  rankSuggestionForQuery,
  reorderGeocodeSuggestions,
  resolveGeocodeProximity,
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

describe('resolveGeocodeProximity', () => {
  it('uses provided pickup/GPS coordinates', () => {
    expect(resolveGeocodeProximity({ lat: 38.69, lng: -9.32 })).toEqual({
      lat: 38.69,
      lng: -9.32,
    })
  })

  it('falls back to Lisbon metro hint without coordinates', () => {
    expect(resolveGeocodeProximity(null)).toEqual({ lng: -9.1393, lat: 38.7223 })
    expect(resolveGeocodeProximity(undefined)).toEqual({ lng: -9.1393, lat: 38.7223 })
    expect(resolveGeocodeProximity({ lat: Number.NaN, lng: -9 })).toEqual({
      lng: -9.1393,
      lat: 38.7223,
    })
  })
})

describe('forwardGeocodeSearch proximity', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('biases provider request toward pickup coordinates', async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        urls.push(url)
        if (url.includes('maptiler.com')) {
          return {
            ok: true,
            json: async () => ({
              features: [
                {
                  geometry: { coordinates: [-9.32, 38.69] },
                  place_name: 'Avenida de Moçambique, Oeiras',
                },
              ],
            }),
          }
        }
        return {
          ok: true,
          json: async () => [
            {
              place_id: 1,
              lat: '38.69',
              lon: '-9.32',
              display_name: 'Avenida de Moçambique, Oeiras',
            },
          ],
        }
      })
    )

    const rows = await forwardGeocodeSearch('Avenida de Moçambique', 5, {
      lat: 38.69,
      lng: -9.32,
    })
    expect(rows.length).toBeGreaterThan(0)
    expect(
      urls.some(
        (u) =>
          u.includes('proximity=-9.32%2C38.69') ||
          u.includes('proximity=-9.32,38.69') ||
          u.includes('viewbox=-10.12')
      )
    ).toBe(true)
  })

  it('still works without proximity argument', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('maptiler.com')) {
          return { ok: true, json: async () => ({ features: [] }) }
        }
        return {
          ok: true,
          json: async () => [
            {
              place_id: 2,
              lat: '38.72',
              lon: '-9.14',
              display_name: 'Lisboa, Portugal',
            },
          ],
        }
      })
    )
    const rows = await forwardGeocodeSearch('Lisboa', 3)
    expect(rows[0]?.primary).toBe('Lisboa')
  })
})
