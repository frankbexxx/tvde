import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../api/client'
import {
  getActiveTrips,
  getTripDetailAdmin,
  getTripDebug,
  assignTripAdmin,
  cancelTripAdmin,
  getSystemHealth,
  getMetrics,
  runTimeouts,
  runOfferExpiry,
  recoverDriver,
  exportLogsCsv,
  createPartner,
  createPartnerOrgAdmin,
  type TripActiveItem,
  type TripDetailAdmin,
  type SystemHealthResponse,
  type AdminMetricsResponse,
} from '../../api/admin'

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

type Tab = 'pending' | 'users' | 'frota' | 'trips' | 'metrics' | 'ops' | 'health'

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pendentes' },
  { id: 'users', label: 'Utilizadores' },
  { id: 'frota', label: 'Frota' },
  { id: 'trips', label: 'Viagens' },
  { id: 'metrics', label: 'Métricas' },
  { id: 'ops', label: 'Operações' },
  { id: 'health', label: 'Saúde' },
]

export function AdminDashboard() {
  const { token } = useAuth()
  const [tab, setTab] = useState<Tab>('pending')
  const [pending, setPending] = useState<PendingUser[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Viagens ativas
  const [activeTrips, setActiveTrips] = useState<TripActiveItem[]>([])
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [tripDetail, setTripDetail] = useState<TripDetailAdmin | null>(null)
  const [tripDebug, setTripDebug] = useState<Record<string, unknown> | null>(null)
  const [tripDebugId, setTripDebugId] = useState<string | null>(null)
  const [tripActionLoading, setTripActionLoading] = useState<string | null>(null)

  // Métricas e Saúde
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null)
  const [health, setHealth] = useState<SystemHealthResponse | null>(null)
  const [opsLoading, setOpsLoading] = useState<string | null>(null)
  const [recoverDriverId, setRecoverDriverId] = useState('')

  const [frotaOrgName, setFrotaOrgName] = useState('')
  const [frotaPartnerId, setFrotaPartnerId] = useState('')
  const [frotaManagerName, setFrotaManagerName] = useState('')
  const [frotaManagerPhone, setFrotaManagerPhone] = useState('')
  const [frotaLoading, setFrotaLoading] = useState<string | null>(null)
  const [frotaOk, setFrotaOk] = useState<string | null>(null)

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
      const data = await apiFetch<AdminUser[]>('/admin/users', { token })
      setUsers(data)
      setError(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchActiveTrips = useCallback(async () => {
    if (!token) return
    try {
      const data = await getActiveTrips(token)
      setActiveTrips(data)
    } catch {
      setActiveTrips([])
    }
  }, [token])

  const fetchTripDetail = useCallback(
    async (tripId: string) => {
      if (!token) return
      try {
        const d = await getTripDetailAdmin(tripId, token)
        setTripDetail(d)
      } catch {
        setTripDetail(null)
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

  const fetchHealth = useCallback(async () => {
    if (!token) return
    try {
      const h = await getSystemHealth(token)
      setHealth(h)
    } catch {
      setHealth(null)
    }
  }, [token])

  const refresh = useCallback(() => {
    fetchPending()
    fetchUsers()
    fetchActiveTrips()
    fetchMetrics()
    fetchHealth()
  }, [fetchPending, fetchUsers, fetchActiveTrips, fetchMetrics, fetchHealth])

  const handleAssignTrip = async (tripId: string) => {
    if (!token) return
    setTripActionLoading(tripId)
    try {
      await assignTripAdmin(tripId, token)
      setError(null)
      fetchActiveTrips()
      setSelectedTripId(null)
      setTripDetail(null)
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
      setSelectedTripId(null)
      setTripDetail(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao cancelar')
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

  const handleRecoverDriver = async () => {
    if (!token || !recoverDriverId.trim()) return
    setOpsLoading('recover')
    try {
      await recoverDriver(recoverDriverId.trim(), token)
      setError(null)
      setRecoverDriverId('')
      fetchHealth()
      fetchMetrics()
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro recover')
    } finally {
      setOpsLoading(null)
    }
  }

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
    if (tab === 'trips') fetchActiveTrips()
    if (tab === 'metrics') fetchMetrics()
    if (tab === 'health') fetchHealth()
  }, [token, tab, fetchActiveTrips, fetchMetrics, fetchHealth])

  useEffect(() => {
    if (selectedTripId && token) {
      fetchTripDetail(selectedTripId)
    } else {
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
    setEditingId(u.id)
    setEditName(u.name)
    setEditPhone(u.phone)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPhone('')
  }

  const handleSaveEdit = async () => {
    if (!token || !editingId) return
    try {
      await apiFetch(`/admin/users/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName || undefined, phone: editPhone || undefined }),
        token,
      })
      cancelEdit()
      fetchUsers()
      setError(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao guardar')
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
            onClick={() => setTab(id)}
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
        </section>
      )}

      {tab === 'trips' && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Viagens ativas</h2>
          <button
            type="button"
            onClick={() => fetchActiveTrips()}
            className="mb-3 px-3 py-1.5 bg-card border border-border text-foreground/80 text-sm rounded-xl hover:bg-muted/40"
          >
            Atualizar
          </button>
          {activeTrips.length === 0 ? (
            <p className="text-foreground/75">Nenhuma viagem ativa.</p>
          ) : (
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
                        onClick={() =>
                          setSelectedTripId(selectedTripId === t.trip_id ? null : t.trip_id)
                        }
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
                      {['requested', 'assigned', 'accepted'].includes(t.status) && (
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
                      {tripDetail && (
                        <p className="text-xs text-foreground/75">
                          Estimativa: {tripDetail.estimated_price} € · Status: {tripDetail.status}
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
        </section>
      )}

      {tab === 'ops' && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Operações</h2>
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
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-2">Recuperar motorista</p>
              <p className="text-xs text-muted-foreground mb-2">
                Força is_available=true para motorista bloqueado (sem viagem ativa)
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
              {health.trips_accepted_too_long.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Viagens accepted há muito ({health.trips_accepted_too_long.length})
                  </p>
                  <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto">
                    {JSON.stringify(health.trips_accepted_too_long, null, 2)}
                  </pre>
                </div>
              )}
              {health.trips_ongoing_too_long.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Viagens ongoing há muito ({health.trips_ongoing_too_long.length})
                  </p>
                  <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto">
                    {JSON.stringify(health.trips_ongoing_too_long, null, 2)}
                  </pre>
                </div>
              )}
              {health.drivers_unavailable_too_long.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Motoristas offline há muito ({health.drivers_unavailable_too_long.length})
                  </p>
                  <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto">
                    {JSON.stringify(health.drivers_unavailable_too_long, null, 2)}
                  </pre>
                </div>
              )}
              {health.stuck_payments.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Pagamentos bloqueados ({health.stuck_payments.length})
                  </p>
                  <pre className="text-xs text-foreground bg-surface-raised border border-border p-2 rounded overflow-x-auto">
                    {JSON.stringify(health.stuck_payments, null, 2)}
                  </pre>
                </div>
              )}
              {health.status === 'ok' &&
                health.warnings.length === 0 &&
                health.trips_accepted_too_long.length === 0 &&
                health.trips_ongoing_too_long.length === 0 &&
                health.drivers_unavailable_too_long.length === 0 &&
                health.stuck_payments.length === 0 && (
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
            <ul className="space-y-3">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="bg-card border border-border rounded-2xl px-4 py-3 shadow-card hover:bg-muted/30 transition-colors"
                >
                  {editingId === u.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nickname"
                        className="w-full px-3 py-2 border rounded-lg text-base"
                      />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+351912345678"
                        className="w-full px-3 py-2 border rounded-lg text-base"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <div>
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
                        <div className="flex flex-wrap gap-1">
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
          )}
        </section>
      )}
    </div>
  )
}
