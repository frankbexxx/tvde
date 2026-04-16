import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { parseAdminDashboardQuery, type AdminDashboardTab } from './adminDashboardQuery'
import { driverIdFromHealthUnavailableRow, tripIdFromHealthRow } from './healthTripLinks'
import { stripePaymentIntentDashboardUrls } from '../../utils/stripeDashboard'
import { apiFetch, type ApiError } from '../../api/client'
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
  type AdminUsageSummaryResponse,
  type TripActiveItem,
  type TripDetailAdmin,
  type SystemHealthResponse,
  type AdminMetricsResponse,
} from '../../api/admin'
import type { TripHistoryItem } from '../../api/trips'

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

const ADMIN_TRIP_CANCEL_STATUSES = ['requested', 'assigned', 'accepted'] as const

/** Erros do PATCH /admin/users/{id} (BETA) em texto legível. */
function formatAdminUserPatchError(detail: unknown): string {
  if (typeof detail === 'string') {
    const key = detail.trim()
    const map: Record<string, string> = {
      invalid_phone_format: 'Telefone inválido. Usa +351 seguido de 9 dígitos (ex.: +351912345678).',
      phone_already_used: 'Esse telefone já está a ser usado por outra conta.',
      cannot_modify_admin: 'Não podes alterar a conta de administrador.',
      user_not_found: 'Utilizador não encontrado.',
      invalid_user_id: 'Identificador de utilizador inválido.',
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
  return 'Não foi possível guardar. Tenta outra vez.'
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
    return { tab: 'pending', tripId: null, tripsList: 'active' }
  }
  return parseAdminDashboardQuery(new URLSearchParams(window.location.search))
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

function HealthAnomalyBlock(props: {
  title: string
  rows: Array<Record<string, unknown>>
  onOpenTrip: (tripId: string) => void
  pageSize?: number
}) {
  const { title, rows, onOpenTrip, pageSize = 20 } = props
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
    <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {title} ({rows.length})
        </p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={`px-2 py-1 text-xs rounded-lg border ${
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
            className={`px-2 py-1 text-xs rounded-lg border ${
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
                    className="shrink-0 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90"
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
          className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card text-foreground/90 hover:bg-muted/40"
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
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Record<string, boolean>>({})
  const [blockConfirmId, setBlockConfirmId] = useState<string | null>(null)

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

  // Métricas e Saúde
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null)
  const [usage, setUsage] = useState<AdminUsageSummaryResponse | null>(null)
  const [health, setHealth] = useState<SystemHealthResponse | null>(null)
  const [opsLoading, setOpsLoading] = useState<string | null>(null)
  const [recoverDriverId, setRecoverDriverId] = useState('')
  const [phase0, setPhase0] = useState<Awaited<ReturnType<typeof getAdminPhase0>> | null>(null)
  const [cronRun, setCronRun] = useState<Awaited<ReturnType<typeof runAdminCron>> | null>(null)
  const [envText, setEnvText] = useState('')
  const [envReveal, setEnvReveal] = useState(false)
  const [envValidate, setEnvValidate] = useState<Awaited<ReturnType<typeof validateEnvText>> | null>(null)

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
      setBulkSelectedIds({})
      setError(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao carregar')
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
      setError((err as { detail?: string })?.detail ?? 'Erro ao carregar mais')
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
  }, [fetchPending, fetchUsers, fetchActiveTrips, fetchHistoryTrips, fetchMetrics, fetchHealth])

  const handleAssignTrip = async (tripId: string) => {
    if (!token) return
    setTripActionLoading(tripId)
    try {
      await assignTripAdmin(tripId, token)
      setError(null)
      fetchActiveTrips()
      setTripDetail(null)
      syncAdminUrl({ tab: 'trips', tripId: null })
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao atribuir')
    } finally {
      setTripActionLoading(null)
    }
  }

  const handleCancelTrip = async (tripId: string) => {
    if (!token) return
    setTripActionLoading(tripId)
    try {
      await cancelTripAdmin(tripId, token)
      setError(null)
      fetchActiveTrips()
      setTripDetail(null)
      syncAdminUrl({ tab: 'trips', tripId: null })
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao cancelar')
    } finally {
      setTripActionLoading(null)
    }
  }

  const handleAdminTripTransition = async (tripId: string, toStatus: 'arriving' | 'ongoing') => {
    if (!token) return
    const msg =
      toStatus === 'arriving'
        ? 'Forçar estado «arriving» (a caminho do passageiro)?'
        : 'Forçar «ongoing» (viagem iniciada)? Isto contorna a exigência de proximidade (~50 m) ao pickup.'
    if (!window.confirm(msg)) return
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
      setError((err as { detail?: string })?.detail ?? 'Erro na transição admin')
    } finally {
      setTripActionLoading(null)
    }
  }

  const handleRunTimeouts = async () => {
    if (!token) return
    setOpsLoading('timeouts')
    try {
      await runTimeouts(token)
      setError(null)
      fetchActiveTrips()
      fetchMetrics()
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro timeouts')
    } finally {
      setOpsLoading(null)
    }
  }

  const handleRunOfferExpiry = async () => {
    if (!token) return
    setOpsLoading('offer-expiry')
    try {
      await runOfferExpiry(token)
      setError(null)
      fetchActiveTrips()
      fetchMetrics()
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro offer-expiry')
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
      setError((err as { detail?: string })?.detail ?? 'Erro fase0')
    } finally {
      setOpsLoading(null)
    }
  }

  const handleRunCronNow = async () => {
    if (!token) return
    if (!window.confirm('Correr cron agora? (timeouts, offers, cleanup, system health)')) return
    setOpsLoading('cron')
    try {
      const d = await runAdminCron(token)
      setCronRun(d)
      setError(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro cron')
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
      setError((err as { detail?: string })?.detail ?? 'Erro validar .env')
    } finally {
      setOpsLoading(null)
    }
  }

  const runRecoverDriver = async (driverUserId: string) => {
    if (!token) return
    const id = driverUserId.trim()
    if (!id) return
    setOpsLoading('recover')
    try {
      await recoverDriver(id, token)
      setError(null)
      setRecoverDriverId('')
      await fetchHealth()
      fetchMetrics()
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro recover')
    } finally {
      setOpsLoading(null)
    }
  }

  const handleRecoverDriver = () => void runRecoverDriver(recoverDriverId)

  const errDetail = (err: unknown) =>
    typeof err === 'object' && err !== null && 'detail' in err
      ? String((err as { detail: unknown }).detail)
      : 'Erro'

  const handleCreateFrotaOrg = async () => {
    if (!token || !frotaOrgName.trim()) return
    setFrotaLoading('org')
    setFrotaOk(null)
    setError(null)
    try {
      const r = await createPartner(frotaOrgName, token)
      setFrotaPartnerId(r.id)
      setFrotaOk(`Organização “${r.name}” criada. O ID da frota foi preenchido abaixo — usa-o para criar o gestor.`)
    } catch (err) {
      setError(errDetail(err))
    } finally {
      setFrotaLoading(null)
    }
  }

  const handleCreateFrotaManager = async () => {
    if (!token || !frotaPartnerId.trim() || !frotaManagerName.trim() || !frotaManagerPhone.trim()) return
    setFrotaLoading('manager')
    setFrotaOk(null)
    setFrotaAssignOk(null)
    setError(null)
    try {
      const r = await createPartnerOrgAdmin(
        frotaPartnerId,
        { name: frotaManagerName, phone: frotaManagerPhone },
        token
      )
      setFrotaOk(
        `Gestor criado: ${r.name} (${r.phone}). Pode iniciar sessão no separador Frota da app com este telefone.`
      )
      setFrotaManagerName('')
      setFrotaManagerPhone('')
    } catch (err) {
      setError(errDetail(err))
    } finally {
      setFrotaLoading(null)
    }
  }

  const handleAssignDriverToFrota = async () => {
    const pid = (frotaAssignPartnerId || frotaPartnerId).trim()
    if (!token || !frotaAssignDriverId.trim() || !pid) return
    if (!window.confirm('Atribuir este motorista a esta frota?')) return
    setFrotaLoading('assign-driver')
    setFrotaOk(null)
    setFrotaAssignOk(null)
    setError(null)
    try {
      const r = await assignDriverToPartner(frotaAssignDriverId, pid, token)
      setFrotaAssignOk(`Motorista atribuído à frota. driver=${r.user_id} · frota=${r.partner_id}`)
    } catch (err) {
      setError(errDetail(err))
    } finally {
      setFrotaLoading(null)
    }
  }

  const handleUnassignDriverFromFrota = async () => {
    if (!token || !frotaAssignDriverId.trim()) return
    if (!window.confirm('Remover este motorista da frota?')) return
    setFrotaLoading('unassign-driver')
    setFrotaOk(null)
    setFrotaAssignOk(null)
    setError(null)
    try {
      const r = await unassignDriverFromPartner(frotaAssignDriverId, token)
      setFrotaAssignOk(`Motorista removido da frota. driver=${r.user_id} · frota=${r.partner_id}`)
    } catch (err) {
      setError(errDetail(err))
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
      setError((err as { detail?: string })?.detail ?? 'Erro export')
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
  }, [token, tab, tripsListMode, fetchActiveTrips, fetchHistoryTrips, fetchMetrics, fetchHealth])

  const fetchDataVisibility = async () => {
    if (!token) return
    setDataLoading(true)
    try {
      const [ps, ds] = await Promise.all([listPartners(token), listDrivers(token)])
      setPartners(ps)
      setDriversList(ds)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao carregar dados')
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
      setError((err as { detail?: string })?.detail ?? 'Erro ao aprovar')
    }
  }

  const handlePromote = async (userId: string) => {
    if (!token) return
    try {
      await apiFetch(`/admin/users/${userId}/promote-driver`, { method: 'POST', token })
      fetchUsers()
      setError(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro')
    }
  }

  const handleDemote = async (userId: string) => {
    if (!token) return
    try {
      await apiFetch(`/admin/users/${userId}/demote-driver`, { method: 'POST', token })
      fetchUsers()
      setError(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro')
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
      fetchUsers()
    } catch (err) {
      setError(formatAdminUserPatchError((err as ApiError).detail))
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
    try {
      await apiFetch(`/admin/users/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ phone: next }),
        token,
      })
      setEditOriginalPhone(next)
      setEditPhone(next)
      setError(null)
      fetchUsers()
    } catch (err) {
      setError(formatAdminUserPatchError((err as ApiError).detail))
    }
  }

  const handleDelete = async (userId: string) => {
    if (!token) return
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'DELETE', token })
      setDeleteConfirmId(null)
      fetchUsers()
      setError(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao eliminar')
    }
  }

  const handleBlockUser = async (userId: string) => {
    if (!token) return
    try {
      await apiFetch(`/admin/users/${userId}/block`, { method: 'POST', token })
      setBlockConfirmId(null)
      setBulkSelectedIds((m) => {
        const next = { ...m }
        delete next[userId]
        return next
      })
      fetchUsers()
      setError(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao bloquear')
    }
  }

  const handleClearUserPassword = async (userId: string) => {
    if (!token) return
    const typed = window.prompt(
      'Repor login BETA (password por defeito). Escreve exactamente: LIMPAR_SENHA'
    )
    if (typed?.trim() !== 'LIMPAR_SENHA') return
    try {
      await apiFetch(`/admin/users/${userId}/password/clear`, {
        method: 'POST',
        token,
        body: JSON.stringify({ confirmation: 'LIMPAR_SENHA' }),
      })
      setError(null)
      fetchUsers()
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao limpar palavra-passe')
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
    try {
      await apiFetch('/admin/users/bulk-block', {
        method: 'POST',
        token,
        body: JSON.stringify({ user_ids: ids, confirmation: expected }),
      })
      setBulkSelectedIds({})
      fetchUsers()
      setError(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao bloquear em massa')
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

  if (loading && users.length === 0) {
    return (
      <div className="p-4">
        <p className="text-foreground/80">A carregar...</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              id === 'trips'
                ? syncAdminUrl({ tab: 'trips', tripId: selectedTripId, tripsList: tripsListMode })
                : syncAdminUrl({ tab: id, tripId: null })
            }
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-foreground/80 hover:bg-muted/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-4">{error}</p>
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
          <button
            type="button"
            onClick={() => (tripsListMode === 'active' ? void fetchActiveTrips() : void fetchHistoryTrips())}
            className="mb-3 px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40"
          >
            Atualizar
          </button>

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
                        onClick={() => void handleAdminTripTransition(selectedTripId, 'arriving')}
                        disabled={tripActionLoading === selectedTripId}
                        className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Forçar arriving
                      </button>
                    )}
                    {tripDetail.status === 'arriving' && (
                      <button
                        type="button"
                        onClick={() => void handleAdminTripTransition(selectedTripId, 'ongoing')}
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
                  {activeTrips.map((t) => (
                    <li
                      key={t.trip_id}
                      className="bg-card border border-border rounded-2xl px-4 py-3 shadow-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {t.trip_id.slice(0, 8)}… · {t.status}
                          </p>
                          <p className="text-sm text-foreground/75">
                            {t.origin_lat.toFixed(4)}, {t.origin_lng.toFixed(4)} →{' '}
                            {t.destination_lat.toFixed(4)}, {t.destination_lng.toFixed(4)}
                          </p>
                          {t.driver_id && (
                            <p className="text-xs text-foreground/70">Driver: {t.driver_id.slice(0, 8)}…</p>
                          )}
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
                              onClick={() => void handleAdminTripTransition(t.trip_id, 'arriving')}
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
                              onClick={() => void handleAdminTripTransition(t.trip_id, 'ongoing')}
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
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => fetchTripDebug(t.trip_id)}
                              className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded"
                            >
                              Debug
                            </button>
                          </div>
                          {tripDebug && tripDebugId === t.trip_id && (
                            <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                              {JSON.stringify(tripDebug, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
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
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => fetchTripDebug(h.trip_id)}
                              className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded"
                            >
                              Debug
                            </button>
                          </div>
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
            <div className="grid grid-cols-2 gap-2 text-sm">
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
              <div className="bg-card border border-border rounded-2xl px-3 py-2 col-span-2 shadow-card">
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
                disabled={!!opsLoading}
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
                disabled={!!opsLoading || !envText.trim()}
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
            <button
              type="button"
              onClick={handleRunTimeouts}
              disabled={!!opsLoading}
              className="w-full px-4 py-3 bg-warning/20 text-warning rounded-lg font-medium disabled:opacity-50"
            >
              {opsLoading === 'timeouts' ? 'A executar...' : 'Executar timeouts'}
            </button>
            <button
              type="button"
              onClick={handleRunOfferExpiry}
              disabled={!!opsLoading}
              className="w-full px-4 py-3 bg-warning/20 text-warning rounded-lg font-medium disabled:opacity-50"
            >
              {opsLoading === 'offer-expiry' ? 'A executar...' : 'Expirar ofertas e redispatch'}
            </button>
            <button
              type="button"
              onClick={handleExportLogs}
              disabled={!!opsLoading}
              className="w-full px-4 py-3 bg-info/20 text-info rounded-lg font-medium disabled:opacity-50"
            >
              {opsLoading === 'export' ? 'A exportar...' : 'Exportar logs CSV'}
            </button>

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
              {!health ? (
                <p className="text-xs text-muted-foreground">A carregar saúde…</p>
              ) : health.stuck_payments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum pagamento stuck nesta leitura.</p>
              ) : (
                <ul className="space-y-2">
                  {health.stuck_payments.map((row, i) => {
                    const tid = tripIdFromHealthRow(row)
                    const piRaw = row.stripe_payment_intent_id
                    const pi = typeof piRaw === 'string' && piRaw.startsWith('pi_') ? piRaw.trim() : null
                    const stripeUrls = pi ? stripePaymentIntentDashboardUrls(pi) : null
                    return (
                      <li
                        key={`stuck-pay-${i}-${tid ?? String(row.id ?? i)}`}
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
          <h2 className="text-lg font-semibold text-foreground mb-4">Saúde do sistema</h2>
            <button
              type="button"
              onClick={() => fetchHealth()}
              className="mb-3 px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40"
            >
              Atualizar
            </button>
          {health ? (
            <div className="space-y-3">
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
              />
              <HealthAnomalyBlock
                key={healthBlockKey('ongoing', health.trips_ongoing_too_long)}
                title="Viagens ongoing há muito"
                rows={health.trips_ongoing_too_long}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('offline', health.drivers_unavailable_too_long)}
                title="Motoristas offline há muito (sem viagem ativa)"
                rows={health.drivers_unavailable_too_long}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('stuck_pi', health.stuck_payments)}
                title="Pagamentos bloqueados (processing)"
                rows={health.stuck_payments}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
                pageSize={25}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('missing_pay', health.missing_payment_records ?? [])}
                title="Viagens sem registo de pagamento"
                rows={health.missing_payment_records ?? []}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
              />
              <HealthAnomalyBlock
                key={healthBlockKey('inconsistent', health.inconsistent_financial_state ?? [])}
                title="Estado financeiro inconsistente"
                rows={health.inconsistent_financial_state ?? []}
                onOpenTrip={(tripId) => syncAdminUrl({ tab: 'trips', tripId })}
                pageSize={25}
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
                      const selectable = filteredSortedUsers.filter((u) => u.role !== 'admin')
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
                            {u.role !== 'admin' ? (
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
                            {u.role !== 'admin' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(u)}
                                  className="px-2 py-1 bg-info text-info-foreground text-xs rounded hover:opacity-90"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleClearUserPassword(u.id)}
                                  className="px-2 py-1 bg-muted text-foreground text-xs rounded border border-border hover:opacity-90"
                                >
                                  Limpar palavra-passe
                                </button>
                                {blockConfirmId === u.id ? (
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
                                    onClick={() => setBlockConfirmId(u.id)}
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
