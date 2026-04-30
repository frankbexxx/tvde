import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { parseAdminDashboardQuery, type AdminDashboardTab } from './adminDashboardQuery'
import { driverIdFromHealthUnavailableRow, tripIdFromHealthRow } from './healthTripLinks'
import { stripePaymentIntentDashboardUrls } from '../../utils/stripeDashboard'
import { formatRelativeAgo, minutesSince } from '../../utils/relativeTime'
import { apiFetch, type ApiError } from '../../api/client'
import { parseJwtPayload } from '../../utils/jwt'
import {
  getActiveTrips,
  getAdminTripHistory,
  getTripDetailAdmin,
  getTripDebug,
  assignTripAdmin,
  adminTripTransition,
  cancelTripAdmin,
  getSystemHealth,
  getMetrics,
  runTimeouts,
  runOfferExpiry,
  recoverDriver,
  exportLogsCsv,
  getAdminPhase0,
  runAdminCron,
  validateEnvText,
  createPartner,
  createPartnerOrgAdmin,
  assignDriverToPartner,
  unassignDriverFromPartner,
  listPartners,
  listDrivers,
  getUsageSummary,
  getAdminAlerts,
  getAdminAuditTrail,
  getReconcilePaymentsPreview,
  postReconcilePaymentsStripeSync,
  postReconcilePaymentsCloseNoPi,
  postAdminTripReconcilePaymentStripe,
  postAdminTripPaymentOpsNote,
  type AdminUsageSummaryResponse,
  type AdminAlertsResponse,
  type AdminAuditTrailItem,
  type TripActiveItem,
  type TripDetailAdmin,
  type SystemHealthResponse,
  type AdminMetricsResponse,
} from '../../api/admin'
import type { TripHistoryItem } from '../../api/trips'
import {
  driverDocumentLabel,
  driverDocumentStatusLabel,
  REQUIRED_DRIVER_DOCUMENTS,
  type DriverDocumentStatus,
  type DriverDocumentsState,
} from '../../services/driverDocuments'

interface PendingUser {
  phone: string
  requested_role: string
}

interface AdminUser {
  id: string
  phone: string
  name: string
  role: string
  status: string
  requested_role: string | null
  has_driver_profile: boolean
}

type Tab = AdminDashboardTab

const USERS_PAGE_SIZE = 50
const ADMIN_DRIVER_DOCS_REGISTRY_KEY = 'tvde_admin_driver_docs_registry_v1'

function emptyDriverDocs(): DriverDocumentsState['docs'] {
  return {
    carta_tvde: 'missing',
    certificado_motorista_tvde: 'missing',
    seguro_responsabilidade_civil: 'missing',
    inspecao_viatura: 'missing',
  }
}

function docsApprovedCount(docs: DriverDocumentsState['docs']): number {
  return REQUIRED_DRIVER_DOCUMENTS.filter((k) => docs[k] === 'approved').length
}

function approvedDriverDocs(): DriverDocumentsState['docs'] {
  return {
    carta_tvde: 'approved',
    certificado_motorista_tvde: 'approved',
    seguro_responsabilidade_civil: 'approved',
    inspecao_viatura: 'approved',
  }
}

const DRIVER_DOC_STATUSES = ['missing', 'pending_review', 'approved', 'rejected', 'expired'] as const

/** Operações — lista «Pagamentos em processing» da saúde (evita lista infinita). */
const OPS_STUCK_PAYMENTS_PAGE_SIZE = 10

const ADMIN_TRIP_CANCEL_STATUSES = ['requested', 'assigned', 'accepted'] as const

const SINGLE_TRIP_PAYMENT_RECONCILE_STATUSES = ['completed', 'cancelled', 'failed'] as const

function tripDetailEligibleSinglePaymentReconcile(d: TripDetailAdmin | null): boolean {
  if (!d) return false
  if (d.payment_status !== 'processing') return false
  const pi = d.stripe_payment_intent_id
  if (typeof pi !== 'string' || !pi.trim()) return false
  return (SINGLE_TRIP_PAYMENT_RECONCILE_STATUSES as readonly string[]).includes(d.status)
}

function isBackofficeStaffRole(role: string): boolean {
  return role === 'admin' || role === 'super_admin'
}

function AdminTripPaymentOpsNotePanel({
  tripId,
  tripDetail,
  enabled,
  draft,
  onDraftChange,
  onSubmit,
  submitting,
}: {
  tripId: string
  tripDetail: TripDetailAdmin | null
  enabled: boolean
  draft: string
  onDraftChange: (v: string) => void
  onSubmit: () => void
  submitting: boolean
}) {
  if (!enabled || !tripDetail || tripDetail.trip_id !== tripId) return null
  const psRaw = tripDetail.payment_status
  const psStr =
    psRaw != null && String(psRaw).trim() ? String(psRaw).trim() : null
  const canSubmit = draft.trim().length >= 3 && draft.trim().length <= 2000
  return (
    <div className="mt-2 rounded-xl border border-border bg-muted/15 px-3 py-2 space-y-2">
      <p className="text-xs font-medium text-foreground">Nota operacional (pagamento)</p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Regista texto no audit trail — <span className="font-medium">não altera Stripe</span> nem estados de
        pagamento.
        {psStr ? (
          <>
            {' '}
            Estado (API): <span className="font-mono text-foreground/90">{psStr}</span>.
          </>
        ) : null}
      </p>
      <textarea
        id={`admin-payment-ops-note-${tripId}`}
        name={`admin-payment-ops-note-${tripId}`}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Ex.: cliente contactado; referência interna… (mín. 3 caracteres)"
        className="w-full min-h-[4.5rem] resize-y rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/70"
      />
      <button
        type="button"
        onClick={() => onSubmit()}
        disabled={submitting || !canSubmit}
        className="w-full sm:w-auto px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium disabled:opacity-50"
      >
        {submitting ? 'A registar…' : 'Registar nota (audit)'}
      </button>
    </div>
  )
}

/** SP-F: motivo ≥10 caracteres; cancela com `null`. */
function promptGovernanceReason(prompt: string): string | null {
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
function formatAdminApiDetail(detail: unknown): string {
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

function adminErrDetail(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'detail' in err) {
    return formatAdminApiDetail((err as ApiError).detail)
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function sessionJwtIsSuperAdmin(token: string | null): boolean {
  if (!token) return false
  return parseJwtPayload(token)?.role === 'super_admin'
}

async function copyAdminClipboard(label: string, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    window.alert(`${label} copiado para a área de transferência.`)
  } catch {
    window.prompt(`Copiar ${label} (Ctrl+C):`, text)
  }
}

function maskSensitiveEnvDisplay(text: string): string {
  return text.split('\n').map((line) => {
    const eq = line.indexOf('=')
    if (eq <= 0) return line
    const keyPart = line.slice(0, eq).replace(/^\s*#\s*/, '').trim()
    if (!/SECRET|PASSWORD|TOKEN|PRIVATE|WEBHOOK|API_KEY|DATABASE|BEARER|AUTH|DSN|CREDENTIAL/i.test(keyPart)) {
      return line
    }
    return `${line.slice(0, eq + 1)}••••••••`
  }).join('\n')
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'agora', label: 'Agora' },
  { id: 'docs', label: 'Documentos' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'users', label: 'Utilizadores' },
  { id: 'frota', label: 'Frota' },
  { id: 'dados', label: 'Dados' },
  { id: 'trips', label: 'Viagens' },
  { id: 'metrics', label: 'Métricas' },
  { id: 'ops', label: 'Operações' },
  { id: 'health', label: 'Saúde' },
]

function readInitialAdminQuery(): ReturnType<typeof parseAdminDashboardQuery> {
  if (typeof window === 'undefined') {
    return { tab: 'agora', tripId: null, tripsList: 'active' }
  }
  return parseAdminDashboardQuery(new URLSearchParams(window.location.search))
}

/** SP-G: contagens de linhas de anomalia + avisos (alinhado a system-health). */
function countHealthSignalRows(h: SystemHealthResponse | null): number {
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

function healthRowTimestamp(row: Record<string, unknown>): string {
  const v =
    row.updated_at ??
    row.created_at ??
    row.payment_updated_at ??
    row.trip_completed_at ??
    ''
  return typeof v === 'string' ? v : ''
}

/** Repõe paginação interna quando os dados de saúde mudam (via remount). */
function healthBlockKey(title: string, rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return `${title}-0`
  const top = rows.slice(0, 3).map((r) => tripIdFromHealthRow(r) ?? healthRowTimestamp(r))
  return `${title}-${rows.length}-${top.join('|')}`
}

/** SP-D: texto humano + 3 passos por classe de anomalia (Saúde). */
type HealthAnomalyPlaybook = {
  what: string
  steps: readonly [string, string, string]
}

const PB_TRIPS_ACCEPTED_LONG: HealthAnomalyPlaybook = {
  what: 'Viagens que ficaram em «accepted» mais tempo do que o esperado: o motorista aceitou mas o fluxo não avançou (ex.: não passou a «arriving» / início).',
  steps: [
    'Abre cada linha em Viagens, confirma o estado real e se o motorista já se deslocou — usa «Forçar arriving» ou «Forçar ongoing» no admin quando fizer sentido operacional.',
    'Se o motorista desistiu ou há erro de dados, cancela ou re-atribui conforme a vossa política; regista motivo quando usares cancelamento com motivo.',
    'Corre em Operações «Correr cron agora» (timeouts) e volta a Atualizar a Saúde; se o volume for alto, verifica agendador externo do `/cron/jobs`.',
  ],
}

const PB_TRIPS_ONGOING_LONG: HealthAnomalyPlaybook = {
  what: 'Viagens em «ongoing» há tempo excessivo: viagem iniciada mas não concluída nem falhou pelo motor automático.',
  steps: [
    'Abre a viagem em Viagens: confirma se o motorista ainda está em serviço ou se a app perdeu o «Complete».',
    'Se a viagem já terminou no mundo real, orienta o motorista a concluir na app; se está presa por bug, avalia cancelamento admin ou suporte em campo.',
    'Operações → cron + Atualizar Saúde; investiga logs Stripe se o pagamento ficou em processing.',
  ],
}

const PB_DRIVERS_UNAVAILABLE: HealthAnomalyPlaybook = {
  what: 'Motoristas marcados indisponíveis há muito tempo sem viagem ativa associada — podem estar «presos» após falha ou timeout.',
  steps: [
    'Vai a Operações → «Recuperar motorista» para os UUID sugeridos (só com segurança: sem viagem activa).',
    'Se o caso não aparece na lista, usa UUID manual na mesma secção após confirmar no JSON da Saúde.',
    'Depois de recuperar, confirma na tab Frota / motorista que voltaram disponíveis e re-corre Saúde.',
  ],
}

const PB_STUCK_PAYMENTS: HealthAnomalyPlaybook = {
  what: 'Pagamentos cujo estado interno não bate com o esperado (ex.: processing prolongado, incoerência com Stripe).',
  steps: [
    'Abre a viagem em Viagens e usa os links Stripe (test/live) do PaymentIntent para ver o estado real no dashboard.',
    'Confirma que o webhook Stripe está a receber eventos (Operações / deploy); sem webhook o capture pode ficar incompleto.',
    'Se precisares de nota interna sem alterar BD de pagamento, usa nota operacional de pagamento (audit); reembolso manual continua no Stripe até haver API dedicada.',
  ],
}

const PB_MISSING_PAYMENT: HealthAnomalyPlaybook = {
  what: 'Viagens em estado que normalmente exigem registo de pagamento mas a linha de pagamento falta na base de dados.',
  steps: [
    'Abre em Viagens o trip_id indicado; confirma se a aceitação falhou a meio ou se houve duplicação.',
    'Não inventes pagamento manual na BD — escala com contexto (logs `trip_accepted`, Stripe).',
    'Cron + re-leitura da Saúde; se for bug de corrida, regista para correção de código na próxima sessão.',
  ],
}

const PB_INCONSISTENT_FINANCIAL: HealthAnomalyPlaybook = {
  what: 'Incoerência entre viagem concluída e valores de pagamento (totais, comissão, payout) face às regras actuais.',
  steps: [
    'Abre a viagem e o PI no Stripe; cruza com o JSON desta linha antes de qualquer ajuste manual.',
    'Documenta o caso (nota operacional / suporte); não alteres valores financeiros sem processo acordado.',
    'Se for padrão recorrente, prioriza fix no motor de preços / webhook — lista para engenharia.',
  ],
}

function HealthAnomalyBlock(props: {
  title: string
  rows: Array<Record<string, unknown>>
  onOpenTrip: (tripId: string) => void
  pageSize?: number
  playbook?: HealthAnomalyPlaybook
}) {
  const { title, rows, onOpenTrip, pageSize = 20, playbook } = props
  const [sortRecent, setSortRecent] = useState(true)
  const [shown, setShown] = useState(pageSize)

  const sortedRows = useMemo(() => {
    if (!sortRecent) return rows
    return [...rows].sort((a, b) => healthRowTimestamp(b).localeCompare(healthRowTimestamp(a)))
  }, [rows, sortRecent])

  const slice = sortedRows.slice(0, shown)
  const canShowMore = shown < sortedRows.length

  if (!rows.length) return null
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2 touch-manipulation">
      {playbook ? (
        <details className="rounded-lg border border-info/40 bg-info/10 px-2 py-1.5 text-xs">
          <summary className="cursor-pointer font-medium text-foreground select-none min-h-10 flex items-center py-1">
            O que é · O que fazer (3 passos)
          </summary>
          <p className="mt-2 text-foreground/85 leading-relaxed">{playbook.what}</p>
          <ol className="mt-2 list-decimal pl-4 space-y-1.5 text-foreground/85">
            {playbook.steps.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ol>
        </details>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {title} ({rows.length})
        </p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={`min-h-9 px-2 py-1.5 text-xs rounded-lg border ${
              sortRecent
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
            }`}
            onClick={() => {
              setSortRecent(true)
              setShown(pageSize)
            }}
          >
            Mais recentes
          </button>
          <button
            type="button"
            className={`min-h-9 px-2 py-1.5 text-xs rounded-lg border ${
              !sortRecent
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
            }`}
            onClick={() => {
              setSortRecent(false)
              setShown(pageSize)
            }}
          >
            Ordem API
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {slice.map((row, i) => {
          const tid = tripIdFromHealthRow(row)
          const key = tid ? `${title}-${tid}-${i}` : `${title}-row-${i}`
          return (
            <li key={key} className="rounded-lg border border-border/80 bg-background p-2 space-y-2">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                {tid ? (
                  <button
                    type="button"
                    className="w-full min-h-10 px-3 py-2 sm:w-auto shrink-0 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90"
                    onClick={() => onOpenTrip(tid)}
                  >
                    Abrir em Viagens
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground pr-2">
                    Sem viagem nesta linha (ex.: motorista) — ver JSON ou Operações.
                  </p>
                )}
              </div>
              <pre className="text-xs text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(row, null, 2)}
              </pre>
            </li>
          )
        })}
      </ul>
      {canShowMore ? (
        <button
          type="button"
          className="w-full min-h-10 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card text-foreground/90 hover:bg-muted/40"
          onClick={() => setShown((n) => Math.min(n + pageSize, sortedRows.length))}
        >
          Mostrar mais ({sortedRows.length - shown} restantes)
        </button>
      ) : null}
    </div>
  )
}

export function AdminDashboard() {
  const { token } = useAuth()
  const isSuperAdminSession = sessionJwtIsSuperAdmin(token)
  const [searchParams, setSearchParams] = useSearchParams()
  const initial = readInitialAdminQuery()
  const [tab, setTab] = useState<Tab>(() => initial.tab)
  const [pending, setPending] = useState<PendingUser[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  /** Valores no momento em que se abriu «Editar» — para comparar e confirmar mudanças. */
  const [editOriginalName, setEditOriginalName] = useState('')
  const [editOriginalPhone, setEditOriginalPhone] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [usersHasMore, setUsersHasMore] = useState(false)
  const [usersLoadingMore, setUsersLoadingMore] = useState(false)
  const [usersSort, setUsersSort] = useState<'name' | 'role' | 'status'>('name')
  const [usersFilter, setUsersFilter] = useState('')
  const [driverDocsRegistry, setDriverDocsRegistry] = useState<Record<string, DriverDocumentsState['docs']>>({})
  const [docsStatusFilter, setDocsStatusFilter] = useState<'all' | DriverDocumentStatus>('all')
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Record<string, boolean>>({})
  const [blockConfirmId, setBlockConfirmId] = useState<string | null>(null)
  const [unblockConfirmId, setUnblockConfirmId] = useState<string | null>(null)
  /** SP-E: cache de `GET /admin/audit-trail` por utilizador (ausência de chave = ainda não carregado). */
  const [userAuditRows, setUserAuditRows] = useState<Record<string, AdminAuditTrailItem[]>>({})
  const [userAuditLoading, setUserAuditLoading] = useState<string | null>(null)
  const [userAuditError, setUserAuditError] = useState<Record<string, string>>({})

  const invalidateUserAudit = useCallback((userId: string) => {
    setUserAuditRows((m) => {
      const next = { ...m }
      delete next[userId]
      return next
    })
    setUserAuditError((m) => {
      const next = { ...m }
      delete next[userId]
      return next
    })
  }, [])

  // Viagens (lista activa + histórico terminal)
  const [activeTrips, setActiveTrips] = useState<TripActiveItem[]>([])
  const [tripsListMode, setTripsListMode] = useState<'active' | 'history'>(() => initial.tripsList)
  const [historyTrips, setHistoryTrips] = useState<TripHistoryItem[]>([])
  const [historyTripsError, setHistoryTripsError] = useState<string | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(() => initial.tripId)
  /** Evita aplicar resposta de GET /admin/trips/:id se o utilizador já mudou de viagem. */
  const selectedTripForDetailRef = useRef<string | null>(selectedTripId)
  selectedTripForDetailRef.current = selectedTripId
  const [tripDetail, setTripDetail] = useState<TripDetailAdmin | null>(null)
  const [tripDetailLoading, setTripDetailLoading] = useState(false)
  const [tripDebug, setTripDebug] = useState<Record<string, unknown> | null>(null)
  const [tripDebugId, setTripDebugId] = useState<string | null>(null)
  const [tripActionLoading, setTripActionLoading] = useState<string | null>(null)
  const [paymentOpsNoteText, setPaymentOpsNoteText] = useState('')

  const canPostPaymentOpsNote = useMemo(
    () => isBackofficeStaffRole(parseJwtPayload(token ?? '')?.role ?? ''),
    [token]
  )

  // Métricas e Saúde
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null)
  const [usage, setUsage] = useState<AdminUsageSummaryResponse | null>(null)
  const [health, setHealth] = useState<SystemHealthResponse | null>(null)
  const [adminAlerts, setAdminAlerts] = useState<AdminAlertsResponse | null>(null)
  const [opsLoading, setOpsLoading] = useState<string | null>(null)
  const [recoverDriverId, setRecoverDriverId] = useState('')
  const [phase0, setPhase0] = useState<Awaited<ReturnType<typeof getAdminPhase0>> | null>(null)
  const [cronRun, setCronRun] = useState<Awaited<ReturnType<typeof runAdminCron>> | null>(null)
  const [envText, setEnvText] = useState('')
  const [envReveal, setEnvReveal] = useState(false)
  const [envValidate, setEnvValidate] = useState<Awaited<ReturnType<typeof validateEnvText>> | null>(null)
  const [reconcilePreview, setReconcilePreview] = useState<Awaited<
    ReturnType<typeof getReconcilePaymentsPreview>
  > | null>(null)
  const [reconcileRun, setReconcileRun] = useState<Record<string, unknown> | null>(null)
  const [opsStuckPaymentsPage, setOpsStuckPaymentsPage] = useState(0)

  const [frotaOrgName, setFrotaOrgName] = useState('')
  const [frotaPartnerId, setFrotaPartnerId] = useState('')
  const [frotaManagerName, setFrotaManagerName] = useState('')
  const [frotaManagerPhone, setFrotaManagerPhone] = useState('')
  const [frotaAssignDriverId, setFrotaAssignDriverId] = useState('')
  const [frotaAssignPartnerId, setFrotaAssignPartnerId] = useState('')
  const [frotaAssignMode, setFrotaAssignMode] = useState<'select' | 'manual'>('select')
  const [frotaAssignOk, setFrotaAssignOk] = useState<string | null>(null)
  const [frotaLoading, setFrotaLoading] = useState<string | null>(null)
  const [frotaOk, setFrotaOk] = useState<string | null>(null)

  const [partners, setPartners] = useState<Array<{ id: string; name: string; created_at: string }>>([])
  const [driversList, setDriversList] = useState<Array<{ user_id: string; partner_id: string; status: string }>>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataSearch, setDataSearch] = useState('')

  const syncAdminUrl = useCallback(
    (next: { tab: Tab; tripId: string | null; tripsList?: 'active' | 'history' }) => {
      setSearchParams(
        () => {
          const p = new URLSearchParams()
          if (next.tripId) {
            p.set('tab', 'trips')
            p.set('tripId', next.tripId)
            if (next.tripsList === 'history') {
              p.set('tripsList', 'history')
            }
            return p
          }
          if (next.tab === 'pending') {
            p.set('tab', 'pending')
            return p
          }
          p.set('tab', next.tab)
          if (next.tab === 'trips' && next.tripsList === 'history') {
            p.set('tripsList', 'history')
          }
          return p
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const selectTripsListMode = useCallback(
    (mode: 'active' | 'history') => {
      setTripsListMode(mode)
      syncAdminUrl({ tab: 'trips', tripId: selectedTripId, tripsList: mode })
    },
    [syncAdminUrl, selectedTripId]
  )

  const adminQs = searchParams.toString()
  useEffect(() => {
    const sp = new URLSearchParams(adminQs)
    const { tab: t, tripId, tripsList } = parseAdminDashboardQuery(sp)
    setTab(t)
    setSelectedTripId(tripId)
    setTripsListMode(t === 'trips' ? tripsList : 'active')
  }, [adminQs])

  useEffect(() => {
    setPaymentOpsNoteText('')
  }, [selectedTripId])

  const stuckPaymentsListLen = health?.stuck_payments?.length ?? 0
  useEffect(() => {
    setOpsStuckPaymentsPage((prev) => {
      const maxPage = Math.max(0, Math.ceil(stuckPaymentsListLen / OPS_STUCK_PAYMENTS_PAGE_SIZE) - 1)
      return Math.min(prev, maxPage)
    })
  }, [stuckPaymentsListLen])

  const fetchPending = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiFetch<PendingUser[]>('/admin/pending-users', { token })
      setPending(data)
    } catch {
      setPending([])
    }
  }, [token])

  const fetchUsers = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiFetch<AdminUser[]>(
        `/admin/users?limit=${USERS_PAGE_SIZE}&offset=0`,
        { token }
      )
      setUsers(data)
      setUsersHasMore(data.length === USERS_PAGE_SIZE)
      // Preservar selecção em massa no refresh (intervalo / tab); só podar IDs que já não vêm na 1.ª página.
      const allowedIds = new Set(data.map((u) => u.id))
      setBulkSelectedIds((prev) => {
        const next: Record<string, boolean> = {}
        for (const [id, on] of Object.entries(prev)) {
          if (on && allowedIds.has(id)) next[id] = true
        }
        return next
      })
      setError(null)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao carregar'))
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchUsersMore = useCallback(async () => {
    if (!token || !usersHasMore || usersLoadingMore) return
    setUsersLoadingMore(true)
    try {
      const offset = users.length
      const data = await apiFetch<AdminUser[]>(
        `/admin/users?limit=${USERS_PAGE_SIZE}&offset=${offset}`,
        { token }
      )
      setUsers((prev) => {
        const seen = new Set(prev.map((u) => u.id))
        return [...prev, ...data.filter((u) => !seen.has(u.id))]
      })
      setUsersHasMore(data.length === USERS_PAGE_SIZE)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao carregar mais'))
    } finally {
      setUsersLoadingMore(false)
    }
  }, [token, users.length, usersHasMore, usersLoadingMore])

  const fetchActiveTrips = useCallback(async () => {
    if (!token) return
    try {
      const data = await getActiveTrips(token)
      setActiveTrips(data)
    } catch {
      setActiveTrips([])
    }
  }, [token])

  const fetchHistoryTrips = useCallback(async () => {
    if (!token) return
    setHistoryTripsError(null)
    try {
      const data = await getAdminTripHistory(token, { limit: 50 })
      setHistoryTrips(data)
    } catch (e) {
      setHistoryTrips([])
      const err = e as ApiError
      const raw = err.detail
      const detail = typeof raw === 'string' ? raw : ''
      if (err.status === 404) {
        setHistoryTripsError(
          'O backend não expõe o histórico (404). Faz deploy do backend com GET /admin/trip-history, ou confirma o URL da API (VITE_API_URL).'
        )
      } else {
        setHistoryTripsError(
          detail || (err.status ? `Erro ao carregar histórico (${err.status}).` : 'Erro ao carregar histórico.')
        )
      }
    }
  }, [token])

  const fetchTripDetail = useCallback(
    async (tripId: string) => {
      if (!token) return
      setTripDetailLoading(true)
      setTripDetail(null)
      try {
        const d = await getTripDetailAdmin(tripId, token)
        if (selectedTripForDetailRef.current !== tripId) return
        setTripDetail(d)
      } catch {
        if (selectedTripForDetailRef.current !== tripId) return
        setTripDetail(null)
      } finally {
        if (selectedTripForDetailRef.current === tripId) {
          setTripDetailLoading(false)
        }
      }
    },
    [token]
  )

  const fetchTripDebug = useCallback(
    async (tripId: string) => {
      if (!token) return
      try {
        const d = await getTripDebug(tripId, token)
        setTripDebug(d)
        setTripDebugId(tripId)
      } catch {
        setTripDebug(null)
        setTripDebugId(null)
      }
    },
    [token]
  )

  const handleReconcileSingleTripPayment = async (tripId: string) => {
    if (!token) return
    if (
      !window.confirm(
        'Alinhar este pagamento ao PaymentIntent na Stripe? Se o PI estiver cancelado, o pagamento passa a failed; viagem cancelada ou failed mantém-se; viagem completed pode passar a failed.'
      )
    ) {
      return
    }
    const gr = promptGovernanceReason('Motivo SP-F para alinhar pagamento desta viagem com Stripe:')
    if (!gr) return
    setTripActionLoading(`${tripId}-reconcile-pay`)
    try {
      const out = await postAdminTripReconcilePaymentStripe(token, tripId, {
        governance_reason: gr,
        dry_run: false,
      })
      if (out.skipped) {
        window.alert(`Operação não aplicada: ${String(out.reason ?? '—')}\n\n${JSON.stringify(out, null, 2)}`)
      } else if (out.error) {
        window.alert(String(out.detail ?? JSON.stringify(out)))
      } else {
        window.alert(`OK — action=${String(out.action)}\ntrip_status=${String(out.trip_status_after ?? '—')}`)
      }
      setError(null)
      await fetchTripDetail(tripId)
      await fetchHealth()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao alinhar pagamento com Stripe'))
    } finally {
      setTripActionLoading(null)
    }
  }

  const handlePaymentOpsNote = async (tripId: string) => {
    if (!token) return
    const note = paymentOpsNoteText.trim()
    if (note.length < 3) {
      window.alert('A nota precisa de pelo menos 3 caracteres.')
      return
    }
    if (
      !window.confirm(
        'Registar esta nota no audit trail? Não altera o Stripe nem o estado do pagamento — fica apenas registado para suporte e operações.'
      )
    ) {
      return
    }
    setTripActionLoading(`${tripId}-payment-ops-note`)
    try {
      const out = await postAdminTripPaymentOpsNote(token, tripId, { note })
      window.alert(`Nota registada. payment_id=${out.payment_id}`)
      setPaymentOpsNoteText('')
      setError(null)
      await fetchTripDetail(tripId)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao registar nota operacional'))
    } finally {
      setTripActionLoading(null)
    }
  }

  const fetchMetrics = useCallback(async () => {
    if (!token) return
    try {
      const m = await getMetrics(token)
      setMetrics(m)
    } catch {
      setMetrics(null)
    }
  }, [token])

  const fetchUsage = useCallback(async () => {
    if (!token) return
    try {
      const u = await getUsageSummary(token)
      setUsage(u)
    } catch {
      setUsage(null)
    }
  }, [token])

  const fetchHealth = useCallback(async () => {
    if (!token) return
    try {
      const h = await getSystemHealth(token)
      setHealth(h)
    } catch {
      setHealth(null)
    }
  }, [token])

  const fetchAdminAlerts = useCallback(async () => {
    if (!token) return
    try {
      const a = await getAdminAlerts(token)
      setAdminAlerts(a)
    } catch {
      setAdminAlerts(null)
    }
  }, [token])

  const ensureDataLoaded = useCallback(async () => {
    if (!token) return
    if (partners.length > 0 && driversList.length > 0) return
    setDataLoading(true)
    try {
      const [ps, ds] = await Promise.all([listPartners(token), listDrivers(token)])
      setPartners(ps)
      setDriversList(ds)
    } catch {
      // ignore; visibility tab can retry
    } finally {
      setDataLoading(false)
    }
  }, [token, partners.length, driversList.length])

  const refresh = useCallback(() => {
    fetchPending()
    fetchUsers()
    fetchActiveTrips()
    fetchHistoryTrips()
    fetchMetrics()
    fetchHealth()
    void fetchAdminAlerts()
  }, [
    fetchPending,
    fetchUsers,
    fetchActiveTrips,
    fetchHistoryTrips,
    fetchMetrics,
    fetchHealth,
    fetchAdminAlerts,
  ])

  const handleAssignTrip = async (tripId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo para atribuir a viagem (SP-F, mín. 10 caracteres):')
    if (!gr) return
    setTripActionLoading(tripId)
    try {
      await assignTripAdmin(tripId, token, gr)
      setError(null)
      fetchActiveTrips()
      setTripDetail(null)
      syncAdminUrl({ tab: 'trips', tripId: null })
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao atribuir'))
    } finally {
      setTripActionLoading(null)
    }
  }

  const handleCancelTrip = async (tripId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo do cancelamento admin (mín. 10; fica na viagem):')
    if (!gr) return
    setTripActionLoading(tripId)
    try {
      await cancelTripAdmin(tripId, token, gr)
      setError(null)
      fetchActiveTrips()
      setTripDetail(null)
      syncAdminUrl({ tab: 'trips', tripId: null })
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao cancelar'))
    } finally {
      setTripActionLoading(null)
    }
  }

  const handleAdminTripTransition = async (
    tripId: string,
    toStatus: 'arriving' | 'ongoing',
    fromStatus?: string,
  ) => {
    if (!token) return
    const shortId = tripId.slice(0, 8)
    const header = `Viagem ${shortId}…${fromStatus ? ` (${fromStatus} → ${toStatus})` : ` → ${toStatus}`}`
    const body =
      toStatus === 'arriving'
        ? 'Forçar estado «arriving» (a caminho do passageiro)?'
        : 'Forçar «ongoing» (viagem iniciada)? Isto contorna a exigência de proximidade (~50 m) ao pickup.'
    if (!window.confirm(`${header}\n\n${body}`)) return
    const reason = window.prompt(
      'Motivo da intervenção (mínimo 10 caracteres; fica em auditoria):',
      'Correção operacional: motorista no local, app sem GPS preciso'
    )
    if (reason === null) return
    const trimmed = reason.trim()
    if (trimmed.length < 10) {
      window.alert('O motivo precisa de pelo menos 10 caracteres.')
      return
    }
    setTripActionLoading(tripId)
    try {
      await adminTripTransition(tripId, token, { to_status: toStatus, reason: trimmed })
      setError(null)
      await fetchActiveTrips()
      if (selectedTripId === tripId) {
        const d = await getTripDetailAdmin(tripId, token)
        setTripDetail(d)
      }
    } catch (err) {
      setError(adminErrDetail(err, 'Erro na transição admin'))
    } finally {
      setTripActionLoading(null)
    }
  }

  const handleRunTimeouts = async () => {
    if (!token) return
    const gr = promptGovernanceReason(
      'Motivo para correr timeouts (SP-F). Requer sessão super_admin; mín. 10 caracteres.'
    )
    if (!gr) return
    setOpsLoading('timeouts')
    try {
      await runTimeouts(token, gr)
      setError(null)
      fetchActiveTrips()
      fetchMetrics()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro timeouts'))
    } finally {
      setOpsLoading(null)
    }
  }

  const handleRunOfferExpiry = async () => {
    if (!token) return
    const gr = promptGovernanceReason(
      'Motivo para expirar ofertas / redispatch (SP-F). Requer super_admin; mín. 10 caracteres.'
    )
    if (!gr) return
    setOpsLoading('offer-expiry')
    try {
      await runOfferExpiry(token, gr)
      setError(null)
      fetchActiveTrips()
      fetchMetrics()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro offer-expiry'))
    } finally {
      setOpsLoading(null)
    }
  }

  const handleFetchPhase0 = async () => {
    if (!token) return
    setOpsLoading('phase0')
    try {
      const d = await getAdminPhase0(token)
      setPhase0(d)
      setError(null)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro fase0'))
    } finally {
      setOpsLoading(null)
    }
  }

  const handleRunCronNow = async () => {
    if (!token) return
    if (!window.confirm('Correr cron agora? (timeouts, offers, cleanup, system health)')) return
    const gr = promptGovernanceReason(
      'Motivo para correr o lote cron completo (SP-F). Requer super_admin; mín. 10 caracteres.'
    )
    if (!gr) return
    setOpsLoading('cron')
    try {
      const d = await runAdminCron(token, gr)
      setCronRun(d)
      setError(null)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro cron'))
    } finally {
      setOpsLoading(null)
    }
  }

  const handleValidateEnv = async () => {
    if (!token) return
    const text = envText.trim()
    if (!text) return
    setOpsLoading('env-validate')
    try {
      const d = await validateEnvText(text, token)
      setEnvValidate(d)
      setError(null)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro validar .env'))
    } finally {
      setOpsLoading(null)
    }
  }

  const handleReconcilePreview = async () => {
    if (!token) return
    setOpsLoading('reconcile-preview')
    try {
      const d = await getReconcilePaymentsPreview(token, { limit: 200 })
      setReconcilePreview(d)
      setReconcileRun(null)
      setError(null)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro pré-visualização reconciliação'))
    } finally {
      setOpsLoading(null)
    }
  }

  const handleReconcileStripeSync = async (dryRun: boolean) => {
    if (!token) return
    const gr = promptGovernanceReason(
      dryRun
        ? 'Motivo (SP-F) para Stripe sync em simulação (dry-run):'
        : 'Motivo (SP-F) para aplicar Stripe sync na base de dados:'
    )
    if (!gr) return
    setOpsLoading(dryRun ? 'reconcile-stripe-dry' : 'reconcile-stripe-run')
    try {
      const out = await postReconcilePaymentsStripeSync(token, {
        governance_reason: gr,
        dry_run: dryRun,
        limit: 100,
      })
      setReconcileRun(out)
      setError(null)
      await fetchHealth()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro Stripe sync reconciliação'))
    } finally {
      setOpsLoading(null)
    }
  }

  const handleReconcileCloseNoPi = async (dryRun: boolean) => {
    if (!token) return
    if (
      !dryRun &&
      !window.confirm(
        'Marcar como failed viagem + pagamento sem PaymentIntent? Esta acção é irreversível pelo mesmo fluxo.'
      )
    ) {
      return
    }
    const gr = promptGovernanceReason(
      dryRun
        ? 'Motivo (SP-F) para simular fecho sem PI (dry-run):'
        : 'Motivo (SP-F) para fechar na BD pares sem stripe_payment_intent_id:'
    )
    if (!gr) return
    setOpsLoading(dryRun ? 'reconcile-close-dry' : 'reconcile-close-run')
    try {
      const out = await postReconcilePaymentsCloseNoPi(token, {
        governance_reason: gr,
        dry_run: dryRun,
        limit: 100,
      })
      setReconcileRun(out)
      setError(null)
      await fetchHealth()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro fechar sem PI'))
    } finally {
      setOpsLoading(null)
    }
  }

  const runRecoverDriver = async (driverUserId: string) => {
    if (!token) return
    const id = driverUserId.trim()
    if (!id) return
    const gr = promptGovernanceReason('Motivo para recuperar motorista (disponível=true; SP-F):')
    if (!gr) return
    setOpsLoading('recover')
    try {
      await recoverDriver(id, token, gr)
      setError(null)
      setRecoverDriverId('')
      await fetchHealth()
      fetchMetrics()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro recover'))
    } finally {
      setOpsLoading(null)
    }
  }

  const handleRecoverDriver = () => void runRecoverDriver(recoverDriverId)

  const handleCreateFrotaOrg = async () => {
    if (!token || !frotaOrgName.trim()) return
    const gr = promptGovernanceReason('Motivo para criar organização / frota (SP-F, mín. 10 caracteres):')
    if (!gr) return
    setFrotaLoading('org')
    setFrotaOk(null)
    setError(null)
    try {
      const r = await createPartner(frotaOrgName, token, gr)
      setFrotaPartnerId(r.id)
      setFrotaOk(`Organização “${r.name}” criada. O ID da frota foi preenchido abaixo — usa-o para criar o gestor.`)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro'))
    } finally {
      setFrotaLoading(null)
    }
  }

  const handleCreateFrotaManager = async () => {
    if (!token || !frotaPartnerId.trim() || !frotaManagerName.trim() || !frotaManagerPhone.trim()) return
    const gr = promptGovernanceReason('Motivo para criar gestor de frota (SP-F, mín. 10 caracteres):')
    if (!gr) return
    setFrotaLoading('manager')
    setFrotaOk(null)
    setFrotaAssignOk(null)
    setError(null)
    try {
      const r = await createPartnerOrgAdmin(
        frotaPartnerId,
        { name: frotaManagerName, phone: frotaManagerPhone },
        token,
        gr
      )
      setFrotaOk(
        `Gestor criado: ${r.name} (${r.phone}). Pode iniciar sessão no separador Frota da app com este telefone.`
      )
      setFrotaManagerName('')
      setFrotaManagerPhone('')
    } catch (err) {
      setError(adminErrDetail(err, 'Erro'))
    } finally {
      setFrotaLoading(null)
    }
  }

  const handleAssignDriverToFrota = async () => {
    const pid = (frotaAssignPartnerId || frotaPartnerId).trim()
    if (!token || !frotaAssignDriverId.trim() || !pid) return
    if (!window.confirm('Atribuir este motorista a esta frota?')) return
    const gr = promptGovernanceReason('Motivo para atribuir motorista à frota (SP-F, mín. 10 caracteres):')
    if (!gr) return
    setFrotaLoading('assign-driver')
    setFrotaOk(null)
    setFrotaAssignOk(null)
    setError(null)
    try {
      const r = await assignDriverToPartner(frotaAssignDriverId, pid, token, gr)
      setFrotaAssignOk(`Motorista atribuído à frota. driver=${r.user_id} · frota=${r.partner_id}`)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro'))
    } finally {
      setFrotaLoading(null)
    }
  }

  const handleUnassignDriverFromFrota = async () => {
    if (!token || !frotaAssignDriverId.trim()) return
    if (!window.confirm('Remover este motorista da frota?')) return
    const gr = promptGovernanceReason('Motivo para remover motorista da frota (SP-F, mín. 10 caracteres):')
    if (!gr) return
    setFrotaLoading('unassign-driver')
    setFrotaOk(null)
    setFrotaAssignOk(null)
    setError(null)
    try {
      const r = await unassignDriverFromPartner(frotaAssignDriverId, token, gr)
      setFrotaAssignOk(`Motorista removido da frota. driver=${r.user_id} · frota=${r.partner_id}`)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro'))
    } finally {
      setFrotaLoading(null)
    }
  }

  const handleExportLogs = async () => {
    if (!token) return
    setOpsLoading('export')
    try {
      const blob = await exportLogsCsv(token)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `interaction_logs_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setError(null)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro export'))
    } finally {
      setOpsLoading(null)
    }
  }

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchPending()
    fetchUsers()
    const id = setInterval(refresh, 8000)
    return () => clearInterval(id)
  }, [token, fetchPending, fetchUsers, refresh])

  useEffect(() => {
    if (!token) return
    if (tab === 'agora') {
      void fetchActiveTrips()
      void fetchMetrics()
      void fetchHealth()
      void fetchAdminAlerts()
    }
    if (tab === 'trips') {
      if (tripsListMode === 'active') void fetchActiveTrips()
      else void fetchHistoryTrips()
    }
    if (tab === 'metrics') fetchMetrics()
    if (tab === 'health') fetchHealth()
    if (tab === 'ops') fetchHealth()
    if (tab === 'dados') void fetchDataVisibility()
    if (tab === 'metrics') fetchUsage()
    if (tab === 'frota') void ensureDataLoaded()
    // Tab-driven fetches; fetchDataVisibility / fetchUsage / ensureDataLoaded are stable enough for this pattern.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-running on every render of inline fetch helpers
  }, [
    token,
    tab,
    tripsListMode,
    fetchActiveTrips,
    fetchHistoryTrips,
    fetchMetrics,
    fetchHealth,
    fetchAdminAlerts,
  ])

  const fetchDataVisibility = async () => {
    if (!token) return
    setDataLoading(true)
    try {
      const [ps, ds] = await Promise.all([listPartners(token), listDrivers(token)])
      setPartners(ps)
      setDriversList(ds)
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao carregar dados'))
    } finally {
      setDataLoading(false)
    }
  }

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // ignore (http / permissions); user can still select text
    }
  }

  useEffect(() => {
    if (selectedTripId && token) {
      void fetchTripDetail(selectedTripId)
    } else {
      setTripDetailLoading(false)
      setTripDetail(null)
      setTripDebug(null)
      setTripDebugId(null)
    }
  }, [selectedTripId, token, fetchTripDetail])

  const handleApprove = async (phone: string) => {
    if (!token) return
    try {
      await apiFetch('/admin/approve-user', {
        method: 'POST',
        body: JSON.stringify({ phone }),
        token,
      })
      setPending((p) => p.filter((u) => u.phone !== phone))
      fetchUsers()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro ao aprovar'))
    }
  }

  const handlePromote = async (userId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo para promover a motorista (super_admin; SP-F):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${userId}/promote-driver`, {
        method: 'POST',
        token,
        body: JSON.stringify({ governance_reason: gr }),
      })
      invalidateUserAudit(userId)
      fetchUsers()
      setError(null)
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleDemote = async (userId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo para repor passageiro (super_admin; SP-F):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${userId}/demote-driver`, {
        method: 'POST',
        token,
        body: JSON.stringify({ governance_reason: gr }),
      })
      invalidateUserAudit(userId)
      fetchUsers()
      setError(null)
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const startEdit = (u: AdminUser) => {
    setError(null)
    setEditingId(u.id)
    const n = u.name || ''
    const p = u.phone
    setEditName(n)
    setEditPhone(p)
    setEditOriginalName(n.trim())
    setEditOriginalPhone(p.trim())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPhone('')
    setEditOriginalName('')
    setEditOriginalPhone('')
  }

  /** Ao sair da tab Utilizadores, limpar selecção em massa e edição — evita estado «pendurado» nas outras tabs. */
  useEffect(() => {
    if (tab !== 'users') {
      setBulkSelectedIds({})
      setDeleteConfirmId(null)
      setBlockConfirmId(null)
      setUnblockConfirmId(null)
      setEditingId(null)
      setEditName('')
      setEditPhone('')
      setEditOriginalName('')
      setEditOriginalPhone('')
    }
  }, [tab])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_DRIVER_DOCS_REGISTRY_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, Partial<DriverDocumentsState['docs']>>
      const next: Record<string, DriverDocumentsState['docs']> = {}
      for (const [userId, docs] of Object.entries(parsed)) {
        next[userId] = {
          carta_tvde: docs.carta_tvde ?? 'missing',
          certificado_motorista_tvde: docs.certificado_motorista_tvde ?? 'missing',
          seguro_responsabilidade_civil: docs.seguro_responsabilidade_civil ?? 'missing',
          inspecao_viatura: docs.inspecao_viatura ?? 'missing',
        }
      }
      setDriverDocsRegistry(next)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_DRIVER_DOCS_REGISTRY_KEY, JSON.stringify(driverDocsRegistry))
    } catch {
      /* ignore */
    }
  }, [driverDocsRegistry])

  const handleSaveUserName = async () => {
    if (!token || !editingId) return
    const next = editName.trim()
    if (next === editOriginalName.trim()) {
      setError('O nome não mudou em relação ao valor actual.')
      return
    }
    const prevLabel = editOriginalName.trim() || '(sem nome, mostra telefone)'
    if (!window.confirm(`Alterar o nome?\n\nDe: ${prevLabel}\nPara: ${next || '(vazio — o servidor pode repor o telefone como nome)'}`)) {
      return
    }
    try {
      await apiFetch(`/admin/users/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: next || undefined }),
        token,
      })
      setEditOriginalName(next)
      setError(null)
      invalidateUserAudit(editingId)
      fetchUsers()
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleSaveUserPhone = async () => {
    if (!token || !editingId) return
    const next = editPhone.trim()
    if (next === editOriginalPhone.trim()) {
      setError('O telefone não mudou em relação ao valor actual.')
      return
    }
    const typed = window.prompt(
      `Alterar telefone de ${editOriginalPhone} para ${next}.\n\nPara confirmar, escreve exactamente: ALTERAR_TELEFONE`
    )
    if (typed?.trim() !== 'ALTERAR_TELEFONE') return
    const gr = promptGovernanceReason('Motivo de auditoria para mudança de telefone (SP-F, mín. 10 caracteres):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ phone: next, governance_reason: gr }),
        token,
      })
      setEditOriginalPhone(next)
      setEditPhone(next)
      setError(null)
      invalidateUserAudit(editingId)
      fetchUsers()
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleDelete = async (userId: string) => {
    if (!token) return
    const reason = window.prompt(
      'Motivo da eliminação (mínimo 10 caracteres; fica em auditoria — SP-F). Só super_admin pode eliminar contas.'
    )
    if (!reason || reason.trim().length < 10) {
      setError('Eliminação cancelada: motivo com pelo menos 10 caracteres é obrigatório.')
      setDeleteConfirmId(null)
      return
    }
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: 'DELETE',
        token,
        body: JSON.stringify({ governance_reason: reason.trim() }),
      })
      setDeleteConfirmId(null)
      invalidateUserAudit(userId)
      fetchUsers()
      setError(null)
    } catch (err) {
      const ae = err as ApiError
      const d = ae?.detail
      const msg =
        typeof d === 'string'
          ? formatAdminApiDetail(d)
          : Array.isArray(d)
            ? formatAdminApiDetail(d)
            : 'Erro ao eliminar'
      setError(msg)
    }
  }

  const handleBlockUser = async (userId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo para bloquear conta (SP-F, mín. 10 caracteres):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${userId}/block`, {
        method: 'POST',
        token,
        body: JSON.stringify({ governance_reason: gr }),
      })
      setBlockConfirmId(null)
      invalidateUserAudit(userId)
      setBulkSelectedIds((m) => {
        const next = { ...m }
        delete next[userId]
        return next
      })
      fetchUsers()
      setError(null)
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleUnblockUser = async (userId: string) => {
    if (!token) return
    const gr = promptGovernanceReason('Motivo para desbloquear conta (SP-F, mín. 10 caracteres):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${userId}/unblock`, {
        method: 'POST',
        token,
        body: JSON.stringify({ governance_reason: gr }),
      })
      setUnblockConfirmId(null)
      invalidateUserAudit(userId)
      fetchUsers()
      setError(null)
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleClearUserPassword = async (userId: string) => {
    if (!token) return
    const typed = window.prompt(
      'Repor login BETA (password por defeito). Escreve exactamente: LIMPAR_SENHA'
    )
    if (typed?.trim() !== 'LIMPAR_SENHA') return
    const gr = promptGovernanceReason('Motivo para repor palavra-passe BETA (super_admin; SP-F):')
    if (!gr) return
    try {
      await apiFetch(`/admin/users/${userId}/password/clear`, {
        method: 'POST',
        token,
        body: JSON.stringify({ confirmation: 'LIMPAR_SENHA', governance_reason: gr }),
      })
      setError(null)
      invalidateUserAudit(userId)
      fetchUsers()
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const handleBulkBlock = async () => {
    if (!token) return
    const ids = Object.keys(bulkSelectedIds).filter((id) => bulkSelectedIds[id])
    if (ids.length === 0) return
    const expected = `BLOQUEAR_${ids.length}`
    const typed = window.prompt(
      `Para bloquear ${ids.length} conta(s) (reversível), escreve exactamente:\n${expected}`
    )
    if (typed?.trim() !== expected) return
    const reason = window.prompt(
      'Motivo do bloqueio em massa (mínimo 10 caracteres; fica em auditoria — SP-F). Só super_admin pode executar.'
    )
    if (!reason || reason.trim().length < 10) {
      setError('Bloqueio em massa cancelado: motivo com pelo menos 10 caracteres é obrigatório.')
      return
    }
    try {
      await apiFetch('/admin/users/bulk-block', {
        method: 'POST',
        token,
        body: JSON.stringify({
          user_ids: ids,
          confirmation: expected,
          governance_reason: reason.trim(),
        }),
      })
      for (const id of ids) invalidateUserAudit(id)
      setBulkSelectedIds({})
      fetchUsers()
      setError(null)
    } catch (err) {
      setError(formatAdminApiDetail((err as ApiError).detail))
    }
  }

  const filteredSortedUsers = useMemo(() => {
    const q = usersFilter.trim().toLowerCase()
    let list = users
    if (q) {
      list = users.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.status.toLowerCase().includes(q)
      )
    }
    const sorted = [...list]
    const byPhone = (a: AdminUser, b: AdminUser) => a.phone.localeCompare(b.phone)
    if (usersSort === 'name') {
      sorted.sort((a, b) => (a.name || a.phone).localeCompare(b.name || b.phone) || byPhone(a, b))
    } else if (usersSort === 'role') {
      sorted.sort((a, b) => a.role.localeCompare(b.role) || byPhone(a, b))
    } else {
      sorted.sort((a, b) => a.status.localeCompare(b.status) || byPhone(a, b))
    }
    return sorted
  }, [users, usersFilter, usersSort])

  const driverUsers = useMemo(
    () => users.filter((u) => u.has_driver_profile || u.role === 'driver'),
    [users]
  )
  const docsRowsData = useMemo(() => {
    const totals = DRIVER_DOC_STATUSES.reduce(
      (acc, st) => {
        acc[st] = 0
        return acc
      },
      {} as Record<DriverDocumentStatus, number>
    )
    const rows = driverUsers
      .slice(0, 20)
      .map((u) => {
        const docs = driverDocsRegistry[u.id] ?? emptyDriverDocs()
        const approved = docsApprovedCount(docs)
        const missing = REQUIRED_DRIVER_DOCUMENTS.filter((k) => docs[k] !== 'approved')
        return { user: u, docs, approved, missing }
      })
      .sort((a, b) => a.approved - b.approved || (a.user.name || a.user.phone).localeCompare(b.user.name || b.user.phone))
    for (const row of rows) {
      for (const doc of REQUIRED_DRIVER_DOCUMENTS) {
        totals[row.docs[doc]] += 1
      }
    }
    return { rows, totals }
  }, [driverUsers, driverDocsRegistry])

  const selectedTripInActiveList = useMemo(
    () => Boolean(selectedTripId && activeTrips.some((t) => t.trip_id === selectedTripId)),
    [selectedTripId, activeTrips]
  )
  const selectedTripInHistoryList = useMemo(
    () => Boolean(selectedTripId && historyTrips.some((t) => t.trip_id === selectedTripId)),
    [selectedTripId, historyTrips]
  )
  /** Viagem seleccionada que não está na lista activa; no modo Histórico deixa de ser «órfã» se já aparece na lista. */
  const tripOrphanFromDeepLink = Boolean(
    selectedTripId &&
      !selectedTripInActiveList &&
      !(tripsListMode === 'history' && selectedTripInHistoryList)
  )

  /** SP-D: indicador na tab Saúde quando há linhas ou avisos. */
  const healthTabHasSignals = useMemo(
    () =>
      Boolean(
        health &&
          (countHealthSignalRows(health) > 0 || (health.warnings?.length ?? 0) > 0)
      ),
    [health]
  )

  const opsStuckPaymentsPageData = useMemo(() => {
    const rows = health?.stuck_payments ?? []
    const total = rows.length
    const start = opsStuckPaymentsPage * OPS_STUCK_PAYMENTS_PAGE_SIZE
    const maxPage = Math.max(0, Math.ceil(total / OPS_STUCK_PAYMENTS_PAGE_SIZE) - 1)
    return {
      slice: rows.slice(start, start + OPS_STUCK_PAYMENTS_PAGE_SIZE),
      total,
      maxPage,
      from: total === 0 ? 0 : start + 1,
      to: Math.min(start + OPS_STUCK_PAYMENTS_PAGE_SIZE, total),
    }
  }, [health?.stuck_payments, opsStuckPaymentsPage])

  if (loading && users.length === 0) {
    return (
      <div className="p-4">
        <p className="text-foreground/80">A carregar...</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <nav
        className="flex flex-wrap gap-2 mb-4 pb-1"
        role="tablist"
        aria-label="Secções do painel admin"
      >
        {TABS.map(({ id, label }) => {
          const healthDot = id === 'health' && healthTabHasSignals
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() =>
                id === 'trips'
                  ? syncAdminUrl({ tab: 'trips', tripId: selectedTripId, tripsList: tripsListMode })
                  : syncAdminUrl({ tab: id, tripId: null })
              }
              className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-foreground/80 hover:bg-muted/50'
              }`}
              title={healthDot ? 'Há anomalias ou avisos na Saúde' : undefined}
            >
              <span className="inline-flex items-center gap-1.5">
                {label}
                {healthDot ? (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-destructive"
                    aria-hidden
                  />
                ) : null}
              </span>
            </button>
          )
        })}
      </nav>

      {token ? (
        <p className="text-xs text-muted-foreground mb-3 -mt-2" role="status" aria-live="polite">
          Sessão (JWT):{' '}
          <span
            className={`font-mono font-medium ${
              isSuperAdminSession ? 'text-foreground' : 'text-warning'
            }`}
          >
            {parseJwtPayload(token)?.role ?? '—'}
          </span>
          {!isSuperAdminSession ? (
            <span className="text-muted-foreground">
              {' '}
              · Executar timeouts, expirar ofertas, exportar CSV, cron completo e validar .env exigem{' '}
              <code className="text-foreground/90">super_admin</code>
            </span>
          ) : null}
        </p>
      ) : null}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-4">{error}</p>
      )}

      {tab === 'agora' && (
        <section className="space-y-4 mb-6" aria-labelledby="admin-agora-heading">
          <h2 id="admin-agora-heading" className="text-lg font-semibold text-foreground">
            Estado agora
          </h2>
          <p className="text-sm text-foreground/70 -mt-2">
            Resumo em segundos (actualiza com o painel, ~8 s). Usa as tabs abaixo para agir.
          </p>

          {(() => {
            const stuckN = health?.stuck_payments?.length ?? 0
            const signalRows = countHealthSignalRows(health)
            const hStatus = health?.status ?? '—'
            const degraded = hStatus === 'degraded' || signalRows > 0
            const activeN = metrics?.active_trips ?? activeTrips.length
            const pendingN = pending.length

            return (
              <>
                <div
                  className={`rounded-2xl border px-4 py-3 shadow-card ${
                    degraded
                      ? 'border-warning/60 bg-warning/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">
                    Saúde API: <span className="text-foreground">{hStatus}</span>
                    {signalRows > 0 ? (
                      <span className="text-warning"> · {signalRows} linha(s) de anomalia</span>
                    ) : (
                      <span className="text-muted-foreground"> · sem linhas de anomalia</span>
                    )}
                  </p>
                  {stuckN > 0 ? (
                    <p className="text-sm text-destructive mt-1 font-medium">
                      Pagamentos presos (stuck): {stuckN} — ver Saúde ou Operações.
                    </p>
                  ) : (
                    <p className="text-xs text-foreground/65 mt-1">Pagamentos presos: 0</p>
                  )}
                  {signalRows > 0 ? (
                    <p className="text-xs text-foreground/75 mt-2">
                      Em <strong>Saúde</strong>, cada bloco com linhas inclui «O que é · O que fazer (3 passos)» (SP-D).
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'trips', tripId: null, tripsList: 'active' })}
                    className="rounded-2xl border border-border bg-card px-3 py-3 text-left shadow-card hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-xs text-foreground/70">Viagens activas</p>
                    <p className="text-2xl font-semibold text-foreground tabular-nums">{activeN}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'pending', tripId: null })}
                    className="rounded-2xl border border-border bg-card px-3 py-3 text-left shadow-card hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-xs text-foreground/70">Pendentes aprovação</p>
                    <p className="text-2xl font-semibold text-foreground tabular-nums">{pendingN}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'metrics', tripId: null })}
                    className="rounded-2xl border border-border bg-card px-3 py-3 text-left shadow-card hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-xs text-foreground/70">Motoristas disponíveis</p>
                    <p className="text-2xl font-semibold text-foreground tabular-nums">
                      {metrics?.drivers_available ?? '—'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'metrics', tripId: null })}
                    className="rounded-2xl border border-border bg-card px-3 py-3 text-left shadow-card hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-xs text-foreground/70">Em curso (métricas)</p>
                    <p className="text-2xl font-semibold text-foreground tabular-nums">
                      {metrics?.trips_ongoing ?? '—'}
                    </p>
                  </button>
                </div>

                {adminAlerts &&
                  (adminAlerts.zero_drivers_available || adminAlerts.zero_trips_today) && (
                    <div className="rounded-xl border border-info/40 bg-info/10 px-3 py-2 text-sm text-foreground">
                      {adminAlerts.zero_drivers_available ? (
                        <p>Alerta métricas: nenhum motorista disponível agora.</p>
                      ) : null}
                      {adminAlerts.zero_trips_today ? (
                        <p className={adminAlerts.zero_drivers_available ? 'mt-1' : ''}>
                          Alerta métricas: zero viagens criadas hoje (UTC).
                        </p>
                      ) : null}
                    </div>
                  )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'trips', tripId: null, tripsList: 'active' })}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                  >
                    Ir para Viagens
                  </button>
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'health', tripId: null })}
                    className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
                  >
                    Ir para Saúde
                  </button>
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'ops', tripId: null })}
                    className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
                  >
                    Ir para Operações
                  </button>
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'docs', tripId: null })}
                    className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
                  >
                    Documentos
                  </button>
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'metrics', tripId: null })}
                    className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
                  >
                    Métricas
                  </button>
                </div>
              </>
            )
          })()}
        </section>
      )}

      {tab === 'docs' && (
        <section className="space-y-4 mb-6" aria-labelledby="admin-docs-heading">
          <h2 id="admin-docs-heading" className="text-lg font-semibold text-foreground">
            Documentos e licenças
          </h2>
          <div className="rounded-2xl border border-border bg-card px-4 py-4 space-y-3 shadow-card">
            <p className="text-sm text-foreground/85">
              Esta secção centraliza documentos operacionais (motorista e viatura) e validações.
            </p>
            <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-foreground">
              Módulo em implementação. Nesta fase, a validação continua via operação/admin.
            </div>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Documentos obrigatórios (v1)</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/80">
                {REQUIRED_DRIVER_DOCUMENTS.map((doc) => (
                  <li key={doc}>{driverDocumentLabel(doc)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Estados esperados</p>
              <div className="flex flex-wrap gap-2">
                {DRIVER_DOC_STATUSES.map((st) => (
                  <span
                    key={st}
                    className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-foreground/85"
                  >
                    {driverDocumentStatusLabel(st)}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Motoristas (controle rápido v1)</p>
                <p className="text-xs text-muted-foreground">{driverUsers.length} com perfil motorista</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-3 py-2 space-y-2">
                <p className="text-xs text-foreground/85">Totais por estado (20 motoristas visíveis)</p>
                <div className="flex flex-wrap gap-1.5">
                  {DRIVER_DOC_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDocsStatusFilter((prev) => (prev === st ? 'all' : st))}
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${
                        docsStatusFilter === st
                          ? 'border-info/60 bg-info/15 text-foreground'
                          : 'border-border bg-card text-foreground/85'
                      }`}
                    >
                      {driverDocumentStatusLabel(st)}: {docsRowsData.totals[st]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDocsStatusFilter('all')}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      docsStatusFilter === 'all'
                        ? 'border-info/60 bg-info/15 text-foreground'
                        : 'border-border bg-card text-foreground/85'
                    }`}
                  >
                    Todos
                  </button>
                </div>
              </div>
              {driverUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem motoristas carregados nesta página.</p>
              ) : (
                <ul className="space-y-2 max-h-[min(46vh,20rem)] overflow-y-auto pr-0.5">
                  {docsRowsData.rows.map(({ user: u, docs, approved, missing }) => {
                    return (
                      <li key={u.id} className="rounded-lg border border-border/70 bg-background px-3 py-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{u.name || u.phone}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{u.phone}</p>
                          </div>
                          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-foreground/85">
                            {approved}/{REQUIRED_DRIVER_DOCUMENTS.length} aprovados
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground/80">
                          {missing.length === 0
                            ? 'Checklist completo.'
                            : `Em falta: ${missing.map((k) => driverDocumentLabel(k)).join(', ')}`}
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {REQUIRED_DRIVER_DOCUMENTS.filter((doc) =>
                            docsStatusFilter === 'all' ? true : docs[doc] === docsStatusFilter
                          ).map((doc) => (
                            <div
                              key={doc}
                              className="rounded-md border border-border/70 bg-card px-2 py-1.5 flex flex-wrap items-center justify-between gap-1"
                            >
                              <p className="text-[11px] text-foreground/85">{driverDocumentLabel(doc)}</p>
                              <div className="flex flex-wrap gap-1">
                                {DRIVER_DOC_STATUSES.map((st) => (
                                  <button
                                    key={`${u.id}-${doc}-${st}`}
                                    type="button"
                                    onClick={() =>
                                      setDriverDocsRegistry((prev) => ({
                                        ...prev,
                                        [u.id]: {
                                          ...(prev[u.id] ?? emptyDriverDocs()),
                                          [doc]: st,
                                        },
                                      }))
                                    }
                                    className={`rounded border px-1.5 py-0.5 text-[10px] ${
                                      docs[doc] === st
                                        ? 'border-info/60 bg-info/15 text-foreground'
                                        : 'border-border bg-background text-foreground/75 hover:bg-muted/40'
                                    }`}
                                  >
                                    {driverDocumentStatusLabel(st)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          {REQUIRED_DRIVER_DOCUMENTS.every((doc) =>
                            docsStatusFilter === 'all' ? false : docs[doc] !== docsStatusFilter
                          ) ? (
                            <p className="text-[11px] text-muted-foreground">
                              Sem documentos deste estado para este motorista.
                            </p>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDriverDocsRegistry((prev) => ({
                                ...prev,
                                [u.id]: approvedDriverDocs(),
                              }))
                            }
                            className="min-h-[32px] flex-1 rounded-md border border-success/50 bg-success/10 px-2 text-xs font-medium text-foreground hover:bg-success/20"
                          >
                            Aprovar tudo
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDriverDocsRegistry((prev) => ({
                                ...prev,
                                [u.id]: emptyDriverDocs(),
                              }))
                            }
                            className="min-h-[32px] flex-1 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted/50"
                          >
                            Limpar
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => syncAdminUrl({ tab: 'frota', tripId: null })}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
              >
                Ir para Frota
              </button>
              <button
                type="button"
                onClick={() => syncAdminUrl({ tab: 'users', tripId: null })}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
              >
                Ir para Utilizadores
              </button>
              <button
                type="button"
                onClick={() => syncAdminUrl({ tab: 'ops', tripId: null })}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/40"
              >
                Ir para Operações
              </button>
            </div>
          </div>
        </section>
      )}

      {frotaOk && tab === 'frota' && (
        <p className="text-sm text-foreground bg-success/15 border border-success/30 px-3 py-2 rounded-lg mb-4">
          {frotaOk}
        </p>
      )}
      {frotaAssignOk && tab === 'frota' && (
        <p className="text-sm text-foreground bg-success/15 border border-success/30 px-3 py-2 rounded-lg mb-4">
          {frotaAssignOk}
        </p>
      )}

      {tab === 'pending' && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Utilizadores pendentes</h2>
          {pending.length === 0 ? (
            <p className="text-muted-foreground">Nenhum utilizador pendente.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((u) => (
                <li
                  key={u.phone}
                  className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3 shadow-card"
                >
                  <div>
                    <p className="font-medium text-foreground">{u.phone}</p>
                    <p className="text-sm text-foreground/75">{u.requested_role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApprove(u.phone)}
                    className="px-3 py-1.5 bg-success text-success-foreground text-sm font-medium rounded-lg hover:opacity-90"
                  >
                    Aprovar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'frota' && (
        <section className="space-y-8">
          <h2 className="text-lg font-semibold text-foreground">Frota (parceiros)</h2>
          <p className="text-sm text-foreground/75 -mt-4">
            Cria uma organização e depois o gestor que inicia sessão na app no separador Frota — tudo aqui, sem
            ferramentas externas.
          </p>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">1. Nova frota</h3>
            <label className="block text-sm text-foreground/80" htmlFor="frota-org-name">
              Nome da organização
            </label>
            <input
              id="frota-org-name"
              type="text"
              value={frotaOrgName}
              onChange={(e) => {
                setFrotaOrgName(e.target.value)
                setFrotaOk(null)
                setFrotaAssignOk(null)
              }}
              placeholder="Ex.: Frota Lisboa Norte"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground"
            />
            <button
              type="button"
              disabled={!frotaOrgName.trim() || frotaLoading !== null}
              onClick={() => void handleCreateFrotaOrg()}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {frotaLoading === 'org' ? 'A criar…' : 'Criar Frota'}
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">2. Gestor Frota</h3>
            <p className="text-sm text-foreground/75">
              ID da organização (preenche automaticamente após o passo 1, ou cola um UUID existente).
            </p>
            <label className="block text-sm text-foreground/80" htmlFor="frota-partner-id">
              ID da organização (partner_id)
            </label>
            <input
              id="frota-partner-id"
              type="text"
              value={frotaPartnerId}
              onChange={(e) => {
                setFrotaPartnerId(e.target.value)
                setFrotaOk(null)
                setFrotaAssignOk(null)
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono text-sm"
            />
            <label className="block text-sm text-foreground/80" htmlFor="frota-mgr-name">
              Nome do gestor
            </label>
            <input
              id="frota-mgr-name"
              type="text"
              value={frotaManagerName}
              onChange={(e) => {
                setFrotaManagerName(e.target.value)
                setFrotaOk(null)
                setFrotaAssignOk(null)
              }}
              placeholder="Nome completo"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground"
            />
            <label className="block text-sm text-foreground/80" htmlFor="frota-mgr-phone">
              Telefone (login OTP)
            </label>
            <input
              id="frota-mgr-phone"
              type="tel"
              value={frotaManagerPhone}
              onChange={(e) => {
                setFrotaManagerPhone(e.target.value)
                setFrotaOk(null)
                setFrotaAssignOk(null)
              }}
              placeholder="+351…"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground"
            />
            <button
              type="button"
              disabled={
                !frotaPartnerId.trim() ||
                !frotaManagerName.trim() ||
                !frotaManagerPhone.trim() ||
                frotaLoading !== null
              }
              onClick={() => void handleCreateFrotaManager()}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {frotaLoading === 'manager' ? 'A criar…' : 'Criar Gestor'}
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">3. Atribuir motorista à frota</h3>
            <p className="text-sm text-foreground/75">
              Seleciona o motorista e a frota (sem UUIDs manuais).
            </p>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {dataLoading ? 'A carregar listas…' : 'Listas prontas.'}
              </p>
              <button
                type="button"
                onClick={() => setFrotaAssignMode((m) => (m === 'select' ? 'manual' : 'select'))}
                className="px-2 py-1 bg-card border border-border text-foreground/80 text-xs rounded-lg hover:bg-muted/40"
              >
                {frotaAssignMode === 'select' ? 'Modo manual' : 'Modo select'}
              </button>
            </div>

            {frotaAssignMode === 'select' ? (
              <>
                <label className="block text-sm text-foreground/80" htmlFor="frota-assign-driver-select">
                  Motorista
                </label>
                <select
                  id="frota-assign-driver-select"
                  value={frotaAssignDriverId}
                  onChange={(e) => {
                    setFrotaAssignDriverId(e.target.value)
                    setFrotaAssignOk(null)
                    setFrotaOk(null)
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
                >
                  <option value="">— escolher —</option>
                  {users
                    .filter((u) => u.role === 'driver' || u.has_driver_profile)
                    .slice(0, 400)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {(u.name || u.phone) + ' · ' + u.phone}
                      </option>
                    ))}
                </select>

                <label className="block text-sm text-foreground/80" htmlFor="frota-assign-partner-select">
                  Frota
                </label>
                <select
                  id="frota-assign-partner-select"
                  value={frotaAssignPartnerId || frotaPartnerId}
                  onChange={(e) => {
                    setFrotaAssignPartnerId(e.target.value)
                    setFrotaAssignOk(null)
                    setFrotaOk(null)
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
                >
                  <option value="">— escolher —</option>
                  {partners.slice(0, 400).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="block text-sm text-foreground/80" htmlFor="frota-assign-driver-id">
                  Driver ID (driver_user_id)
                </label>
                <input
                  id="frota-assign-driver-id"
                  type="text"
                  value={frotaAssignDriverId}
                  onChange={(e) => {
                    setFrotaAssignDriverId(e.target.value)
                    setFrotaAssignOk(null)
                    setFrotaOk(null)
                  }}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono text-sm"
                />
                <label className="block text-sm text-foreground/80" htmlFor="frota-assign-partner-id">
                  Frota ID (partner_id)
                </label>
                <input
                  id="frota-assign-partner-id"
                  type="text"
                  value={frotaAssignPartnerId || frotaPartnerId}
                  onChange={(e) => {
                    setFrotaAssignPartnerId(e.target.value)
                    setFrotaAssignOk(null)
                    setFrotaOk(null)
                  }}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono text-sm"
                />
              </>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  !frotaAssignDriverId.trim() ||
                  !(frotaAssignPartnerId || frotaPartnerId).trim() ||
                  frotaLoading !== null
                }
                onClick={() => void handleAssignDriverToFrota()}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {frotaLoading === 'assign-driver' ? 'A atribuir…' : 'Atribuir'}
              </button>
              <button
                type="button"
                disabled={!frotaAssignDriverId.trim() || frotaLoading !== null}
                onClick={() => void handleUnassignDriverFromFrota()}
                className="flex-1 px-4 py-2 bg-card border border-border text-foreground/90 text-sm font-medium rounded-xl hover:bg-muted/40 disabled:opacity-50"
              >
                {frotaLoading === 'unassign-driver' ? 'A remover…' : 'Remover'}
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === 'dados' && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Dados (visibilidade)</h2>
          <p className="text-sm text-foreground/75">
            IDs essenciais para operar o sistema — com botão de copiar.
          </p>
          <div className="space-y-2">
            <label className="block text-sm text-foreground/80" htmlFor="admin-data-search">
              Pesquisar (nome/telefone/UUID)
            </label>
            <input
              id="admin-data-search"
              type="search"
              value={dataSearch}
              onChange={(e) => setDataSearch(e.target.value)}
              placeholder="Filtrar…"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
            />
            <button
              type="button"
              onClick={() => void fetchDataVisibility()}
              disabled={dataLoading}
              className="px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 disabled:opacity-50"
            >
              {dataLoading ? 'A carregar…' : 'Atualizar'}
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">Users</h3>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem utilizadores.</p>
            ) : (
              <ul className="space-y-2">
                {users
                  .filter((u) => {
                    const q = dataSearch.trim().toLowerCase()
                    if (!q) return true
                    return (
                      u.id.toLowerCase().includes(q) ||
                      u.phone.toLowerCase().includes(q) ||
                      (u.name ?? '').toLowerCase().includes(q) ||
                      u.role.toLowerCase().includes(q)
                    )
                  })
                  .slice(0, 200)
                  .map((u) => (
                    <li key={u.id} className="rounded-xl border border-border bg-background/30 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{u.name || '—'}</p>
                          <p className="text-muted-foreground">{u.phone}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.role} · {u.status}
                          </p>
                          <p className="text-xs font-mono text-foreground/90 break-all mt-1">{u.id}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void copy(u.id)}
                          className="px-2 py-1 bg-card border border-border text-foreground/80 text-xs rounded-lg hover:bg-muted/40"
                        >
                          Copiar
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">Partners</h3>
            {partners.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem frotas.</p>
            ) : (
              <ul className="space-y-2">
                {partners
                  .filter((p) => {
                    const q = dataSearch.trim().toLowerCase()
                    if (!q) return true
                    return p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
                  })
                  .slice(0, 200)
                  .map((p) => (
                    <li key={p.id} className="rounded-xl border border-border bg-background/30 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.created_at}</p>
                          <p className="text-xs font-mono text-foreground/90 break-all mt-1">{p.id}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void copy(p.id)}
                          className="px-2 py-1 bg-card border border-border text-foreground/80 text-xs rounded-lg hover:bg-muted/40"
                        >
                          Copiar
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <h3 className="font-medium text-foreground">Drivers</h3>
            {driversList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem motoristas.</p>
            ) : (
              <ul className="space-y-2">
                {driversList
                  .filter((d) => {
                    const q = dataSearch.trim().toLowerCase()
                    if (!q) return true
                    return (
                      d.user_id.toLowerCase().includes(q) ||
                      d.partner_id.toLowerCase().includes(q) ||
                      d.status.toLowerCase().includes(q)
                    )
                  })
                  .slice(0, 200)
                  .map((d) => (
                    <li key={d.user_id} className="rounded-xl border border-border bg-background/30 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">status: {d.status}</p>
                          <p className="text-xs text-muted-foreground">partner_id</p>
                          <p className="text-xs font-mono text-foreground/90 break-all">{d.partner_id}</p>
                          <p className="text-xs text-muted-foreground mt-2">user_id</p>
                          <p className="text-xs font-mono text-foreground/90 break-all">{d.user_id}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => void copy(d.user_id)}
                            className="px-2 py-1 bg-card border border-border text-foreground/80 text-xs rounded-lg hover:bg-muted/40"
                          >
                            Copiar user
                          </button>
                          <button
                            type="button"
                            onClick={() => void copy(d.partner_id)}
                            className="px-2 py-1 bg-card border border-border text-foreground/80 text-xs rounded-lg hover:bg-muted/40"
                          >
                            Copiar frota
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {tab === 'trips' && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Viagens</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Activas: pedido até em curso. Histórico: concluídas, canceladas ou falha (últimas 50 por ordem de
            actualização).
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => selectTripsListMode('active')}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border ${
                tripsListMode === 'active'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
              }`}
            >
              Activas
            </button>
            <button
              type="button"
              onClick={() => selectTripsListMode('history')}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border ${
                tripsListMode === 'history'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
              }`}
            >
              Histórico
            </button>
          </div>
          <div className="mb-3 flex items-center gap-2 text-xs text-foreground/60">
            <button
              type="button"
              onClick={() =>
                tripsListMode === 'active' ? void fetchActiveTrips() : void fetchHistoryTrips()
              }
              className="px-3 py-1.5 bg-card border border-border text-foreground/85 text-sm font-medium rounded-xl hover:bg-muted/40"
              title="Força refresh imediato; polling automático continua a cada poucos segundos"
            >
              ↻ Atualizar lista
            </button>
            <span>Polling natural activo — usa o botão para refresh imediato.</span>
          </div>

          {tripOrphanFromDeepLink && selectedTripId ? (
            <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 px-4 py-4 shadow-card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Viagem aberta (fora da lista de activas)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vês isto ao vires da Saúde ou de um link — não precisas da viagem estar activa para rever ou depurar.
                  </p>
                  <p className="text-xs font-mono text-foreground/80 mt-2 break-all">{selectedTripId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => syncAdminUrl({ tab: 'trips', tripId: null, tripsList: tripsListMode })}
                  className="shrink-0 px-3 py-1.5 bg-card border border-border text-foreground text-xs rounded-lg hover:bg-muted/40"
                >
                  Fechar viagem
                </button>
              </div>
              {tripDetailLoading ? (
                <p className="text-sm text-foreground/75">A carregar detalhe…</p>
              ) : tripDetail && tripDetail.trip_id === selectedTripId ? (
                <div className="space-y-2 rounded-xl border border-border bg-background/80 p-3">
                  <p className="text-sm text-foreground">
                    Estado: <span className="font-medium">{tripDetail.status}</span> · Estimativa:{' '}
                    {tripDetail.estimated_price} €
                    {tripDetail.final_price != null ? ` · Final: ${tripDetail.final_price} €` : null}
                  </p>
                  {(() => {
                    const pi = tripDetail.stripe_payment_intent_id
                    if (typeof pi !== 'string' || !pi) return null
                    const urls = stripePaymentIntentDashboardUrls(pi)
                    return urls ? (
                      <div className="flex flex-wrap gap-2 items-center text-xs">
                        <span className="text-muted-foreground">Stripe:</span>
                        <a
                          href={urls.test}
                          target="_blank"
                          rel="noreferrer"
                          className="text-info underline font-medium"
                        >
                          Abrir PI (test)
                        </a>
                        <a
                          href={urls.live}
                          target="_blank"
                          rel="noreferrer"
                          className="text-info underline font-medium"
                        >
                          Abrir PI (live)
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Payment intent de teste/mock — sem página no Stripe Dashboard.
                      </p>
                    )
                  })()}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void fetchTripDebug(selectedTripId)}
                      className="px-3 py-1.5 bg-warning text-warning-foreground text-xs font-medium rounded-lg"
                    >
                      Debug
                    </button>
                    {isSuperAdminSession && tripDetailEligibleSinglePaymentReconcile(tripDetail) ? (
                      <button
                        type="button"
                        onClick={() => void handleReconcileSingleTripPayment(selectedTripId)}
                        disabled={tripActionLoading === `${selectedTripId}-reconcile-pay`}
                        className="px-3 py-1.5 bg-info/25 text-info text-xs font-medium rounded-lg border border-info/30 disabled:opacity-50"
                        title="Consulta Stripe e actualiza o pagamento processing (viagens completed, cancelled ou failed)."
                      >
                        {tripActionLoading === `${selectedTripId}-reconcile-pay`
                          ? 'A alinhar…'
                          : 'Alinhar pagamento (Stripe)'}
                      </button>
                    ) : null}
                    {tripDetail.status === 'requested' && (
                      <button
                        type="button"
                        onClick={() => void handleAssignTrip(selectedTripId)}
                        disabled={tripActionLoading === selectedTripId}
                        className="px-3 py-1.5 bg-success text-success-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Atribuir
                      </button>
                    )}
                    {tripDetail.status === 'accepted' && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleAdminTripTransition(selectedTripId, 'arriving', tripDetail.status)
                        }
                        disabled={tripActionLoading === selectedTripId}
                        className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Forçar arriving
                      </button>
                    )}
                    {tripDetail.status === 'arriving' && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleAdminTripTransition(selectedTripId, 'ongoing', tripDetail.status)
                        }
                        disabled={tripActionLoading === selectedTripId}
                        className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Forçar ongoing
                      </button>
                    )}
                    {ADMIN_TRIP_CANCEL_STATUSES.includes(
                      tripDetail.status as (typeof ADMIN_TRIP_CANCEL_STATUSES)[number]
                    ) && (
                      <button
                        type="button"
                        onClick={() => void handleCancelTrip(selectedTripId)}
                        disabled={tripActionLoading === selectedTripId}
                        className="px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Cancelar viagem
                      </button>
                    )}
                  </div>
                  {selectedTripId ? (
                    <AdminTripPaymentOpsNotePanel
                      tripId={selectedTripId}
                      tripDetail={tripDetail}
                      enabled={canPostPaymentOpsNote}
                      draft={paymentOpsNoteText}
                      onDraftChange={setPaymentOpsNoteText}
                      onSubmit={() => void handlePaymentOpsNote(selectedTripId)}
                      submitting={tripActionLoading === `${selectedTripId}-payment-ops-note`}
                    />
                  ) : null}
                  {tripDebug && tripDebugId === selectedTripId && (
                    <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(tripDebug, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <p className="text-sm text-warning">
                  Não foi possível carregar o detalhe desta viagem (inexistente ou sem acesso).
                </p>
              )}
            </div>
          ) : null}

          {tripsListMode === 'active' && (
            <>
              {activeTrips.length === 0 && !tripOrphanFromDeepLink ? (
                <p className="text-foreground/75">Nenhuma viagem ativa.</p>
              ) : activeTrips.length > 0 ? (
                <ul className="space-y-3">
                  {activeTrips.map((t) => {
                    const ageMin = minutesSince(t.updated_at)
                    const stuckAccepted = t.status === 'accepted' && ageMin != null && ageMin >= 5
                    return (
                    <li
                      key={t.trip_id}
                      className={`bg-card border rounded-2xl px-4 py-3 shadow-card hover:bg-muted/30 transition-colors ${
                        stuckAccepted ? 'border-warning/60' : 'border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-foreground flex flex-wrap items-center gap-2">
                            <span>{t.trip_id.slice(0, 8)}… · {t.status}</span>
                            {stuckAccepted && (
                              <span
                                className="inline-flex items-center rounded-full bg-warning/20 border border-warning/50 px-2 py-0.5 text-[11px] font-semibold text-warning"
                                title="Potencial stuck: accepted há mais de 5 min sem progredir"
                              >
                                stuck {Math.round(ageMin!)}′
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-foreground/75">
                            {t.origin_lat.toFixed(4)}, {t.origin_lng.toFixed(4)} →{' '}
                            {t.destination_lat.toFixed(4)}, {t.destination_lng.toFixed(4)}
                          </p>
                          <p className="text-xs text-foreground/70">
                            P: {t.passenger_id.slice(0, 8)}…
                            {t.driver_id ? <> · D: {t.driver_id.slice(0, 8)}…</> : <> · D: —</>}
                            {' · '}
                            <span title={t.updated_at ?? ''}>atualizado {formatRelativeAgo(t.updated_at)}</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const nextId = selectedTripId === t.trip_id ? null : t.trip_id
                              syncAdminUrl({ tab: 'trips', tripId: nextId, tripsList: tripsListMode })
                            }}
                            className="px-2 py-1 bg-info text-info-foreground text-xs rounded"
                          >
                            {selectedTripId === t.trip_id ? 'Fechar' : 'Detalhe'}
                          </button>
                          {t.status === 'requested' && (
                            <button
                              type="button"
                              onClick={() => handleAssignTrip(t.trip_id)}
                              disabled={tripActionLoading === t.trip_id}
                              className="px-2 py-1 bg-success text-success-foreground text-xs rounded disabled:opacity-50"
                            >
                              Atribuir
                            </button>
                          )}
                          {t.status === 'accepted' && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleAdminTripTransition(t.trip_id, 'arriving', t.status)
                              }
                              disabled={tripActionLoading === t.trip_id}
                              className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded disabled:opacity-50"
                              title="Quando o motorista já está a caminho mas o estado API ficou em accepted"
                            >
                              → arriving
                            </button>
                          )}
                          {t.status === 'arriving' && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleAdminTripTransition(t.trip_id, 'ongoing', t.status)
                              }
                              disabled={tripActionLoading === t.trip_id}
                              className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded disabled:opacity-50"
                              title="Quando o pickup GPS bloqueia «Iniciar viagem» mas o motorista já está no local"
                            >
                              → ongoing
                            </button>
                          )}
                          {ADMIN_TRIP_CANCEL_STATUSES.includes(
                            t.status as (typeof ADMIN_TRIP_CANCEL_STATUSES)[number]
                          ) && (
                            <button
                              type="button"
                              onClick={() => handleCancelTrip(t.trip_id)}
                              disabled={tripActionLoading === t.trip_id}
                              className="px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                      {selectedTripId === t.trip_id && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <p className="text-xs text-foreground/85">
                            Estado (lista): <span className="font-medium text-foreground">{t.status}</span>
                          </p>
                          {tripDetailLoading ? (
                            <p className="text-xs text-foreground/70">A carregar detalhe…</p>
                          ) : tripDetail && tripDetail.trip_id === t.trip_id ? (
                            <>
                              <p className="text-xs text-foreground/75">
                                Estimativa: {tripDetail.estimated_price} € · Status (API): {tripDetail.status}
                                {tripDetail.final_price != null ? ` · Final: ${tripDetail.final_price} €` : null}
                              </p>
                              {(() => {
                                const pi = tripDetail.stripe_payment_intent_id
                                if (typeof pi !== 'string' || !pi) return null
                                const urls = stripePaymentIntentDashboardUrls(pi)
                                return urls ? (
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    <a
                                      href={urls.test}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-info underline"
                                    >
                                      Stripe (test)
                                    </a>
                                    <a
                                      href={urls.live}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-info underline"
                                    >
                                      Stripe (live)
                                    </a>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    PI mock/teste — sem link Stripe.
                                  </p>
                                )
                              })()}
                            </>
                          ) : (
                            <p className="text-xs text-warning">
                              Não foi possível carregar o detalhe (rede, timeout ou viagem inexistente). Tenta
                              &quot;Atualizar&quot; na lista ou &quot;Debug&quot; abaixo.
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => fetchTripDebug(t.trip_id)}
                              className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded"
                            >
                              Debug
                            </button>
                            {isSuperAdminSession && tripDetailEligibleSinglePaymentReconcile(tripDetail) ? (
                              <button
                                type="button"
                                onClick={() => void handleReconcileSingleTripPayment(t.trip_id)}
                                disabled={tripActionLoading === `${t.trip_id}-reconcile-pay`}
                                className="px-2 py-1 bg-info/25 text-info text-xs font-medium rounded border border-info/30 disabled:opacity-50"
                                title="Consulta Stripe e actualiza o pagamento processing (viagens completed, cancelled ou failed)."
                              >
                                {tripActionLoading === `${t.trip_id}-reconcile-pay`
                                  ? 'A alinhar…'
                                  : 'Alinhar pagamento (Stripe)'}
                              </button>
                            ) : null}
                          </div>
                          <AdminTripPaymentOpsNotePanel
                            tripId={t.trip_id}
                            tripDetail={tripDetail}
                            enabled={canPostPaymentOpsNote}
                            draft={paymentOpsNoteText}
                            onDraftChange={setPaymentOpsNoteText}
                            onSubmit={() => void handlePaymentOpsNote(t.trip_id)}
                            submitting={tripActionLoading === `${t.trip_id}-payment-ops-note`}
                          />
                          {tripDebug && tripDebugId === t.trip_id && (
                            <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                              {JSON.stringify(tripDebug, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </li>
                    )
                  })}
                </ul>
              ) : tripOrphanFromDeepLink ? (
                <p className="text-xs text-muted-foreground">
                  Lista de viagens activas vazia; o painel acima é a viagem que abriste por link.
                </p>
              ) : null}
            </>
          )}

          {tripsListMode === 'history' && (
            <>
              {historyTripsError ? (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/25 px-3 py-2 rounded-lg">
                  {historyTripsError}
                </p>
              ) : null}
              {!historyTripsError && historyTrips.length === 0 ? (
                <p className="text-foreground/75">
                  Nenhuma viagem no histórico recente (concluída, cancelada ou falha) nesta base de dados.
                </p>
              ) : historyTrips.length > 0 ? (
                <ul className="space-y-3">
                  {historyTrips.map((h) => (
                    <li
                      key={h.trip_id}
                      className="bg-card border border-border rounded-2xl px-4 py-3 shadow-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {h.trip_id.slice(0, 8)}… · {h.status}
                          </p>
                          <p className="text-sm text-foreground/75">
                            {h.origin_lat.toFixed(4)}, {h.origin_lng.toFixed(4)} →{' '}
                            {h.destination_lat.toFixed(4)}, {h.destination_lng.toFixed(4)}
                          </p>
                          <p className="text-xs text-foreground/70">
                            Fim:{' '}
                            {h.completed_at
                              ? new Date(h.completed_at).toLocaleString('pt-PT')
                              : '— (sem data de conclusão)'}
                            {h.final_price != null ? ` · ${h.final_price} €` : null}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextId = selectedTripId === h.trip_id ? null : h.trip_id
                            syncAdminUrl({ tab: 'trips', tripId: nextId, tripsList: tripsListMode })
                          }}
                          className="px-2 py-1 bg-info text-info-foreground text-xs rounded shrink-0"
                        >
                          {selectedTripId === h.trip_id ? 'Fechar' : 'Detalhe'}
                        </button>
                      </div>
                      {selectedTripId === h.trip_id && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <p className="text-xs text-foreground/85">
                            Estado (lista): <span className="font-medium text-foreground">{h.status}</span>
                          </p>
                          {tripDetailLoading ? (
                            <p className="text-xs text-foreground/70">A carregar detalhe…</p>
                          ) : tripDetail && tripDetail.trip_id === h.trip_id ? (
                            <>
                              <p className="text-xs text-foreground/75">
                                Estimativa: {tripDetail.estimated_price} € · Status (API): {tripDetail.status}
                                {tripDetail.final_price != null ? ` · Final: ${tripDetail.final_price} €` : null}
                              </p>
                              {(() => {
                                const pi = tripDetail.stripe_payment_intent_id
                                if (typeof pi !== 'string' || !pi) return null
                                const urls = stripePaymentIntentDashboardUrls(pi)
                                return urls ? (
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    <a
                                      href={urls.test}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-info underline"
                                    >
                                      Stripe (test)
                                    </a>
                                    <a
                                      href={urls.live}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-info underline"
                                    >
                                      Stripe (live)
                                    </a>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    PI mock/teste — sem link Stripe.
                                  </p>
                                )
                              })()}
                            </>
                          ) : (
                            <p className="text-xs text-warning">
                              Não foi possível carregar o detalhe (rede, timeout ou viagem inexistente). Tenta
                              &quot;Atualizar&quot; na lista ou &quot;Debug&quot; abaixo.
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => fetchTripDebug(h.trip_id)}
                              className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded"
                            >
                              Debug
                            </button>
                            {isSuperAdminSession && tripDetailEligibleSinglePaymentReconcile(tripDetail) ? (
                              <button
                                type="button"
                                onClick={() => void handleReconcileSingleTripPayment(h.trip_id)}
                                disabled={tripActionLoading === `${h.trip_id}-reconcile-pay`}
                                className="px-2 py-1 bg-info/25 text-info text-xs font-medium rounded border border-info/30 disabled:opacity-50"
                                title="Consulta Stripe e actualiza o pagamento processing (viagens completed, cancelled ou failed)."
                              >
                                {tripActionLoading === `${h.trip_id}-reconcile-pay`
                                  ? 'A alinhar…'
                                  : 'Alinhar pagamento (Stripe)'}
                              </button>
                            ) : null}
                          </div>
                          <AdminTripPaymentOpsNotePanel
                            tripId={h.trip_id}
                            tripDetail={tripDetail}
                            enabled={canPostPaymentOpsNote}
                            draft={paymentOpsNoteText}
                            onDraftChange={setPaymentOpsNoteText}
                            onSubmit={() => void handlePaymentOpsNote(h.trip_id)}
                            submitting={tripActionLoading === `${h.trip_id}-payment-ops-note`}
                          />
                          {tripDebug && tripDebugId === h.trip_id && (
                            <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                              {JSON.stringify(tripDebug, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </section>
      )}

      {tab === 'metrics' && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Métricas</h2>
          <button
            type="button"
            onClick={() => fetchMetrics()}
            className="mb-3 px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40"
          >
            Atualizar
          </button>
          {metrics ? (
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
                <p className="text-foreground/70">Viagens ativas</p>
                <p className="font-bold text-foreground">{metrics.active_trips}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
                <p className="text-foreground/70">Motoristas disponíveis</p>
                <p className="font-bold text-foreground">{metrics.drivers_available}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
                <p className="text-foreground/70">Motoristas ocupados</p>
                <p className="font-bold text-foreground">{metrics.drivers_busy}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
                <p className="text-foreground/70">À espera de motorista</p>
                <p className="font-bold text-foreground">{metrics.trips_requested}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
                <p className="text-foreground/70">Em viagem</p>
                <p className="font-bold text-foreground">{metrics.trips_ongoing}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
                <p className="text-foreground/70">Concluídas hoje</p>
                <p className="font-bold text-foreground">{metrics.trips_completed_today}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card sm:col-span-2">
                <p className="text-foreground/70">Total criadas / aceites / concluídas</p>
                <p className="font-bold text-foreground">
                  {metrics.trips_created_total} / {metrics.trips_accepted_total} /{' '}
                  {metrics.trips_completed_total}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-foreground/75">Carregar métricas...</p>
          )}

          {metrics ? (
            <p className="text-sm text-foreground/80 -mt-2">
              Os totais são agregados. Para ver{' '}
              <span className="font-medium text-foreground">viagens concluídas / canceladas</span> em lista:{' '}
              <button
                type="button"
                className="text-info underline font-medium"
                onClick={() => syncAdminUrl({ tab: 'trips', tripId: null, tripsList: 'history' })}
              >
                Viagens → Histórico
              </button>{' '}
              (últimas 50).
            </p>
          ) : null}

          <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-foreground">Operação (uso + alertas)</h3>
              <button
                type="button"
                onClick={() => void fetchUsage()}
                className="px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40"
              >
                Atualizar
              </button>
            </div>
            {usage ? (
              <>
                {(usage.alerts.zero_drivers_available || usage.alerts.zero_trips_today) && (
                  <div className="text-sm text-warning bg-warning/10 border border-warning/20 px-3 py-2 rounded-lg">
                    <p className="font-medium">Alertas</p>
                    <ul className="list-disc pl-5">
                      {usage.alerts.zero_drivers_available && <li>Zero motoristas disponíveis</li>}
                      {usage.alerts.zero_trips_today && <li>Zero viagens criadas hoje</li>}
                    </ul>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Weekly report</p>
                  {usage.weekly.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-foreground/70">
                            <th className="py-1 pr-2">Semana</th>
                            <th className="py-1 pr-2">Criadas</th>
                            <th className="py-1">Concluídas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usage.weekly.map((r) => (
                            <tr key={r.week_start} className="border-t border-border/60">
                              <td className="py-1 pr-2 font-mono text-xs">{r.week_start.slice(0, 10)}</td>
                              <td className="py-1 pr-2">{r.trips_created}</td>
                              <td className="py-1">{r.trips_completed}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Carregar uso...</p>
            )}
          </div>
        </section>
      )}

      {tab === 'ops' && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Operações</h2>
          <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">FASE 0 — Pronto para testes</p>
              <button
                type="button"
                onClick={handleFetchPhase0}
                disabled={!!opsLoading}
                className="px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 disabled:opacity-50"
              >
                {opsLoading === 'phase0' ? 'A verificar…' : 'Verificar'}
              </button>
            </div>
            {phase0 ? (
              <div className="text-sm space-y-1">
                <p className="text-foreground/80">
                  ENV={phase0.env} · ENVIRONMENT={String(phase0.environment ?? '') || '—'} · request_id={phase0.request_id || '—'}
                </p>
                <ul className="list-disc pl-5 text-foreground/80">
                  <li>CRON_SECRET set: {phase0.cron_secret_set ? 'sim' : 'não'}</li>
                  <li>STRIPE_WEBHOOK_SECRET set: {phase0.stripe_webhook_secret_set ? 'sim' : 'não'}</li>
                  <li>STRIPE_MOCK: {phase0.stripe_mock ? 'sim' : 'não'}</li>
                  <li>BETA_MODE: {phase0.beta_mode ? 'sim' : 'não'}</li>
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Carrega “Verificar” para ver readiness.</p>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Cron (admin-only)</p>
              <button
                type="button"
                onClick={handleRunCronNow}
                disabled={!!opsLoading || !isSuperAdminSession}
                title={
                  !isSuperAdminSession
                    ? 'Requer sessão super_admin (mesma regra que na API).'
                    : undefined
                }
                className="px-3 py-1.5 bg-warning/20 text-warning rounded-xl font-medium disabled:opacity-50"
              >
                {opsLoading === 'cron' ? 'A correr…' : 'Correr cron agora'}
              </button>
            </div>
            {cronRun ? (
              <div className="text-sm space-y-1">
                <p className="text-foreground/80">
                  status={cronRun.status} · duration_ms={cronRun.duration_ms} · error_count={cronRun.error_count} · request_id=
                  {cronRun.request_id || '—'}
                </p>
                {cronRun.error_count > 0 ? (
                  <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto">
                    {JSON.stringify(cronRun.errors, null, 2)}
                  </pre>
                ) : (
                  <p className="text-foreground/75">Sem erros.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Executa para validar timeouts/offers/cleanup/health.</p>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Validar .env (não guarda segredos)</p>
              <button
                type="button"
                onClick={() => setEnvReveal((v) => !v)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground hover:bg-muted/40"
              >
                {envReveal ? 'Ocultar valores sensíveis' : 'Mostrar para editar'}
              </button>
            </div>
            {!envReveal ? (
              <textarea
                readOnly
                value={envText ? maskSensitiveEnvDisplay(envText) : ''}
                placeholder="Cola aqui o .env. Valores sensíveis aparecem mascarados até carregares em «Mostrar para editar»."
                className="w-full min-h-28 px-3 py-2 border rounded-lg text-sm font-mono bg-muted/20 text-foreground"
              />
            ) : (
              <textarea
                value={envText}
                onChange={(e) => setEnvText(e.target.value)}
                placeholder="Cola aqui o .env (key=value). Isto só valida; não guarda."
                className="w-full min-h-28 px-3 py-2 border rounded-lg text-sm font-mono"
              />
            )}
            {!envReveal ? (
              <p className="text-xs text-muted-foreground">
                Modo seguro: chaves com TOKEN/SECRET/PASSWORD/etc. mostram valor oculto no ecrã.
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleValidateEnv}
                disabled={!!opsLoading || !envText.trim() || !isSuperAdminSession}
                title={
                  !isSuperAdminSession
                    ? 'Validar .env na API exige super_admin (dados sensíveis).'
                    : undefined
                }
                className="px-3 py-1.5 bg-info/20 text-info rounded-xl font-medium disabled:opacity-50"
              >
                {opsLoading === 'env-validate' ? 'A validar…' : 'Validar'}
              </button>
              {envValidate ? (
                <span className="text-xs text-foreground/70">
                  request_id={envValidate.request_id || '—'} · missing={envValidate.missing_required_keys.length} · ignored_lines=
                  {envValidate.ignored_lines}
                </span>
              ) : null}
            </div>
            {envValidate ? (
              envValidate.missing_required_keys.length > 0 ? (
                <div className="text-sm text-warning bg-warning/10 border border-warning/20 px-3 py-2 rounded-lg">
                  <p className="font-medium">Faltam chaves obrigatórias</p>
                  <ul className="list-disc pl-5">
                    {envValidate.missing_required_keys.map((k) => (
                      <li key={k} className="font-mono text-xs">
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-sm text-success bg-success/10 border border-success/20 px-3 py-2 rounded-lg">
                  OK — chaves obrigatórias presentes.
                </div>
              )
            ) : null}
          </div>

          <div className="space-y-3">
            {!isSuperAdminSession ? (
              <p className="text-xs text-muted-foreground rounded-xl border border-border/80 bg-muted/15 px-3 py-2 leading-relaxed">
                <span className="font-medium text-foreground/90">Operação:</span> os três botões abaixo chamam rotas{' '}
                <code className="font-mono text-[11px]">/admin/run-timeouts</code>,{' '}
                <code className="font-mono text-[11px]">/admin/run-offer-expiry</code> e{' '}
                <code className="font-mono text-[11px]">/admin/export-logs</code> — na API só{' '}
                <code className="font-mono text-[11px]">super_admin</code>. Usa sessão elevada ou pede a quem a tenha.
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleRunTimeouts}
              disabled={!!opsLoading || !isSuperAdminSession}
              title={!isSuperAdminSession ? 'Requer sessão super_admin.' : undefined}
              className="w-full min-h-11 px-4 py-3 bg-warning/20 text-warning rounded-lg font-medium disabled:opacity-50 touch-manipulation"
            >
              {opsLoading === 'timeouts' ? 'A executar...' : 'Executar timeouts'}
            </button>
            <button
              type="button"
              onClick={handleRunOfferExpiry}
              disabled={!!opsLoading || !isSuperAdminSession}
              title={!isSuperAdminSession ? 'Requer sessão super_admin.' : undefined}
              className="w-full min-h-11 px-4 py-3 bg-warning/20 text-warning rounded-lg font-medium disabled:opacity-50 touch-manipulation"
            >
              {opsLoading === 'offer-expiry' ? 'A executar...' : 'Expirar ofertas e redispatch'}
            </button>
            <button
              type="button"
              onClick={handleExportLogs}
              disabled={!!opsLoading || !isSuperAdminSession}
              title={!isSuperAdminSession ? 'Requer sessão super_admin.' : undefined}
              className="w-full min-h-11 px-4 py-3 bg-info/20 text-info rounded-lg font-medium disabled:opacity-50 touch-manipulation"
            >
              {opsLoading === 'export' ? 'A exportar...' : 'Exportar logs CSV'}
            </button>

            {isSuperAdminSession ? (
              <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-4 shadow-card space-y-3">
                <p className="text-sm font-medium text-foreground">Reconciliar pagamentos (super_admin)</p>
                <p className="text-xs text-muted-foreground">
                  Pares <span className="font-mono">trip.completed</span> + <span className="font-mono">payment.processing</span>
                  : pré-visualizar, alinhar com Stripe (se existir PI), ou fechar como failed quando não há PI. Com auditoria
                  (motivo SP-F). Em ambiente com <span className="font-mono">STRIPE_MOCK</span>, o Stripe sync não chama a API
                  externa.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleReconcilePreview()}
                    disabled={!!opsLoading}
                    className="px-3 py-1.5 bg-card border border-border text-foreground/90 text-xs font-medium rounded-xl hover:bg-muted/40 disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-preview' ? 'A carregar…' : 'Pré-visualizar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileStripeSync(true)}
                    disabled={!!opsLoading}
                    className="px-3 py-1.5 bg-info/20 text-info text-xs font-medium rounded-xl disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-stripe-dry' ? '…' : 'Stripe sync (dry-run)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileStripeSync(false)}
                    disabled={!!opsLoading}
                    className="px-3 py-1.5 bg-warning/25 text-warning text-xs font-medium rounded-xl disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-stripe-run' ? '…' : 'Stripe sync (aplicar)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileCloseNoPi(true)}
                    disabled={!!opsLoading}
                    className="px-3 py-1.5 bg-card border border-border text-foreground/90 text-xs font-medium rounded-xl hover:bg-muted/40 disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-close-dry' ? '…' : 'Fechar sem PI (dry-run)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileCloseNoPi(false)}
                    disabled={!!opsLoading}
                    className="px-3 py-1.5 bg-destructive/20 text-destructive text-xs font-medium rounded-xl disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-close-run' ? '…' : 'Fechar sem PI (aplicar)'}
                  </button>
                </div>
                {reconcilePreview ? (
                  <div className="space-y-2">
                    <p className="text-xs text-foreground/80">
                      candidatos={reconcilePreview.count} · request_id={reconcilePreview.request_id ?? '—'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyAdminClipboard('SQL', reconcilePreview.select_sql)}
                        className="px-2 py-1 text-xs rounded-lg border border-border bg-background hover:bg-muted/40"
                      >
                        Copiar SQL
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void copyAdminClipboard('JSON', JSON.stringify(reconcilePreview.candidates, null, 2))
                        }
                        className="px-2 py-1 text-xs rounded-lg border border-border bg-background hover:bg-muted/40"
                      >
                        Copiar candidatos (JSON)
                      </button>
                    </div>
                    <pre className="text-xs text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {reconcilePreview.select_sql}
                    </pre>
                  </div>
                ) : null}
                {reconcileRun ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <p className="text-xs font-medium text-foreground/90">Última execução POST</p>
                      <button
                        type="button"
                        onClick={() => void copyAdminClipboard('resposta', JSON.stringify(reconcileRun, null, 2))}
                        className="px-2 py-1 text-xs rounded-lg border border-border bg-background hover:bg-muted/40"
                      >
                        Copiar JSON
                      </button>
                    </div>
                    <pre className="text-xs text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(reconcileRun, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Pagamentos em processing (saúde)</p>
                <button
                  type="button"
                  onClick={() => void fetchHealth()}
                  disabled={!!opsLoading}
                  className="px-3 py-1.5 bg-card border border-border text-foreground/80 text-xs rounded-xl hover:bg-muted/40 disabled:opacity-50"
                >
                  Actualizar saúde
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Dados da mesma leitura que a tab Saúde. Links Stripe só com <span className="font-mono">pi_…</span>{' '}
                (abre dashboard; não expõe segredos).
              </p>
              {health && health.stuck_payments.length > OPS_STUCK_PAYMENTS_PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-foreground/85">
                  <span>
                    A mostrar{' '}
                    <span className="font-medium tabular-nums">
                      {opsStuckPaymentsPageData.from}–{opsStuckPaymentsPageData.to}
                    </span>{' '}
                    de {opsStuckPaymentsPageData.total} · página{' '}
                    <span className="font-mono tabular-nums">
                      {opsStuckPaymentsPage + 1}/{opsStuckPaymentsPageData.maxPage + 1}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={opsStuckPaymentsPage <= 0}
                      onClick={() => setOpsStuckPaymentsPage((p) => Math.max(0, p - 1))}
                      className="px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={opsStuckPaymentsPage >= opsStuckPaymentsPageData.maxPage}
                      onClick={() =>
                        setOpsStuckPaymentsPage((p) =>
                          Math.min(opsStuckPaymentsPageData.maxPage, p + 1)
                        )
                      }
                      className="px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Seguinte
                    </button>
                  </span>
                </div>
              ) : null}
              {!health ? (
                <p className="text-xs text-muted-foreground">A carregar saúde…</p>
              ) : health.stuck_payments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum pagamento stuck nesta leitura.</p>
              ) : (
                <ul className="space-y-2">
                  {opsStuckPaymentsPageData.slice.map((row, i) => {
                    const tid = tripIdFromHealthRow(row)
                    const piRaw = row.stripe_payment_intent_id
                    const pi = typeof piRaw === 'string' && piRaw.startsWith('pi_') ? piRaw.trim() : null
                    const stripeUrls = pi ? stripePaymentIntentDashboardUrls(pi) : null
                    const rowKey = String(row.id ?? row.trip_id ?? `idx-${opsStuckPaymentsPage}-${i}`)
                    return (
                      <li
                        key={`stuck-pay-${opsStuckPaymentsPage}-${rowKey}`}
                        className="rounded-lg border border-border/80 bg-background p-3 space-y-2"
                      >
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                          {tid ? (
                            <button
                              type="button"
                              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90"
                              onClick={() => syncAdminUrl({ tab: 'trips', tripId: tid })}
                            >
                              Abrir em Viagens
                            </button>
                          ) : null}
                          {stripeUrls ? (
                            <span className="flex flex-wrap gap-2 text-xs">
                              <a
                                href={stripeUrls.live}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-info underline underline-offset-2"
                              >
                                Stripe (live)
                              </a>
                              <a
                                href={stripeUrls.test}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-info underline underline-offset-2"
                              >
                                Stripe (test)
                              </a>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem PaymentIntent na API ainda.</span>
                          )}
                        </div>
                        <pre className="text-xs text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-28 overflow-y-auto">
                          {JSON.stringify(row, null, 2)}
                        </pre>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Recuperar motorista</p>
                <button
                  type="button"
                  onClick={() => void fetchHealth()}
                  disabled={!!opsLoading}
                  className="px-3 py-1.5 bg-card border border-border text-foreground/80 text-xs rounded-xl hover:bg-muted/40 disabled:opacity-50"
                >
                  Actualizar saúde
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Força <span className="font-mono">is_available=true</span> para motorista bloqueado (sem viagem ativa).
                Lista a partir de <strong>saúde</strong> — motoristas offline há muito sem viagem.
              </p>
              {!health ? (
                <p className="text-xs text-muted-foreground">A carregar saúde…</p>
              ) : health.drivers_unavailable_too_long.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sem candidatos nesta leitura. Se o caso não aparecer, usa UUID manual abaixo.
                </p>
              ) : (
                <ul className="space-y-2">
                  {health.drivers_unavailable_too_long
                    .map((row, i) => {
                      const did = driverIdFromHealthUnavailableRow(row)
                      return did ? { did, i } : null
                    })
                    .filter((x): x is { did: string; i: number } => x !== null)
                    .map(({ did, i }) => (
                      <li
                        key={`recover-suggest-${did}-${i}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-background px-3 py-2"
                      >
                        <span className="font-mono text-xs text-foreground/90">{did.slice(0, 8)}…</span>
                        <button
                          type="button"
                          onClick={() => void runRecoverDriver(did)}
                          disabled={opsLoading === 'recover'}
                          className="px-3 py-1.5 bg-success text-success-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                        >
                          Recuperar
                        </button>
                      </li>
                    ))}
                </ul>
              )}
              <details className="rounded-lg border border-border/80 bg-muted/15 px-3 py-2">
                <summary className="text-xs cursor-pointer text-foreground/80 font-medium">
                  UUID manual (casos raros)
                </summary>
                <p className="text-xs text-muted-foreground mt-2 mb-2">
                  Só quando o motorista não aparece na lista de saúde.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recoverDriverId}
                    onChange={(e) => setRecoverDriverId(e.target.value)}
                    placeholder="driver_id (UUID)"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleRecoverDriver}
                    disabled={!!opsLoading || !recoverDriverId.trim()}
                    className="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm disabled:opacity-50"
                  >
                    Recuperar
                  </button>
                </div>
              </details>
            </div>
          </div>
        </section>
      )}

      {tab === 'health' && (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
            <h2 className="text-lg font-semibold text-foreground">Saúde do sistema</h2>
            <button
              type="button"
              onClick={() => fetchHealth()}
              className="min-h-11 w-full px-4 py-2.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 sm:w-auto shrink-0"
            >
              Atualizar
            </button>
          </div>
          {health ? (
            <div className="space-y-3">
              {countHealthSignalRows(health) + health.warnings.length > 0 ? (
                <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-foreground flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>Há anomalias ou avisos.</strong> Expande «O que é · O que fazer» em cada bloco abaixo.
                  </span>
                  <button
                    type="button"
                    onClick={() => syncAdminUrl({ tab: 'ops', tripId: null })}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-muted/40"
                  >
                    Ir para Operações (cron / recuperar)
                  </button>
                </div>
              ) : null}
              <p
                className={`font-medium ${
                  health.status === 'ok' ? 'text-success' : 'text-warning'
                }`}
              >
                Status: {health.status}
              </p>
              {health.warnings.length > 0 && (
                <ul className="text-sm text-warning space-y-1">
                  {health.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              <HealthAnomalyBlock
                key={healthBlockKey('accepted', health.trips_accepted_too_long)}
                title="Viagens accepted há muito"
                rows={health.trips_accepted_too_long}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_TRIPS_ACCEPTED_LONG}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('ongoing', health.trips_ongoing_too_long)}
                title="Viagens ongoing há muito"
                rows={health.trips_ongoing_too_long}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_TRIPS_ONGOING_LONG}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('offline', health.drivers_unavailable_too_long)}
                title="Motoristas offline há muito (sem viagem ativa)"
                rows={health.drivers_unavailable_too_long}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_DRIVERS_UNAVAILABLE}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('stuck_pi', health.stuck_payments)}
                title="Pagamentos bloqueados (processing)"
                rows={health.stuck_payments}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
                pageSize={25}
                playbook={PB_STUCK_PAYMENTS}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('missing_pay', health.missing_payment_records ?? [])}
                title="Viagens sem registo de pagamento"
                rows={health.missing_payment_records ?? []}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
                playbook={PB_MISSING_PAYMENT}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('inconsistent', health.inconsistent_financial_state ?? [])}
                title="Estado financeiro inconsistente"
                rows={health.inconsistent_financial_state ?? []}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
                pageSize={25}
                playbook={PB_INCONSISTENT_FINANCIAL}
              />
              {health.status === 'ok' &&
                health.warnings.length === 0 &&
                health.trips_accepted_too_long.length === 0 &&
                health.trips_ongoing_too_long.length === 0 &&
                health.drivers_unavailable_too_long.length === 0 &&
                health.stuck_payments.length === 0 &&
                (health.missing_payment_records ?? []).length === 0 &&
                (health.inconsistent_financial_state ?? []).length === 0 && (
                  <p className="text-foreground/75">Tudo OK.</p>
                )}
            </div>
          ) : (
            <p className="text-foreground/75">Carregar saúde...</p>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Gestão de Utilizadores</h2>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            SP-F: <strong className="text-foreground/90">Eliminar conta</strong> e{' '}
            <strong className="text-foreground/90">Bloquear seleccionados</strong> exigem utilizador com papel{' '}
            <code className="text-foreground/90">super_admin</code> na BD e motivo de auditoria (prompt ao confirmar).
          </p>
          {users.length === 0 ? (
            <p className="text-muted-foreground">Nenhum utilizador.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[12rem]">
                    <label className="text-xs text-muted-foreground">Filtrar</label>
                    <input
                      type="search"
                      value={usersFilter}
                      onChange={(e) => setUsersFilter(e.target.value)}
                      placeholder="Nome, telefone, papel…"
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Ordenar</label>
                    <select
                      value={usersSort}
                      onChange={(e) => setUsersSort(e.target.value as 'name' | 'role' | 'status')}
                      className="block mt-1 px-3 py-2 border rounded-lg text-sm bg-background"
                    >
                      <option value="name">Nome</option>
                      <option value="role">Papel</option>
                      <option value="status">Estado</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                  <span>
                    A mostrar {filteredSortedUsers.length} de {users.length} carregados
                    {usersHasMore ? ' (há mais na BD)' : ''}.
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchUsersMore()}
                    disabled={!usersHasMore || usersLoadingMore}
                    className="px-3 py-1.5 bg-card border border-border text-foreground text-xs rounded-lg hover:bg-muted/40 disabled:opacity-50"
                  >
                    {usersLoadingMore ? 'A carregar…' : 'Carregar mais 50'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selectable = filteredSortedUsers.filter((u) => !isBackofficeStaffRole(u.role))
                      const next: Record<string, boolean> = { ...bulkSelectedIds }
                      for (const u of selectable) next[u.id] = true
                      setBulkSelectedIds(next)
                    }}
                    className="px-3 py-1.5 bg-muted text-foreground text-xs rounded-lg hover:opacity-90"
                  >
                    Seleccionar filtrados (sem admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkSelectedIds({})}
                    className="px-3 py-1.5 bg-muted text-foreground text-xs rounded-lg hover:opacity-90"
                  >
                    Limpar selecção
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkBlock()}
                    disabled={Object.keys(bulkSelectedIds).filter((id) => bulkSelectedIds[id]).length === 0}
                    className="px-3 py-1.5 bg-warning text-warning-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                  >
                    Bloquear seleccionados (reversível)
                  </button>
                </div>
              </div>
              <ul className="space-y-3">
                {filteredSortedUsers.map((u) => (
                  <li
                    key={u.id}
                    className="bg-card border border-border rounded-2xl px-4 py-3 shadow-card hover:bg-muted/30 transition-colors"
                  >
                    {editingId === u.id ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-background/60 p-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                            Nome (alcunha)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Valor quando abriste a edição:{' '}
                            <span className="font-mono text-foreground/90">{editOriginalName || '—'}</span>
                          </p>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Nome ou alcunha"
                            className="w-full px-3 py-2 border rounded-lg text-base bg-background"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveUserName()}
                            className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90"
                          >
                            Guardar só o nome
                          </button>
                        </div>
                        <div className="rounded-xl border border-border bg-background/60 p-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Telefone</p>
                          <p className="text-xs text-muted-foreground">
                            Valor quando abriste a edição:{' '}
                            <span className="font-mono text-foreground/90">{editOriginalPhone}</span>
                          </p>
                          <p className="text-xs text-warning">
                            Mudar o telefone afecta o login (OTP / BETA). Confirma com a palavra indicada no aviso.
                          </p>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="+351912345678"
                            className="w-full px-3 py-2 border rounded-lg text-base bg-background"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveUserPhone()}
                            className="px-3 py-1.5 bg-warning text-warning-foreground text-sm font-medium rounded-lg hover:opacity-90"
                          >
                            Guardar só o telefone
                          </button>
                        </div>
                        <div className="rounded-xl border border-border bg-background/60 p-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                            Palavra-passe (login BETA)
                          </p>
                          {isSuperAdminSession ? (
                            <>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Acção dedicada: remove o hash da palavra-passe para o utilizador voltar ao fluxo por
                                defeito. Não mistura com nome nem telefone — vais confirmar com{' '}
                                <code className="rounded bg-muted px-1 py-0.5 text-foreground/90">LIMPAR_SENHA</code> e
                                um motivo de auditoria (≥10 caracteres).
                              </p>
                              <button
                                type="button"
                                onClick={() => void handleClearUserPassword(editingId)}
                                className="px-3 py-1.5 bg-muted text-foreground text-sm rounded-lg border border-border hover:bg-muted/80"
                              >
                                Repor palavra-passe a pedido…
                              </button>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Só uma sessão <code className="text-foreground/90">super_admin</code> pode repor a
                              palavra-passe BETA. O teu papel actual não inclui esta acção.
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-lg"
                        >
                          Fechar edição
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex gap-3 min-w-0">
                            {!isBackofficeStaffRole(u.role) ? (
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 shrink-0"
                                checked={!!bulkSelectedIds[u.id]}
                                onChange={(e) =>
                                  setBulkSelectedIds((m) => ({
                                    ...m,
                                    [u.id]: e.target.checked,
                                  }))
                                }
                                aria-label={`Seleccionar ${u.name || u.phone}`}
                              />
                            ) : (
                              <span className="w-4 shrink-0" aria-hidden />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">
                                {u.name || u.phone}
                                {u.name && u.name !== u.phone && (
                                  <span className="text-muted-foreground text-sm ml-1">({u.phone})</span>
                                )}
                                {!u.name && <span className="text-muted-foreground text-sm ml-1">—</span>}
                              </p>
                              <p className="text-sm text-muted-foreground">{u.phone}</p>
                              <p className="text-xs text-muted-foreground">
                                {u.role} · {u.status}
                                {u.has_driver_profile && ' · motorista'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {u.role === 'passenger' && (
                              <button
                                type="button"
                                onClick={() => handlePromote(u.id)}
                                className="px-2 py-1 bg-success text-success-foreground text-xs rounded hover:opacity-90"
                              >
                                Motorista
                              </button>
                            )}
                            {u.role === 'driver' && (
                              <button
                                type="button"
                                onClick={() => handleDemote(u.id)}
                                className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded hover:opacity-90"
                              >
                                Passageiro
                              </button>
                            )}
                            {!isBackofficeStaffRole(u.role) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(u)}
                                  className="px-2 py-1 bg-info text-info-foreground text-xs rounded hover:opacity-90"
                                >
                                  Editar
                                </button>
                                {u.status === 'blocked' ? (
                                  unblockConfirmId === u.id ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void handleUnblockUser(u.id)}
                                        className="px-2 py-1 bg-success text-success-foreground text-xs rounded"
                                      >
                                        Confirmar desbloqueio
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setUnblockConfirmId(null)}
                                        className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                                      >
                                        Cancelar
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBlockConfirmId(null)
                                        setUnblockConfirmId(u.id)
                                      }}
                                      className="px-2 py-1 bg-success/90 text-success-foreground text-xs rounded hover:opacity-90"
                                    >
                                      Desbloquear
                                    </button>
                                  )
                                ) : blockConfirmId === u.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => void handleBlockUser(u.id)}
                                      className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded"
                                    >
                                      Confirmar bloqueio
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setBlockConfirmId(null)}
                                      className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUnblockConfirmId(null)
                                      setBlockConfirmId(u.id)
                                    }}
                                    className="px-2 py-1 bg-warning/80 text-foreground text-xs rounded hover:opacity-90"
                                  >
                                    Bloquear
                                  </button>
                                )}
                                {deleteConfirmId === u.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(u.id)}
                                      className="px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded"
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(u.id)}
                                    className="px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded hover:opacity-90"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {!isBackofficeStaffRole(u.role) && (
                      <details
                        className="mt-3 rounded-xl border border-border/80 bg-background/40 px-3 py-2"
                        onToggle={async (e) => {
                          const el = e.currentTarget
                          if (!el.open || !token) return
                          if (userAuditRows[u.id] !== undefined) return
                          setUserAuditLoading(u.id)
                          setUserAuditError((m) => {
                            const next = { ...m }
                            delete next[u.id]
                            return next
                          })
                          try {
                            const rows = await getAdminAuditTrail(token, {
                              entity_type: 'user',
                              entity_id: u.id,
                              limit: 50,
                            })
                            setUserAuditRows((m) => ({ ...m, [u.id]: rows }))
                          } catch {
                            setUserAuditError((m) => ({
                              ...m,
                              [u.id]: 'Não foi possível carregar o trilho.',
                            }))
                          } finally {
                            setUserAuditLoading(null)
                          }
                        }}
                      >
                        <summary className="cursor-pointer text-xs font-medium text-foreground select-none">
                          Trilho admin (identidade · SP-E)
                        </summary>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                          Eventos <code className="text-foreground/90">admin.*</code> em que este utilizador é a entidade
                          (últimos 50). Útil para rever alterações de nome, telefone ou bloqueio.
                        </p>
                        {userAuditLoading === u.id ? (
                          <p className="mt-2 text-xs text-muted-foreground">A carregar…</p>
                        ) : null}
                        {userAuditError[u.id] ? (
                          <p className="mt-2 text-xs text-destructive">{userAuditError[u.id]}</p>
                        ) : null}
                        {userAuditRows[u.id] !== undefined && userAuditLoading !== u.id ? (
                          userAuditRows[u.id].length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">Sem eventos registados.</p>
                          ) : (
                            <ul className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                              {userAuditRows[u.id].map((row) => (
                                <li
                                  key={row.id}
                                  className="rounded-lg border border-border/70 bg-card/50 p-2 text-xs space-y-1"
                                >
                                  <p className="font-medium text-foreground">{row.event_type}</p>
                                  <p className="text-muted-foreground">{row.occurred_at}</p>
                                  <pre className="text-[11px] text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                                    {JSON.stringify(row.payload, null, 2)}
                                  </pre>
                                </li>
                              ))}
                            </ul>
                          )
                        ) : null}
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}
