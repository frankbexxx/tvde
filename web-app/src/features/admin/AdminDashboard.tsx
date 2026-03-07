import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../api/client'

interface PendingUser {
  phone: string
  requested_role: string
}

export function AdminDashboard() {
  const { token } = useAuth()
  const [pending, setPending] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPending = async () => {
    if (!token) return
    try {
      const data = await apiFetch<PendingUser[]>('/admin/pending-users', { token })
      setPending(data)
      setError(null)
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
    const id = setInterval(fetchPending, 5000)
    return () => clearInterval(id)
  }, [token])

  const handleApprove = async (phone: string) => {
    if (!token) return
    try {
      await apiFetch('/admin/approve-user', {
        method: 'POST',
        body: JSON.stringify({ phone }),
        token,
      })
      setPending((p) => p.filter((u) => u.phone !== phone))
    } catch (err) {
      setError((err as { detail?: string })?.detail ?? 'Erro ao aprovar')
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-slate-500">A carregar...</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-lg font-bold text-slate-900 mb-4">Pending Users</h2>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
      )}
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
    </div>
  )
}
