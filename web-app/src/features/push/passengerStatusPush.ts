import { setStoredAppRouteRole } from '../../utils/authStorage'

export const PASSENGER_STATUS_PUSH_EVENT = 'trip_status'
export const PASSENGER_STATUS_PUSH_STORAGE_KEY = 'passenger_status_push'
export const PASSENGER_STATUS_PUSH_DOM_EVENT = 'tvde-passenger-status-push'

const ACTIVE_STATUSES = new Set(['accepted', 'arriving', 'ongoing'])
const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'failed'])

export type PassengerStatusPushRoute = 'passenger' | 'ignored'
export type PassengerTerminalPush = { tripId: string; status: string }

function pushStatus(data: Record<string, unknown> | undefined): string {
  return typeof data?.status === 'string' ? data.status : ''
}

function pushTripId(data: Record<string, unknown> | undefined): string {
  return typeof data?.trip_id === 'string' ? data.trip_id : ''
}

export function isPassengerStatusPush(data: Record<string, unknown> | undefined): boolean {
  if (!data || data.event !== PASSENGER_STATUS_PUSH_EVENT) return false
  const status = pushStatus(data)
  return (ACTIVE_STATUSES.has(status) || TERMINAL_STATUSES.has(status)) && pushTripId(data).length > 0
}

/** Foreground: o poll do passageiro já actualiza o ecrã. Não navegar. */
export function noteForegroundTripStatusPush(
  data: Record<string, unknown> | undefined
): 'noted' | 'ignored' {
  if (!isPassengerStatusPush(data)) return 'ignored'
  return 'noted'
}

function rememberTerminalPush(tripId: string, status: string): void {
  try {
    if (TERMINAL_STATUSES.has(status)) {
      sessionStorage.setItem(
        PASSENGER_STATUS_PUSH_STORAGE_KEY,
        JSON.stringify({ tripId, status })
      )
      return
    }
    sessionStorage.removeItem(PASSENGER_STATUS_PUSH_STORAGE_KEY)
  } catch {
    /* sessão privada: o ecrã activo continua a recuperar por /trips/active */
  }
}

/**
 * Toque na notificação de estado. Sessão válida abre /passenger.
 * Estados terminais ficam no histórico, não na viagem activa.
 */
export function applyTripStatusPushNavigation(
  data: Record<string, unknown> | undefined
): PassengerStatusPushRoute {
  if (!isPassengerStatusPush(data)) return 'ignored'
  const status = pushStatus(data)
  const tripId = pushTripId(data)
  setStoredAppRouteRole('passenger')
  rememberTerminalPush(tripId, status)
  if (window.location.pathname !== '/passenger') {
    window.location.assign('/passenger')
  } else if (TERMINAL_STATUSES.has(status)) {
    window.dispatchEvent(new CustomEvent(PASSENGER_STATUS_PUSH_DOM_EVENT))
  }
  return 'passenger'
}

/** Lê e esquece o aviso terminal, para o histórico e não para a viagem activa. */
export function takePassengerTerminalPush(): PassengerTerminalPush | null {
  try {
    const raw = sessionStorage.getItem(PASSENGER_STATUS_PUSH_STORAGE_KEY)
    sessionStorage.removeItem(PASSENGER_STATUS_PUSH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tripId?: unknown; status?: unknown }
    if (typeof parsed.tripId !== 'string' || typeof parsed.status !== 'string') return null
    if (!TERMINAL_STATUSES.has(parsed.status)) return null
    return { tripId: parsed.tripId, status: parsed.status }
  } catch {
    return null
  }
}
