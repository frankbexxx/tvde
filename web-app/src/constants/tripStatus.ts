import type { StatusVariant } from '../components/layout/StatusHeader'
import type { TripCreateResponse, TripDetailResponse } from '../api/trips'
import i18n from '../i18n'

/** Ordem do ciclo de vida da viagem (API ↔ UI). */
export const TRIP_STATE_RANK: Record<string, number> = {
  requested: 0,
  assigned: 1,
  accepted: 2,
  arriving: 3,
  ongoing: 4,
  completed: 10,
  cancelled: 10,
  failed: 10,
}

export function tripStateRank(s: string): number {
  return TRIP_STATE_RANK[s] ?? -1
}

export function isActiveTripStatus(status: string): boolean {
  return !['completed', 'cancelled', 'failed'].includes(status)
}

export function isFinalTripStatus(status: string): boolean {
  return ['completed', 'cancelled', 'failed'].includes(status)
}

/** Antes do motorista chegar ao ponto de recolha (visão passageiro). */
export function isPrePickupStatus(status: string): boolean {
  return status === 'requested' || status === 'assigned'
}

export function mergeDriverPolledWithOverride(
  polled: string | undefined,
  override: string | null,
  fallback: string
): string {
  if (!override) return polled ?? fallback
  const pr = polled !== undefined ? tripStateRank(polled) : -1
  const or = tripStateRank(override)
  if (pr >= or) return polled ?? fallback
  return override
}

export function mergePassengerPolledWithPending(
  polled: TripDetailResponse | null,
  pending: TripDetailResponse | null,
  tripId: string | null
): TripDetailResponse | null {
  if (!tripId) return polled
  if (!pending || pending.trip_id !== tripId) return polled
  if (!polled) return pending
  const pr = tripStateRank(polled.status)
  const pe = tripStateRank(pending.status)
  if (pr >= pe) return polled
  return { ...polled, status: pending.status }
}

const PASSENGER_STATUS_KEYS = [
  'requested',
  'assigned',
  'accepted',
  'arriving',
  'ongoing',
  'completed',
  'cancelled',
  'failed',
] as const

/** @deprecated Use passengerTripStatusLabel — kept for tests referencing PT literals. */
export const PASSENGER_TRIP_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PASSENGER_STATUS_KEYS.map((k) => [k, i18n.t(`trip:status.${k}`, { lng: 'pt' })])
)

export function passengerTripStatusLabel(status: string): string {
  const key = `trip:status.${status}`
  if (i18n.exists(key)) return i18n.t(key)
  return status
}

const DRIVER_ACTIVE_VARIANTS: Record<string, StatusVariant> = {
  assigned: 'assigned',
  accepted: 'accepted',
  arriving: 'arriving',
  ongoing: 'ongoing',
  completed: 'completed',
}

export function driverActiveTripUi(status: string): { label: string; variant: StatusVariant } {
  const key = `trip:driverActive.${status}`
  if (i18n.exists(key)) {
    return { label: i18n.t(key), variant: DRIVER_ACTIVE_VARIANTS[status] ?? 'idle' }
  }
  return { label: status, variant: 'idle' }
}

export function driverAvailableTripStatusLabel(): string {
  return i18n.t('trip:driverAvailable')
}

/** @deprecated */
export const DRIVER_AVAILABLE_TRIP_STATUS_LABEL = i18n.t('trip:driverAvailable', { lng: 'pt' })

export function driverNewTripListHint(): string {
  return i18n.t('trip:driverNewTripHint')
}

/** @deprecated */
export const DRIVER_NEW_TRIP_LIST_HINT = i18n.t('trip:driverNewTripHint', { lng: 'pt' })

export function driverTripBadgeShort(status: string): string {
  const key = `trip:driverBadge.${status}`
  if (i18n.exists(key)) return i18n.t(key)
  return status
}

/**
 * Classe Tailwind para um dot de 8px colorido, usado no histórico de viagens
 * (passenger e driver). Pattern semântico alinhado com a paleta do tema
 * (ver docs/meta/THEME_REFACTOR_2026-04-20.md):
 *
 *  - completed → verde `success` (resultado positivo).
 *  - failed    → `destructive/70` (algo correu mal, vale a atenção).
 *  - cancelled → cinza muted (cancelada é comum e normal; vermelho seria
 *                 alarmista para algo que o utilizador frequentemente inicia).
 *  - outros    → cinza muted (fallback defensivo).
 *
 * Uso típico:
 *   <span className={`h-2 w-2 rounded-full shrink-0 ${historyStatusDotColor(t.status)}`} />
 */
export function historyStatusDotColor(status: string): string {
  if (status === 'completed') return 'bg-success'
  if (status === 'failed') return 'bg-destructive/70'
  return 'bg-muted-foreground/40'
}

export function tripDetailFromCreateResponse(
  res: TripCreateResponse,
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
): TripDetailResponse {
  const now = new Date().toISOString()
  return {
    trip_id: res.trip_id,
    status: res.status,
    passenger_id: '',
    origin_lat: pickup.lat,
    origin_lng: pickup.lng,
    destination_lat: dropoff.lat,
    destination_lng: dropoff.lng,
    estimated_price: res.estimated_price,
    final_price: res.final_price,
    created_at: now,
    updated_at: now,
    payment_status: res.payment_status,
  }
}
