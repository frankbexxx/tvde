import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DestinationSearchField } from './DestinationSearchField'
import type { GeocodeSuggestion } from '@/services/geocoding'

const suggestions: GeocodeSuggestion[] = Array.from({ length: 8 }, (_, i) => ({
  id: `s${i}`,
  primary: `Lisboa ${i}`,
  secondary: 'Portugal',
  lat: 38.7 + i * 0.001,
  lng: -9.14,
}))

describe('DestinationSearchField mobile UX', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('forces computed font-size 16px on the search input', () => {
    render(
      <DestinationSearchField
        query=""
        onQueryChange={() => undefined}
        suggestions={[]}
        loading={false}
        onSelect={() => undefined}
      />
    )
    const input = screen.getByTestId('destination-search-input')
    expect(input.style.fontSize).toBe('16px')
    expect(input.className).toMatch(/text-\[16px\]/)
  })

  it('focus + typing expands search mode and notifies parent', async () => {
    const onActive = vi.fn()
    render(
      <div data-testid="map-bottom-sheet">
        <DestinationSearchField
          query="Lis"
          onQueryChange={() => undefined}
          suggestions={suggestions}
          loading={false}
          onSelect={() => undefined}
          onSearchActiveChange={onActive}
        />
        <button type="button">Marcar recolha no mapa</button>
      </div>
    )
    const input = screen.getByTestId('destination-search-input')
    fireEvent.focus(input)
    await waitFor(() =>
      expect(screen.getByTestId('destination-search-field').getAttribute('data-search-active')).toBe(
        'true'
      )
    )
    expect(onActive).toHaveBeenCalledWith(true)
    const list = screen.getByTestId('destination-suggestions')
    expect(list.className).toMatch(/relative/)
    expect(list.className).not.toMatch(/absolute/)
    expect(screen.getAllByRole('option').length).toBe(8)
  })

  it('selection collapses search, blurs, and calls onSelect', async () => {
    const onActive = vi.fn()
    const onSelect = vi.fn()
    render(
      <DestinationSearchField
        query="Lis"
        onQueryChange={() => undefined}
        suggestions={suggestions}
        loading={false}
        onSelect={onSelect}
        onSearchActiveChange={onActive}
      />
    )
    const input = screen.getByTestId('destination-search-input') as HTMLInputElement
    const blur = vi.spyOn(input, 'blur')
    fireEvent.focus(input)
    await waitFor(() => expect(onActive).toHaveBeenCalledWith(true))
    fireEvent.click(screen.getByRole('option', { name: /Lisboa 0/i }))
    expect(onSelect).toHaveBeenCalledWith(suggestions[0])
    expect(blur).toHaveBeenCalled()
    expect(onActive).toHaveBeenCalledWith(false)
  })

  for (const width of [360, 390, 412]) {
    it(`keeps 16px input style at ${width}px viewport shell`, () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
      render(
        <div style={{ width }}>
          <DestinationSearchField
            query=""
            onQueryChange={() => undefined}
            suggestions={[]}
            loading={false}
            onSelect={() => undefined}
          />
        </div>
      )
      expect(screen.getByTestId('destination-search-input').style.fontSize).toBe('16px')
    })
  }
})
