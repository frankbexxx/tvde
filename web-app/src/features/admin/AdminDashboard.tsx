import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../api/client'

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

type Tab = 'pending' | 'users'

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

  const refresh = useCallback(() => {
    fetchPending()
    fetchUsers()
  }, [fetchPending, fetchUsers])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchPending()
    fetchUsers()
    const id = setInterval(refresh, 8000)
    return () => clearInterval(id)
  }, [token, fetchPending, fetchUsers, refresh])

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
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}
        >
          Pendentes
        </button>
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'users' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}
        >
          Utilizadores
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
      )}

      {tab === 'pending' && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Pending Users</h2>
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
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+351912345678"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg"
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
