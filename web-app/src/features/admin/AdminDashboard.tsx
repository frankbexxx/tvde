import { useCallback, useEffect, useMemo, useState } from 'react'
import { isBackofficeStaffRole, useAuth } from '../../context/AuthContext'
import { AdminTripPaymentOpsNotePanel } from './AdminTripPaymentOpsNotePanel'
import {
  adminErrDetail,
  approvedDriverDocs,
  countHealthSignalRows,
  docsApprovedCount,
  emptyDriverDocs,
  healthRowTimestamp,
  maskSensitiveEnvDisplay,
  promptGovernanceReason,
  sessionJwtIsSuperAdmin,
  tripDetailEligibleSinglePaymentReconcile,
} from './adminDashboardHelpers'
import { type AdminDashboardTab } from './adminDashboardQuery'
import { useAdminDashboardNavigation } from './useAdminDashboardNavigation'
import { useAdminTripLists } from './useAdminTripLists'
import { useAdminTripDetailActions } from './useAdminTripDetailActions'
import { useAdminSystemPanels } from './useAdminSystemPanels'
import { useAdminAlertsAndAudit } from './useAdminAlertsAndAudit'
import { useAdminUsersDirectory } from './useAdminUsersDirectory'
import { driverIdFromHealthUnavailableRow, tripIdFromHealthRow } from './healthTripLinks'
import { stripePaymentIntentDashboardUrls } from '../../utils/stripeDashboard'
import { formatRelativeAgo, minutesSince } from '../../utils/relativeTime'
import { apiFetch } from '../../api/client'
import { parseJwtPayload } from '../../utils/jwt'
import {
  recoverDriver,
  exportLogsCsv,
  runAdminCron,
  validateEnvText,
  createPartner,
  createPartnerOrgAdmin,
  assignDriverToPartner,
  unassignDriverFromPartner,
  listPartners,
  listDrivers,
  getReconcilePaymentsPreview,
  postReconcilePaymentsStripeSync,
  postReconcilePaymentsCloseNoPi,
} from '../../api/admin'
import { CancellationReasonMuted } from '../../components/trips/CancellationReasonMuted'
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

type Tab = AdminDashboardTab
const ADMIN_DRIVER_DOCS_REGISTRY_KEY = 'tvde_admin_driver_docs_registry_v1'

const DRIVER_DOC_STATUSES = ['missing', 'pending_review', 'approved', 'rejected', 'expired'] as const

/** Operações — lista «Pagamentos em processing» da saúde (evita lista infinita). */
const OPS_STUCK_PAYMENTS_PAGE_SIZE = 10

const ADMIN_TRIP_CANCEL_STATUSES = ['requested', 'assigned', 'accepted'] as const

async function copyAdminClipboard(label: string, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    window.alert(`${label} copiado para a área de transferência.`)
  } catch {
    window.prompt(`Copiar ${label} (Ctrl+C):`, text)
  }
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
            className={`inline-flex items-center justify-center min-h-11 touch-manipulation px-2 py-1.5 text-xs rounded-lg border ${sortRecent
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
            className={`inline-flex items-center justify-center min-h-11 touch-manipulation px-2 py-1.5 text-xs rounded-lg border ${!sortRecent
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
  const { tab, tripsListMode, selectedTripId, syncAdminUrl, selectTripsListMode } =
    useAdminDashboardNavigation()
  const { activeTrips, historyTrips, historyTripsError, fetchActiveTrips, fetchHistoryTrips } =
    useAdminTripLists(token)
  const [pending, setPending] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [opsLoading, setOpsLoading] = useState<string | null>(null)
  const {
    metrics,
    usage,
    health,
    phase0,
    fetchMetrics,
    fetchUsage,
    fetchHealth,
    handleFetchPhase0,
    handleRunTimeouts,
    handleRunOfferExpiry,
  } = useAdminSystemPanels({ token, setError, setOpsLoading, fetchActiveTrips })
  const {
    adminAlerts,
    fetchAdminAlerts,
    userAuditRows,
    userAuditLoading,
    userAuditError,
    invalidateUserAudit,
    loadUserAuditTrailIfNeeded,
  } = useAdminAlertsAndAudit(token)
  const {
    users,
    editingId,
    editName,
    editPhone,
    editOriginalName,
    editOriginalPhone,
    deleteConfirmId,
    usersHasMore,
    usersLoadingMore,
    usersSort,
    usersFilter,
    bulkSelectedIds,
    blockConfirmId,
    unblockConfirmId,
    setEditName,
    setEditPhone,
    setUsersSort,
    setUsersFilter,
    setBulkSelectedIds,
    setDeleteConfirmId,
    setBlockConfirmId,
    setUnblockConfirmId,
    fetchUsers,
    fetchUsersMore,
    filteredSortedUsers,
    driverUsers,
    startEdit,
    cancelEdit,
    handleSaveUserName,
    handleSaveUserPhone,
    handleDelete,
    handleBlockUser,
    handleUnblockUser,
    handleClearUserPassword,
    handleBulkBlock,
    handlePromote,
    handleDemote,
  } = useAdminUsersDirectory({ token, tab, setError, setLoading, invalidateUserAudit })
  const [driverDocsRegistry, setDriverDocsRegistry] = useState<Record<string, DriverDocumentsState['docs']>>({})
  const [docsStatusFilter, setDocsStatusFilter] = useState<'all' | DriverDocumentStatus>('all')

  const canPostPaymentOpsNote = useMemo(
    () => isBackofficeStaffRole(parseJwtPayload(token ?? '')?.role ?? ''),
    [token]
  )

  const [recoverDriverId, setRecoverDriverId] = useState('')
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

  const {
    tripDetail,
    tripDetailLoading,
    tripDebug,
    tripDebugId,
    tripActionLoading,
    paymentOpsNoteText,
    setPaymentOpsNoteText,
    fetchTripDebug,
    handleReconcileSingleTripPayment,
    handlePaymentOpsNote,
    handleAssignTrip,
    handleCancelTrip,
    handleAdminTripTransition,
  } = useAdminTripDetailActions({
    token,
    selectedTripId,
    syncAdminUrl,
    fetchActiveTrips,
    fetchHealth,
    setError,
  })

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
              className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === id
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
            className={`font-mono font-medium ${isSuperAdminSession ? 'text-foreground' : 'text-warning'
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
                  className={`rounded-2xl border px-4 py-3 shadow-card ${degraded
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
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${docsStatusFilter === st
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
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${docsStatusFilter === 'all'
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
                                    className={`rounded border px-1.5 py-0.5 text-[10px] ${docs[doc] === st
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
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-success text-success-foreground text-sm font-medium rounded-lg hover:opacity-90"
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
              className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 disabled:opacity-50"
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
              className={`inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 rounded-xl text-sm font-medium border ${tripsListMode === 'active'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
                }`}
            >
              Activas
            </button>
            <button
              type="button"
              onClick={() => selectTripsListMode('history')}
              className={`inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 rounded-xl text-sm font-medium border ${tripsListMode === 'history'
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
              className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/85 text-sm font-medium rounded-xl hover:bg-muted/40"
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
                  className="shrink-0 inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground text-xs rounded-lg hover:bg-muted/40"
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
                  <CancellationReasonMuted reason={tripDetail.cancellation_reason} className="text-xs" />
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
                      className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning text-warning-foreground text-xs font-medium rounded-lg"
                    >
                      Debug
                    </button>
                    {isSuperAdminSession && tripDetailEligibleSinglePaymentReconcile(tripDetail) ? (
                      <button
                        type="button"
                        onClick={() => void handleReconcileSingleTripPayment(selectedTripId)}
                        disabled={tripActionLoading === `${selectedTripId}-reconcile-pay`}
                        className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-info/25 text-info text-xs font-medium rounded-lg border border-info/30 disabled:opacity-50"
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
                        className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-success text-success-foreground text-xs font-medium rounded-lg disabled:opacity-50"
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
                        className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg disabled:opacity-50"
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
                        className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg disabled:opacity-50"
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
                          className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-medium rounded-lg disabled:opacity-50"
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
                        className={`bg-card border rounded-2xl px-4 py-3 shadow-card hover:bg-muted/30 transition-colors ${stuckAccepted ? 'border-warning/60' : 'border-border'
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
                                <CancellationReasonMuted reason={tripDetail.cancellation_reason} className="text-xs" />
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
                          <CancellationReasonMuted reason={h.cancellation_reason} className="text-xs" />
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
            className="mb-3 inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40"
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
                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40"
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
                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40 disabled:opacity-50"
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
                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning/20 text-warning rounded-xl font-medium disabled:opacity-50"
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
                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground hover:bg-muted/40"
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
                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-info/20 text-info rounded-xl font-medium disabled:opacity-50"
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
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/90 text-xs font-medium rounded-xl hover:bg-muted/40 disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-preview' ? 'A carregar…' : 'Pré-visualizar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileStripeSync(true)}
                    disabled={!!opsLoading}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-info/20 text-info text-xs font-medium rounded-xl disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-stripe-dry' ? '…' : 'Stripe sync (dry-run)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileStripeSync(false)}
                    disabled={!!opsLoading}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning/25 text-warning text-xs font-medium rounded-xl disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-stripe-run' ? '…' : 'Stripe sync (aplicar)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileCloseNoPi(true)}
                    disabled={!!opsLoading}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/90 text-xs font-medium rounded-xl hover:bg-muted/40 disabled:opacity-50"
                  >
                    {opsLoading === 'reconcile-close-dry' ? '…' : 'Fechar sem PI (dry-run)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReconcileCloseNoPi(false)}
                    disabled={!!opsLoading}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-destructive/20 text-destructive text-xs font-medium rounded-xl disabled:opacity-50"
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
                  className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-xs rounded-xl hover:bg-muted/40 disabled:opacity-50"
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
                              className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90"
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
                  className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground/80 text-xs rounded-xl hover:bg-muted/40 disabled:opacity-50"
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
                          className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-success text-success-foreground text-xs font-medium rounded-lg disabled:opacity-50"
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
                    className="shrink-0 inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-muted/40"
                  >
                    Ir para Operações (cron / recuperar)
                  </button>
                </div>
              ) : null}
              <p
                className={`font-medium ${health.status === 'ok' ? 'text-success' : 'text-warning'
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
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-card border border-border text-foreground text-xs rounded-lg hover:bg-muted/40 disabled:opacity-50"
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
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-muted text-foreground text-xs rounded-lg hover:opacity-90"
                  >
                    Seleccionar filtrados (sem admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkSelectedIds({})}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-muted text-foreground text-xs rounded-lg hover:opacity-90"
                  >
                    Limpar selecção
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkBlock()}
                    disabled={Object.keys(bulkSelectedIds).filter((id) => bulkSelectedIds[id]).length === 0}
                    className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning text-warning-foreground text-xs font-medium rounded-lg disabled:opacity-50"
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
                            className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90"
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
                            className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-warning text-warning-foreground text-sm font-medium rounded-lg hover:opacity-90"
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
                                className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-muted text-foreground text-sm rounded-lg border border-border hover:bg-muted/80"
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
                          className="inline-flex items-center justify-center min-h-11 touch-manipulation px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-lg"
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
                          await loadUserAuditTrailIfNeeded(u.id)
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
