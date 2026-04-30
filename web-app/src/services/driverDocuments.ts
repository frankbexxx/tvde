export const REQUIRED_DRIVER_DOCUMENTS = [
  'carta_tvde',
  'certificado_motorista_tvde',
  'seguro_responsabilidade_civil',
  'inspecao_viatura',
] as const

export type DriverRequiredDocument = (typeof REQUIRED_DRIVER_DOCUMENTS)[number]
export type DriverDocumentStatus = 'missing' | 'pending_review' | 'approved' | 'rejected' | 'expired'

export interface DriverDocumentsState {
  docs: Record<DriverRequiredDocument, DriverDocumentStatus>
  onboardingCompleted: boolean
}

const DOCS_STATE_KEY = 'tvde_driver_documents_state_v1'
const DOCS_GATE_KEY = 'tvde_driver_documents_gate_enabled'

function defaultDocsState(): DriverDocumentsState {
  return {
    docs: {
      carta_tvde: 'missing',
      certificado_motorista_tvde: 'missing',
      seguro_responsabilidade_civil: 'missing',
      inspecao_viatura: 'missing',
    },
    onboardingCompleted: false,
  }
}

function sanitizeState(next: DriverDocumentsState): DriverDocumentsState {
  const ready = isDriverDocumentsReady(next)
  return {
    ...next,
    onboardingCompleted: Boolean(next.onboardingCompleted || ready),
  }
}

export function getDriverDocumentsState(): DriverDocumentsState {
  try {
    const raw = localStorage.getItem(DOCS_STATE_KEY)
    if (!raw) return defaultDocsState()
    const parsed = JSON.parse(raw) as Partial<DriverDocumentsState>
    const base = defaultDocsState()
    return sanitizeState({
      onboardingCompleted: Boolean(parsed.onboardingCompleted),
      docs: {
        carta_tvde: parsed.docs?.carta_tvde ?? base.docs.carta_tvde,
        certificado_motorista_tvde:
          parsed.docs?.certificado_motorista_tvde ?? base.docs.certificado_motorista_tvde,
        seguro_responsabilidade_civil:
          parsed.docs?.seguro_responsabilidade_civil ?? base.docs.seguro_responsabilidade_civil,
        inspecao_viatura: parsed.docs?.inspecao_viatura ?? base.docs.inspecao_viatura,
      },
    })
  } catch {
    return defaultDocsState()
  }
}

export function setDriverDocumentsState(next: DriverDocumentsState): void {
  try {
    localStorage.setItem(DOCS_STATE_KEY, JSON.stringify(sanitizeState(next)))
  } catch {
    /* ignore */
  }
}

export function isDriverDocumentsReady(state: DriverDocumentsState): boolean {
  return REQUIRED_DRIVER_DOCUMENTS.every((k) => state.docs[k] === 'approved')
}

/**
 * Gate desligado por defeito para não bloquear smoke/dev.
 * Ativar manualmente com localStorage key: `tvde_driver_documents_gate_enabled=1`.
 */
export function isDriverDocumentsGateEnabled(): boolean {
  try {
    return localStorage.getItem(DOCS_GATE_KEY) === '1'
  } catch {
    return false
  }
}

export function setDriverDocumentsGateEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(DOCS_GATE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function driverDocumentLabel(key: DriverRequiredDocument): string {
  switch (key) {
    case 'carta_tvde':
      return 'Carta TVDE'
    case 'certificado_motorista_tvde':
      return 'Certificado motorista TVDE'
    case 'seguro_responsabilidade_civil':
      return 'Seguro responsabilidade civil'
    case 'inspecao_viatura':
      return 'Inspeção da viatura'
  }
}

export function driverDocumentStatusLabel(status: DriverDocumentStatus): string {
  switch (status) {
    case 'approved':
      return 'Aprovado'
    case 'pending_review':
      return 'Em revisão'
    case 'rejected':
      return 'Rejeitado'
    case 'expired':
      return 'Expirado'
    case 'missing':
    default:
      return 'Em falta'
  }
}

export function driverDocumentsApprovedCount(state: DriverDocumentsState): number {
  return REQUIRED_DRIVER_DOCUMENTS.filter((k) => state.docs[k] === 'approved').length
}
