import type { ApiError } from '../../api/client'
import type { SystemHealthResponse, TripDetailAdmin } from '../../api/admin'
import { parseAdminDashboardQuery } from './adminDashboardQuery'
import {
  REQUIRED_DRIVER_DOCUMENTS,
  type DriverDocumentsState,
} from '../../services/driverDocuments'
import { parseJwtPayload } from '../../utils/jwt'

const SINGLE_TRIP_PAYMENT_RECONCILE_STATUSES = ['completed', 'cancelled', 'failed'] as const

export function emptyDriverDocs(): DriverDocumentsState['docs'] {
  return {
    carta_tvde: 'missing',
    certificado_motorista_tvde: 'missing',
    seguro_responsabilidade_civil: 'missing',
    inspecao_viatura: 'missing',
  }
}

export function docsApprovedCount(docs: DriverDocumentsState['docs']): number {
  return REQUIRED_DRIVER_DOCUMENTS.filter((k) => docs[k] === 'approved').length
}

export function approvedDriverDocs(): DriverDocumentsState['docs'] {
  return {
    carta_tvde: 'approved',
    certificado_motorista_tvde: 'approved',
    seguro_responsabilidade_civil: 'approved',
    inspecao_viatura: 'approved',
  }
}

export function tripDetailEligibleSinglePaymentReconcile(d: TripDetailAdmin | null): boolean {
  if (!d) return false
  if (d.payment_status !== 'processing') return false
  const pi = d.stripe_payment_intent_id
  if (typeof pi !== 'string' || !pi.trim()) return false
  return (SINGLE_TRIP_PAYMENT_RECONCILE_STATUSES as readonly string[]).includes(d.status)
}

/** SP-F: motivo ≥10 caracteres; cancela com `null`. Usa `window.prompt` / `window.alert`. */
export function promptGovernanceReason(prompt: string): string | null {
  const raw = window.prompt(prompt)
  if (raw === null) return null
  const t = raw.trim()
  if (t.length < 10) {
    window.alert('O motivo precisa de pelo menos 10 caracteres.')
    return null
  }
  return t
}

/** Erros das rotas admin (PATCH utilizador, bloqueio, password, etc.) em texto legível. */
export function formatAdminApiDetail(detail: unknown): string {
  if (detail && typeof detail === 'object' && 'detail' in detail) {
    return formatAdminApiDetail((detail as { detail: unknown }).detail)
  }
  if (detail === 'timeout') {
    return 'Pedido expirou (rede lenta ou servidor a aquecer). Tenta de novo.'
  }
  if (typeof detail === 'string') {
    const key = detail.trim()
    const map: Record<string, string> = {
      invalid_phone_format: 'Telefone inválido. Usa +351 seguido de 9 dígitos (ex.: +351912345678).',
      phone_already_used: 'Esse telefone já está a ser usado por outra conta.',
      cannot_modify_admin: 'Não podes alterar a conta de administrador.',
      cannot_modify_staff_role: 'Esta conta é de backoffice (admin / super_admin) — não podes alterá-la por aqui.',
      governance_reason_required_for_phone_change:
        'Para mudar o telefone, usa «Guardar só o telefone»: confirma com ALTERAR_TELEFONE e indica um motivo de auditoria com pelo menos 10 caracteres.',
      cannot_delete_staff_role: 'Não é permitido eliminar contas admin / super_admin.',
      cannot_delete_admin: 'Não é permitido eliminar esta conta de administrador.',
      cannot_block_staff_role: 'Não é permitido bloquear contas admin / super_admin.',
      cannot_unblock_staff_role: 'Estado de conta de backoffice não pode ser alterado por aqui.',
      super_admin_required:
        'Esta acção exige sessão de super_admin (exportar logs CSV, cron, validar .env, eliminar conta, bloqueio em massa ou repor palavra-passe).',
      user_not_found: 'Utilizador não encontrado.',
      invalid_user_id: 'Identificador de utilizador inválido.',
      user_not_blocked: 'Esta conta não está bloqueada.',
      invalid_confirmation: 'Confirmação incorrecta — escreve exactamente o texto pedido no aviso ou cancela.',
      cannot_delete_user_with_trips: 'Não é possível eliminar: o utilizador tem viagens como passageiro.',
      driver_has_active_trip: 'O motorista tem viagem activa — fecha ou cancela antes de repor passageiro.',
      empty_user_ids: 'Nenhum utilizador seleccionado para bloqueio em massa.',
      too_many_user_ids: 'Demasiados IDs num único pedido (máximo 200).',
      'Not available': 'Esta acção só está disponível em modo BETA.',
    }
    return map[key] ?? key
  }
  if (Array.isArray(detail)) {
    const parts = detail.map((d) => {
      if (typeof d === 'object' && d !== null && 'msg' in d) return String((d as { msg?: unknown }).msg)
      return JSON.stringify(d)
    })
    return parts.join(' · ') || 'Pedido inválido.'
  }
  return 'Não foi possível concluir o pedido. Tenta outra vez.'
}

export function adminErrDetail(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'detail' in err) {
    return formatAdminApiDetail((err as ApiError).detail)
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function sessionJwtIsSuperAdmin(token: string | null): boolean {
  if (!token) return false
  return parseJwtPayload(token)?.role === 'super_admin'
}

export function maskSensitiveEnvDisplay(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const eq = line.indexOf('=')
      if (eq <= 0) return line
      const keyPart = line.slice(0, eq).replace(/^\s*#\s*/, '').trim()
      if (!/SECRET|PASSWORD|TOKEN|PRIVATE|WEBHOOK|API_KEY|DATABASE|BEARER|AUTH|DSN|CREDENTIAL/i.test(keyPart)) {
        return line
      }
      return `${line.slice(0, eq + 1)}••••••••`
    })
    .join('\n')
}

export function readInitialAdminQuery(): ReturnType<typeof parseAdminDashboardQuery> {
  if (typeof window === 'undefined') {
    return { tab: 'agora', tripId: null, tripsList: 'active' }
  }
  return parseAdminDashboardQuery(new URLSearchParams(window.location.search))
}

/** SP-G: contagens de linhas de anomalia + avisos (alinhado a system-health). */
export function countHealthSignalRows(h: SystemHealthResponse | null): number {
  if (!h) return 0
  const n = (a: unknown[] | undefined) => (Array.isArray(a) ? a.length : 0)
  return (
    n(h.trips_accepted_too_long) +
    n(h.trips_ongoing_too_long) +
    n(h.stuck_payments) +
    n(h.drivers_unavailable_too_long) +
    n(h.missing_payment_records) +
    n(h.inconsistent_financial_state) +
    (h.warnings?.length ?? 0)
  )
}

export function healthRowTimestamp(row: Record<string, unknown>): string {
  const v =
    row.updated_at ?? row.created_at ?? row.payment_updated_at ?? row.trip_completed_at ?? ''
  return typeof v === 'string' ? v : ''
}
