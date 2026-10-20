import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import type { TripDetailResponse } from '../../api/trips'
import { PassengerHistoryDetailPanel } from './PassengerHistoryDetailPanel'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: null, sessionRole: 'passenger' }),
}))

function baseDetail(over: Partial<TripDetailResponse> = {}): TripDetailResponse {
  return {
    trip_id: 'trip-refund-1',
    status: 'completed',
    passenger_id: 'p1',
    origin_lat: 41.15,
    origin_lng: -8.61,
    destination_lat: 41.16,
    destination_lng: -8.62,
    estimated_price: 4.5,
    final_price: 4.5,
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:20:00Z',
    payment_status: 'succeeded',
    payment_total_amount: 4.5,
    payment_method_display: 'Visa •••• 4242',
    ...over,
  }
}

function wrap(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

describe('PassengerHistoryDetailPanel refund (F3)', () => {
  it('shows succeeded plus full refund line and keeps original total', async () => {
    await i18n.changeLanguage('pt')
    wrap(
      <PassengerHistoryDetailPanel
        detail={baseDetail({ refund_status: 'full', refunded_amount: 4.5 })}
        loading={false}
        error={null}
      />,
    )
    expect(screen.getByTestId('passenger-history-payment-status')).toHaveTextContent('Pagamento concluído')
    expect(screen.getByTestId('passenger-history-refund-line')).toHaveTextContent('Reembolso total: 4,50')
    expect(screen.getAllByText('4.5 €').length).toBeGreaterThanOrEqual(1)
  })

  it('shows partial refund line', async () => {
    await i18n.changeLanguage('pt')
    wrap(
      <PassengerHistoryDetailPanel
        detail={baseDetail({ refund_status: 'partial', refunded_amount: 2 })}
        loading={false}
        error={null}
      />,
    )
    expect(screen.getByTestId('passenger-history-refund-line')).toHaveTextContent('Reembolso parcial: 2,00')
  })

  it('omits refund line when none', async () => {
    await i18n.changeLanguage('pt')
    wrap(
      <PassengerHistoryDetailPanel
        detail={baseDetail({ refund_status: 'none', refunded_amount: 0 })}
        loading={false}
        error={null}
      />,
    )
    expect(screen.queryByTestId('passenger-history-refund-line')).not.toBeInTheDocument()
    expect(screen.getByTestId('passenger-history-payment-status')).toHaveTextContent('Pagamento concluído')
  })
})
