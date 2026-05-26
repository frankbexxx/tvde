import { apiFetch } from './client'
import type {
  DriverDocumentsState,
  DriverDocumentStatus,
  DriverRequiredDocument,
} from '../services/driverDocuments'
import {
  defaultDriverDocumentsState,
  REQUIRED_DRIVER_DOCUMENTS,
} from '../services/driverDocuments'

export type ServerDocRow = {
  status?: string
  expires_at?: string | null
  partner_note?: string | null
}

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

export function driverDocumentsFromServer(
  server: DriverDocumentsApiState | null
): DriverDocumentsState {
  const base = defaultDriverDocumentsState()
  if (!server?.docs) return base
  const docs = { ...base.docs }
  const docDetails: DriverDocumentsState['docDetails'] = {}
  for (const k of REQUIRED_DRIVER_DOCUMENTS) {
    const row = server.docs[k]
    if (!row || typeof row !== 'object') continue
    const st = row.status
    if (st && isStatus(st)) docs[k] = st
    if ('expires_at' in row || 'partner_note' in row) {
      docDetails[k] = {
        expiresAt:
          'expires_at' in row
            ? typeof row.expires_at === 'string'
              ? row.expires_at
              : null
            : null,
        partnerNote:
          'partner_note' in row
            ? typeof row.partner_note === 'string'
              ? row.partner_note
              : null
            : null,
      }
    }
  }
  const ready = REQUIRED_DRIVER_DOCUMENTS.every((key) => docs[key] === 'approved')
  return {
    docs,
    docDetails,
    onboardingCompleted: ready,
  }
}

export function mergeServerDriverDocuments(
  prev: DriverDocumentsState,
  server: DriverDocumentsApiState | null
): DriverDocumentsState {
  if (!server?.docs) return prev
  const docs = { ...prev.docs }
  const docDetails = { ...prev.docDetails }
  for (const k of REQUIRED_DRIVER_DOCUMENTS) {
    const row = server.docs[k]
    if (!row || typeof row !== 'object') continue
    const st = row.status
    if (st && isStatus(st)) docs[k] = st
    const prevD = docDetails[k]
    docDetails[k] = {
      expiresAt:
        'expires_at' in row
          ? typeof row.expires_at === 'string'
            ? row.expires_at
            : null
          : (prevD?.expiresAt ?? null),
      partnerNote:
        'partner_note' in row
          ? typeof row.partner_note === 'string'
            ? row.partner_note
            : null
          : (prevD?.partnerNote ?? null),
    }
  }
  const ready = REQUIRED_DRIVER_DOCUMENTS.every((key) => docs[key] === 'approved')
  return {
    docs,
    docDetails,
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
