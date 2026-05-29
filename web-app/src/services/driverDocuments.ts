export const REQUIRED_DRIVER_DOCUMENTS = [
  'carta_tvde',
  'certificado_motorista_tvde',
  'seguro_responsabilidade_civil',
  'inspecao_viatura',
  'cartao_cidadao',
  'registo_criminal',
] as const

export type DriverRequiredDocument = (typeof REQUIRED_DRIVER_DOCUMENTS)[number]
export type DriverDocumentStatus = 'missing' | 'pending_review' | 'approved' | 'rejected' | 'expired'

/** Metadados partilhados com o partner (validade, notas). */
export interface DriverDocumentDetails {
  expiresAt: string | null
  partnerNote: string | null
  fileName?: string | null
}

export interface DriverDocumentsState {
  docs: Record<DriverRequiredDocument, DriverDocumentStatus>
  onboardingCompleted: boolean
  /** Preenchido a partir do servidor (`GET /driver/documents`). */
  docDetails: Partial<Record<DriverRequiredDocument, DriverDocumentDetails>>
}

const DOCS_STATE_KEY = 'tvde_driver_documents_state_v1'
const DOCS_GATE_KEY = 'tvde_driver_documents_gate_enabled'

export function defaultDriverDocumentsState(): DriverDocumentsState {
  return {
    docs: {
      carta_tvde: 'missing',
      certificado_motorista_tvde: 'missing',
      seguro_responsabilidade_civil: 'missing',
      inspecao_viatura: 'missing',
      cartao_cidadao: 'missing',
      registo_criminal: 'missing',
    },
    onboardingCompleted: false,
    docDetails: {},
  }
}

function sanitizeDocDetails(
  raw: Partial<Record<DriverRequiredDocument, Partial<DriverDocumentDetails>>> | undefined
): Partial<Record<DriverRequiredDocument, DriverDocumentDetails>> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Partial<Record<DriverRequiredDocument, DriverDocumentDetails>> = {}
  for (const k of REQUIRED_DRIVER_DOCUMENTS) {
    const row = raw[k]
    if (!row || typeof row !== 'object') continue
    out[k] = {
      expiresAt: typeof row.expiresAt === 'string' ? row.expiresAt : null,
      partnerNote: typeof row.partnerNote === 'string' ? row.partnerNote : null,
      fileName: typeof row.fileName === 'string' ? row.fileName : null,
    }
  }
  return out
}

function sanitizeState(next: DriverDocumentsState): DriverDocumentsState {
  const ready = isDriverDocumentsReady(next)
  return {
    ...next,
    docDetails: sanitizeDocDetails(next.docDetails),
    onboardingCompleted: Boolean(next.onboardingCompleted || ready),
  }
}

export function getDriverDocumentsState(): DriverDocumentsState {
  try {
    const raw = localStorage.getItem(DOCS_STATE_KEY)
    if (!raw) return defaultDriverDocumentsState()
    const parsed = JSON.parse(raw) as Partial<DriverDocumentsState>
    const base = defaultDriverDocumentsState()
    return sanitizeState({
      onboardingCompleted: Boolean(parsed.onboardingCompleted),
      docs: {
        carta_tvde: parsed.docs?.carta_tvde ?? base.docs.carta_tvde,
        certificado_motorista_tvde:
          parsed.docs?.certificado_motorista_tvde ?? base.docs.certificado_motorista_tvde,
        seguro_responsabilidade_civil:
          parsed.docs?.seguro_responsabilidade_civil ?? base.docs.seguro_responsabilidade_civil,
        inspecao_viatura: parsed.docs?.inspecao_viatura ?? base.docs.inspecao_viatura,
        cartao_cidadao: parsed.docs?.cartao_cidadao ?? base.docs.cartao_cidadao,
        registo_criminal: parsed.docs?.registo_criminal ?? base.docs.registo_criminal,
      },
      docDetails: sanitizeDocDetails(
        parsed.docDetails as Partial<Record<DriverRequiredDocument, Partial<DriverDocumentDetails>>>
      ),
    })
  } catch {
    return defaultDriverDocumentsState()
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
    case 'cartao_cidadao':
      return 'Cartão de cidadão'
    case 'registo_criminal':
      return 'Registo criminal'
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

function daysUntilIso(iso: string): number | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / 86_400_000)
}

/** Texto curto para a linha de validade na UI do motorista. */
export function formatDriverDocExpiresLine(iso: string | null | undefined): string | null {
  if (iso == null || !String(String(iso).trim())) return null
  const s = String(iso).trim()
  try {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return `Validade: ${s}`
    const dayStr = d.toLocaleDateString('pt-PT')
    const days = daysUntilIso(s)
    if (days == null) return `Validade: ${dayStr}`
    if (days < 0) return `Validade: ${dayStr} (expirada — contacta a tua frota)`
    if (days <= 14) return `Validade: ${dayStr} (faltam ${days} dias)`
    return `Validade: ${dayStr}`
  } catch {
    return `Validade: ${s}`
  }
}

/** Indicadores para alertas no painel de documentos. */
export function driverDocumentsExpiryAttention(state: DriverDocumentsState): {
  hasExpired: boolean
  hasSoon: boolean
} {
  let hasExpired = false
  let hasSoon = false
  for (const k of REQUIRED_DRIVER_DOCUMENTS) {
    if (state.docs[k] === 'expired') hasExpired = true
    const exp = state.docDetails[k]?.expiresAt
    if (exp) {
      const days = daysUntilIso(exp)
      if (days != null && days < 0) hasExpired = true
      else if (
        days != null &&
        days <= 30 &&
        (state.docs[k] === 'approved' || state.docs[k] === 'pending_review')
      ) {
        hasSoon = true
      }
    }
  }
  return { hasExpired, hasSoon }
}
