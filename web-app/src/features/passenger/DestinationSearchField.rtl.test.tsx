import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useState } from 'react'
import { DestinationSearchField } from './DestinationSearchField'
import { placeSearchShouldFetch } from './placeSearchFetch'
import type { GeocodeSuggestion } from '@/services/geocoding'

const suggestions: GeocodeSuggestion[] = Array.from({ length: 8 }, (_, i) => ({
  id: `s${i}`,
  primary: `Lisboa ${i}`,
  secondary: 'Portugal',
  lat: 38.7 + i * 0.001,
  lng: -9.14,
}))

const destSuggestions: GeocodeSuggestion[] = [
  {
    id: 'mardel',
    primary: 'Rua Carlos Mardel',
    secondary: 'Oeiras',
    lat: 38.69,
    lng: -9.32,
  },
  {
    id: 'other',
    primary: 'Rua Carlos Mardel',
    secondary: 'Lisboa',
    lat: 38.74,
    lng: -9.12,
  },
]

describe('placeSearchShouldFetch', () => {
  it('blocks fetch while selection is committed', () => {
    expect(
      placeSearchShouldFetch({
        query: 'Rua Carlos Mardel, Oeiras',
        selectionCommitted: true,
      })
    ).toBe(false)
  })

  it('allows fetch again after user would edit (not committed)', () => {
    expect(
      placeSearchShouldFetch({
        query: 'Rua Carlos Mardel',
        selectionCommitted: false,
      })
    ).toBe(true)
  })

  it('respects enabled gate (destination needs pickup)', () => {
    expect(
      placeSearchShouldFetch({
        query: 'Avenida',
        selectionCommitted: false,
        enabled: false,
      })
    ).toBe(false)
  })
})

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

  it('single select commits destination: list closes, search inactive, no re-open from selected label', async () => {
    const geocodeCalls: string[] = []
    function Harness() {
      const [query, setQuery] = useState('Carlos Mardel')
      const [rows, setRows] = useState(destSuggestions)
      const [candidate, setCandidate] = useState<GeocodeSuggestion | null>(null)
      const [searchActive, setSearchActive] = useState(false)

      return (
        <div>
          <DestinationSearchField
            query={query}
            onQueryChange={(v) => {
              setQuery(v)
              if (candidate) setCandidate(null)
            }}
            suggestions={rows}
            loading={false}
            selectionCommitted={Boolean(candidate)}
            onSelect={(s) => {
              setCandidate(s)
              const label = s.secondary ? `${s.primary}, ${s.secondary}` : s.primary
              setQuery(label)
              setRows([])
              // Simulate parent: committed selection must not refetch
              if (
                placeSearchShouldFetch({
                  query: label,
                  selectionCommitted: true,
                })
              ) {
                geocodeCalls.push(label)
              }
            }}
            onSearchActiveChange={setSearchActive}
          />
          {candidate && !searchActive ? (
            <div data-testid="dest-preview">preview:{candidate.primary}</div>
          ) : null}
          <span data-testid="search-flag">{searchActive ? 'on' : 'off'}</span>
        </div>
      )
    }

    render(<Harness />)
    const input = screen.getByTestId('destination-search-input')
    fireEvent.focus(input)
    expect(screen.getByTestId('destination-suggestions')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: /Oeiras/i }))

    await waitFor(() => {
      expect(screen.queryByTestId('destination-suggestions')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('dest-preview')).toHaveTextContent('Rua Carlos Mardel')
    expect(screen.getByTestId('search-flag')).toHaveTextContent('off')
    expect(geocodeCalls).toEqual([])
    expect((input as HTMLInputElement).value).toContain('Oeiras')
  })

  it('after commit, editing the input allows search mode again', async () => {
    function Harness() {
      const [query, setQuery] = useState('Rua Carlos Mardel, Oeiras')
      const [candidate, setCandidate] = useState<GeocodeSuggestion | null>(destSuggestions[0])
      return (
        <DestinationSearchField
          query={query}
          onQueryChange={(v) => {
            setQuery(v)
            setCandidate(null)
          }}
          suggestions={candidate ? [] : destSuggestions}
          loading={false}
          selectionCommitted={Boolean(candidate)}
          onSelect={setCandidate}
        />
      )
    }
    render(<Harness />)
    expect(screen.queryByTestId('destination-suggestions')).not.toBeInTheDocument()
    const input = screen.getByTestId('destination-search-input')
    await act(async () => {
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'Avenida de Mo' } })
    })
    await waitFor(() => {
      expect(screen.getByTestId('destination-suggestions')).toBeInTheDocument()
    })
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
