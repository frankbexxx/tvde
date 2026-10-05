import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import type { TripDetailResponse } from '../../api/trips'
import { EmergencySosButton } from '../emergency/EmergencySosPanel'
import { PassengerHistoryDetailPanel } from './PassengerHistoryDetailPanel'
import { PassengerPaymentConfirmCard } from './PassengerPaymentConfirmCard'
import { TripPlannerPanel } from './TripPlannerPanel'
import { passengerPlaceLabel } from './passengerPlaceLabel'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: null, sessionRole: 'passenger' }),
}))

const tripId = 'eb41db81-b1c0-4dc9-b0cd-7b2b530753d6'

function detail(): TripDetailResponse {
  return {
    trip_id: tripId,
    status: 'completed',
    passenger_id: 'p1',
    origin_lat: 41.15,
    origin_lng: -8.61,
    destination_lat: 41.16,
    destination_lng: -8.62,
    estimated_price: 8,
    final_price: 9,
    created_at: '2026-09-30T10:00:00Z',
    updated_at: '2026-09-30T10:20:00Z',
    payment_status: 'succeeded',
  }
}

function wrap(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

describe('passenger UX copy', () => {
  it('does not show a trip id or invented minutes while searching', async () => {
    await i18n.changeLanguage('pt')
    wrap(
      <TripPlannerPanel
        uiState="searching"
        hasPickup
        hasDropoff
        pickupAddress="Rua A"
        dropoffAddress="Rua B"
        pickupAddressLoading={false}
        dropoffAddressLoading={false}
        routeMeta={null}
        routeMetaLoading={false}
        activeTrip={detail()}
        onChooseMap={() => undefined}
        onSetDestinationHint={() => undefined}
        onReset={() => undefined}
        onConfirmTrip={() => undefined}
      />,
    )
    expect(screen.getByText('À procura de motorista disponível')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/530753d6|eb41db81/)
    expect(document.body.textContent).not.toMatch(/\d+\s*min/)
    expect(document.body.textContent).not.toMatch(/Pode demorar/)
  })

  it('shows a human history status and hides coordinates and the full id', async () => {
    await i18n.changeLanguage('pt')
    wrap(<PassengerHistoryDetailPanel detail={detail()} loading={false} error={null} />)
    expect(screen.getByText('Viagem concluída')).toBeInTheDocument()
    expect(screen.getByText('Pagamento concluído')).toBeInTheDocument()
    expect(screen.getAllByText('Ponto no mapa').length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toMatch(/41\.15|succeeded|completed/)
    expect(document.body.textContent).not.toContain(tripId)
  })

  it('labels SOS as an emergency action', async () => {
    await i18n.changeLanguage('pt')
    const onClick = vi.fn()
    wrap(<EmergencySosButton onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'SOS — Emergência' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('keeps simulated payment human and clear that nothing is charged', async () => {
    await i18n.changeLanguage('pt')
    wrap(
      <PassengerPaymentConfirmCard
        tripId="trip-1"
        clientSecret="pi_visual_secret_mock"
        token="tok"
        onConfirmed={() => undefined}
        onSkip={() => undefined}
      />,
    )
    expect(screen.getByText('Sem cobrança')).toBeInTheDocument()
    expect(screen.getByText('Não é usado um cartão e não é cobrado nenhum valor.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/simulado|DEV\b|Stripe|BETA|sandbox|mock/i)
  })

  it('rates without BETA and names the screen and theme without lab words', async () => {
    await i18n.changeLanguage('pt')
    expect(i18n.t('passenger:rating.errorForbidden')).not.toMatch(/BETA/)
    expect(i18n.t('passenger:rating.errorForbidden')).toMatch(/Não foi possível enviar a avaliação/)
    expect(i18n.t('settings:appMode')).toBe('Ecrã a usar')
    expect(i18n.t('settings:appModeHint')).toMatch(/conta não muda/)
    expect(i18n.t('settings:ambiance.neon.label')).toBe('Neon')
    expect(i18n.t('settings:ambiance.neon.description')).not.toMatch(/teste|sandbox|experimental/i)
    expect(passengerPlaceLabel('41.15, -8.61', 'Ponto no mapa')).toBe('Ponto no mapa')
    expect(passengerPlaceLabel('Oeiras', 'Ponto no mapa')).toBe('Oeiras')
  })
})
