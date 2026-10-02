import i18n from '../../i18n'
import {
  REQUIRED_DRIVER_DOCUMENTS,
  type DriverDocumentStatus,
  type DriverDocumentsState,
} from '../../services/driverDocuments'

const STATUS_ORDER: DriverDocumentStatus[] = ['missing', 'pending_review', 'rejected', 'expired']

const STATUS_KEYS: Record<DriverDocumentStatus, string> = {
  missing: 'availability.blockDocMissing',
  pending_review: 'availability.blockDocPending',
  rejected: 'availability.blockDocRejected',
  expired: 'availability.blockDocExpired',
  approved: 'availability.blockDocOther',
}

export type DriverAvailabilityBlock = {
  kind: 'documents' | 'rest'
  reason: string
  next: string
}

export function blockingDocumentStatuses(state: DriverDocumentsState): DriverDocumentStatus[] {
  const found = new Set<DriverDocumentStatus>()
  for (const key of REQUIRED_DRIVER_DOCUMENTS) {
    const status = state.docs[key]
    if (status !== 'approved') found.add(status)
  }
  return STATUS_ORDER.filter((status) => found.has(status))
}

function joinList(parts: string[]): string {
  const andWord = i18n.t('availability.blockListAnd', { ns: 'driver' })
  if (parts.length <= 1) return parts[0] ?? ''
  if (parts.length === 2) return `${parts[0]} ${andWord} ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} ${andWord} ${parts[parts.length - 1]}`
}

/** O que impede o toque em «Ficar disponível». Documentos ganham porque o handler regressa antes do pedido. */
export function driverAvailabilityBlockMessage(input: {
  docsBlocked: boolean
  statuses: DriverDocumentStatus[]
  hoursBlocked: boolean
  restUntilLabel: string | null
}): DriverAvailabilityBlock | null {
  if (input.docsBlocked) {
    const detailParts = input.statuses
      .filter((status) => status !== 'approved')
      .map((status) => i18n.t(STATUS_KEYS[status], { ns: 'driver' }))
    const detail =
      detailParts.length > 0
        ? joinList(detailParts)
        : i18n.t('availability.blockDocOther', { ns: 'driver' })
    return {
      kind: 'documents',
      reason: i18n.t('availability.blockDocumentsReason', { ns: 'driver', detail }),
      next: i18n.t('availability.blockDocumentsNext', { ns: 'driver' }),
    }
  }
  if (input.hoursBlocked) {
    return {
      kind: 'rest',
      reason: i18n.t('availability.blockRestReason', { ns: 'driver' }),
      next: input.restUntilLabel
        ? i18n.t('availability.blockRestNextUntil', { ns: 'driver', when: input.restUntilLabel })
        : i18n.t('availability.blockRestNext', { ns: 'driver' }),
    }
  }
  return null
}
