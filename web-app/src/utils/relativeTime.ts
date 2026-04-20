/**
 * Formata diferença de tempo curta e legível em PT-PT.
 *
 * Usado no AdminDashboard para mostrar "atualizado há X" nas linhas de viagens
 * activas, e para sinalizar linhas `accepted` paradas há mais de N minutos.
 *
 * Mantém-se simples e síncrono; não tenta lidar com futuro (assume `iso` no passado).
 *
 * Ex.: "há 8s", "há 3 min", "há 2 h", "há 1 dia".
 */

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export function formatRelativeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const diff = Math.max(0, now - t)
  if (diff < MIN) {
    const s = Math.max(1, Math.round(diff / SEC))
    return `há ${s}s`
  }
  if (diff < HOUR) {
    const m = Math.round(diff / MIN)
    return `há ${m} min`
  }
  if (diff < DAY) {
    const h = Math.round(diff / HOUR)
    return `há ${h} h`
  }
  const d = Math.round(diff / DAY)
  return `há ${d} dia${d === 1 ? '' : 's'}`
}

/**
 * Minutos passados desde `iso`. Útil para threshold de "stuck" (ex.: > 5 min).
 * Devolve `null` se `iso` for inválido.
 */
export function minutesSince(iso: string | null | undefined, now: number = Date.now()): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.max(0, (now - t) / MIN)
}
