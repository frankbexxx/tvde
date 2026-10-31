import { noteLoginSession } from '../driver/driverSessionFamily'

/**
 * Família injectada pelo fixture E2E depois de um login refresh-v1.
 * Não aceita o access token, nem uma string vazia, como família.
 */
export function sessionFamilyFromE2eInject(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const sessionId = record.session_id
  if (typeof sessionId !== 'string') return null
  const family = sessionId.trim()
  if (!family || family.split('.').length === 3) return null
  for (const key of ['passenger', 'driver', 'admin', 'partner'] as const) {
    if (record[key] === family) return null
  }
  return family
}

/** Regista a família do inject. Sem id legítimo, a sessão fica sem família. */
export function noteE2eInjectedSession(raw: unknown): boolean {
  const family = sessionFamilyFromE2eInject(raw)
  if (!family) return false
  noteLoginSession(family)
  return true
}
