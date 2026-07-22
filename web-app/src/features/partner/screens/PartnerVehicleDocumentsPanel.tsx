import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiError } from '../../../api/client'
import {
  PARTNER_VEHICLE_DOCUMENT_TYPES,
  createPartnerVehicleDocument,
  deletePartnerVehicleDocument,
  downloadPartnerVehicleDocumentFile,
  fetchPartnerVehicleDocuments,
  patchPartnerVehicleDocument,
  uploadPartnerVehicleDocument,
  type PartnerVehicleDocumentRow,
  type PartnerVehicleDocumentStoredStatus,
  type PartnerVehicleDocumentType,
} from '../../../api/partner'
import { triggerBlobDownload } from '../triggerBlobDownload'
import {
  VEHICLE_DOC_ACCEPT,
  validateVehicleDocumentFile,
  vehicleDocumentDisplayStatus,
} from '../vehicleDocumentHelpers'

type DocFormState = {
  document_number: string
  issuer: string
  issued_at: string
  valid_from: string
  expires_at: string
  notes: string
  status: PartnerVehicleDocumentStoredStatus
}

const emptyDocForm = (): DocFormState => ({
  document_number: '',
  issuer: '',
  issued_at: '',
  valid_from: '',
  expires_at: '',
  notes: '',
  status: 'pending_review',
})

function formFromDoc(doc: PartnerVehicleDocumentRow): DocFormState {
  const status = (doc.status || 'pending_review').toLowerCase()
  const stored: PartnerVehicleDocumentStoredStatus =
    status === 'approved' || status === 'rejected' ? status : 'pending_review'
  return {
    document_number: doc.document_number ?? '',
    issuer: doc.issuer ?? '',
    issued_at: toDateInput(doc.issued_at),
    valid_from: toDateInput(doc.valid_from),
    expires_at: toDateInput(doc.expires_at),
    notes: doc.notes ?? '',
    status: stored,
  }
}

/** HTML date input value from ISO timestamp. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : ''
}

/** Send date-only fields as UTC midnight ISO for the backend. */
function dateToApi(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  return `${t}T00:00:00Z`
}

type SlotView = {
  document_type: PartnerVehicleDocumentType
  doc: PartnerVehicleDocumentRow | null
}

type PartnerVehicleDocumentsPanelProps = {
  vehicleId: string
}

export function PartnerVehicleDocumentsPanel({ vehicleId }: PartnerVehicleDocumentsPanelProps) {
  const { t } = useTranslation('partner')
  const [docs, setDocs] = useState<PartnerVehicleDocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<PartnerVehicleDocumentType | null>(null)
  const [form, setForm] = useState<DocFormState>(emptyDocForm)
  const [file, setFile] = useState<File | null>(null)

  const apiErrorMessage = useCallback(
    (e: unknown, fallbackKey: string) => {
      const status = e && typeof e === 'object' && 'status' in e ? (e as ApiError).status : undefined
      const detailRaw =
        e && typeof e === 'object' && 'detail' in e ? (e as ApiError).detail : undefined
      const detail = typeof detailRaw === 'string' ? detailRaw : undefined
      if (detail === 'document_type_exists' || (status === 409 && detail?.includes('document_type'))) {
        return t('vehicles.documents.errors.typeExists')
      }
      if (detail === 'file_too_large' || status === 413) {
        return t('vehicles.documents.errors.fileTooLarge')
      }
      if (detail === 'invalid_file_type' || status === 415) {
        return t('vehicles.documents.errors.invalidFileType')
      }
      if (status === 403) return t('vehicles.documents.errors.forbidden')
      if (status === 404 || detail === 'not_found' || detail === 'document_not_found') {
        return t('vehicles.documents.errors.notFound')
      }
      if (detail) return detail
      return t(fallbackKey)
    },
    [t]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchPartnerVehicleDocuments(vehicleId)
      setDocs(rows)
    } catch (e) {
      setError(apiErrorMessage(e, 'vehicles.documents.loadError'))
    } finally {
      setLoading(false)
    }
  }, [apiErrorMessage, vehicleId])

  useEffect(() => {
    void load()
  }, [load])

  const slots: SlotView[] = useMemo(() => {
    const byType = new Map(docs.map((d) => [d.document_type, d]))
    return PARTNER_VEHICLE_DOCUMENT_TYPES.map((document_type) => ({
      document_type,
      doc: byType.get(document_type) ?? null,
    }))
  }, [docs])

  const openCreate = (documentType: PartnerVehicleDocumentType) => {
    setEditingType(documentType)
    setForm(emptyDocForm())
    setFile(null)
    setError(null)
    setSuccess(null)
  }

  const openEdit = (doc: PartnerVehicleDocumentRow) => {
    setEditingType(doc.document_type as PartnerVehicleDocumentType)
    setForm(formFromDoc(doc))
    setFile(null)
    setError(null)
    setSuccess(null)
  }

  const closeForm = () => {
    setEditingType(null)
    setForm(emptyDocForm())
    setFile(null)
  }

  const onPickFile = (picked: File | null, inputEl: HTMLInputElement | null) => {
    if (!picked) {
      setFile(null)
      return
    }
    const invalid = validateVehicleDocumentFile(picked)
    if (invalid) {
      setError(t(`vehicles.documents.errors.${invalid}`))
      setFile(null)
      if (inputEl) inputEl.value = ''
      return
    }
    setError(null)
    setFile(picked)
  }

  const onSave = async (documentType: PartnerVehicleDocumentType) => {
    setError(null)
    setSuccess(null)
    if (file) {
      const invalid = validateVehicleDocumentFile(file)
      if (invalid) {
        setError(t(`vehicles.documents.errors.${invalid}`))
        return
      }
    }
    setBusy(true)
    try {
      const existing = docs.find((d) => d.document_type === documentType) ?? null
      const body = {
        document_number: form.document_number.trim() || null,
        issuer: form.issuer.trim() || null,
        issued_at: dateToApi(form.issued_at),
        valid_from: dateToApi(form.valid_from),
        expires_at: dateToApi(form.expires_at),
        notes: form.notes.trim() || null,
        status: form.status,
      }
      let doc: PartnerVehicleDocumentRow
      if (existing) {
        doc = await patchPartnerVehicleDocument(vehicleId, existing.id, body)
      } else {
        doc = await createPartnerVehicleDocument(vehicleId, {
          document_type: documentType,
          ...body,
        })
      }
      // Metadata is committed before the separate upload request. Keep the
      // persisted row in local state so a failed upload retries as an edit
      // instead of attempting a duplicate create.
      setDocs((current) => [
        ...current.filter((item) => item.document_type !== doc.document_type),
        doc,
      ])
      if (file) {
        doc = await uploadPartnerVehicleDocument(vehicleId, doc.id, file)
      }
      setSuccess(
        existing
          ? t('vehicles.documents.updatedOk')
          : t('vehicles.documents.createdOk')
      )
      closeForm()
      await load()
      void doc
    } catch (e) {
      setError(
        apiErrorMessage(
          e,
          file ? 'vehicles.documents.uploadError' : 'vehicles.documents.saveError'
        )
      )
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (doc: PartnerVehicleDocumentRow) => {
    if (!window.confirm(t('vehicles.documents.confirmDelete'))) return
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      await deletePartnerVehicleDocument(vehicleId, doc.id)
      setSuccess(t('vehicles.documents.deletedOk'))
      if (editingType === doc.document_type) closeForm()
      await load()
    } catch (e) {
      setError(apiErrorMessage(e, 'vehicles.documents.deleteError'))
    } finally {
      setBusy(false)
    }
  }

  const onDownload = async (doc: PartnerVehicleDocumentRow) => {
    setError(null)
    setBusy(true)
    try {
      const blob = await downloadPartnerVehicleDocumentFile(vehicleId, doc.id)
      triggerBlobDownload(blob, doc.file_name || `${doc.document_type}.bin`)
    } catch (e) {
      setError(apiErrorMessage(e, 'vehicles.documents.downloadError'))
    } finally {
      setBusy(false)
    }
  }

  const fieldClass =
    'w-full min-h-10 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground'

  const statusLabel = (doc: PartnerVehicleDocumentRow | null, missing: boolean) => {
    const key = vehicleDocumentDisplayStatus(doc, missing)
    if (key === 'expired_pending') return t('vehicles.documents.status.expiredPending')
    const known = [
      'missing',
      'pending_review',
      'valid',
      'expiring_soon',
      'expired',
      'rejected',
    ] as const
    if ((known as readonly string[]).includes(key)) {
      return t(`vehicles.documents.status.${key}`)
    }
    return key
  }

  const typeLabel = (documentType: PartnerVehicleDocumentType) =>
    t(`vehicles.documents.types.${documentType}`)

  return (
    <div
      className="space-y-2 border-t border-border pt-2"
      data-testid="partner-vehicle-docs-panel"
    >
      <p className="text-xs font-semibold text-foreground">{t('vehicles.documents.title')}</p>

      {error ? (
        <p
          className="text-xs text-destructive"
          role="alert"
          data-testid="partner-vehicle-docs-error"
        >
          {error}
        </p>
      ) : null}
      {success && !error ? (
        <p
          className="text-xs text-success"
          role="status"
          data-testid="partner-vehicle-docs-success"
        >
          {success}
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs text-muted-foreground" data-testid="partner-vehicle-docs-loading">
          {t('vehicles.documents.loading')}
        </p>
      ) : null}

      {!loading
        ? slots.map(({ document_type, doc }) => {
          const missing = !doc
          const editing = editingType === document_type
          return (
            <div
              key={document_type}
              className="rounded-lg border border-border/80 bg-background/60 p-2 space-y-1.5"
              data-testid={`partner-vehicle-doc-slot-${document_type}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold">{typeLabel(document_type)}</p>
                  <p
                    className="text-[11px] text-muted-foreground"
                    data-testid={`partner-vehicle-doc-status-${document_type}`}
                  >
                    {statusLabel(doc, missing)}
                    {doc?.expires_at
                      ? ` · ${t('vehicles.documents.expiresAt')}: ${toDateInput(doc.expires_at)}`
                      : ''}
                  </p>
                  {doc?.file_name ? (
                    <p
                      className="text-[11px] text-muted-foreground truncate"
                      data-testid={`partner-vehicle-doc-file-${document_type}`}
                    >
                      {doc.file_name}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {missing ? (
                    <button
                      type="button"
                      data-testid={`partner-vehicle-doc-add-${document_type}`}
                      disabled={busy}
                      onClick={() => openCreate(document_type)}
                      className="min-h-8 rounded-lg border border-border px-2 text-[11px] font-semibold disabled:opacity-50"
                    >
                      {t('vehicles.documents.add')}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        data-testid={`partner-vehicle-doc-edit-${document_type}`}
                        disabled={busy}
                        onClick={() => openEdit(doc)}
                        className="min-h-8 rounded-lg border border-border px-2 text-[11px] font-semibold disabled:opacity-50"
                      >
                        {t('vehicles.documents.edit')}
                      </button>
                      {doc.has_file ? (
                        <button
                          type="button"
                          data-testid={`partner-vehicle-doc-download-${document_type}`}
                          disabled={busy}
                          onClick={() => void onDownload(doc)}
                          className="min-h-8 rounded-lg border border-border px-2 text-[11px] font-semibold disabled:opacity-50"
                        >
                          {t('vehicles.documents.download')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        data-testid={`partner-vehicle-doc-delete-${document_type}`}
                        disabled={busy}
                        onClick={() => void onDelete(doc)}
                        className="min-h-8 rounded-lg border border-destructive/40 px-2 text-[11px] font-semibold text-destructive disabled:opacity-50"
                      >
                        {t('vehicles.documents.remove')}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editing ? (
                <div
                  className="grid gap-1.5 border-t border-border/60 pt-2"
                  data-testid={`partner-vehicle-doc-form-${document_type}`}
                >
                  <input
                    className={fieldClass}
                    data-testid={`partner-vehicle-doc-field-number-${document_type}`}
                    placeholder={t('vehicles.documents.fields.documentNumber')}
                    value={form.document_number}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, document_number: e.target.value }))
                    }
                  />
                  <input
                    className={fieldClass}
                    data-testid={`partner-vehicle-doc-field-issuer-${document_type}`}
                    placeholder={t('vehicles.documents.fields.issuer')}
                    value={form.issuer}
                    onChange={(e) => setForm((prev) => ({ ...prev, issuer: e.target.value }))}
                  />
                  <label className="text-[11px] text-muted-foreground space-y-0.5">
                    <span>{t('vehicles.documents.fields.issuedAt')}</span>
                    <input
                      type="date"
                      className={fieldClass}
                      data-testid={`partner-vehicle-doc-field-issued-${document_type}`}
                      value={form.issued_at}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, issued_at: e.target.value }))
                      }
                    />
                  </label>
                  <label className="text-[11px] text-muted-foreground space-y-0.5">
                    <span>{t('vehicles.documents.fields.validFrom')}</span>
                    <input
                      type="date"
                      className={fieldClass}
                      data-testid={`partner-vehicle-doc-field-valid-from-${document_type}`}
                      value={form.valid_from}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, valid_from: e.target.value }))
                      }
                    />
                  </label>
                  <label className="text-[11px] text-muted-foreground space-y-0.5">
                    <span>{t('vehicles.documents.fields.expiresAt')}</span>
                    <input
                      type="date"
                      className={fieldClass}
                      data-testid={`partner-vehicle-doc-field-expires-${document_type}`}
                      value={form.expires_at}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, expires_at: e.target.value }))
                      }
                    />
                  </label>
                  <textarea
                    className={fieldClass}
                    data-testid={`partner-vehicle-doc-field-notes-${document_type}`}
                    placeholder={t('vehicles.documents.fields.notes')}
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                  <select
                    className={fieldClass}
                    data-testid={`partner-vehicle-doc-field-status-${document_type}`}
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as PartnerVehicleDocumentStoredStatus,
                      }))
                    }
                  >
                    <option value="pending_review">
                      {t('vehicles.documents.storedStatus.pending_review')}
                    </option>
                    <option value="approved">
                      {t('vehicles.documents.storedStatus.approved')}
                    </option>
                    <option value="rejected">
                      {t('vehicles.documents.storedStatus.rejected')}
                    </option>
                  </select>
                  <label className="text-[11px] text-muted-foreground space-y-0.5">
                    <span>{t('vehicles.documents.fields.file')}</span>
                    <input
                      type="file"
                      accept={VEHICLE_DOC_ACCEPT}
                      data-testid={`partner-vehicle-doc-field-file-${document_type}`}
                      className="block w-full text-xs"
                      onChange={(e) =>
                        onPickFile(e.target.files?.[0] ?? null, e.currentTarget)
                      }
                    />
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      data-testid={`partner-vehicle-doc-save-${document_type}`}
                      disabled={busy}
                      onClick={() => void onSave(document_type)}
                      className="flex-1 min-h-9 rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {busy ? t('vehicles.documents.saving') : t('vehicles.documents.save')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={closeForm}
                      className="flex-1 min-h-9 rounded-lg border border-border text-[11px] font-semibold disabled:opacity-50"
                    >
                      {t('vehicles.documents.cancel')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })
        : null}
    </div>
  )
}
