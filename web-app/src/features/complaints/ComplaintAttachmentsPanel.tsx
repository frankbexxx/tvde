import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ATTACHMENT_ACCEPT,
  downloadComplaintAttachment,
  listAdminComplaintAttachments,
  listMyComplaintAttachments,
  uploadAdminComplaintAttachment,
  uploadMyComplaintAttachment,
  type ComplaintAttachmentItem,
} from '../../api/complaints'

const EMPTY_FILES: File[] = []
const MAX_FILES = 5
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['pdf', 'jpg', 'jpeg', 'png'])

export function validateAttachmentChoice(
  file: File,
  already: number
): 'type' | 'size' | 'count' | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED.has(ext)) return 'type'
  if (file.size > MAX_BYTES) return 'size'
  if (already >= MAX_FILES) return 'count'
  return null
}

type Props = {
  token: string
  publicReference: string
  status: string
  mode: 'user' | 'admin'
  pendingFiles?: File[]
}

export function ComplaintAttachmentsPanel({
  token,
  publicReference,
  status,
  mode,
  pendingFiles = EMPTY_FILES,
}: Props) {
  const { t } = useTranslation('complaints')
  const [items, setItems] = useState<ComplaintAttachmentItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const closed = status === 'closed'

  useEffect(() => {
    let cancelled = false
    const list =
      mode === 'admin' ? listAdminComplaintAttachments : listMyComplaintAttachments
    const upload =
      mode === 'admin' ? uploadAdminComplaintAttachment : uploadMyComplaintAttachment
    ;(async () => {
      for (const file of pendingFiles) {
        await upload(token, publicReference, file)
      }
      const rows = await list(token, publicReference)
      if (!cancelled) setItems(rows)
    })().catch(() => {
      if (!cancelled) setError(t('form.error'))
    })
    return () => {
      cancelled = true
    }
  }, [token, publicReference, mode, pendingFiles, t])

  async function onPick(file: File | undefined) {
    if (!file || closed) return
    const reason = validateAttachmentChoice(file, items.length)
    if (reason === 'type') {
      setError(t('form.attachmentsType'))
      return
    }
    if (reason === 'size') {
      setError(t('form.attachmentsSize'))
      return
    }
    if (reason === 'count') {
      setError(t('form.attachmentsCount'))
      return
    }
    setError(null)
    const upload =
      mode === 'admin' ? uploadAdminComplaintAttachment : uploadMyComplaintAttachment
    const row = await upload(token, publicReference, file)
    setItems((prev) => [...prev, row])
  }

  async function onDownload(item: ComplaintAttachmentItem) {
    const base = mode === 'admin' ? '/admin/complaints' : '/complaints'
    await downloadComplaintAttachment(
      token,
      `${base}/${encodeURIComponent(publicReference)}/attachments/${item.id}`,
      item.original_file_name
    )
  }

  return (
    <section aria-label={t('form.attachments')}>
      <h4>{t('form.attachments')}</h4>
      <p>{t('form.attachmentsHint')}</p>
      {items.length === 0 ? <p>{t('form.attachmentsEmpty')}</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.original_file_name}</span>
            <span>{item.mime_type}</span>
            <span>{item.size_bytes}</span>
            <span>{item.created_at}</span>
            {item.uploaded_by_user_id ? <span>{item.uploaded_by_user_id}</span> : null}
            <button type="button" onClick={() => void onDownload(item)}>
              {t('form.attachmentsDownload')}
            </button>
          </li>
        ))}
      </ul>
      {closed ? (
        <p>{t('form.attachmentsClosed')}</p>
      ) : (
        <label>
          {t('form.attachmentsAdd')}
          <input
            type="file"
            accept={ATTACHMENT_ACCEPT}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              void onPick(file)
            }}
          />
        </label>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  )
}
