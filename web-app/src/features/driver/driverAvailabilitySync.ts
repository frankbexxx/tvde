import { isTimeoutLikeError } from '../../api/client'
import i18n from '../../i18n'
import { driverAvailabilityComplianceI18nKey } from '../shared/vehicleComplianceGateMessages'

/** Poll leve para reflectir Partner/Admin force-online sem refresh manual. */
export const DRIVER_REMOTE_AVAILABILITY_POLL_MS = 12_000

/** Offline local quando o backend não confirma disponibilidade operacional. */
export function offlineFromBackendAvailability(
  isAvailable: boolean,
  canGoOnline: boolean,
): boolean {
  if (!canGoOnline) return true
  return !isAvailable
}

/** Skip remote GET apply while the user is mid POST online/offline. */
export function shouldSkipRemoteAvailabilityApply(syncing: boolean): boolean {
  return syncing
}

/**
 * Gate for applying a remote availability GET result.
 * Drops cancelled, in-flight-toggle, stale overlapping polls, and pre-toggle responses.
 */
export function shouldAcceptRemoteAvailabilityResponse(opts: {
  cancelled: boolean
  syncing: boolean
  responseSeq: number
  latestSeq: number
  epochAtStart: number
  currentEpoch: number
}): boolean {
  if (opts.cancelled) return false
  if (shouldSkipRemoteAvailabilityApply(opts.syncing)) return false
  if (opts.responseSeq !== opts.latestSeq) return false
  if (opts.epochAtStart !== opts.currentEpoch) return false
  return true
}

/**
 * Next local offline from a remote GET, or null if unchanged / should not apply.
 * Never calls POST — read-only sync.
 */
export function remoteAvailabilityOfflineUpdate(opts: {
  remoteIsAvailable: boolean
  canGoOnline: boolean
  localOffline: boolean
  syncing: boolean
}): boolean | null {
  if (shouldSkipRemoteAvailabilityApply(opts.syncing)) return null
  const nextOffline = offlineFromBackendAvailability(
    opts.remoteIsAvailable,
    opts.canGoOnline,
  )
  if (nextOffline === opts.localOffline) return null
  return nextOffline
}

/** Read-only tick used by poll / focus / visibility. GET failure → no local change. */
export async function fetchRemoteAvailabilityOfflineUpdate(opts: {
  getStatus: () => Promise<{ is_available: boolean }>
  canGoOnline: boolean
  /** Re-read after await so a completed POST toggle is not undone by a stale GET. */
  getLocalOffline: () => boolean
  getSyncing: () => boolean
}): Promise<boolean | null> {
  if (shouldSkipRemoteAvailabilityApply(opts.getSyncing())) return null
  try {
    const { is_available } = await opts.getStatus()
    return remoteAvailabilityOfflineUpdate({
      remoteIsAvailable: is_available,
      canGoOnline: opts.canGoOnline,
      localOffline: opts.getLocalOffline(),
      syncing: opts.getSyncing(),
    })
  } catch {
    return null
  }
}

/** Poll de /available e reporter só após confirmação explícita de online no backend. */
export function isDriverAvailabilityOperational(opts: {
  token: string | null
  offline: boolean
  hydrated: boolean
  syncing: boolean
}): boolean {
  return Boolean(opts.token && !opts.offline && opts.hydrated && !opts.syncing)
}

export function isDriverLocationReportingOperational(opts: {
  token: string | null
  offline: boolean
  hydrated: boolean
  syncing: boolean
  activeTripId: string | null | undefined
  activeTripBootstrapPending?: boolean
}): boolean {
  if (!opts.token) return false
  if (opts.activeTripId || opts.activeTripBootstrapPending) return true
  return isDriverAvailabilityOperational(opts)
}

export function shouldBootstrapDriverActiveTrip(opts: {
  token: string | null
  sessionRole: string | null | undefined
  activeTripId: string | null | undefined
}): boolean {
  return Boolean(opts.token && opts.sessionRole === 'driver' && !opts.activeTripId)
}

export function isDrivingHoursBlockedError(err: unknown): boolean {
  const e = err as { status?: number; detail?: unknown }
  return e?.status === 409 && e?.detail === 'driving_hours_blocked'
}

export function formatDriverAvailabilityError(err: unknown): string {
  if (isDrivingHoursBlockedError(err)) {
    return 'Limite de tempo de condução ou repouso legal: não foi possível ficar disponível. Ver o aviso de horas no ecrã.'
  }
  if (isTimeoutLikeError(err)) {
    return 'Sem ligação ou o servidor demorou a responder. Verifica a rede e tenta outra vez.'
  }
  const e = err as { status?: number; detail?: unknown }
  const detail = typeof e?.detail === 'string' ? e.detail : 'erro_desconhecido'
  const complianceKey = driverAvailabilityComplianceI18nKey(detail)
  if (complianceKey) {
    return i18n.t(`driver:${complianceKey}`)
  }
  return `Não foi possível alterar disponibilidade (${detail}).`
}
