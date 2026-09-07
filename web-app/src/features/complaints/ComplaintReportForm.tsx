import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  COMPLAINT_CATEGORIES,
  createComplaint,
  type ComplaintCategory,
  type ComplaintUserItem,
} from '../../api/complaints'

type ComplaintReportFormProps = {
  token: string
  tripId?: string | null
  tripLabel?: string | null
  onClose: () => void
  onCreated?: (item: ComplaintUserItem) => void
}

export function ComplaintReportForm({
  token,
  tripId,
  tripLabel,
  onClose,
  onCreated,
}: ComplaintReportFormProps) {
  const { t } = useTranslation('complaints')
  const [category, setCategory] = useState<ComplaintCategory>('trip_service')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<ComplaintUserItem | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const item = await createComplaint(token, {
        category,
        description: description.trim(),
        trip_id: tripId || undefined,
      })
      setCreated(item)
      onCreated?.(item)
    } catch {
      setError(t('form.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <div className="space-y-3" data-testid="complaint-created">
        <p className="text-sm text-foreground">{t('form.success')}</p>
        <p className="text-sm font-mono font-semibold text-foreground" data-testid="complaint-public-ref">
          {created.public_reference}
        </p>
        <p className="text-xs text-muted-foreground">{t('form.successHint')}</p>
        <button
          type="button"
          className="text-sm underline text-foreground"
          onClick={onClose}
          data-testid="complaint-form-done"
        >
          {t('form.done')}
        </button>
      </div>
    )
  }

  return (
    <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)} data-testid="complaint-report-form">
      <h3 className="text-sm font-semibold text-foreground">{t('form.title')}</h3>
      {(tripLabel || tripId) && (
        <p className="text-xs text-muted-foreground" data-testid="complaint-trip-ref">
          {t('form.tripRef', { ref: tripLabel || tripId })}
        </p>
      )}
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">{t('form.category')}</span>
        <select
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
          data-testid="complaint-category"
        >
          {COMPLAINT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`categories.${c}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">{t('form.description')}</span>
        <textarea
          className="w-full min-h-[96px] rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
          required
          data-testid="complaint-description"
        />
      </label>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !description.trim()}
          className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
          data-testid="complaint-submit"
        >
          {submitting ? t('form.submitting') : t('form.submit')}
        </button>
        <button type="button" className="text-sm text-muted-foreground underline" onClick={onClose}>
          {t('form.cancel')}
        </button>
      </div>
    </form>
  )
}
