import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: null }),
}))

import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import type { PriceBreakdown, TripDetailResponse } from '../../api/trips'
import { TripPlannerPanel } from './TripPlannerPanel'
import { PassengerStatusCard } from './PassengerStatusCard'
import { PassengerHistoryDetailPanel } from './PassengerHistoryDetailPanel'
import { PriceFormulaBreakdown } from './PriceFormulaBreakdown'

function wrap(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

function breakdown(overrides: Partial<PriceBreakdown> = {}): PriceBreakdown {
  return {
    category: 'x',
    tariff_version: 'v1',
    base_fare: 1.5,
    price_per_km: 0.6,
    price_per_min: 0.12,
    distance_amount: 3,
    duration_amount: 1.2,
    minimum_fare: 4.5,
    minimum_fare_adjustment: 0,
    pet_surcharge: 0,
    tolls_amount: 0,
    fare_subtotal: 5.7,
    total: 5.7,
    ...overrides,
  }
}

function detail(price: PriceBreakdown | null): TripDetailResponse {
  return {
    trip_id: 'trip-1',
    status: 'ongoing',
    passenger_id: 'pax',
    origin_lat: 38.7,
    origin_lng: -9.1,
    destination_lat: 38.8,
    destination_lng: -9.2,
    estimated_price: 10,
    created_at: '2026-09-24T08:00:00.000Z',
    updated_at: '2026-09-24T08:00:00.000Z',
    intermediation_rate_percent: 15,
    driver_payout: 99.99,
    price_breakdown: price,
    distance_km: 12.4,
    duration_min: 18,
  }
}

function planner(price: PriceBreakdown | null, extra?: { pet?: number; tolls?: number }) {
  return (
    <TripPlannerPanel
      uiState="searching"
      hasPickup
      hasDropoff
      pickupAddress="A"
      dropoffAddress="B"
      pickupAddressLoading={false}
      dropoffAddressLoading={false}
      routeMeta={null}
      routeMetaLoading={false}
      activeTrip={null}
      onChooseMap={() => undefined}
      onSetDestinationHint={() => undefined}
      onReset={() => undefined}
      onConfirmTrip={() => undefined}
      lastEstimatedTotal={10}
      lastFareSubtotal={price?.fare_subtotal ?? 5.7}
      lastPetSurcharge={extra?.pet ?? null}
      lastEstimatedTolls={extra?.tolls ?? null}
      lastIntermediationRate={15}
      lastPriceBreakdown={price}
    />
  )
}

describe('passenger price formula', () => {
  it('renders the GO snapshot in Portuguese', async () => {
    await i18n.changeLanguage('pt')
    wrap(<PriceFormulaBreakdown breakdown={breakdown()} />)
    expect(screen.getByTestId('passenger-price-formula-base').textContent).toBe(
      'Base 1.50 € + 0.60 €/km + 0.12 €/min',
    )
    expect(screen.getByTestId('passenger-price-formula-minimum').textContent).toBe(
      'Mínimo da categoria: 4.50 €',
    )
    expect(screen.queryByTestId('passenger-price-formula-adjustment')).toBeNull()
  })

  it('renders Comfort rates from the snapshot', async () => {
    await i18n.changeLanguage('pt')
    wrap(
      <PriceFormulaBreakdown
        breakdown={breakdown({
          category: 'comfort',
          base_fare: 1.9,
          price_per_km: 0.85,
          price_per_min: 0.15,
          minimum_fare: 5.5,
        })}
      />,
    )
    expect(screen.getByTestId('passenger-price-formula-base').textContent).toBe(
      'Base 1.90 € + 0.85 €/km + 0.15 €/min',
    )
    expect(screen.getByTestId('passenger-price-formula-minimum').textContent).toBe(
      'Mínimo da categoria: 5.50 €',
    )
  })

  it('renders XL rates from the snapshot', async () => {
    await i18n.changeLanguage('pt')
    wrap(
      <PriceFormulaBreakdown
        breakdown={breakdown({
          category: 'xl',
          base_fare: 3,
          price_per_km: 1.05,
          price_per_min: 0.15,
          minimum_fare: 6.5,
        })}
      />,
    )
    expect(screen.getByTestId('passenger-price-formula-base').textContent).toBe(
      'Base 3.00 € + 1.05 €/km + 0.15 €/min',
    )
    expect(screen.getByTestId('passenger-price-formula-minimum').textContent).toBe(
      'Mínimo da categoria: 6.50 €',
    )
  })

  it('shows the minimum adjustment only when it is above zero', async () => {
    await i18n.changeLanguage('pt')
    wrap(
      <PriceFormulaBreakdown breakdown={breakdown({ minimum_fare_adjustment: 0.8 })} />,
    )
    expect(screen.getByTestId('passenger-price-formula-adjustment').textContent).toBe(
      'Ajuste ao mínimo: 0.80 €',
    )
  })

  it('renders the formula in English', async () => {
    await i18n.changeLanguage('en')
    wrap(<PriceFormulaBreakdown breakdown={breakdown({ minimum_fare_adjustment: 0.4 })} />)
    expect(screen.getByTestId('passenger-price-formula-base').textContent).toBe(
      'Base 1.50 € + 0.60 €/km + 0.12 €/min',
    )
    expect(screen.getByTestId('passenger-price-formula-minimum').textContent).toBe(
      'Category minimum: 4.50 €',
    )
    expect(screen.getByTestId('passenger-price-formula-adjustment').textContent).toBe(
      'Minimum adjustment: 0.40 €',
    )
  })

  it('omits the formula when the snapshot is missing or incomplete', async () => {
    await i18n.changeLanguage('pt')
    const { rerender } = wrap(<PriceFormulaBreakdown breakdown={null} />)
    expect(screen.queryByTestId('passenger-price-formula')).toBeNull()
    rerender(
      <I18nextProvider i18n={i18n}>
        <PriceFormulaBreakdown
          breakdown={breakdown({ price_per_km: undefined, price_per_min: undefined })}
        />
      </I18nextProvider>,
    )
    expect(screen.queryByTestId('passenger-price-formula')).toBeNull()
  })

  it('shows formula, pet, tolls and the intermediation rate as separate lines after create', async () => {
    await i18n.changeLanguage('pt')
    wrap(planner(breakdown({ pet_surcharge: 1.5, tolls_amount: 0.4 }), { pet: 1.5, tolls: 0.4 }))
    const block = screen.getByTestId('passenger-estimate-breakdown')
    expect(screen.getByTestId('passenger-price-formula-base').textContent).toBe(
      'Base 1.50 € + 0.60 €/km + 0.12 €/min',
    )
    expect(block.textContent).toMatch(/Suplemento animal/)
    expect(block.textContent).toMatch(/Portagens estimadas/)
    expect(screen.getByTestId('passenger-intermediation-rate').textContent).toBe(
      'Taxa de intermediação VAMULÁ: 15%',
    )
    expect(screen.getByTestId('passenger-price-formula').textContent).not.toMatch(/intermedia/)
    expect(screen.getByTestId('passenger-price-formula').textContent).not.toMatch(/Portagens/)
    expect(screen.getByTestId('passenger-price-formula').textContent).not.toMatch(/Suplemento/)
    expect(block.textContent).not.toMatch(/99\.99/)
  })

  it('shows the active-trip formula from the snapshot and keeps the rate separate', async () => {
    await i18n.changeLanguage('en')
    wrap(<PassengerStatusCard uxState="TRIP_ONGOING" activeTrip={detail(breakdown())} />)
    expect(screen.getByTestId('passenger-price-formula-base').textContent).toBe(
      'Base 1.50 € + 0.60 €/km + 0.12 €/min',
    )
    expect(screen.getByTestId('passenger-intermediation-rate').textContent).toBe(
      'VAMULÁ intermediation rate: 15%',
    )
    expect(document.body.textContent).not.toMatch(/99\.99/)
    expect(screen.getByTestId('passenger-price-formula').textContent).not.toMatch(/12\.4/)
  })

  it('shows the history formula and omits it when the snapshot is incomplete', async () => {
    await i18n.changeLanguage('pt')
    const { rerender } = wrap(
      <PassengerHistoryDetailPanel
        detail={{ ...detail(breakdown()), status: 'completed', final_price: 18 }}
        loading={false}
        error={null}
      />,
    )
    expect(screen.getByTestId('passenger-history-detail').textContent).toMatch(/18/)
    expect(screen.getByTestId('passenger-price-formula-base').textContent).toBe(
      'Base 1.50 € + 0.60 €/km + 0.12 €/min',
    )
    expect(screen.getByTestId('passenger-intermediation-rate').textContent).toBe(
      'Taxa de intermediação VAMULÁ: 15%',
    )
    rerender(
      <I18nextProvider i18n={i18n}>
        <PassengerHistoryDetailPanel
          detail={{ ...detail(null), status: 'completed', final_price: 18 }}
          loading={false}
          error={null}
        />
      </I18nextProvider>,
    )
    expect(screen.getByTestId('passenger-history-detail').textContent).toMatch(/18/)
    expect(screen.queryByTestId('passenger-price-formula')).toBeNull()
    expect(screen.getByTestId('passenger-intermediation-rate')).toBeTruthy()
  })

  it('does not hardcode commercial tariff numbers in the component', () => {
    const source = readFileSync(resolve(__dirname, 'PriceFormulaBreakdown.tsx'), 'utf8')
    expect(source).not.toMatch(/1\.50|0\.60|0\.12|4\.50|1\.90|0\.85|5\.50|1\.05|6\.50/)
  })
})
