/** Família de sessão em memória. A renovação do access token não passa por aqui. */

type FamilyListener = (next: string | null, previous: string | null) => void

let family: string | null = null
let epoch = 0
let synthetic = 0
const listeners = new Set<FamilyListener>()

export function currentSessionFamily(): string | null {
  return family
}

/** Aumenta em cada troca real de família, incluindo o logout. */
export function sessionEpoch(): number {
  return epoch
}

/** Devolve false quando a família não mudou. Um refresh da mesma família não notifica. */
export function noteSessionFamily(next: string | null): boolean {
  if (family === next) return false
  const previous = family
  family = next
  epoch += 1
  listeners.forEach((listener) => listener(next, previous))
  return true
}

/** Login. Sem id conhecido, cada entrada conta como família nova. */
export function noteLoginSession(sessionId: string | null | undefined): boolean {
  const trimmed = typeof sessionId === 'string' ? sessionId.trim() : ''
  const next = trimmed.length > 0 ? trimmed : `login-${++synthetic}`
  return noteSessionFamily(next)
}

export function subscribeSessionFamily(listener: FamilyListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resetSessionFamilyForTests(): void {
  family = null
  epoch = 0
  synthetic = 0
  listeners.clear()
}
