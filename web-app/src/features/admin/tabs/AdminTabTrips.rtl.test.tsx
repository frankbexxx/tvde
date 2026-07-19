import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AdminAuditTrailItem, TripDetailAdmin } from '../../../api/admin'
import { ADMIN_ASSIGN_RECOVERY_LABEL, ADMIN_ASSIGN_RECOVERY_TITLE } from '../adminTripSupportLabels'
import { AdminTabTrips, type AdminTabTripsProps } from './AdminTabTrips'

const tripDetail: TripDetailAdmin = {
  trip_id: 'trip-aaa-111',
  status: 'cancelled',
  passenger_id: 'pax-1',
  driver_id: 'drv-1',
  origin_lat: 38.7,
  origin_lng: -9.1,
  destination_lat: 38.71,
  destination_lng: -9.12,
  estimated_price: 5.5,
  final_price: 5.5,
  payment_status: 'failed',
  cancelled_by: 'admin',
  cancellation_reason: 'Teste suporte ADMIN-OPS-2',
  created_at: '2026-07-18T10:00:00.000Z',
  updated_at: '2026-07-18T10:30:00.000Z',
  started_at: null,
  completed_at: null,
}

const auditRows: AdminAuditTrailItem[] = [
  {
    id: 'ev-1',
    event_type: 'admin.trip_transition_admin',
    entity_type: 'trip',
    entity_id: tripDetail.trip_id,
    occurred_at: '2026-07-18T10:10:00.000Z',
    payload: { to_status: 'arriving', reason: 'Correção operacional GPS' },
  },
  {
    id: 'ev-2',
    event_type: 'admin.payment_ops_note',
    entity_type: 'trip',
    entity_id: tripDetail.trip_id,
    occurred_at: '2026-07-18T10:20:00.000Z',
    payload: { note: 'Nota ops mock', payment_status: 'failed' },
  },
]

function baseProps(over: Partial<AdminTabTripsProps> = {}): AdminTabTripsProps {
  return {
    activeTrips: [
      {
        trip_id: 'trip-req-1',
        status: 'requested',
        passenger_id: 'pax-1',
        driver_id: null,
        origin_lat: 38.7,
        origin_lng: -9.1,
        destination_lat: 38.71,
        destination_lng: -9.12,
        updated_at: '2026-07-18T10:00:00.000Z',
      },
    ],
    canPostPaymentOpsNote: false,
    fetchActiveTrips: vi.fn(),
    fetchHistoryTrips: vi.fn(),
    fetchTripDebug: vi.fn(),
    handleAdminTripTransition: vi.fn(),
    handleAssignTrip: vi.fn(),
    handleCancelTrip: vi.fn(),
    handlePaymentOpsNote: vi.fn(),
    handleReconcileSingleTripPayment: vi.fn(),
    historyTrips: [],
    historyTripsError: null,
    isSuperAdminSession: false,
    paymentOpsNoteText: '',
    selectTripsListMode: vi.fn(),
    selectedTripId: tripDetail.trip_id,
    setPaymentOpsNoteText: vi.fn(),
    syncAdminUrl: vi.fn(),
    tripActionLoading: null,
    tripDebug: null,
    tripDebugId: null,
    tripDetail,
    tripDetailLoading: false,
    tripOrphanFromDeepLink: true,
    tripsListMode: 'active',
    tripAuditRows: auditRows,
    tripAuditLoading: false,
    tripAuditError: null,
    fetchTripAuditTrail: vi.fn(),
    ...over,
  }
}

describe('AdminTabTrips support surface (RTL)', () => {
  it('mostra payment_status, cancel e timestamps no detalhe', () => {
    render(<AdminTabTrips {...baseProps()} />)
    const panel = screen.getByTestId('admin-trip-detail-support')
    expect(panel).toHaveTextContent(/pagamento/i)
    expect(panel).toHaveTextContent(/failed/i)
    expect(panel).toHaveTextContent(/cancelado por/i)
    expect(panel).toHaveTextContent(/admin/i)
    expect(panel).toHaveTextContent(/criada/i)
    expect(panel).toHaveTextContent(/actualizada/i)
  })

  it('renderiza linha temporal com eventos mockados', () => {
    render(<AdminTabTrips {...baseProps()} />)
    expect(screen.getByTestId('admin-trip-audit-timeline')).toBeInTheDocument()
    const rows = screen.getAllByTestId('admin-trip-audit-row')
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows[0]).toHaveTextContent(/transição/i)
    expect(screen.getByText(/nota operacional/i)).toBeInTheDocument()
  })

  it('assign copy indica recuperação', () => {
    render(
      <AdminTabTrips
        {...baseProps({
          selectedTripId: null,
          tripOrphanFromDeepLink: false,
          tripDetail: null,
          tripAuditRows: undefined,
        })}
      />
    )
    const btn = screen.getByRole('button', { name: ADMIN_ASSIGN_RECOVERY_LABEL })
    expect(btn).toHaveAttribute('title', ADMIN_ASSIGN_RECOVERY_TITLE)
  })
})
