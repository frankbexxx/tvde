import { describe, expect, it } from 'vitest'
import { placeSearchShouldFetch } from './placeSearchFetch'

describe('placeSearchShouldFetch', () => {
  it('returns false when selectionCommitted even with long query', () => {
    expect(
      placeSearchShouldFetch({
        query: 'Avenida de Moçambique, Oeiras',
        selectionCommitted: true,
      })
    ).toBe(false)
  })

  it('returns true for normal typing without selection', () => {
    expect(
      placeSearchShouldFetch({
        query: 'Avenida de Mo',
        selectionCommitted: false,
      })
    ).toBe(true)
  })

  it('returns false below min length', () => {
    expect(
      placeSearchShouldFetch({
        query: 'A',
        selectionCommitted: false,
      })
    ).toBe(false)
  })

  it('returns false when enabled is false', () => {
    expect(
      placeSearchShouldFetch({
        query: 'Avenida',
        selectionCommitted: false,
        enabled: false,
      })
    ).toBe(false)
  })
})
