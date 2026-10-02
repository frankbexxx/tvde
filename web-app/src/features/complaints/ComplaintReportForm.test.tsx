import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@/i18n'
import { createComplaint } from '../../api/complaints'
import { ComplaintReportForm } from './ComplaintReportForm'

vi.mock('../../api/complaints', async () => {
  const actual = await vi.importActual<typeof import('../../api/complaints')>('../../api/complaints')
  return {
    ...actual,
    listMyComplaintAttachments: vi.fn(async () => []),
    uploadMyComplaintAttachment: vi.fn(async () => ({
      id: 'att-1',
      original_file_name: 'note.pdf',
      mime_type: 'application/pdf',
      size_bytes: 12,
      created_at: new Date().toISOString(),
    })),
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
    expect(createComplaint).toHaveBeenCalledWith('tok', {
      category: 'trip_service',
      description: 'Late pickup',
      trip_id: 'trip-1',
    })
    expect(screen.getByText('Reclamação registada. Guarde a referência:')).toBeInTheDocument()
    expect(screen.getByText('O estado não aparece noutro ecrã.')).toBeInTheDocument()
    expect(screen.queryByText(/nas suas reclamações/i)).not.toBeInTheDocument()
  })
})
