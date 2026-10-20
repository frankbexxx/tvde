import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '../../i18n'
import type { TripDetailAdmin } from '../../api/admin'
import { AdminTripDetailSupportFields } from './AdminTripDetailSupportFields'

function baseDetail(over: Partial<TripDetailAdmin> = {}): TripDetailAdmin {
  return {
    trip_id: 't1',
    status: 'completed',
    passenger_id: 'p1',
    estimated_price: 4.5,
    final_price: 4.5,
    payment_status: 'succeeded',
    origin_lat: 1,
    origin_lng: 2,
    destination_lat: 3,
    destination_lng: 4,
    created_at: '2026-10-20T10:00:00Z',
    ...over,
  }
}

describe('AdminTripDetailSupportFields refund (F3)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
  })

  it('shows refunded amount and status for full refund', () => {
    render(
      <AdminTripDetailSupportFields
        tripDetail={baseDetail({ refund_status: 'full', refunded_amount: 4.5 })}
      />,
    )
    const block = screen.getByTestId('admin-trip-refund-block')
    expect(block.textContent).toMatch(/Reembolsado:/)
    expect(block.textContent).toMatch(/4,50/)
    expect(block.textContent).toMatch(/Estado reembolso:/)
    expect(block.textContent).toMatch(/Reembolso total/)
    expect(block.textContent).not.toMatch(/\bfull\b/)
  })

  it('shows partial refund', () => {
    render(
      <AdminTripDetailSupportFields
        tripDetail={baseDetail({ refund_status: 'partial', refunded_amount: 2 })}
      />,
    )
    expect(screen.getByTestId('admin-trip-refund-block').textContent).toMatch(/Reembolso parcial/)
  })

  it('omits refund block when none', () => {
    render(
      <AdminTripDetailSupportFields
        tripDetail={baseDetail({ refund_status: 'none', refunded_amount: 0 })}
      />,
    )
    expect(screen.queryByTestId('admin-trip-refund-block')).not.toBeInTheDocument()
  })
})
