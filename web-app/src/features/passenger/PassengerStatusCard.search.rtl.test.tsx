import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { PassengerStatusCard } from './PassengerStatusCard'
import type { TripDetailResponse } from '../../api/trips'

const trip: TripDetailResponse = {
  trip_id: 't1',
  status: 'requested',
  passenger_id: 'p1',
  origin_lat: 38.7,
  origin_lng: -9.1,
  destination_lat: 38.8,
  destination_lng: -9.2,
  estimated_price: 4.5,
  created_at: '2026-10-06T15:00:00.000Z',
  updated_at: '2026-10-06T15:00:00.000Z',
}

function renderCard(props: Partial<React.ComponentProps<typeof PassengerStatusCard>> = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <PassengerStatusCard uxState="SEARCHING_DRIVER" activeTrip={trip} {...props} />
    </I18nextProvider>
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('pt')
})

describe('PassengerStatusCard — procura longa', () => {
  it('before the threshold shows the normal search state without actions', () => {
    renderCard({ searchFallback: false, onContinueWaiting: vi.fn(), onCancelTrip: vi.fn() })
    expect(screen.getByTestId('passenger-info-panel-searching')).toHaveTextContent(
      'À procura de motorista disponível'
    )
    expect(screen.queryByTestId('passenger-search-continue')).toBeNull()
    expect(screen.queryByTestId('passenger-search-cancel')).toBeNull()
  })

  it('after the threshold offers continue/cancel and never "Tentar novamente"', () => {
    renderCard({ searchFallback: true, onContinueWaiting: vi.fn(), onCancelTrip: vi.fn() })
    const panel = screen.getByTestId('passenger-info-panel-searching-long')
    expect(panel).toHaveTextContent('Ainda à procura de motorista')
    expect(panel).toHaveTextContent('O teu pedido continua activo.')
    expect(screen.getByRole('button', { name: 'Continuar à espera' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar viagem' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull()
  })

  it('G2: "Continuar à espera" only calls continue — no cancel', () => {
    const onContinueWaiting = vi.fn()
    const onCancelTrip = vi.fn()
    renderCard({ searchFallback: true, onContinueWaiting, onCancelTrip })
    fireEvent.click(screen.getByTestId('passenger-search-continue'))
    expect(onContinueWaiting).toHaveBeenCalledOnce()
    expect(onCancelTrip).not.toHaveBeenCalled()
  })

  it('G3: only the explicit "Cancelar viagem" action requests cancellation', () => {
    const onContinueWaiting = vi.fn()
    const onCancelTrip = vi.fn()
    renderCard({ searchFallback: true, onContinueWaiting, onCancelTrip })
    expect(onCancelTrip).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('passenger-search-cancel'))
    expect(onCancelTrip).toHaveBeenCalledOnce()
    expect(onContinueWaiting).not.toHaveBeenCalled()
  })
})
