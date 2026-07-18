import { useCallback, useEffect, useMemo, useState } from 'react'
import { isBackofficeStaffRole, useAuth } from '../../context/AuthContext'
import {
  adminErrDetail,
  approvedDriverDocs,
  countHealthSignalRows,
  docsApprovedCount,
  emptyDriverDocs,
  promptGovernanceReason,
  sessionJwtIsSuperAdmin,
} from './adminDashboardHelpers'
import {
  ADMIN_DRIVER_DOCS_REGISTRY_KEY,
  DRIVER_DOC_STATUSES,
  OPS_STUCK_PAYMENTS_PAGE_SIZE,
} from './adminConstants'
import { type AdminDashboardTab } from './adminDashboardQuery'
import { useAdminDashboardNavigation } from './useAdminDashboardNavigation'
import { useAdminTripLists } from './useAdminTripLists'
import { useAdminTripDetailActions } from './useAdminTripDetailActions'
import { useAdminSystemPanels } from './useAdminSystemPanels'
import { useAdminAlertsAndAudit } from './useAdminAlertsAndAudit'
import { useAdminUsersDirectory } from './useAdminUsersDirectory'
import { apiFetch } from '../../api/client'
import { parseJwtPayload } from '../../utils/jwt'
import {
  recoverDriver,
  postAdminDrivingRestOverride,
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
import {
  driverDocumentLabel,
  driverDocumentStatusLabel,
  REQUIRED_DRIVER_DOCUMENTS,
  type DriverDocumentStatus,
  type DriverDocumentsState,
} from '../../services/driverDocuments'
import { AdminTabAgora } from './tabs/AdminTabAgora'
import { AdminTabDocs } from './tabs/AdminTabDocs'
import { AdminTabPending } from './tabs/AdminTabPending'
import { AdminTabFrota } from './tabs/AdminTabFrota'
import { AdminTabDados } from './tabs/AdminTabDados'
import { AdminTabTrips } from './tabs/AdminTabTrips'
import { AdminTabMetrics } from './tabs/AdminTabMetrics'
import { AdminTabOps } from './tabs/AdminTabOps'
import { AdminTabHealth } from './tabs/AdminTabHealth'
import { AdminTabUsers } from './tabs/AdminTabUsers'

interface PendingUser {
  phone: string
  requested_role: string
}

type Tab = AdminDashboardTab
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

export function AdminDashboard() {
  const { token } = useAuth()
  const isSuperAdminSession = sessionJwtIsSuperAdmin(token)
  const { tab, tripsListMode, selectedTripId, syncAdminUrl, selectTripsListMode } =
    useAdminDashboardNavigation()
  const { activeTrips, historyTrips, historyTripsError, fetchActiveTrips, fetchHistoryTrips } =
    useAdminTripLists(token)
  /** Wrappers void para props/hooks que esperam Promise<void>; boolean fica para refreshAgora. */
  const fetchActiveTripsVoid = useCallback(async () => {
    await fetchActiveTrips()
  }, [fetchActiveTrips])
  const [pending, setPending] = useState<PendingUser[]>([])
  /** ADMIN-POLL-1: já não bloqueia no dump global de users; tabs carregam on-enter. */
  const [loading, setLoading] = useState(false)
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
  } = useAdminSystemPanels({ token, setError, setOpsLoading, fetchActiveTrips: fetchActiveTripsVoid })
  const fetchMetricsVoid = useCallback(async () => {
    await fetchMetrics()
  }, [fetchMetrics])
  const fetchHealthVoid = useCallback(async () => {
    await fetchHealth()
  }, [fetchHealth])
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
  const [drivingRestDriverId, setDrivingRestDriverId] = useState('')
  const [drivingRestUntilLocal, setDrivingRestUntilLocal] = useState('')
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

  const fetchPending = useCallback(async (): Promise<boolean> => {
    if (!token) return false
    try {
      const data = await apiFetch<PendingUser[]>('/admin/pending-users', { token })
      setPending(data)
      return true
    } catch {
      setPending([])
      return false
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
    fetchActiveTrips: fetchActiveTripsVoid,
    fetchHealth: fetchHealthVoid,
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

  /** ADMIN-POLL-2: async; ok se pelo menos um endpoint responder. */
  const refreshAgora = useCallback(async (): Promise<'ok' | 'error'> => {
    const settled = await Promise.allSettled([
      fetchPending(),
      fetchActiveTrips(),
      fetchMetrics(),
      fetchHealth(),
      fetchAdminAlerts(),
    ])
    const anyOk = settled.some(
      (r) => r.status === 'fulfilled' && r.value === true
    )
    return anyOk ? 'ok' : 'error'
  }, [fetchPending, fetchActiveTrips, fetchMetrics, fetchHealth, fetchAdminAlerts])

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

  const runDrivingRestOverride = async (clear: boolean) => {
    if (!token) return
    const id = drivingRestDriverId.trim()
    if (!id) return
    if (!clear && !drivingRestUntilLocal.trim()) {
      setError('Indica data e hora de fim do repouso (campo local).')
      return
    }
    const gr = promptGovernanceReason(
      clear
        ? 'Motivo para limpar repouso administrativo (driving_rest_until; SP-F, mín. 10 caracteres):'
        : 'Motivo para definir repouso administrativo até à data indicada (SP-F, mín. 10 caracteres):'
    )
    if (!gr) return
    let restUntilIso: string | null = null
    if (!clear) {
      const d = new Date(drivingRestUntilLocal.trim())
      if (Number.isNaN(d.getTime())) {
        setError('Data/hora inválida.')
        return
      }
      restUntilIso = d.toISOString()
    }
    setOpsLoading('driving-rest')
    try {
      await postAdminDrivingRestOverride(id, token, {
        governance_reason: gr,
        rest_until: restUntilIso,
      })
      setError(null)
      await fetchHealth()
      fetchMetrics()
    } catch (err) {
      setError(adminErrDetail(err, 'Erro override repouso TVDE'))
    } finally {
      setOpsLoading(null)
    }
  }

  const handleDrivingRestSet = () => void runDrivingRestOverride(false)
  const handleDrivingRestClear = () => void runDrivingRestOverride(true)

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

  // ADMIN-POLL-1 / BACKEND-DBPOOL-1: sem setInterval global — só on-enter por tab + botões Actualizar.
  useEffect(() => {
    if (!token) return
    if (tab === 'agora') {
      refreshAgora()
    }
    if (tab === 'pending') {
      void fetchPending()
    }
    if (tab === 'users' || tab === 'docs') {
      void fetchUsers()
    }
    if (tab === 'trips') {
      if (tripsListMode === 'active') void fetchActiveTrips()
      else void fetchHistoryTrips()
    }
    if (tab === 'metrics') {
      void fetchMetrics()
      void fetchUsage()
    }
    if (tab === 'health') void fetchHealth()
    if (tab === 'ops') void fetchHealth()
    if (tab === 'dados') void fetchDataVisibility()
    if (tab === 'frota') void ensureDataLoaded()
    // Tab-driven fetches; fetchDataVisibility / fetchUsage / ensureDataLoaded are stable enough for this pattern.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-running on every render of inline fetch helpers
  }, [
    token,
    tab,
    tripsListMode,
    refreshAgora,
    fetchPending,
    fetchUsers,
    fetchActiveTrips,
    fetchHistoryTrips,
    fetchMetrics,
    fetchUsage,
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
          cartao_cidadao: docs.cartao_cidadao ?? 'missing',
          registo_criminal: docs.registo_criminal ?? 'missing',
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
        <AdminTabAgora
          activeTrips={activeTrips}
          adminAlerts={adminAlerts}
          countHealthSignalRows={countHealthSignalRows}
          health={health}
          metrics={metrics}
          onRefresh={refreshAgora}
          pending={pending}
          syncAdminUrl={syncAdminUrl}
        />
      )}

      {tab === 'docs' && (
        <AdminTabDocs
          DRIVER_DOC_STATUSES={DRIVER_DOC_STATUSES}
          REQUIRED_DRIVER_DOCUMENTS={REQUIRED_DRIVER_DOCUMENTS}
          approvedDriverDocs={approvedDriverDocs}
          docsRowsData={docsRowsData}
          docsStatusFilter={docsStatusFilter}
          driverDocumentLabel={driverDocumentLabel}
          driverDocumentStatusLabel={driverDocumentStatusLabel}
          driverUsers={driverUsers}
          emptyDriverDocs={emptyDriverDocs}
          setDocsStatusFilter={setDocsStatusFilter}
          setDriverDocsRegistry={setDriverDocsRegistry}
          syncAdminUrl={syncAdminUrl}
        />
      )}

      {tab === 'pending' && (
        <AdminTabPending
          handleApprove={handleApprove}
          pending={pending}
        />
      )}

      {tab === 'frota' && (
        <AdminTabFrota
          dataLoading={dataLoading}
          frotaAssignDriverId={frotaAssignDriverId}
          frotaAssignMode={frotaAssignMode}
          frotaAssignOk={frotaAssignOk}
          frotaAssignPartnerId={frotaAssignPartnerId}
          frotaLoading={frotaLoading}
          frotaManagerName={frotaManagerName}
          frotaManagerPhone={frotaManagerPhone}
          frotaOk={frotaOk}
          frotaOrgName={frotaOrgName}
          frotaPartnerId={frotaPartnerId}
          handleAssignDriverToFrota={handleAssignDriverToFrota}
          handleCreateFrotaManager={handleCreateFrotaManager}
          handleCreateFrotaOrg={handleCreateFrotaOrg}
          handleUnassignDriverFromFrota={handleUnassignDriverFromFrota}
          partners={partners}
          setFrotaAssignDriverId={setFrotaAssignDriverId}
          setFrotaAssignMode={setFrotaAssignMode}
          setFrotaAssignOk={setFrotaAssignOk}
          setFrotaAssignPartnerId={setFrotaAssignPartnerId}
          setFrotaManagerName={setFrotaManagerName}
          setFrotaManagerPhone={setFrotaManagerPhone}
          setFrotaOk={setFrotaOk}
          setFrotaOrgName={setFrotaOrgName}
          setFrotaPartnerId={setFrotaPartnerId}
          users={users}
        />
      )}

      {tab === 'dados' && (
        <AdminTabDados
          copy={copy}
          dataLoading={dataLoading}
          dataSearch={dataSearch}
          driversList={driversList}
          fetchDataVisibility={fetchDataVisibility}
          partners={partners}
          setDataSearch={setDataSearch}
          users={users}
        />
      )}

      {tab === 'trips' && (
        <AdminTabTrips
          activeTrips={activeTrips}
          canPostPaymentOpsNote={canPostPaymentOpsNote}
          fetchActiveTrips={fetchActiveTripsVoid}
          fetchHistoryTrips={fetchHistoryTrips}
          fetchTripDebug={fetchTripDebug}
          handleAdminTripTransition={handleAdminTripTransition}
          handleAssignTrip={handleAssignTrip}
          handleCancelTrip={handleCancelTrip}
          handlePaymentOpsNote={handlePaymentOpsNote}
          handleReconcileSingleTripPayment={handleReconcileSingleTripPayment}
          historyTrips={historyTrips}
          historyTripsError={historyTripsError}
          isSuperAdminSession={isSuperAdminSession}
          paymentOpsNoteText={paymentOpsNoteText}
          selectTripsListMode={selectTripsListMode}
          selectedTripId={selectedTripId}
          setPaymentOpsNoteText={setPaymentOpsNoteText}
          syncAdminUrl={syncAdminUrl}
          tripActionLoading={tripActionLoading}
          tripDebug={tripDebug}
          tripDebugId={tripDebugId}
          tripDetail={tripDetail}
          tripDetailLoading={tripDetailLoading}
          tripOrphanFromDeepLink={tripOrphanFromDeepLink}
          tripsListMode={tripsListMode}
        />
      )}

      {tab === 'metrics' && (
        <AdminTabMetrics
          fetchMetrics={fetchMetricsVoid}
          fetchUsage={fetchUsage}
          metrics={metrics}
          syncAdminUrl={syncAdminUrl}
          usage={usage}
        />
      )}

      {tab === 'ops' && (
        <AdminTabOps
          cronRun={cronRun}
          envReveal={envReveal}
          envText={envText}
          envValidate={envValidate}
          fetchHealth={fetchHealthVoid}
          handleExportLogs={handleExportLogs}
          handleFetchPhase0={handleFetchPhase0}
          handleReconcileCloseNoPi={handleReconcileCloseNoPi}
          handleReconcilePreview={handleReconcilePreview}
          handleReconcileStripeSync={handleReconcileStripeSync}
          handleRecoverDriver={handleRecoverDriver}
          handleRunCronNow={handleRunCronNow}
          handleRunOfferExpiry={handleRunOfferExpiry}
          handleRunTimeouts={handleRunTimeouts}
          handleValidateEnv={handleValidateEnv}
          health={health}
          isSuperAdminSession={isSuperAdminSession}
          opsLoading={opsLoading}
          opsStuckPaymentsPage={opsStuckPaymentsPage}
          opsStuckPaymentsPageData={opsStuckPaymentsPageData}
          phase0={phase0}
          reconcilePreview={reconcilePreview}
          reconcileRun={reconcileRun}
          recoverDriverId={recoverDriverId}
          runRecoverDriver={runRecoverDriver}
          setEnvReveal={setEnvReveal}
          setEnvText={setEnvText}
          setOpsStuckPaymentsPage={setOpsStuckPaymentsPage}
          setRecoverDriverId={setRecoverDriverId}
          drivingRestDriverId={drivingRestDriverId}
          drivingRestUntilLocal={drivingRestUntilLocal}
          handleDrivingRestSet={handleDrivingRestSet}
          handleDrivingRestClear={handleDrivingRestClear}
          setDrivingRestDriverId={setDrivingRestDriverId}
          setDrivingRestUntilLocal={setDrivingRestUntilLocal}
          syncAdminUrl={syncAdminUrl}
        />
      )}

      {tab === 'health' && (
        <AdminTabHealth
          fetchHealth={fetchHealthVoid}
          health={health}
          syncAdminUrl={syncAdminUrl}
        />
      )}

      {tab === 'users' && (
        <AdminTabUsers
          blockConfirmId={blockConfirmId}
          bulkSelectedIds={bulkSelectedIds}
          cancelEdit={cancelEdit}
          deleteConfirmId={deleteConfirmId}
          editName={editName}
          editOriginalName={editOriginalName}
          editOriginalPhone={editOriginalPhone}
          editPhone={editPhone}
          editingId={editingId}
          fetchUsersMore={fetchUsersMore}
          filteredSortedUsers={filteredSortedUsers}
          handleBlockUser={handleBlockUser}
          handleBulkBlock={handleBulkBlock}
          handleClearUserPassword={handleClearUserPassword}
          handleDelete={handleDelete}
          handleDemote={handleDemote}
          handlePromote={handlePromote}
          handleSaveUserName={handleSaveUserName}
          handleSaveUserPhone={handleSaveUserPhone}
          handleUnblockUser={handleUnblockUser}
          isSuperAdminSession={isSuperAdminSession}
          loadUserAuditTrailIfNeeded={loadUserAuditTrailIfNeeded}
          setBlockConfirmId={setBlockConfirmId}
          setBulkSelectedIds={setBulkSelectedIds}
          setDeleteConfirmId={setDeleteConfirmId}
          setEditName={setEditName}
          setEditPhone={setEditPhone}
          setUnblockConfirmId={setUnblockConfirmId}
          setUsersFilter={setUsersFilter}
          setUsersSort={setUsersSort}
          startEdit={startEdit}
          token={token}
          unblockConfirmId={unblockConfirmId}
          userAuditError={userAuditError}
          userAuditLoading={userAuditLoading}
          userAuditRows={userAuditRows}
          users={users}
          usersFilter={usersFilter}
          usersHasMore={usersHasMore}
          usersLoadingMore={usersLoadingMore}
          usersSort={usersSort}
        />
      )}
    </div>
  )
}
