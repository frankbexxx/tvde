/** L-12 / L-25 Complaints API (passenger / driver / admin). */
import { API_BASE, apiFetch } from './client'

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

export type ComplaintSource =
  | 'in_app'
  | 'livro_reclamacoes'
  | 'ral'
  | 'other'

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
  source: string
  external_reference?: string | null
  submitted_at: string
  trip_id?: string | null
  assigned_to?: string | null
}

export type ComplaintAdminItem = ComplaintAdminListItem & {
  complainant_user_id?: string | null
  description: string
  external_response_due_at?: string | null
  external_responded_at?: string | null
  complainant_name?: string | null
  complainant_email?: string | null
  complainant_phone?: string | null
  resolution?: string | null
  resolved_at?: string | null
  closed_at?: string | null
  retention_until: string
  created_at: string
  updated_at: string
  history: ComplaintHistoryItem[]
}

export type ComplaintAdminExternalCreateBody = {
  source: Exclude<ComplaintSource, 'in_app'>
  category: ComplaintCategory
  description: string
  submitted_at: string
  external_reference?: string | null
  complainant_name?: string | null
  complainant_email?: string | null
  complainant_phone?: string | null
  external_response_due_at?: string | null
}

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  'trip_service',
  'payment_price',
  'driver_vehicle',
  'safety',
  'account_app',
  'other',
]

export const ADMIN_EXTERNAL_SOURCES: Exclude<ComplaintSource, 'in_app'>[] = [
  'livro_reclamacoes',
  'ral',
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

export type ComplaintAttachmentItem = {
  id: string
  original_file_name: string
  mime_type: string
  size_bytes: number
  created_at: string
  uploaded_by_user_id?: string | null
}

const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png'

export { ATTACHMENT_ACCEPT }

async function uploadAttachment(
  token: string,
  path: string,
  file: File
): Promise<ComplaintAttachmentItem> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw { status: res.status, detail: payload.detail ?? res.statusText }
  }
  return res.json() as Promise<ComplaintAttachmentItem>
}

export async function listMyComplaintAttachments(
  token: string,
  publicReference: string
): Promise<ComplaintAttachmentItem[]> {
  return apiFetch<ComplaintAttachmentItem[]>(
    `/complaints/${encodeURIComponent(publicReference)}/attachments`,
    { token }
  )
}

export async function uploadMyComplaintAttachment(
  token: string,
  publicReference: string,
  file: File
): Promise<ComplaintAttachmentItem> {
  return uploadAttachment(
    token,
    `/complaints/${encodeURIComponent(publicReference)}/attachments`,
    file
  )
}

export async function listAdminComplaintAttachments(
  token: string,
  publicReference: string
): Promise<ComplaintAttachmentItem[]> {
  return apiFetch<ComplaintAttachmentItem[]>(
    `/admin/complaints/${encodeURIComponent(publicReference)}/attachments`,
    { token }
  )
}

export async function uploadAdminComplaintAttachment(
  token: string,
  publicReference: string,
  file: File
): Promise<ComplaintAttachmentItem> {
  return uploadAttachment(
    token,
    `/admin/complaints/${encodeURIComponent(publicReference)}/attachments`,
    file
  )
}

export async function downloadComplaintAttachment(
  token: string,
  path: string,
  filename: string
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw { status: res.status, detail: 'download_failed' }
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function createAdminExternalComplaint(
  token: string,
  body: ComplaintAdminExternalCreateBody
): Promise<ComplaintAdminItem> {
  return apiFetch<ComplaintAdminItem>('/admin/complaints/external', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  })
}
