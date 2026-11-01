/** Fase legal observada pelo gestor GPS. Não chama a ponte. */

export type LegalAcceptancePhase = 'checking' | 'open' | 'blocked'

type Snapshot = {
  phase: LegalAcceptancePhase
  family: string | null
}

type Listener = (snapshot: Snapshot) => void

let snapshot: Snapshot = { phase: 'checking', family: null }
const listeners = new Set<Listener>()

export function currentLegalAcceptancePhase(): Snapshot {
  return snapshot
}

export function noteLegalAcceptancePhase(phase: LegalAcceptancePhase, family: string | null): void {
  if (snapshot.phase === phase && snapshot.family === family) return
  snapshot = { phase, family }
  listeners.forEach((listener) => listener(snapshot))
}

export function subscribeLegalAcceptancePhase(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resetLegalAcceptancePhaseForTests(): void {
  snapshot = { phase: 'checking', family: null }
  listeners.clear()
}
