import { isTimeoutLikeError } from '../../api/client'

/** Offline local quando o backend não confirma disponibilidade operacional. */
export function offlineFromBackendAvailability(
  isAvailable: boolean,
  canGoOnline: boolean,
): boolean {
  if (!canGoOnline) return true
  return !isAvailable
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
  return `Não foi possível alterar disponibilidade (${detail}).`
}
