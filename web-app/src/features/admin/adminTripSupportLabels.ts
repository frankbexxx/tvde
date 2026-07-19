import type { AdminAuditTrailItem } from '../../api/admin'
import type { PaymentStatus } from '../../api/trips'
import { passengerTripStatusLabel, paymentStatusLabel } from '../../constants/tripStatusLabels'

const CANCELLED_BY_LABELS: Record<string, string> = {
  passenger: 'Passageiro',
  driver: 'Motorista',
  admin: 'Admin',
}

const AUDIT_EVENT_LABELS: Record<string, string> = {
  'admin.trip_assign_admin': 'Atribuição (recuperação)',
  'admin.trip_transition_admin': 'Transição de estado',
  'admin.trip_cancel_admin': 'Cancelamento Admin',
  'admin.payment_ops_note': 'Nota operacional (pagamento)',
  'admin.reconcile_payment_stripe_succeeded': 'Reconciliação Stripe (succeeded)',
  'admin.reconcile_payment_stripe_terminal_failed': 'Reconciliação Stripe (failed)',
  'admin.reconcile_payment_stripe_no_such_pi': 'Reconciliação Stripe (PI inexistente)',
  'admin.reconcile_close_no_stripe_pi': 'Fecho processamento sem PI',
  'admin.reconcile_single_payment_stripe_succeeded': 'Alinhar pagamento (succeeded)',
  'admin.reconcile_single_payment_stripe_terminal_failed': 'Alinhar pagamento (failed)',
}

const PAYLOAD_REDACT_KEYS = new Set([
  'password',
  'client_secret',
  'payment_intent_client_secret',
  'secret',
  'token',
  'authorization',
  'phone',
  'email',
  'name',
])

export function adminTripStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return passengerTripStatusLabel(status)
}

export function adminPaymentStatusLabel(status: PaymentStatus | string | null | undefined): string {
  if (status == null || status === '') return '—'
  const labeled = paymentStatusLabel(status as PaymentStatus)
  return labeled ?? String(status)
}

export function adminCancelledByLabel(who: string | null | undefined): string | null {
  if (who == null || who === '') return null
  return CANCELLED_BY_LABELS[who] ?? who
}

export function formatAdminTripTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('pt-PT')
}

export function adminAuditEventLabel(eventType: string): string {
  return AUDIT_EVENT_LABELS[eventType] ?? eventType.replace(/^admin\./, '')
}

/** Payload seguro para UI: sem segredos / PII óbvia; notas truncadas. */
export function sanitizeAdminAuditPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(payload ?? {})) {
    const k = key.toLowerCase()
    if (PAYLOAD_REDACT_KEYS.has(k) || k.includes('secret') || k.includes('password')) {
      out[key] = '[redacted]'
      continue
    }
    if (typeof raw === 'string' && (k === 'note' || k === 'reason' || k === 'governance_reason')) {
      out[key] = raw.length > 280 ? `${raw.slice(0, 280)}…` : raw
      continue
    }
    if (raw != null && typeof raw === 'object') continue
    out[key] = raw
  }
  return out
}

export function isTripRelevantAuditEvent(row: AdminAuditTrailItem): boolean {
  const t = row.event_type
  if (!t.startsWith('admin.')) return false
  return (
    t.includes('trip_') ||
    t.includes('payment') ||
    t.includes('reconcile') ||
    t.includes('ops_note') ||
    t.includes('assign') ||
    t.includes('cancel') ||
    t.includes('transition')
  )
}

export const ADMIN_ASSIGN_RECOVERY_LABEL = 'Atribuir (recuperação)'
export const ADMIN_ASSIGN_RECOVERY_TITLE =
  'Uso excepcional para recuperação; dispatch normal é automático/Partner/Fleet.'
