import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { rateTripPassenger } from '../../api/trips'
import { isTimeoutLikeError } from '../../api/client'
import { toast } from 'sonner'
import {
  BTN_SECONDARY,
  BTN_SECONDARY_RADIUS,
  INFO_BOX_BODY_COMPACT,
  INFO_BOX_PASSENGER,
  INFO_BOX_TITLE_COMPACT,
} from '../../components/layout/infoBoxTemplate'

const STARS = [1, 2, 3, 4, 5] as const

export function PassengerTripRatingPanel({
  tripId,
  token,
  onSubmitted,
  onSkip,
}: {
  tripId: string
  token: string
  onSubmitted: () => void
  onSkip: () => void
}) {
  const { t } = useTranslation('passenger')
  const [rating, setRating] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (rating == null) return
    setBusy(true)
    try {
      await rateTripPassenger(tripId, token, rating)
      toast.success(t('trip.thanksRating'))
      onSubmitted()
    } catch (err: unknown) {
      const e = err as { status?: number; detail?: string }
      const msg = isTimeoutLikeError(err) || e?.status === 0
        ? t('rating.errorNetwork')
        : e?.status === 403
          ? t('rating.errorForbidden')
          : e?.status === 404
            ? t('rating.errorNotFound')
            : e?.detail === 'trip_not_completed'
              ? t('rating.errorNotCompleted')
              : String(e?.detail ?? t('rating.errorGeneric'))
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`${INFO_BOX_PASSENGER} p-3 space-y-2 shadow-card max-h-[min(38dvh,280px)] overflow-y-auto`}
      data-testid="passenger-trip-rating"
    >
      <div>
        <h2 className={INFO_BOX_TITLE_COMPACT}>{t('rating.title')}</h2>
        <p className={`${INFO_BOX_BODY_COMPACT} mt-0.5`}>{t('rating.subtitle')}</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start" role="group" aria-label={t('rating.starsAria')}>
        {STARS.map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            data-testid={`passenger-rating-star-${n}`}
            onClick={() => setRating(n)}
            className={`min-h-9 min-w-9 ${BTN_SECONDARY_RADIUS} border text-base font-semibold transition-colors touch-manipulation ${
              rating === n
                ? 'border-success bg-success text-success-foreground'
                : 'border-border bg-muted/40 text-foreground hover:bg-muted/70'
            } disabled:opacity-50`}
            aria-pressed={rating === n}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          className={`min-h-[44px] ${BTN_SECONDARY} px-4`}
        >
          {t('rating.skip')}
        </button>
        <button
          type="button"
          disabled={busy || rating == null}
          onClick={() => void submit()}
          className={`min-h-[44px] ${BTN_SECONDARY_RADIUS} bg-success px-4 text-sm font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50 touch-manipulation`}
        >
          {busy ? t('rating.submitting') : t('trip.sendRating')}
        </button>
      </div>
    </div>
  )
}
