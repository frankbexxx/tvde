import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  fetchDriverMessages,
  fetchDriverSentMessages,
  markDriverMessageRead,
  postDriverMessage,
  type DriverMessageRow,
} from '../../api/driverMessages'
import { formatDateTime } from '../../i18n/format'

type InboxTab = 'received' | 'sent' | 'compose'

export function DriverInboxPanel() {
  const { t } = useTranslation('driver')
  const { token } = useAuth()
  const [tab, setTab] = useState<InboxTab>('received')
  const [received, setReceived] = useState<DriverMessageRow[]>([])
  const [sent, setSent] = useState<DriverMessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<'normal' | 'high'>('normal')
  const [sending, setSending] = useState(false)
  const [sendOk, setSendOk] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [inbox, outbox] = await Promise.all([
        fetchDriverMessages(token),
        fetchDriverSentMessages(token),
      ])
      setReceived(inbox)
      setSent(outbox)
    } catch {
      setError(t('inbox.loadError'))
    } finally {
      setLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    void load()
  }, [load])

  const openMessage = async (m: DriverMessageRow) => {
    setOpenId(m.id)
    if (!m.read && token && tab === 'received') {
      try {
        await markDriverMessageRead(token, m.id)
        setReceived((prev) => prev.map((r) => (r.id === m.id ? { ...r, read: true } : r)))
      } catch {
        /* keep UI usable */
      }
    }
  }

  const rows = tab === 'sent' ? sent : received
  const selected = rows.find((r) => r.id === openId) ?? null

  const handleSend = async () => {
    if (!token || !title.trim() || !body.trim()) return
    setSending(true)
    setSendOk(null)
    setError(null)
    try {
      await postDriverMessage(token, { title: title.trim(), body: body.trim(), priority })
      setTitle('')
      setBody('')
      setSendOk(t('inbox.sendOk'))
      setTab('sent')
      await load()
    } catch {
      setError(t('inbox.sendError'))
    } finally {
      setSending(false)
    }
  }

  const tabLabels: Record<InboxTab, string> = {
    received: t('inbox.tabReceived'),
    sent: t('inbox.tabSent'),
    compose: t('inbox.tabCompose'),
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg border border-border p-0.5">
        {(['received', 'sent', 'compose'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setOpenId(null)
            }}
            className={`flex-1 min-h-8 rounded-md text-xs font-medium touch-manipulation ${tab === id ? 'bg-primary/15 text-foreground' : 'text-muted-foreground'}`}
          >
            {tabLabels[id]}
          </button>
        ))}
      </div>

      {tab === 'compose' ? (
        <div className="space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('inbox.subjectPlaceholder')}
            className="w-full rounded-lg border border-border px-2 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('inbox.bodyPlaceholder')}
            rows={4}
            className="w-full rounded-lg border border-border px-2 py-2 text-sm"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'normal' | 'high')}
            className="w-full rounded-lg border border-border px-2 py-2 text-sm"
          >
            <option value="normal">{t('inbox.priorityNormal')}</option>
            <option value="high">{t('inbox.priorityHigh')}</option>
          </select>
          <button
            type="button"
            disabled={sending || !title.trim() || !body.trim()}
            onClick={() => void handleSend()}
            className="w-full min-h-10 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {sending ? t('inbox.sending') : t('inbox.sendToFleet')}
          </button>
          {sendOk ? <p className="text-xs text-success">{sendOk}</p> : null}
        </div>
      ) : loading ? (
        <p className="text-xs text-muted-foreground">{t('inbox.loading')}</p>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {tab === 'sent' ? t('inbox.emptySent') : t('inbox.emptyReceived')}
        </p>
      ) : (
        <>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {rows.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => void openMessage(m)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-xs touch-manipulation ${m.read ? 'border-border bg-card' : 'border-info/40 bg-info/5'}`}
                >
                  <p className="font-medium text-foreground flex items-center gap-2">
                    {!m.read && tab === 'received' ? (
                      <span className="h-2 w-2 rounded-full bg-info shrink-0" aria-hidden />
                    ) : null}
                    {m.title}
                    {m.priority === 'high' ? (
                      <span className="text-[10px] uppercase text-destructive font-semibold">
                        {t('inbox.priorityBadgeHigh')}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {formatDateTime(m.created_at)}
                  </p>
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
        </>
      )}

      {tab !== 'compose' ? (
        <button type="button" onClick={() => void load()} className="text-xs text-primary underline">
          {t('inbox.refresh')}
        </button>
      ) : null}
    </div>
  )
}
