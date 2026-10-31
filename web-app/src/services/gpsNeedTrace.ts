/** Diagnóstico sanitizado da necessidade GPS. Não decide nem altera o serviço. */

export type RefreshTraceOutcome = 'refreshed' | 'transient' | 'invalid' | 'stale'

export type GpsNeedTraceEvent =
  | {
      kind: 'react'
      needed: boolean
      tokenPresent: boolean
      offline: boolean
      hydrated: boolean
      syncing: boolean
      familyChanged: boolean
    }
  | { kind: 'android'; needed: boolean }
  | { kind: 'lifecycle'; phase: 'mount' | 'unmount' }
  | {
      kind: 'availability-poll'
      phase: 'start' | 'end'
      accepted: boolean | null
      statusOk: boolean | null
    }
  | { kind: 'refresh'; outcome: RefreshTraceOutcome }
  | { kind: 'family'; changed: true }

type Listener = (event: GpsNeedTraceEvent) => void

const listeners = new Set<Listener>()
let familyChanged = false
let lastReact = ''

function enabled(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === 'test'
}

function emit(event: GpsNeedTraceEvent): void {
  if (!enabled() || listeners.size === 0) return
  listeners.forEach((listener) => listener(event))
}

export function subscribeGpsNeedTrace(listener: Listener): () => void {
  if (!enabled()) return () => undefined
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resetGpsNeedTraceForTests(): void {
  familyChanged = false
  lastReact = ''
}

/** Só a troca efectiva. O identificador da família não entra no rasto. */
export function traceFamilyChange(changed: boolean): void {
  if (!changed) return
  familyChanged = true
  emit({ kind: 'family', changed: true })
}

/** Decisão React, antes da ponte Android. */
export function traceReactDecision(input: {
  needed: boolean
  tokenPresent: boolean
  offline: boolean
  hydrated: boolean
  syncing: boolean
}): void {
  if (!enabled() || listeners.size === 0) return
  const stable = JSON.stringify(input)
  if (stable === lastReact && !familyChanged) return
  const changed = familyChanged
  familyChanged = false
  lastReact = stable
  emit({ kind: 'react', ...input, familyChanged: changed })
}

/** Pedido já entregue à ponte. Não é a decisão React. */
export function traceAndroidNeed(needed: boolean): void {
  emit({ kind: 'android', needed })
}

export function traceLifecycle(phase: 'mount' | 'unmount'): void {
  emit({ kind: 'lifecycle', phase })
}

export function traceAvailabilityPoll(input: {
  phase: 'start' | 'end'
  accepted?: boolean | null
  statusOk?: boolean | null
}): void {
  emit({
    kind: 'availability-poll',
    phase: input.phase,
    accepted: input.accepted ?? null,
    statusOk: input.statusOk ?? null,
  })
}

export function traceRefresh(outcome: RefreshTraceOutcome): RefreshTraceOutcome {
  emit({ kind: 'refresh', outcome })
  return outcome
}
