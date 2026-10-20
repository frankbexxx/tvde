import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@/i18n'
import type { TripHistoryItem } from '../../api/trips'
import { PassengerSideMenu } from './PassengerSideMenu'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    sessionDisplayName: 'QA',
    sessionPhone: '+351900000683',
    logout: vi.fn(),
  }),
}))

function historyItem(over: Partial<TripHistoryItem> = {}): TripHistoryItem {
  return {
    trip_id: 'hist-refund-1',
    status: 'completed',
    origin_lat: 41.15,
    origin_lng: -8.61,
    destination_lat: 41.16,
    destination_lng: -8.62,
    estimated_price: 4.5,
    final_price: 4.5,
    payment_status: 'succeeded',
    ...over,
  }
}

describe('PassengerSideMenu history refund (F3)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })
  })

  it('shows refund secondary line and keeps original price', () => {
    render(
      <PassengerSideMenu
        open
        onOpenChange={() => undefined}
        screen="history"
        onScreenChange={() => undefined}
        history={[historyItem({ refund_status: 'full', refunded_amount: 4.5 })]}
        historyLoading={false}
        historyPollFault={false}
        historyDetail={null}
        historyDetailLoading={false}
        historyDetailError={null}
        onHistoryTripSelect={() => undefined}
      />,
    )
    expect(screen.getByText('4.5 €')).toBeInTheDocument()
    expect(screen.getByTestId('passenger-history-refund-hist-refund-1')).toHaveTextContent(
      'Reembolso total: 4,50',
    )
  })

  it('does not show refund line without refund_status', () => {
    render(
      <PassengerSideMenu
        open
        onOpenChange={() => undefined}
        screen="history"
        onScreenChange={() => undefined}
        history={[historyItem()]}
        historyLoading={false}
        historyPollFault={false}
        historyDetail={null}
        historyDetailLoading={false}
        historyDetailError={null}
        onHistoryTripSelect={() => undefined}
      />,
    )
    expect(screen.queryByTestId('passenger-history-refund-hist-refund-1')).not.toBeInTheDocument()
  })
})
