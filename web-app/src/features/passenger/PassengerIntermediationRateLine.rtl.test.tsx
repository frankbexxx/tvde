import { describe, expect, it, vi } from 'vitest'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: null }),
}))
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import type { TripDetailResponse } from '../../api/trips'
import { TripPlannerPanel } from './TripPlannerPanel'
import { PassengerStatusCard } from './PassengerStatusCard'
import { PassengerHistoryDetailPanel } from './PassengerHistoryDetailPanel'

function wrap(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

function detail(rate: number | null, payout = 99.99): TripDetailResponse {
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
    intermediation_rate_percent: rate,
    driver_payout: payout,
  }
}

describe('passenger intermediation rate', () => {
  it('shows the API rate on the estimate block in Portuguese', async () => {
    await i18n.changeLanguage('pt')
    wrap(
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
        lastIntermediationRate={15}
      />,
    )
    expect(screen.getByTestId('passenger-intermediation-rate').textContent).toBe(
      'Taxa de intermediação VAMULÁ: 15%',
    )
    expect(screen.getByTestId('passenger-estimate-breakdown').textContent).not.toMatch(/99\.99/)
  })

  it('renders the rate it is given, including a non-commercial value', async () => {
    await i18n.changeLanguage('pt')
    wrap(
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
        lastIntermediationRate={12.5}
      />,
    )
    expect(screen.getByTestId('passenger-intermediation-rate').textContent).toBe(
      'Taxa de intermediação VAMULÁ: 12.5%',
    )
  })

  it('omits the estimate line when the rate is absent', async () => {
    await i18n.changeLanguage('pt')
    wrap(
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
        lastIntermediationRate={null}
      />,
    )
    expect(screen.queryByTestId('passenger-intermediation-rate')).toBeNull()
  })

  it('shows 15% on the active trip card in English and hides payout', async () => {
    await i18n.changeLanguage('en')
    wrap(
      <PassengerStatusCard uxState="TRIP_ONGOING" activeTrip={detail(15, 88.5)} />,
    )
    expect(screen.getByTestId('passenger-intermediation-rate').textContent).toBe(
      'VAMULÁ intermediation rate: 15%',
    )
    expect(document.body.textContent).not.toMatch(/88\.5/)
  })

  it('omits the active-trip line when the snapshot is null', async () => {
    await i18n.changeLanguage('en')
    wrap(<PassengerStatusCard uxState="TRIP_ONGOING" activeTrip={detail(null)} />)
    expect(screen.queryByTestId('passenger-intermediation-rate')).toBeNull()
    expect(document.body.textContent).not.toMatch(/99\.99/)
  })

  it('shows 15% on history detail in Portuguese', async () => {
    await i18n.changeLanguage('pt')
    wrap(
      <PassengerHistoryDetailPanel
        detail={{ ...detail(15), status: 'completed', final_price: 18 }}
        loading={false}
        error={null}
      />,
    )
    expect(screen.getByTestId('passenger-intermediation-rate').textContent).toBe(
      'Taxa de intermediação VAMULÁ: 15%',
    )
    expect(screen.getByTestId('passenger-history-detail').textContent).not.toMatch(/99\.99/)
  })

  it('omits the history line when the snapshot is null', async () => {
    await i18n.changeLanguage('pt')
    wrap(
      <PassengerHistoryDetailPanel detail={detail(null)} loading={false} error={null} />,
    )
    expect(screen.queryByTestId('passenger-intermediation-rate')).toBeNull()
  })
})
