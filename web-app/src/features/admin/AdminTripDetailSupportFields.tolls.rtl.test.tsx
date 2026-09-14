import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminTripDetailSupportFields } from './AdminTripDetailSupportFields'
import type { TripDetailAdmin } from '../../api/admin'

function baseDetail(over: Partial<TripDetailAdmin> = {}): TripDetailAdmin {
  return {
    trip_id: 't1',
    status: 'completed',
    estimated_price: 10,
    final_price: 10.4,
    payment_status: 'succeeded',
    origin_lat: 1,
    origin_lng: 2,
    destination_lat: 3,
    destination_lng: 4,
    created_at: '2026-09-14T10:00:00Z',
    ...over,
  } as TripDetailAdmin
}

describe('AdminTripDetailSupportFields tolls audit (F3)', () => {
  it('shows estimate/charged/observed/delta/source/status', () => {
    render(
      <AdminTripDetailSupportFields
        tripDetail={baseDetail({
          price_breakdown: {
            category: 'x',
            base_fare: 1.5,
            distance_amount: 6,
            duration_amount: 1.8,
            fare_subtotal: 9.3,
            pet_surcharge: 0,
            tolls_amount: 0.4,
            total: 9.7,
            estimated_tolls_amount: 0.4,
            charged_tolls_amount: 0.4,
            observed_tolls_amount: 2.25,
            observed_tolls_delta: 1.85,
            tolls_source: 'here',
            tolls_status: 'ok',
          },
        })}
      />,
    )
    const block = screen.getByTestId('admin-trip-tolls-audit')
    expect(block.textContent).toMatch(/0\.40/)
    expect(block.textContent).toMatch(/2\.25/)
    expect(block.textContent).toMatch(/\+1\.85/)
    expect(block.textContent).toMatch(/here/)
    expect(block.textContent).toMatch(/ok/)
  })

  it('shows — for legacy without toll snapshot fields', () => {
    render(
      <AdminTripDetailSupportFields
        tripDetail={baseDetail({
          price_breakdown: {
            category: 'x',
            base_fare: 1.5,
            distance_amount: 0,
            duration_amount: 0,
            fare_subtotal: 4.5,
            pet_surcharge: 0,
            tolls_amount: 0,
            total: 4.5,
          },
        })}
      />,
    )
    const block = screen.getByTestId('admin-trip-tolls-audit')
    expect(block.textContent).toMatch(/—/)
    expect(block.textContent).toMatch(/0\.00 €/)
  })

  it('shows observed < charged delta and admin error code', () => {
    render(
      <AdminTripDetailSupportFields
        tripDetail={baseDetail({
          price_breakdown: {
            category: 'x',
            base_fare: 1.5,
            distance_amount: 0,
            duration_amount: 0,
            fare_subtotal: 4.5,
            pet_surcharge: 0,
            tolls_amount: 0.4,
            total: 4.9,
            estimated_tolls_amount: 0.4,
            charged_tolls_amount: 0.4,
            observed_tolls_amount: 0.1,
            observed_tolls_delta: -0.3,
            tolls_source: 'here',
            tolls_status: 'ok',
            observed_tolls_status: 'ok',
            observed_tolls_error_code: null,
            tolls_error_code: 'here_timeout',
          },
        })}
      />,
    )
    const block = screen.getByTestId('admin-trip-tolls-audit')
    expect(block.textContent).toMatch(/-0\.30/)
    expect(block.textContent).toMatch(/here_timeout/)
  })

  it('does not expose apiKey in rendered audit', () => {
    render(
      <AdminTripDetailSupportFields
        tripDetail={baseDetail({
          price_breakdown: {
            category: 'x',
            base_fare: 1.5,
            distance_amount: 0,
            duration_amount: 0,
            fare_subtotal: 4.5,
            pet_surcharge: 0,
            tolls_amount: 0,
            total: 4.5,
            tolls_source: 'here?apiKey=super-secret-key',
            tolls_status: 'error',
            tolls_error_code: 'here_auth_error',
          },
        })}
      />,
    )
    const block = screen.getByTestId('admin-trip-tolls-audit')
    expect(block.textContent).not.toContain('super-secret-key')
    expect(block.textContent).toMatch(/REDACTED/)
  })
})
