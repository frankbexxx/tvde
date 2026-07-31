import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PartnerMetrics, PartnerTripRow } from '../../../api/partner'
import i18n from '../../../i18n'
import { PartnerHomeDashboard } from './PartnerHomeDashboard'

function trip(overrides: Partial<PartnerTripRow> & Pick<PartnerTripRow, 'trip_id' | 'status'>): PartnerTripRow {
  return {
    passenger_id: 'pax-1',
    driver_id: 'drv-1',
    origin_lat: 38.72,
    origin_lng: -9.14,
    destination_lat: 38.73,
    destination_lng: -9.13,
    estimated_price: 10,
    final_price: null,
    cancel_reason: null,
    created_at: '2026-07-23T08:00:00Z',
    started_at: null,
    completed_at: null,
    updated_at: '2026-07-23T08:00:00Z',
    ...overrides,
  }
}

const metrics: PartnerMetrics = {
  trips_today: 2,
  trips_total: 10,
  active_drivers: 1,
  trips_completed: 8,
  trips_cancelled: 1,
  total_drivers: 3,
  trips_completed_today: 1,
  revenue_completed_today: 12.5,
}

function renderDash(trips: PartnerTripRow[]) {
  return render(
    <MemoryRouter>
      <PartnerHomeDashboard metrics={metrics} trips={trips} onRefresh={vi.fn()} />
    </MemoryRouter>
  )
}

describe('PartnerHomeDashboard (OPS-UX-1C)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('sem viagens ativas mostra fallback', () => {
    renderDash([trip({ trip_id: 't-done', status: 'completed', completed_at: '2026-07-23T09:00:00Z' })])
    expect(screen.getByTestId('partner-home-active-trip-empty')).toHaveTextContent(
      /nenhuma viagem ativa/i
    )
    expect(screen.queryByTestId('partner-home-active-trip-follow')).toBeNull()
    expect(screen.getByTestId('partner-kpi-completed-today')).toBeInTheDocument()
  })

  it('uma viagem ativa → cartão + status PT + Acompanhar para o detalhe', () => {
    renderDash([trip({ trip_id: 'trip-live', status: 'ongoing', updated_at: '2026-07-23T10:00:00Z' })])
    expect(screen.getByTestId('partner-home-active-trip-card')).toHaveTextContent(/viagem ativa/i)
    expect(screen.getByTestId('partner-home-active-trip-status')).toHaveTextContent(/em curso/i)
    const cta = screen.getByTestId('partner-home-active-trip-follow')
    expect(cta).toHaveTextContent(/acompanhar/i)
    expect(cta).toHaveAttribute('href', '/partner/trips/trip-live')
    expect(screen.getByTestId('partner-kpi-revenue-today')).toBeInTheDocument()
  })

  it('várias viagens ativas → contagem e CTA para a mais recente', () => {
    renderDash([
      trip({ trip_id: 'older', status: 'assigned', updated_at: '2026-07-23T09:00:00Z' }),
      trip({ trip_id: 'newer', status: 'accepted', updated_at: '2026-07-23T11:00:00Z' }),
      trip({ trip_id: 'done', status: 'completed', updated_at: '2026-07-23T12:00:00Z' }),
    ])
    expect(screen.getByTestId('partner-home-active-trip-count')).toHaveTextContent(/2 viagens ativas/i)
    expect(screen.getByTestId('partner-home-active-trip-follow')).toHaveAttribute(
      'href',
      '/partner/trips/newer'
    )
  })
})
