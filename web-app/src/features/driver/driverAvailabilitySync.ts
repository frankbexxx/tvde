import { isTimeoutLikeError } from '../../api/client'
import i18n from '../../i18n'
import {
  REQUIRED_DRIVER_DOCUMENTS,
  type DriverDocumentsState,
} from '../../services/driverDocuments'
import { driverAvailabilityComplianceI18nKey } from '../shared/vehicleComplianceGateMessages'

/** Ainda não há leitura desta família, ou a leitura não confirma nem revoga. */
export type DriverDocumentEligibility = 'checking' | 'clear' | 'blocked'

/** Poll leve para reflectir Partner/Admin force-online sem refresh manual. */
export const DRIVER_REMOTE_AVAILABILITY_POLL_MS = 12_000

/**
 * Prazo máximo sem access token depois de um Online já confirmado nesta família.
 * Cobre um refresh HTTP e, passado o prazo, a autorização deixa de valer.
 */
export const DRIVER_TOKEN_GAP_MS = 15_000

/** Offline local só quando o GET /driver/status não confirma disponibilidade. */
export function offlineFromBackendAvailability(isAvailable: boolean): boolean {
  return !isAvailable
}

/**
 * `checking` é só a verificação ainda em aberto. Não é um estado do documento.
 * Depois de uma leitura, qualquer obrigatório que não seja `approved` bloqueia.
 */
export function driverDocumentEligibility(opts: {
  gateEnabled: boolean
  loaded: boolean
  state: DriverDocumentsState
}): DriverDocumentEligibility {
  if (!opts.gateEnabled) return 'clear'
  if (!opts.loaded) return 'checking'
  const statuses = REQUIRED_DRIVER_DOCUMENTS.map((key) => opts.state.docs[key])
  if (statuses.every((status) => status === 'approved')) return 'clear'
  return 'blocked'
}

/** Checking só mantém recolha já autorizada nesta família. Bloqueio confirmado pára. */
export function documentEligibilityAllowsCollection(opts: {
  eligibility: DriverDocumentEligibility
  previouslyAuthorized: boolean
}): boolean {
  if (opts.eligibility === 'blocked') return false
  if (opts.eligibility === 'clear') return true
  return opts.previouslyAuthorized
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
  sessionEpochAtStart: number
  currentSessionEpoch: number
}): boolean {
  if (opts.cancelled) return false
  if (shouldSkipRemoteAvailabilityApply(opts.syncing)) return false
  if (opts.responseSeq !== opts.latestSeq) return false
  if (opts.epochAtStart !== opts.currentEpoch) return false
  if (opts.sessionEpochAtStart !== opts.currentSessionEpoch) return false
  return true
}

/**
 * A hidratação segue a família do motorista, não a geração do access token.
 * Sem família, ou fora do papel de motorista, não há sessão para manter.
 */
export function driverAvailabilitySessionKey(
  role: string | null | undefined,
  family: string | null,
): string | null {
  if (role !== 'driver') return null
  const id = family?.trim() ?? ''
  return id.length > 0 ? id : null
}

/** Só um estado confirmado desta sessão autoriza o GPS. Falha e resposta antiga não contam. */
export function shouldHydrateAvailability(opts: { accepted: boolean; statusOk: boolean }): boolean {
  return opts.accepted && opts.statusOk
}

/**
 * Next local offline from a remote GET, or null if unchanged / should not apply.
 * Never calls POST — read-only sync.
 */
export function remoteAvailabilityOfflineUpdate(opts: {
  remoteIsAvailable: boolean
  localOffline: boolean
  syncing: boolean
}): boolean | null {
  if (shouldSkipRemoteAvailabilityApply(opts.syncing)) return null
  const nextOffline = offlineFromBackendAvailability(opts.remoteIsAvailable)
  if (nextOffline === opts.localOffline) return null
  return nextOffline
}

/** Read-only tick used by poll / focus / visibility. GET failure → no local change. */
export async function fetchRemoteAvailabilityOfflineUpdate(opts: {
  getStatus: () => Promise<{ is_available: boolean }>
  /** Re-read after await so a completed POST toggle is not undone by a stale GET. */
  getLocalOffline: () => boolean
  getSyncing: () => boolean
}): Promise<boolean | null> {
  if (shouldSkipRemoteAvailabilityApply(opts.getSyncing())) return null
  try {
    const { is_available } = await opts.getStatus()
    return remoteAvailabilityOfflineUpdate({
      remoteIsAvailable: is_available,
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

const ACTIVE_DRIVER_TRIP = new Set(['accepted', 'arriving', 'ongoing'])
const ENDED_DRIVER_TRIP = new Set(['completed', 'cancelled', 'failed'])

export function isConfirmedActiveDriverTrip(status: string | null | undefined): boolean {
  return Boolean(status && ACTIVE_DRIVER_TRIP.has(status))
}

export function isEndedDriverTrip(status: string | null | undefined): boolean {
  return Boolean(status && ENDED_DRIVER_TRIP.has(status))
}

type DriverLocationNeed = {
  token: string | null
  offline: boolean
  hydrated: boolean
  syncing: boolean
  tripStatus?: string | null
  /** Só depois de uma viagem activa já confirmada perder a rede. */
  tripRecoveryUnresolved?: boolean
  confirmedActiveTrip?: boolean
}

/**
 * Reporter e serviço nativo usam a mesma decisão.
 * Um id local, o primeiro GET ou um timeout sem viagem confirmada não ligam o GPS.
 */
export function isDriverLocationNeeded(opts: DriverLocationNeed): boolean {
  if (!opts.token) return false
  if (isEndedDriverTrip(opts.tripStatus)) return isDriverAvailabilityOperational(opts)
  if (isConfirmedActiveDriverTrip(opts.tripStatus)) return true
  if (opts.tripRecoveryUnresolved && opts.confirmedActiveTrip) return true
  return isDriverAvailabilityOperational(opts)
}

/** Timeout ou falha de rede. Sem viagem confirmada, a recuperação fica desligada. */
export function recoveryAfterTripProbe(opts: {
  confirmedActiveTrip: boolean
  networkError: boolean
  tripStatus?: string | null
}): boolean {
  if (!opts.networkError || !opts.confirmedActiveTrip) return false
  if (isEndedDriverTrip(opts.tripStatus)) return false
  if (opts.tripStatus && !isConfirmedActiveDriverTrip(opts.tripStatus)) return false
  return true
}

/** drop: resposta de outra família. missing: esta sessão já não tem a viagem. keep: falha transitória da mesma família. */
export function resolveDriverTripPollFailure(opts: {
  requestFamily: string | null
  currentFamily: string | null
  httpStatus: number | undefined
}): 'drop' | 'missing' | 'keep' {
  if (opts.requestFamily !== opts.currentFamily) return 'drop'
  if (opts.httpStatus === 403 || opts.httpStatus === 404) return 'missing'
  return 'keep'
}

export function isDriverLocationReportingOperational(opts: DriverLocationNeed & {
  activeTripId?: string | null
  activeTripBootstrapPending?: boolean
}): boolean {
  return isDriverLocationNeeded(opts)
}

/**
 * Serviço já autorizado nesta família, durante a lacuna aberta pela sessão.
 * Online confirmado ou viagem activa já confirmada. Sem token não há upload.
 * Não abre autorização nova: sem hidratação prévia, ou só com um id, fica parado.
 */
export function keepsNativeLocationServiceDuringTokenGap(opts: {
  token: string | null
  offline: boolean
  hydrated: boolean
  syncing: boolean
  confirmedActiveTrip?: boolean
  tripStatus?: string | null
}): boolean {
  if (opts.token || !opts.hydrated) return false
  if (isEndedDriverTrip(opts.tripStatus)) return false
  if (opts.confirmedActiveTrip) return true
  return !opts.offline && !opts.syncing
}

/** Viagem confirmada. Um id local sem estado não chega. */
export function isNativeDriverLocationServiceNeeded(opts: DriverLocationNeed & {
  activeTripBootstrapPending?: boolean
}): boolean {
  if (isDriverLocationNeeded(opts)) return true
  return keepsNativeLocationServiceDuringTokenGap(opts)
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
