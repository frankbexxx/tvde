import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminTabComplaints } from '../admin/tabs/AdminTabComplaints'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: 'admin-tok' }),
}))

const listAdminComplaints = vi.fn()
const getAdminComplaint = vi.fn()
const updateAdminComplaint = vi.fn()

vi.mock('../../api/complaints', async () => {
  const actual = await vi.importActual<typeof import('../../api/complaints')>('../../api/complaints')
  return {
    ...actual,
    listAdminComplaints: (...args: unknown[]) => listAdminComplaints(...args),
    getAdminComplaint: (...args: unknown[]) => getAdminComplaint(...args),
    updateAdminComplaint: (...args: unknown[]) => updateAdminComplaint(...args),
  }
})

describe('AdminTabComplaints', () => {
  beforeEach(() => {
    listAdminComplaints.mockResolvedValue([
      {
        id: '1',
        public_reference: 'CMP-2026-ABCDEF01',
        complainant_role: 'passenger',
        category: 'other',
        status: 'received',
        submitted_at: new Date().toISOString(),
      },
    ])
    getAdminComplaint.mockResolvedValue({
      id: '1',
      public_reference: 'CMP-2026-ABCDEF01',
      complainant_role: 'passenger',
      complainant_user_id: 'u1',
      category: 'other',
      description: 'Problem',
      source: 'in_app',
      status: 'received',
      submitted_at: new Date().toISOString(),
      retention_until: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      history: [
        {
          event_type: 'received',
          to_status: 'received',
          occurred_at: new Date().toISOString(),
        },
      ],
    })
    updateAdminComplaint.mockResolvedValue({
      id: '1',
      public_reference: 'CMP-2026-ABCDEF01',
      complainant_role: 'passenger',
      complainant_user_id: 'u1',
      category: 'other',
      description: 'Problem',
      source: 'in_app',
      status: 'resolved',
      resolution: 'Fixed',
      resolved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      retention_until: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      history: [
        { event_type: 'received', occurred_at: new Date().toISOString() },
        { event_type: 'resolved', occurred_at: new Date().toISOString() },
      ],
    })
  })

  it('lists and resolves a complaint', async () => {
    render(<AdminTabComplaints />)
    await waitFor(() => {
      expect(screen.getByTestId('admin-complaint-row-CMP-2026-ABCDEF01')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('admin-complaint-row-CMP-2026-ABCDEF01'))
    await waitFor(() => {
      expect(screen.getByTestId('admin-complaint-history')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByTestId('admin-complaint-next-status'), {
      target: { value: 'resolved' },
    })
    await waitFor(() => {
      expect(screen.getByTestId('admin-complaint-resolution')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByTestId('admin-complaint-resolution'), {
      target: { value: 'Fixed' },
    })
    fireEvent.click(screen.getByTestId('admin-complaint-save'))
    await waitFor(() => {
      expect(updateAdminComplaint).toHaveBeenCalled()
    })
  })
})
