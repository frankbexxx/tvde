/** Ponte Android. No browser e nos testes sem ponte, a WebView mantém o envio. */

interface GpsOwnershipBridge {
  nativeOwnsUpload: () => boolean
  beginWebViewSend: () => boolean
  endWebViewSend: () => void
  sessionChanged: () => void
  setServiceNeeded?: (needed: boolean) => void
  serviceNeeded?: () => boolean
  serviceOperational?: () => boolean
  serviceCollecting?: () => boolean
  serviceSending?: () => boolean
  serviceStopReason?: () => string
}

export interface NativeLocationServiceState {
  needed: boolean
  operational: boolean
  collecting: boolean
  sending: boolean
  stopReason: string
}

declare global {
  interface Window {
    vamulaGps?: GpsOwnershipBridge
  }
}

function bridge(): GpsOwnershipBridge | null {
  const candidate = window.vamulaGps
  if (!candidate?.beginWebViewSend || !candidate.endWebViewSend || !candidate.nativeOwnsUpload) {
    return null
  }
  return candidate
}

/** False só quando o nativo assumiu mesmo o envio. */
export function beginWebViewLocationSend(): boolean {
  const current = bridge()
  if (!current) return true
  try {
    return current.beginWebViewSend() === true
  } catch {
    return true
  }
}

export function endWebViewLocationSend(): void {
  const current = bridge()
  if (!current) return
  try {
    current.endWebViewSend()
  } catch {
    // O finally do envio não pode falhar por causa da ponte.
  }
}

export function nativeOwnsDriverLocation(): boolean {
  const current = bridge()
  if (!current) return false
  try {
    return current.nativeOwnsUpload() === true
  } catch {
    return false
  }
}

/** O dashboard já decidiu. Sem ponte, o browser não tem serviço nativo. */
export function syncNativeLocationServiceNeed(needed: boolean): void {
  const current = bridge()
  if (!current?.setServiceNeeded) return
  try {
    current.setServiceNeeded(needed)
  } catch {
    // A WebView continua com o reporter actual.
  }
}

export function readNativeLocationServiceState(): NativeLocationServiceState | null {
  const current = bridge()
  if (!current?.serviceOperational || !current.serviceCollecting || !current.serviceSending) return null
  try {
    return {
      needed: current.serviceNeeded?.() === true,
      operational: current.serviceOperational() === true,
      collecting: current.serviceCollecting() === true,
      sending: current.serviceSending() === true,
      stopReason: current.serviceStopReason?.() ?? '',
    }
  } catch {
    return null
  }
}

/** Logout ou nova sessão. Sem ponte, não há propriedade nativa para largar. */
export function releaseDriverLocationOwnership(): void {
  const current = bridge()
  if (!current?.sessionChanged) return
  try {
    current.sessionChanged()
  } catch {
    // O logout local segue mesmo que a ponte falhe.
  }
}
