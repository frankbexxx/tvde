import { useTranslation } from 'react-i18next'
import type { TripDetailResponse } from '../../api/trips'
import { formatPickup, formatDestination } from '../../utils/format'
import { CancellationReasonMuted } from '../../components/trips/CancellationReasonMuted'
import { historyStatusDotColor } from '../../constants/tripStatus'
import { MENU_SURFACE } from '../../components/layout/infoBoxTemplate'
import { formatDateTime } from '../../i18n/format'

type PassengerHistoryDetailPanelProps = {
  detail: TripDetailResponse | null
  loading: boolean
  error: string | null
}

function formatWhen(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return formatDateTime(iso, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function PassengerHistoryDetailPanel({
  detail,
  loading,
  error,
}: PassengerHistoryDetailPanelProps) {
  const { t } = useTranslation('passenger')

  if (loading && !detail) {
    return <p className="text-sm text-muted-foreground">{t('historyDetail.loading')}</p>
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (!detail) {
    return <p className="text-sm text-muted-foreground">{t('historyDetail.unavailable')}</p>
  }

  const price =
    detail.final_price != null
      ? `${detail.final_price} €`
      : detail.estimated_price != null
        ? `~${detail.estimated_price} €`
        : '—'

  return (
    <div className={`space-y-3 ${MENU_SURFACE} p-3`} data-testid="passenger-history-detail">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${historyStatusDotColor(detail.status)}`}
        />
        <span className="text-sm font-medium capitalize text-foreground">{detail.status}</span>
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-foreground/90">
          <span className="text-muted-foreground">{t('historyDetail.pickup')}</span>{' '}
          {formatPickup(detail.origin_lat, detail.origin_lng)}
        </p>
        <p className="text-foreground/90">
          <span className="text-muted-foreground">{t('historyDetail.destination')}</span>{' '}
          {formatDestination(detail.destination_lat, detail.destination_lng)}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">{t('historyDetail.price')}</dt>
          <dd className="font-semibold tabular-nums text-foreground">{price}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('historyDetail.payment')}</dt>
          <dd className="font-medium text-foreground">{detail.payment_status ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('historyDetail.created')}</dt>
          <dd className="text-foreground">{formatWhen(detail.created_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('historyDetail.completed')}</dt>
          <dd className="text-foreground">{formatWhen(detail.completed_at)}</dd>
        </div>
      </dl>
      <p className="text-[11px] font-mono text-muted-foreground break-all">
        {t('historyDetail.tripId', { id: detail.trip_id })}
      </p>
      <CancellationReasonMuted reason={detail.cancellation_reason} />
    </div>
  )
}
