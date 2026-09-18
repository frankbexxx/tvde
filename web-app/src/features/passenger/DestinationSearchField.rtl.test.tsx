import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('uses text-base (>=16px) on the search input', () => {
    render(
      <DestinationSearchField
        query=""
        onQueryChange={() => undefined}
        suggestions={[]}
        loading={false}
        onSelect={() => undefined}
      />
    )
    const input = screen.getByRole('searchbox')
    expect(input.className).toMatch(/(?:^|\s)text-base(?:\s|$)/)
    expect(input.className).not.toMatch(/(?:^|\s)text-sm(?:\s|$)/)
  })

  it('caps suggestion list height and exposes listbox when open', () => {
    render(
      <div data-testid="map-bottom-sheet">
        <DestinationSearchField
          query="Lis"
          onQueryChange={() => undefined}
          suggestions={suggestions}
          loading={false}
          onSelect={() => undefined}
        />
        <button type="button">Marcar recolha no mapa</button>
      </div>
    )
    const list = screen.getByTestId('destination-suggestions')
    expect(list).toBeInTheDocument()
    expect(list.className).toMatch(/max-h-\[min\(11rem/)
    expect(list.getAttribute('role')).toBe('listbox')
  })

  it('scrolls field into view on focus', async () => {
    const scrollIntoView = vi.fn()
    render(
      <div data-testid="map-bottom-sheet">
        <DestinationSearchField
          query=""
          onQueryChange={() => undefined}
          suggestions={[]}
          loading={false}
          onSelect={() => undefined}
        />
      </div>
    )
    const input = screen.getByRole('searchbox')
    const wrap = input.parentElement as HTMLElement
    wrap.scrollIntoView = scrollIntoView
    fireEvent.focus(input)
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
  })
})
