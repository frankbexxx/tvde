import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { TripPlannerPanel } from './TripPlannerPanel'

function wrap(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

describe('TripPlannerPanel tolls estimate (F1)', () => {
  it('shows Portagens estimadas when tolls > 0', async () => {
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
        lastFareSubtotal={4.5}
        lastEstimatedTolls={0.4}
        lastEstimatedTotal={4.9}
      />,
    )
    expect(screen.getByTestId('passenger-estimate-tolls').textContent).toMatch(/0\.40/)
    expect(screen.getByTestId('passenger-estimate-breakdown').textContent).toMatch(/4\.90/)
  })

  it('does not show fake €0 toll line; shows unavailable hint on zero_fallback', async () => {
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
        lastFareSubtotal={4.5}
        lastEstimatedTolls={null}
        lastTollsUnavailable
        lastEstimatedTotal={4.5}
      />,
    )
    expect(screen.queryByTestId('passenger-estimate-tolls')).toBeNull()
    expect(screen.getByTestId('passenger-estimate-tolls-unavailable')).toBeTruthy()
  })
})
