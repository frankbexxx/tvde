/** L-12 Complaints API (passenger / driver / admin). */
import { apiFetch } from './client'

export type ComplaintCategory =
  | 'trip_service'
  | 'payment_price'
  | 'driver_vehicle'
  | 'safety'
  | 'account_app'
  | 'other'

export type ComplaintStatus =
  | 'received'
  | 'under_review'
  | 'awaiting_info'
  | 'resolved'
  | 'closed'

export type ComplaintUserItem = {
  public_reference: string
  category: string
  description: string
  status: string
  submitted_at: string
  trip_id?: string | null
  resolution?: string | null
}

export type ComplaintHistoryItem = {
  event_type: string
  from_status?: string | null
  to_status?: string | null
  actor_user_id?: string | null
  occurred_at: string
  metadata?: Record<string, unknown> | null
}

export type ComplaintAdminListItem = {
  id: string
  public_reference: string
  complainant_role: string
  category: string
  status: string
  submitted_at: string
  trip_id?: string | null
  assigned_to?: string | null
}

export type ComplaintAdminItem = ComplaintAdminListItem & {
  complainant_user_id: string
  description: string
  source: string
  resolution?: string | null
  resolved_at?: string | null
  closed_at?: string | null
  retention_until: string
  created_at: string
  updated_at: string
  history: ComplaintHistoryItem[]
}

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  'trip_service',
  'payment_price',
  'driver_vehicle',
  'safety',
  'account_app',
  'other',
]

export async function createComplaint(
  token: string,
  body: { category: ComplaintCategory; description: string; trip_id?: string | null }
): Promise<ComplaintUserItem> {
  return apiFetch<ComplaintUserItem>('/complaints', {
    method: 'POST',
    token,
    body: JSON.stringify({
      category: body.category,
      description: body.description,
      trip_id: body.trip_id || undefined,
    }),
  })
}

export async function listMyComplaints(token: string): Promise<ComplaintUserItem[]> {
  return apiFetch<ComplaintUserItem[]>('/complaints', { token })
}

export async function getMyComplaint(
  token: string,
  publicReference: string
): Promise<ComplaintUserItem> {
  return apiFetch<ComplaintUserItem>(`/complaints/${encodeURIComponent(publicReference)}`, {
    token,
  })
}

export async function listAdminComplaints(
  token: string,
  params?: { status?: string; category?: string; public_reference?: string }
): Promise<ComplaintAdminListItem[]> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.category) q.set('category', params.category)
  if (params?.public_reference) q.set('public_reference', params.public_reference)
  const qs = q.toString()
  return apiFetch<ComplaintAdminListItem[]>(`/admin/complaints${qs ? `?${qs}` : ''}`, { token })
}

export async function getAdminComplaint(
  token: string,
  publicReference: string
): Promise<ComplaintAdminItem> {
  return apiFetch<ComplaintAdminItem>(
    `/admin/complaints/${encodeURIComponent(publicReference)}`,
    { token }
  )
}

export async function updateAdminComplaint(
  token: string,
  publicReference: string,
  body: {
    status?: ComplaintStatus
    resolution?: string
    assigned_to?: string | null
    clear_assigned_to?: boolean
  }
): Promise<ComplaintAdminItem> {
  return apiFetch<ComplaintAdminItem>(
    `/admin/complaints/${encodeURIComponent(publicReference)}`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    }
  )
}
