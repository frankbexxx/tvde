import type { PaymentStatus } from '../api/trips'
import i18n from '../i18n'

export {
  PASSENGER_TRIP_STATUS_LABELS,
  passengerTripStatusLabel,
  driverActiveTripUi,
  driverAvailableTripStatusLabel,
  driverNewTripListHint,
  DRIVER_AVAILABLE_TRIP_STATUS_LABEL,
  DRIVER_NEW_TRIP_LIST_HINT,
} from './tripStatus'

/** Estado de pagamento vindo da API (`payment_status`) — só UI. */
export function paymentStatusLabel(status: PaymentStatus | undefined | null): string | null {
  if (status == null) return null
  const key = `trip:payment.${status}`
  if (i18n.exists(key)) return i18n.t(key)
  return null
}
