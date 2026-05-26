import { API_BASE, apiFetch } from './client'

export interface DriverMessageRow {
  id: string
  title: string
  body: string
  priority: string
  created_at: string
  read: boolean
}

export async function fetchDriverMessages(token: string): Promise<DriverMessageRow[]> {
  return apiFetch<DriverMessageRow[]>('/driver/messages', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function markDriverMessageRead(token: string, messageId: string): Promise<void> {
  await apiFetch<void>(`/driver/messages/${encodeURIComponent(messageId)}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function uploadDriverDocument(
  token: string,
  docKey: string,
  file: File
): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE.replace(/\/$/, '')}/driver/documents/${encodeURIComponent(docKey)}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string }
    throw { status: res.status, detail: data.detail ?? res.statusText }
  }
}
