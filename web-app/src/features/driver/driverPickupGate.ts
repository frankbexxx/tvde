import {
  DRIVER_START_TRIP_MAX_DISTANCE_M,
  isWithinHaversineM,
} from '../../utils/geo'

/** Gate de UI/API local: «Iniciar viagem» só em `accepted` | `arriving` e perto do pickup contratual. */
export function canDriverStartTripNearPickup(
  displayStatus: string,
  driver: { lat: number; lng: number } | null | undefined,
  pickup: { lat: number; lng: number } | null | undefined
): boolean {
  if (displayStatus !== 'accepted' && displayStatus !== 'arriving') return true
  if (driver == null || pickup == null) return false
  return isWithinHaversineM(driver, pickup, DRIVER_START_TRIP_MAX_DISTANCE_M)
}
