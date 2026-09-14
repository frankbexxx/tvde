/** PORTAGENS V1 F3 — safe display helpers for Partner/Admin toll audit. */

export type TollAuditBreakdown = {
  estimated_tolls_amount?: number | null
  charged_tolls_amount?: number | null
  tolls_amount?: number | null
  observed_tolls_amount?: number | null
  observed_tolls_delta?: number | null
  observed_tolls_status?: string | null
  tolls_source?: string | null
  tolls_status?: string | null
  tolls_error_code?: string | null
  observed_tolls_error_code?: string | null
}

export function formatEuroOrDash(value: unknown): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return `${n.toFixed(2)} €`
}

export function formatDeltaOrDash(value: unknown): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)} €`
}

export function formatTextOrDash(value: unknown): string {
  if (value == null || value === '') return '—'
  const s = String(value).trim()
  return s || '—'
}

/** Charged for billing display: charged_tolls_amount ?? tolls_amount */
export function chargedTollsDisplay(bd: TollAuditBreakdown): string {
  if (bd.charged_tolls_amount != null && bd.charged_tolls_amount !== undefined) {
    return formatEuroOrDash(bd.charged_tolls_amount)
  }
  if (bd.tolls_amount != null && bd.tolls_amount !== undefined) {
    return formatEuroOrDash(bd.tolls_amount)
  }
  return '—'
}

export function observedTollsDisplay(bd: TollAuditBreakdown): string {
  if (bd.observed_tolls_amount != null) {
    return formatEuroOrDash(bd.observed_tolls_amount)
  }
  if (bd.observed_tolls_status) {
    return formatTextOrDash(bd.observed_tolls_status)
  }
  return '—'
}

/** Never include secrets — defensive strip for accidental leaks in status strings. */
export function sanitizeTollAuditText(value: unknown): string {
  const s = formatTextOrDash(value)
  if (s === '—') return s
  return s.replace(/apiKey=[^&\s]+/gi, 'apiKey=[REDACTED]').replace(/sk_[a-zA-Z0-9]+/g, '[REDACTED]')
}
