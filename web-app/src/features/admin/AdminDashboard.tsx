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

type Tab = 'pending' | 'users' | 'trips' | 'metrics' | 'ops' | 'health'

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pendentes' },
  { id: 'users', label: 'Utilizadores' },
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
        <p className="text-slate-500">A carregar...</p>
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
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
      )}

      {tab === 'pending' && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Utilizadores pendentes</h2>
          {pending.length === 0 ? (
            <p className="text-slate-500">Nenhum utilizador pendente.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((u) => (
                <li
                  key={u.phone}
                  className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{u.phone}</p>
                    <p className="text-sm text-slate-500">{u.requested_role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApprove(u.phone)}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                  >
                    Aprovar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'trips' && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Viagens ativas</h2>
          <button
            type="button"
            onClick={() => fetchActiveTrips()}
            className="mb-3 px-3 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg"
          >
            Atualizar
          </button>
          {activeTrips.length === 0 ? (
            <p className="text-slate-500">Nenhuma viagem ativa.</p>
          ) : (
            <ul className="space-y-3">
              {activeTrips.map((t) => (
                <li
                  key={t.trip_id}
                  className="bg-slate-50 rounded-lg px-4 py-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {t.trip_id.slice(0, 8)}… · {t.status}
                      </p>
                      <p className="text-sm text-slate-600">
                        {t.origin_lat.toFixed(4)}, {t.origin_lng.toFixed(4)} →{' '}
                        {t.destination_lat.toFixed(4)}, {t.destination_lng.toFixed(4)}
                      </p>
                      {t.driver_id && (
                        <p className="text-xs text-slate-500">Driver: {t.driver_id.slice(0, 8)}…</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTripId(selectedTripId === t.trip_id ? null : t.trip_id)
                        }
                        className="px-2 py-1 bg-sky-600 text-white text-xs rounded"
                      >
                        {selectedTripId === t.trip_id ? 'Fechar' : 'Detalhe'}
                      </button>
                      {t.status === 'requested' && (
                        <button
                          type="button"
                          onClick={() => handleAssignTrip(t.trip_id)}
                          disabled={tripActionLoading === t.trip_id}
                          className="px-2 py-1 bg-emerald-600 text-white text-xs rounded disabled:opacity-50"
                        >
                          Atribuir
                        </button>
                      )}
                      {['requested', 'assigned', 'accepted'].includes(t.status) && (
                        <button
                          type="button"
                          onClick={() => handleCancelTrip(t.trip_id)}
                          disabled={tripActionLoading === t.trip_id}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedTripId === t.trip_id && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      {tripDetail && (
                        <p className="text-xs text-slate-600">
                          Preço: {tripDetail.estimated_price} € · Status: {tripDetail.status}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fetchTripDebug(t.trip_id)}
                          className="px-2 py-1 bg-amber-600 text-white text-xs rounded"
                        >
                          Debug
                        </button>
                      </div>
                      {tripDebug && tripDebugId === t.trip_id && (
                        <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
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
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Métricas</h2>
          <button
            type="button"
            onClick={() => fetchMetrics()}
            className="mb-3 px-3 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg"
          >
            Atualizar
          </button>
          {metrics ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-slate-500">Viagens ativas</p>
                <p className="font-bold text-slate-900">{metrics.active_trips}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-slate-500">Motoristas disponíveis</p>
                <p className="font-bold text-slate-900">{metrics.drivers_available}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-slate-500">Motoristas ocupados</p>
                <p className="font-bold text-slate-900">{metrics.drivers_busy}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-slate-500">À espera de motorista</p>
                <p className="font-bold text-slate-900">{metrics.trips_requested}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-slate-500">Em viagem</p>
                <p className="font-bold text-slate-900">{metrics.trips_ongoing}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-slate-500">Concluídas hoje</p>
                <p className="font-bold text-slate-900">{metrics.trips_completed_today}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2 col-span-2">
                <p className="text-slate-500">Total criadas / aceites / concluídas</p>
                <p className="font-bold text-slate-900">
                  {metrics.trips_created_total} / {metrics.trips_accepted_total} /{' '}
                  {metrics.trips_completed_total}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">Carregar métricas...</p>
          )}
        </section>
      )}

      {tab === 'ops' && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Operações</h2>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRunTimeouts}
              disabled={!!opsLoading}
              className="w-full px-4 py-3 bg-amber-200 text-amber-900 rounded-lg font-medium disabled:opacity-50"
            >
              {opsLoading === 'timeouts' ? 'A executar...' : 'Executar timeouts'}
            </button>
            <button
              type="button"
              onClick={handleRunOfferExpiry}
              disabled={!!opsLoading}
              className="w-full px-4 py-3 bg-orange-200 text-orange-900 rounded-lg font-medium disabled:opacity-50"
            >
              {opsLoading === 'offer-expiry' ? 'A executar...' : 'Expirar ofertas e redispatch'}
            </button>
            <button
              type="button"
              onClick={handleExportLogs}
              disabled={!!opsLoading}
              className="w-full px-4 py-3 bg-sky-200 text-sky-900 rounded-lg font-medium disabled:opacity-50"
            >
              {opsLoading === 'export' ? 'A exportar...' : 'Exportar logs CSV'}
            </button>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-2">Recuperar motorista</p>
              <p className="text-xs text-slate-500 mb-2">
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
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  Recuperar
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'health' && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Saúde do sistema</h2>
          <button
            type="button"
            onClick={() => fetchHealth()}
            className="mb-3 px-3 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg"
          >
            Atualizar
          </button>
          {health ? (
            <div className="space-y-3">
              <p
                className={`font-medium ${
                  health.status === 'ok' ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                Status: {health.status}
              </p>
              {health.warnings.length > 0 && (
                <ul className="text-sm text-amber-700 space-y-1">
                  {health.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              {health.trips_accepted_too_long.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Viagens accepted há muito ({health.trips_accepted_too_long.length})
                  </p>
                  <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(health.trips_accepted_too_long, null, 2)}
                  </pre>
                </div>
              )}
              {health.trips_ongoing_too_long.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Viagens ongoing há muito ({health.trips_ongoing_too_long.length})
                  </p>
                  <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(health.trips_ongoing_too_long, null, 2)}
                  </pre>
                </div>
              )}
              {health.drivers_unavailable_too_long.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Motoristas offline há muito ({health.drivers_unavailable_too_long.length})
                  </p>
                  <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(health.drivers_unavailable_too_long, null, 2)}
                  </pre>
                </div>
              )}
              {health.stuck_payments.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Pagamentos bloqueados ({health.stuck_payments.length})
                  </p>
                  <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto">
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
                  <p className="text-slate-500">Tudo OK.</p>
                )}
            </div>
          ) : (
            <p className="text-slate-500">Carregar saúde...</p>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Gestão de Utilizadores</h2>
          {users.length === 0 ? (
            <p className="text-slate-500">Nenhum utilizador.</p>
          ) : (
            <ul className="space-y-3">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="bg-slate-50 rounded-lg px-4 py-3"
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
                          className="px-3 py-1.5 bg-slate-300 text-slate-700 text-sm rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-slate-900">
                            {u.name || u.phone}
                            {u.name && u.name !== u.phone && (
                              <span className="text-slate-500 text-sm ml-1">({u.phone})</span>
                            )}
                            {!u.name && <span className="text-slate-500 text-sm ml-1">—</span>}
                          </p>
                          <p className="text-sm text-slate-600">{u.phone}</p>
                          <p className="text-xs text-slate-500">
                            {u.role} · {u.status}
                            {u.has_driver_profile && ' · motorista'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {u.role === 'passenger' && (
                            <button
                              type="button"
                              onClick={() => handlePromote(u.id)}
                              className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                            >
                              Motorista
                            </button>
                          )}
                          {u.role === 'driver' && (
                            <button
                              type="button"
                              onClick={() => handleDemote(u.id)}
                              className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
                            >
                              Passageiro
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(u)}
                                className="px-2 py-1 bg-sky-600 text-white text-xs rounded hover:bg-sky-700"
                              >
                                Editar
                              </button>
                              {deleteConfirmId === u.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(u.id)}
                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 bg-slate-400 text-white text-xs rounded"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(u.id)}
                                  className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
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
