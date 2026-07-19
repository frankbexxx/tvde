import type { TripDetailAdmin } from '../../api/admin'
import { CancellationReasonMuted } from '../../components/trips/CancellationReasonMuted'
import {
  adminCancelledByLabel,
  adminPaymentStatusLabel,
  adminTripStatusLabel,
  formatAdminTripTimestamp,
} from './adminTripSupportLabels'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium break-all">{value}</span>
    </div>
  )
}

export type AdminTripDetailSupportFieldsProps = {
  tripDetail: TripDetailAdmin
  /** Estado na lista (activa/histórico), se diferente do detalhe API. */
  listStatus?: string
}

export function AdminTripDetailSupportFields(props: AdminTripDetailSupportFieldsProps) {
  const { tripDetail: d, listStatus } = props
  const statusLabel = adminTripStatusLabel(d.status)
  const paymentLabel = adminPaymentStatusLabel(
    typeof d.payment_status === 'string' ? d.payment_status : null
  )
  const cancelledBy = adminCancelledByLabel(
    typeof d.cancelled_by === 'string' ? d.cancelled_by : null
  )
  const cancelledAt = formatAdminTripTimestamp(d.cancelled_at)

  return (
    <div className="space-y-2" data-testid="admin-trip-detail-support">
      {listStatus ? (
        <DetailRow label="Estado (lista):" value={adminTripStatusLabel(listStatus)} />
      ) : null}
      <DetailRow label="Estado:" value={`${statusLabel} (${d.status})`} />
      <DetailRow label="Pagamento:" value={`${paymentLabel}${d.payment_status ? ` (${d.payment_status})` : ''}`} />
      <DetailRow
        label="Preço:"
        value={`Estimativa ${d.estimated_price} €${d.final_price != null ? ` · Final ${d.final_price} €` : ''}`}
      />
      {cancelledBy ? <DetailRow label="Cancelado por:" value={cancelledBy} /> : null}
      <CancellationReasonMuted reason={d.cancellation_reason} className="text-xs" />
      <div className="grid gap-1 rounded-lg border border-border/60 bg-muted/20 p-2">
        <p className="text-[11px] font-semibold text-foreground/90">Timestamps</p>
        <DetailRow label="Criada:" value={formatAdminTripTimestamp(d.created_at) ?? '—'} />
        <DetailRow label="Actualizada:" value={formatAdminTripTimestamp(d.updated_at) ?? '—'} />
        <DetailRow label="Início:" value={formatAdminTripTimestamp(d.started_at) ?? '—'} />
        <DetailRow label="Conclusão:" value={formatAdminTripTimestamp(d.completed_at) ?? '—'} />
        {cancelledAt ? <DetailRow label="Cancelada:" value={cancelledAt} /> : null}
      </div>
    </div>
  )
}
