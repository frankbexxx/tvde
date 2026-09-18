import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapStage } from './MapStage'

vi.mock('../../maps/MapView', () => ({
  MapView: ({
    fillContainer,
    mapVisualWeight,
  }: {
    fillContainer?: boolean
    mapVisualWeight?: string
  }) => (
    <div
      data-testid="map-view-mock"
      data-fill={fillContainer ? '1' : '0'}
      data-weight={mapVisualWeight ?? 'emphasized'}
    />
  ),
}))

describe('MapStage (RTL)', () => {
  it('renderiza MapView fillContainer e overlay', () => {
    render(
      <MapStage
        testId="test-map-stage"
        map={{ mapVisualWeight: 'emphasized' }}
        topOverlay={<span>Topo</span>}
      />,
    )
    expect(screen.getByTestId('test-map-stage')).toBeInTheDocument()
    expect(screen.getByTestId('map-view-mock')).toHaveAttribute('data-fill', '1')
    expect(screen.getByText('Topo')).toBeInTheDocument()
  })

  it('propaga mapVisualWeight subdued (confirming context)', () => {
    render(
      <MapStage
        testId="test-map-stage-subdued"
        map={{ mapVisualWeight: 'subdued' }}
        bottomOverlay={<div data-testid="sheet-mock">sheet</div>}
      />,
    )
    expect(screen.getByTestId('map-view-mock')).toHaveAttribute('data-weight', 'subdued')
    expect(screen.getByTestId('sheet-mock')).toBeInTheDocument()
  })
})
