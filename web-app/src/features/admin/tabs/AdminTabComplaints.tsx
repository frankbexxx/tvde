import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../context/AuthContext'
import {
  COMPLAINT_CATEGORIES,
  getAdminComplaint,
  listAdminComplaints,
  updateAdminComplaint,
  type ComplaintAdminItem,
  type ComplaintAdminListItem,
  type ComplaintStatus,
} from '../../../api/complaints'

const STATUSES: ComplaintStatus[] = [
  'received',
  'under_review',
  'awaiting_info',
  'resolved',
  'closed',
]

export function AdminTabComplaints() {
  const { t } = useTranslation('complaints')
  const { token } = useAuth()
  const [rows, setRows] = useState<ComplaintAdminListItem[]>([])
  const [selected, setSelected] = useState<ComplaintAdminItem | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [resolution, setResolution] = useState('')
  const [nextStatus, setNextStatus] = useState<ComplaintStatus | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const list = await listAdminComplaints(token, {
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      })
      setRows(list)
    } catch {
      setError(t('admin.error'))
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter, categoryFilter, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function openDetail(ref: string) {
    if (!token) return
    setError(null)
    try {
      const detail = await getAdminComplaint(token, ref)
      setSelected(detail)
      setNextStatus('')
      setResolution(
        detail.status === 'resolved' || detail.status === 'closed'
          ? detail.resolution || ''
          : ''
      )
    } catch {
      setError(t('admin.error'))
    }
  }

  async function save() {
    if (!token || !selected) return
    setError(null)
    try {
      const body: {
        status?: ComplaintStatus
        resolution?: string
      } = {}
      if (nextStatus) body.status = nextStatus
      if (
        nextStatus === 'resolved' ||
        selected.status === 'resolved' ||
        resolution.trim()
      ) {
        if (resolution.trim()) body.resolution = resolution.trim()
      }
      const updated = await updateAdminComplaint(token, selected.public_reference, body)
      setSelected(updated)
      await refresh()
    } catch {
      setError(t('admin.error'))
    }
  }

  const showActiveResolution =
    selected &&
    (selected.status === 'resolved' ||
      selected.status === 'closed' ||
      nextStatus === 'resolved')

  return (
    <section className="space-y-4" data-testid="admin-tab-complaints">
      <h2 className="text-lg font-semibold text-foreground">{t('admin.title')}</h2>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">{t('admin.status')}</span>
          <select
            className="block rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="admin-complaint-filter-status"
          >
            <option value="">{t('admin.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">{t('admin.category')}</span>
          <select
            className="block rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            data-testid="admin-complaint-filter-category"
          >
            <option value="">{t('admin.all')}</option>
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Atualizar
        </button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto" data-testid="admin-complaint-list">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="w-full text-left rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/30"
                onClick={() => void openDetail(row.public_reference)}
                data-testid={`admin-complaint-row-${row.public_reference}`}
              >
                <div className="font-mono text-xs font-semibold">{row.public_reference}</div>
                <div className="text-xs text-muted-foreground">
                  {row.status} · {row.category} · {row.complainant_role}
                </div>
              </button>
            </li>
          ))}
          {!rows.length && !loading ? (
            <li className="text-sm text-muted-foreground">{t('list.empty')}</li>
          ) : null}
        </ul>
        <div className="rounded-lg border border-border/60 p-3 space-y-3" data-testid="admin-complaint-detail">
          {!selected ? (
            <p className="text-sm text-muted-foreground">{t('admin.noSelection')}</p>
          ) : (
            <>
              <p className="font-mono text-sm font-semibold">{selected.public_reference}</p>
              <p className="text-xs text-muted-foreground">
                {selected.status} · {selected.category}
              </p>
              <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">{t('admin.status')}</span>
                <select
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as ComplaintStatus | '')}
                  data-testid="admin-complaint-next-status"
                >
                  <option value="">— {selected.status}</option>
                  {STATUSES.filter((s) => s !== selected.status).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              {showActiveResolution || nextStatus === 'resolved' ? (
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">{t('admin.resolution')}</span>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    data-testid="admin-complaint-resolution"
                  />
                </label>
              ) : selected.resolution ? (
                <p className="text-xs text-muted-foreground">
                  Resolução anterior (não vigente): {selected.resolution}
                </p>
              ) : null}
              <button
                type="button"
                className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background"
                onClick={() => void save()}
                data-testid="admin-complaint-save"
              >
                {t('admin.save')}
              </button>
              <div>
                <p className="text-xs font-semibold mb-1">{t('admin.timeline')}</p>
                <ol className="space-y-1 text-[11px] text-muted-foreground" data-testid="admin-complaint-history">
                  {selected.history.map((h, i) => (
                    <li key={`${h.event_type}-${h.occurred_at}-${i}`}>
                      {h.occurred_at}: {h.event_type}
                      {h.from_status || h.to_status
                        ? ` (${h.from_status ?? '—'} → ${h.to_status ?? '—'})`
                        : ''}
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
