/**
 * Recuperação web da posição do motorista.
 *
 * O `watchPosition` não é periódico. Esta decisão pede uma leitura nova
 * antes da janela de matching de 45 s, sem inventar timestamps.
 * O Android nativo não usa este módulo.
 */

/** Igual a `LOCATION_MAX_AGE_SECONDS` no servidor. Não é uma configuração nova. */
export const MATCHING_MAX_AGE_MS = 45_000

/**
 * Pede `getCurrentPosition` quando o último fix tem esta idade.
 * O timeout da leitura é 10 s, por isso 20 + 10 fica abaixo de 45.
 */
export const GPS_RECOVERY_TRIGGER_AGE_MS = 20_000

/** Observação local. Não envia coordenadas. */
export const GPS_RECOVERY_OBSERVE_MS = 5_000

/** Abaixo do timeout de 15 s do `watchPosition`, para falhar antes dos 45 s. */
export const GPS_RECOVERY_TIMEOUT_MS = 10_000

export const GPS_RECOVERY_MAX_FAILURES = 3

/** Depois de um erro, espera antes de outra leitura. Não é um ciclo apertado. */
export const GPS_RECOVERY_BACKOFF_MS = 15_000

/**
 * Depois de três falhas, uma leitura por minuto.
 * É maior do que os 15 s entre falhas e do que a janela de 45 s:
 * o `watchPosition` pode recuperar nesse intervalo, e não se empilham leituras.
 */
export const GPS_RECOVERY_COOLDOWN_MS = 60_000

export type GpsRecoveryInput = {
  enabled: boolean
  visible: boolean
  inFlight: boolean
  consecutiveFailures: number
  nowMs: number
  nextAttemptAtMs: number | null
  /** Momento em que a recuperação ficou activa sem um fix. */
  waitingSinceMs: number
  lastFixTimestampMs: number | null
}

/** A shell nativa mantém a cadência Android. Mock e demo não lêem o GPS do browser. */
export function isWebGpsRecoveryEnabled(opts: {
  reporting: boolean
  nativePlatform: boolean
  mock: boolean
  demo: boolean
}): boolean {
  return opts.reporting && !opts.nativePlatform && !opts.mock && !opts.demo
}

export function isNewerGpsTimestamp(previous: number | null, next: number): boolean {
  return Number.isFinite(next) && (previous == null || next > previous)
}

/** `request` inicia uma leitura. `idle` não chama o browser. */
export function gpsRecoveryAction(input: GpsRecoveryInput): 'request' | 'idle' {
  if (!input.enabled || !input.visible || input.inFlight) return 'idle'
  if (input.nextAttemptAtMs != null && input.nowMs < input.nextAttemptAtMs) return 'idle'
  if (
    input.consecutiveFailures >= GPS_RECOVERY_MAX_FAILURES &&
    (input.nextAttemptAtMs == null || input.nowMs < input.nextAttemptAtMs)
  ) {
    return 'idle'
  }
  const ageAnchor = input.lastFixTimestampMs ?? input.waitingSinceMs
  if (input.nowMs - ageAnchor >= GPS_RECOVERY_TRIGGER_AGE_MS) return 'request'
  return 'idle'
}
