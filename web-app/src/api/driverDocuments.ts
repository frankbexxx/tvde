import { apiFetch } from './client'
import type {
  DriverDocumentsState,
  DriverDocumentStatus,
  DriverRequiredDocument,
} from '../services/driverDocuments'
import { REQUIRED_DRIVER_DOCUMENTS } from '../services/driverDocuments'

export type ServerDocRow = { status?: string }

export interface DriverDocumentsApiState {
  version: number
  docs: Record<string, ServerDocRow>
}

const STATUSES: DriverDocumentStatus[] = [
  'missing',
  'pending_review',
  'approved',
  'rejected',
  'expired',
]

function isStatus(s: string): s is DriverDocumentStatus {
  return STATUSES.includes(s as DriverDocumentStatus)
}

export function mergeServerDriverDocuments(
  prev: DriverDocumentsState,
  server: DriverDocumentsApiState | null
): DriverDocumentsState {
  if (!server?.docs) return prev
  const docs = { ...prev.docs }
  for (const k of REQUIRED_DRIVER_DOCUMENTS) {
    const st = server.docs[k]?.status
    if (st && isStatus(st)) docs[k] = st
  }
  const ready = REQUIRED_DRIVER_DOCUMENTS.every((key) => docs[key] === 'approved')
  return {
    docs,
    onboardingCompleted: Boolean(prev.onboardingCompleted || ready),
  }
}

export async function fetchDriverDocuments(token: string): Promise<DriverDocumentsApiState> {
  return apiFetch<DriverDocumentsApiState>(`/driver/documents`, { token })
}

export async function patchDriverDocuments(
  token: string,
  patch: Partial<Record<DriverRequiredDocument, { status?: DriverDocumentStatus }>>
): Promise<DriverDocumentsApiState> {
  const docs: Record<string, { status?: string }> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (v?.status) docs[k] = { status: v.status }
  }
  return apiFetch<DriverDocumentsApiState>(`/driver/documents`, {
    method: 'PATCH',
    body: JSON.stringify({ docs }),
    token,
  })
}

export async function suggestDriverDocumentExpiry(
  token: string,
  text: string
): Promise<{ suggested_expires_at: string | null }> {
  return apiFetch(`/driver/documents/suggest-expiry`, {
    method: 'POST',
    body: JSON.stringify({ text }),
    token,
  })
}
