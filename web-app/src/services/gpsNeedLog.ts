/** Relato de transição para o logcat. Não decide nem comanda o serviço. */

const GPS_NEED_LOG_CODES = [
  'token-absent',
  'gap-expired',
  'gap-expired-native',
  'family-changed',
  'availability-offline',
  'availability-online',
  'hydration-cleared',
  'dashboard-unmount',
  'ui-detached',
  'legal-blocked',
  'logout',
  'session-changed',
  'host-stop',
] as const

export type GpsNeedLogCode = (typeof GPS_NEED_LOG_CODES)[number]

export type GpsNeedLogFlags = {
  needed: boolean
  tokenPresent: boolean
  hydrated: boolean
  offline: boolean
  syncing: boolean
}

const ALLOWED = new Set<string>(GPS_NEED_LOG_CODES)
let lastDelivered = ''
let bridgeFaultNoted = false

export function resetGpsNeedLogForTests(): void {
  lastDelivered = ''
  bridgeFaultNoted = false
}

/** Código desconhecido não chega à ponte. A deduplicação só vale depois da entrega. */
export function logGpsNeed(code: string, flags?: GpsNeedLogFlags): void {
  if (!ALLOWED.has(code)) return
  if (flags && !flagsAreBooleans(flags)) return
  const key = flags
    ? `${code}|${flags.needed}|${flags.tokenPresent}|${flags.hydrated}|${flags.offline}|${flags.syncing}`
    : code
  if (key === lastDelivered) return
  if (!deliver(code, flags)) return
  lastDelivered = key
}

function deliver(code: string, flags?: GpsNeedLogFlags): boolean {
  const bridge = window.vamulaGps
  if (!bridge || typeof bridge.logGpsNeed !== 'function') {
    noteBridgeFault()
    return false
  }
  try {
    // O WebView só aceita o método com o receptor da ponte. Uma função solta é rejeitada.
    if (flags) {
      bridge.logGpsNeed(code, true, flags.needed, flags.tokenPresent, flags.hydrated, flags.offline, flags.syncing)
    } else {
      bridge.logGpsNeed(code, false, false, false, false, false, false)
    }
  } catch {
    noteBridgeFault()
    return false
  }
  bridgeFaultNoted = false
  return true
}

function noteBridgeFault(): void {
  if (bridgeFaultNoted) return
  const bridge = window.vamulaGps
  if (!bridge || typeof bridge.logGpsNeedBridgeFault !== 'function') return
  try {
    bridge.logGpsNeedBridgeFault()
    bridgeFaultNoted = true
  } catch {
    // A falha de diagnóstico não pode interromper o GPS.
  }
}

function flagsAreBooleans(flags: GpsNeedLogFlags): boolean {
  return typeof flags.needed === 'boolean'
    && typeof flags.tokenPresent === 'boolean'
    && typeof flags.hydrated === 'boolean'
    && typeof flags.offline === 'boolean'
    && typeof flags.syncing === 'boolean'
}
