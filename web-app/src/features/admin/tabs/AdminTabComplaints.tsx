import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../context/AuthContext'
import {
  ADMIN_EXTERNAL_SOURCES,
  COMPLAINT_CATEGORIES,
  createAdminExternalComplaint,
  getAdminComplaint,
  listAdminComplaints,
  updateAdminComplaint,
  type ComplaintAdminItem,
  type ComplaintAdminListItem,
  type ComplaintCategory,
  type ComplaintSource,
  type ComplaintStatus,
} from '../../../api/complaints'

const STATUSES: ComplaintStatus[] = [
  'received',
  'under_review',
  'awaiting_info',
  'resolved',
  'closed',
]

type ExternalForm = {
  source: Exclude<ComplaintSource, 'in_app'>
  category: ComplaintCategory
  description: string
  submitted_at: string
  external_reference: string
  complainant_name: string
  complainant_email: string
  complainant_phone: string
  external_response_due_at: string
}

const emptyExternalForm = (): ExternalForm => ({
  source: 'livro_reclamacoes',
  category: 'other',
  description: '',
  submitted_at: new Date().toISOString().slice(0, 16),
  external_reference: '',
  complainant_name: '',
  complainant_email: '',
  complainant_phone: '',
  external_response_due_at: '',
})

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
  const [showImport, setShowImport] = useState(false)
  const [extForm, setExtForm] = useState<ExternalForm>(emptyExternalForm)
  const [creating, setCreating] = useState(false)

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

  async function createExternal() {
    if (!token) return
    setCreating(true)
    setError(null)
    try {
      const submitted = new Date(extForm.submitted_at)
      if (Number.isNaN(submitted.getTime())) {
        setError(t('admin.error'))
        return
      }
      const due = extForm.external_response_due_at.trim()
        ? new Date(extForm.external_response_due_at)
        : null
      if (due && Number.isNaN(due.getTime())) {
        setError(t('admin.error'))
        return
      }
      const created = await createAdminExternalComplaint(token, {
        source: extForm.source,
        category: extForm.category,
        description: extForm.description.trim(),
        submitted_at: submitted.toISOString(),
        external_reference: extForm.external_reference.trim() || null,
        complainant_name: extForm.complainant_name.trim() || null,
        complainant_email: extForm.complainant_email.trim() || null,
        complainant_phone: extForm.complainant_phone.trim() || null,
        external_response_due_at: due ? due.toISOString() : null,
      })
      setShowImport(false)
      setExtForm(emptyExternalForm())
      setSelected(created)
      await refresh()
    } catch {
      setError(t('admin.error'))
    } finally {
      setCreating(false)
    }
  }

  const showActiveResolution =
    selected &&
    (selected.status === 'resolved' ||
      selected.status === 'closed' ||
      nextStatus === 'resolved')

  return (
    <section className="space-y-4" data-testid="admin-tab-complaints">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{t('admin.title')}</h2>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm"
          onClick={() => setShowImport((v) => !v)}
          data-testid="admin-complaint-import-toggle"
        >
          {t('admin.newExternal')}
        </button>
      </div>

      {showImport ? (
        <div
          className="rounded-lg border border-border/60 p-3 space-y-2"
          data-testid="admin-complaint-external-form"
        >
          <p className="text-sm font-medium">{t('admin.newExternal')}</p>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">{t('admin.source')}</span>
            <select
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={extForm.source}
              onChange={(e) =>
                setExtForm((f) => ({
                  ...f,
                  source: e.target.value as Exclude<ComplaintSource, 'in_app'>,
                }))
              }
              data-testid="admin-complaint-ext-source"
            >
              {ADMIN_EXTERNAL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {t(`sources.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">{t('admin.externalReference')}</span>
            <input
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={extForm.external_reference}
              onChange={(e) =>
                setExtForm((f) => ({ ...f, external_reference: e.target.value }))
              }
              data-testid="admin-complaint-ext-reference"
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">{t('admin.submittedAt')}</span>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={extForm.submitted_at}
              onChange={(e) =>
                setExtForm((f) => ({ ...f, submitted_at: e.target.value }))
              }
              data-testid="admin-complaint-ext-submitted"
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">{t('admin.category')}</span>
            <select
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={extForm.category}
              onChange={(e) =>
                setExtForm((f) => ({
                  ...f,
                  category: e.target.value as ComplaintCategory,
                }))
              }
              data-testid="admin-complaint-ext-category"
            >
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">{t('form.description')}</span>
            <textarea
              className="w-full min-h-[72px] rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={extForm.description}
              onChange={(e) =>
                setExtForm((f) => ({ ...f, description: e.target.value }))
              }
              data-testid="admin-complaint-ext-description"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">{t('admin.complainantName')}</span>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={extForm.complainant_name}
                onChange={(e) =>
                  setExtForm((f) => ({ ...f, complainant_name: e.target.value }))
                }
                data-testid="admin-complaint-ext-name"
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">{t('admin.complainantEmail')}</span>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={extForm.complainant_email}
                onChange={(e) =>
                  setExtForm((f) => ({ ...f, complainant_email: e.target.value }))
                }
                data-testid="admin-complaint-ext-email"
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">{t('admin.complainantPhone')}</span>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={extForm.complainant_phone}
                onChange={(e) =>
                  setExtForm((f) => ({ ...f, complainant_phone: e.target.value }))
                }
                data-testid="admin-complaint-ext-phone"
              />
            </label>
          </div>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">{t('admin.dueAt')}</span>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={extForm.external_response_due_at}
              onChange={(e) =>
                setExtForm((f) => ({
                  ...f,
                  external_response_due_at: e.target.value,
                }))
              }
              data-testid="admin-complaint-ext-due"
            />
          </label>
          <button
            type="button"
            className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
            disabled={creating || !extForm.description.trim()}
            onClick={() => void createExternal()}
            data-testid="admin-complaint-ext-submit"
          >
            {creating ? t('form.submitting') : t('admin.createExternal')}
          </button>
        </div>
      ) : null}

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
                  {row.status} · {row.category} · {row.source}
                  {row.external_reference ? ` · ${row.external_reference}` : ''}
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
              <p className="text-xs text-muted-foreground" data-testid="admin-complaint-detail-source">
                {selected.source}
                {selected.external_reference
                  ? ` · ${selected.external_reference}`
                  : ''}{' '}
                · {selected.status} · {selected.category}
              </p>
              {selected.complainant_name ||
              selected.complainant_email ||
              selected.complainant_phone ? (
                <p className="text-xs text-muted-foreground">
                  {[selected.complainant_name, selected.complainant_email, selected.complainant_phone]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}
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
