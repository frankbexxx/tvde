import { beforeEach, describe, expect, it, vi } from 'vitest'
import { approveAdminDriver, rejectAdminDriver } from './admin'

vi.mock('./client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from './client'

describe('admin driver approve/reject API', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
  })

  it('approveAdminDriver POST /admin/drivers/{id}/approve', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ driver_id: 'drv-1', status: 'approved' })
    await approveAdminDriver('drv-1', 'tok')
    expect(apiFetch).toHaveBeenCalledWith('/admin/drivers/drv-1/approve', {
      method: 'POST',
      token: 'tok',
    })
  })

  it('rejectAdminDriver POST /admin/drivers/{id}/reject', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ driver_id: 'drv-1', status: 'rejected' })
    await rejectAdminDriver('drv-1', 'tok')
    expect(apiFetch).toHaveBeenCalledWith('/admin/drivers/drv-1/reject', {
      method: 'POST',
      token: 'tok',
    })
  })
})
