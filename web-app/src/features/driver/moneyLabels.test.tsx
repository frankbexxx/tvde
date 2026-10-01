import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../i18n'
import { RequestCard } from '../../components/cards/RequestCard'
import { PartnerHomeDashboard } from '../partner/screens/PartnerHomeDashboard'
import type { PartnerMetrics, PartnerTripRow } from '../../api/partner'

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

const trip: PartnerTripRow = {
  trip_id: 't-done',
  status: 'completed',
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
  completed_at: '2026-07-23T09:00:00Z',
  updated_at: '2026-07-23T09:00:00Z',
}

describe('money labels', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })
  })

  it('labels the offer as the estimated trip price and keeps the amount', () => {
    render(
      <RequestCard pickup="Rua A" estimatedPrice={12.5} onAccept={() => undefined} />,
    )
    expect(screen.getByText('Preço estimado da viagem')).toBeInTheDocument()
    expect(screen.getByText('12.50 €')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/payout|Stripe/i)
  })

  it('names driver share and platform commission without payout or API', () => {
    expect(i18n.t('driver:opsMenu.historyMoney.driverPayout', { amount: '8.50 €' })).toBe(
      'Parte do motorista: 8.50 €',
    )
    expect(i18n.t('driver:opsMenu.historyMoney.platformCommission', { amount: '1.50 €' })).toBe(
      'Comissão da plataforma: 1.50 €',
    )
    expect(i18n.t('driver:opsMenu.historyMoney.finalPrice')).toBe('Preço da viagem')
    expect(i18n.t('driver:opsMenu.earnings.intro')).not.toMatch(/payout|API/i)
    expect(i18n.t('driver:opsMenu.pricing.body')).toMatch(/parte do motorista/i)
    expect(i18n.t('driver:opsMenu.pricing.body')).toMatch(/comissão da plataforma/i)
  })

  it('labels the partner total as trip value and keeps 12.50', () => {
    render(
      <MemoryRouter>
        <PartnerHomeDashboard metrics={metrics} trips={[trip]} onRefresh={vi.fn()} />
      </MemoryRouter>,
    )
    const card = screen.getByTestId('partner-kpi-revenue-today')
    expect(card).toHaveTextContent('Valor das viagens hoje (€)')
    expect(card).toHaveTextContent('12.50')
    expect(card).toHaveAttribute(
      'title',
      'Soma do preço das viagens concluídas hoje. Usa o preço final, ou a estimativa se o preço final ainda não existir.',
    )
    expect(document.body.textContent).not.toMatch(/Stripe|payout|Receita da frota/i)
  })
})
