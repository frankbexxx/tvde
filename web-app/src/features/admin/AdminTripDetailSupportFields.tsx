import type { TripDetailAdmin } from '../../api/admin'
import { CancellationReasonMuted } from '../../components/trips/CancellationReasonMuted'
import { formatPetSurchargeEuro } from '../trips/tripPetReporting'
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
  const breakdown =
    d.price_breakdown && typeof d.price_breakdown === 'object'
      ? (d.price_breakdown as Record<string, unknown>)
      : null
  const rejections = Array.isArray(d.offer_rejections) ? d.offer_rejections : []

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
      {breakdown ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-1" data-testid="admin-trip-price-breakdown">
          <DetailRow
            label="Subtotal tarifa:"
            value={`${Number(breakdown.fare_subtotal ?? 0).toFixed(2)} €`}
          />
          <DetailRow
            label="Suplemento animal:"
            value={
              d.is_assistance_animal || Number(breakdown.pet_surcharge ?? 0) <= 0
                ? 'Sem suplemento'
                : `${Number(breakdown.pet_surcharge).toFixed(2)} €`
            }
          />
          <DetailRow label="Portagens:" value={`${Number(breakdown.tolls_amount ?? 0).toFixed(2)} €`} />
          <DetailRow label="Total:" value={`${Number(breakdown.total ?? d.final_price ?? d.estimated_price).toFixed(2)} €`} />
          {typeof breakdown.pet_surcharge_rule === 'string' ? (
            <DetailRow label="Regra Pet:" value={breakdown.pet_surcharge_rule} />
          ) : null}
        </div>
      ) : null}
      <DetailRow label="Passageiros:" value={String(d.passenger_count ?? 1)} />
      {typeof d.vehicle_category === 'string' && d.vehicle_category ? (
        <DetailRow label="Categoria:" value={d.vehicle_category} />
      ) : null}
      {typeof d.vehicle_plate === 'string' && d.vehicle_plate ? (
        <DetailRow label="Matrícula:" value={d.vehicle_plate} />
      ) : null}
      {typeof d.driver_id === 'string' && d.driver_id ? (
        <DetailRow label="Motorista:" value={d.driver_id} />
      ) : null}
      {cancelledBy ? <DetailRow label="Cancelado por:" value={cancelledBy} /> : null}
      <CancellationReasonMuted reason={d.cancellation_reason} className="text-xs" />
      {typeof d.cancellation_reason_code === 'string' && d.cancellation_reason_code ? (
        <DetailRow label="Código motivo:" value={d.cancellation_reason_code} />
      ) : null}
      {typeof d.cancellation_reason_detail === 'string' && d.cancellation_reason_detail.trim() ? (
        <DetailRow label="Detalhe interno:" value={d.cancellation_reason_detail.trim()} />
      ) : null}
      {d.is_assistance_animal ? (
        <div className="space-y-1" data-testid="admin-trip-animal-block">
          <DetailRow label="Animal:" value="Cão de assistência" />
          <DetailRow label="Suplemento:" value="Sem suplemento" />
          {d.pet_occupies_seat ? <DetailRow label="Lugar:" value="Ocupa lugar" /> : null}
        </div>
      ) : d.has_pet || (typeof d.vehicle_category === 'string' && d.vehicle_category.toLowerCase() === 'pet') ? (
        <div className="space-y-1" data-testid="admin-trip-animal-block">
          <DetailRow label="Animal:" value="Com animal" />
          {typeof d.pet_size === 'string' && d.pet_size ? (
            <DetailRow label="Porte:" value={d.pet_size} />
          ) : null}
          {typeof d.pet_transport === 'string' && d.pet_transport ? (
            <DetailRow label="Transporte:" value={d.pet_transport} />
          ) : null}
          {d.pet_occupies_seat ? <DetailRow label="Lugar:" value="Ocupa lugar" /> : null}
          <DetailRow
            label="Suplemento:"
            value={formatPetSurchargeEuro(typeof d.pet_surcharge === 'number' ? d.pet_surcharge : null) ?? 'Sem suplemento'}
          />
        </div>
      ) : null}
      {rejections.length > 0 ? (
        <div className="space-y-1" data-testid="admin-trip-offer-rejections">
          <p className="text-[11px] font-semibold text-foreground/90">Recusas de oferta</p>
          {rejections.map((raw, idx) => {
            const r = raw as Record<string, unknown>
            const id = typeof r.offer_id === 'string' ? r.offer_id : `rej-${idx}`
            return (
              <div key={id} className="rounded-md border border-border/50 bg-muted/15 p-2 space-y-0.5">
                <DetailRow
                  label="Motivo:"
                  value={String(r.reason_label ?? r.reason_code ?? '—')}
                />
                {typeof r.reason_code === 'string' ? (
                  <DetailRow label="Código:" value={r.reason_code} />
                ) : null}
                {typeof r.reason_detail === 'string' && r.reason_detail ? (
                  <DetailRow label="Detalhe:" value={r.reason_detail} />
                ) : null}
                {typeof r.driver_id === 'string' ? (
                  <DetailRow label="Motorista:" value={r.driver_id} />
                ) : null}
                {typeof r.rejected_at === 'string' ? (
                  <DetailRow label="Quando:" value={formatAdminTripTimestamp(r.rejected_at) ?? r.rejected_at} />
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
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
