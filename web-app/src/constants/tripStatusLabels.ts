import type { PaymentStatus } from '../api/trips'

export {
  PASSENGER_TRIP_STATUS_LABELS,
  passengerTripStatusLabel,
  DRIVER_ACTIVE_TRIP_UI,
  driverActiveTripUi,
  DRIVER_AVAILABLE_TRIP_STATUS_LABEL,
  DRIVER_NEW_TRIP_LIST_HINT,
} from './tripStatus'

/** Estado de pagamento vindo da API (`payment_status`) — só UI. */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pagamento pendente',
  processing: 'Pagamento a processar…',
  succeeded: 'Pagamento concluído',
  failed: 'Pagamento recusado',
}

export function paymentStatusLabel(status: PaymentStatus | undefined | null): string | null {
  if (status == null) return null
  return PAYMENT_STATUS_LABEL[status] ?? null
}
