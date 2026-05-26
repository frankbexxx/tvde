import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  fetchDriverMessages,
  markDriverMessageRead,
  type DriverMessageRow,
} from '../../api/driverMessages'

export function DriverInboxPanel() {
  const { token } = useAuth()
  const [rows, setRows] = useState<DriverMessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const list = await fetchDriverMessages(token)
      setRows(list)
    } catch {
      setError('Não foi possível carregar a caixa de entrada.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const openMessage = async (m: DriverMessageRow) => {
    setOpenId(m.id)
    if (!m.read && token) {
      try {
        await markDriverMessageRead(token, m.id)
        setRows((prev) => prev.map((r) => (r.id === m.id ? { ...r, read: true } : r)))
      } catch {
        /* keep UI usable */
      }
    }
  }

  const selected = rows.find((r) => r.id === openId) ?? null

  if (loading) {
    return <p className="text-xs text-muted-foreground">A carregar mensagens…</p>
  }
  if (error) {
    return <p className="text-xs text-destructive">{error}</p>
  }
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">Sem avisos da frota.</p>
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {rows.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => void openMessage(m)}
              className={`w-full text-left rounded-lg border px-3 py-2 text-xs touch-manipulation ${m.read ? 'border-border bg-card' : 'border-info/40 bg-info/5'}`}
            >
              <p className="font-medium text-foreground flex items-center gap-2">
                {!m.read ? <span className="h-2 w-2 rounded-full bg-info shrink-0" aria-hidden /> : null}
                {m.title}
                {m.priority === 'high' ? (
                  <span className="text-[10px] uppercase text-destructive font-semibold">Alta</span>
                ) : null}
              </p>
              <p className="text-muted-foreground mt-0.5">{new Date(m.created_at).toLocaleString('pt-PT')}</p>
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <div className="rounded-lg border border-border bg-background/80 px-3 py-2 text-xs">
          <p className="font-medium text-foreground">{selected.title}</p>
          <p className="mt-2 text-foreground/90 whitespace-pre-wrap">{selected.body}</p>
        </div>
      ) : null}
      <button type="button" onClick={() => void load()} className="text-xs text-primary underline">
        Actualizar
      </button>
    </div>
  )
}
