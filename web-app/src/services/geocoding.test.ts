import { describe, expect, it } from 'vitest'
import { mapMtilerFeatureToSuggestion, splitPlaceName } from './geocoding'

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
})
