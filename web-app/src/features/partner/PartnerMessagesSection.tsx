import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePolling } from '../../hooks/usePolling'
import {
  fetchPartnerInboxMessages,
  markPartnerMessageRead,
  postPartnerMessage,
  type PartnerInboxMessageRow,
} from '../../api/partner'

type PartnerMessagesSectionProps = {
  fullWidth?: boolean
  onUnreadChange?: (count: number) => void
}

export function PartnerMessagesSection({ fullWidth = false, onUnreadChange }: PartnerMessagesSectionProps) {
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [bTitle, setBTitle] = useState('')
  const [bBody, setBBody] = useState('')
  const [bPriority, setBPriority] = useState<'normal' | 'high'>('normal')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [inbox, setInbox] = useState<PartnerInboxMessageRow[]>([])

  const load = useCallback(async () => {
    try {
      const rows = await fetchPartnerInboxMessages()
      setError(null)
      return rows
    } catch {
      setError('Não foi possível carregar mensagens dos motoristas.')
      throw new Error('inbox_load_failed')
    }
  }, [])

  const { data, refetch, isLoading, isRefreshing } = usePolling(load, [load], true, 15_000, {
    equals: (prev, next) =>
      prev.length === next.length &&
      prev.every((row, i) => row.id === next[i]?.id && row.read === next[i]?.read),
  })

  useEffect(() => {
    if (data) setInbox(data)
  }, [data])

  const unread = inbox.filter((m) => !m.read).length

  useEffect(() => {
    onUnreadChange?.(unread)
  }, [unread, onUnreadChange])

  const openMessage = async (m: PartnerInboxMessageRow) => {
    setOpenId(m.id)
    if (!m.read) {
      try {
        await markPartnerMessageRead(m.id)
        setInbox((prev) => prev.map((r) => (r.id === m.id ? { ...r, read: true } : r)))
      } catch {
        /* ignore */
      }
    }
  }

  const sendBroadcast = async () => {
    if (!bTitle.trim() || !bBody.trim()) return
    setBusy(true)
    setOk(null)
    try {
      await postPartnerMessage({
        title: bTitle.trim(),
        body: bBody.trim(),
        priority: bPriority,
        driver_user_id: null,
      })
      setBTitle('')
      setBBody('')
      setBroadcastOpen(false)
      setOk('Aviso enviado a toda a frota.')
      void refetch()
    } catch {
      setError('Falha ao enviar aviso à frota.')
    } finally {
      setBusy(false)
    }
  }

  const selected = inbox.find((m) => m.id === openId) ?? null
  const listMaxH = fullWidth ? 'max-h-[min(55dvh,420px)]' : 'max-h-40'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Mensagens dos motoristas
          {unread > 0 ? (
            <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
              {unread}
            </span>
          ) : null}
          {isRefreshing ? (
            <span className="ml-2 text-[10px] font-normal text-muted-foreground">A actualizar…</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => setBroadcastOpen((v) => !v)}
          className="min-h-8 rounded-lg border border-border px-2 text-xs font-medium"
        >
          Aviso à frota
        </button>
      </div>

      {broadcastOpen ? (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <input
            type="text"
            value={bTitle}
            onChange={(e) => setBTitle(e.target.value)}
            placeholder="Título do aviso"
            className="w-full rounded-lg border border-border px-2 py-2 text-sm"
          />
          <textarea
            value={bBody}
            onChange={(e) => setBBody(e.target.value)}
            placeholder="Mensagem para todos os motoristas"
            rows={3}
            className="w-full rounded-lg border border-border px-2 py-2 text-sm"
          />
          <select
            value={bPriority}
            onChange={(e) => setBPriority(e.target.value as 'normal' | 'high')}
            className="w-full rounded-lg border border-border px-2 py-2 text-sm"
          >
            <option value="normal">Prioridade normal</option>
            <option value="high">Prioridade alta</option>
          </select>
          <button
            type="button"
            disabled={busy || !bTitle.trim() || !bBody.trim()}
            onClick={() => void sendBroadcast()}
            className="w-full min-h-9 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? 'A enviar…' : 'Enviar à frota'}
          </button>
        </div>
      ) : null}

      {ok ? <p className="text-xs text-success">{ok}</p> : null}
      {isLoading && inbox.length === 0 ? (
        <p className="text-xs text-muted-foreground">A carregar…</p>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : inbox.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem mensagens dos motoristas.</p>
      ) : (
        <>
          <ul className={`space-y-2 overflow-y-auto ${listMaxH}`}>
            {inbox.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => void openMessage(m)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-xs touch-manipulation ${m.read ? 'border-border bg-card' : 'border-info/40 bg-info/5'}`}
                >
                  <p className="font-medium text-foreground flex items-center gap-2">
                    {!m.read ? <span className="h-2 w-2 rounded-full bg-info shrink-0" /> : null}
                    {m.title}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Motorista · {new Date(m.created_at).toLocaleString('pt-PT')}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <div className="rounded-lg border border-border bg-background/80 px-3 py-2 text-xs space-y-2">
              <p className="font-medium text-foreground">{selected.title}</p>
              <p className="text-foreground/90 whitespace-pre-wrap">{selected.body}</p>
              <Link
                to={`/partner/drivers/${encodeURIComponent(selected.driver_user_id)}`}
                className="text-primary underline"
              >
                Ver motorista
              </Link>
            </div>
          ) : null}
        </>
      )}
      <button type="button" onClick={() => void refetch()} className="text-xs text-primary underline">
        Actualizar
      </button>
    </div>
  )
}
