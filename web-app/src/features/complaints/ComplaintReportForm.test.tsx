import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ComplaintReportForm } from './ComplaintReportForm'

vi.mock('../../api/complaints', async () => {
  const actual = await vi.importActual<typeof import('../../api/complaints')>('../../api/complaints')
  return {
    ...actual,
    createComplaint: vi.fn(async () => ({
      public_reference: 'CMP-2026-TESTREF1',
      category: 'trip_service',
      description: 'Late pickup',
      status: 'received',
      submitted_at: new Date().toISOString(),
      trip_id: 'trip-1',
      resolution: null,
    })),
  }
})

describe('ComplaintReportForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits and shows public reference', async () => {
    render(
      <ComplaintReportForm token="tok" tripId="trip-1" tripLabel="trip-1" onClose={() => undefined} />
    )
    fireEvent.change(screen.getByTestId('complaint-description'), {
      target: { value: 'Late pickup' },
    })
    fireEvent.click(screen.getByTestId('complaint-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('complaint-public-ref')).toHaveTextContent('CMP-2026-TESTREF1')
    })
  })
})
