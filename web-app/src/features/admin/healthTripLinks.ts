/** W2-C: extrair trip UUID a partir de linhas do `system_health` (formatos heterogéneos do backend). */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim())
}

/** Linhas `drivers_unavailable_too_long` do system_health. */
export function driverIdFromHealthUnavailableRow(row: Record<string, unknown>): string | null {
  const d = row.driver_id
  if (typeof d !== 'string') return null
  const s = d.trim()
  if (!UUID_RE.test(s)) return null
  return s
}

export function tripIdFromHealthRow(row: Record<string, unknown>): string | null {
  const direct = row.trip_id ?? row.tripId
  if (typeof direct === 'string' && isUuid(direct)) return direct.trim()

  const st = row.status
  if ((st === 'accepted' || st === 'ongoing') && typeof row.id === 'string' && isUuid(row.id)) {
    return row.id.trim()
  }

  return null
}
