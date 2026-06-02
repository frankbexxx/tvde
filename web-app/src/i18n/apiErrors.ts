import i18n from './index'
import { formatApiErrorDetail } from '../utils/apiErrorDetail'

const KNOWN_CODES = new Set([
  'pending_approval',
  'invalid_credentials',
  'blocked',
  'not_authenticated',
  'invalid_token',
  'forbidden',
  'trip_not_found',
  'driver_not_found',
  'rate_limit_login',
  'rate_limit_otp_request',
  'invalid_trip_state_transition',
])

function normalizeDetailCode(detail: unknown): string | null {
  if (typeof detail !== 'string') return null
  const s = detail.trim()
  if (s === 'BETA cheio' || s.includes('cheio')) return 'beta_full'
  if (s.toLowerCase() === 'not available') return 'beta_login_unavailable'
  if (KNOWN_CODES.has(s)) return s
  return null
}

/** Maps API `detail` (code or rare PT string) to localized message; falls back to raw detail. */
export function resolveApiErrorDetail(detail: unknown): string {
  const code = normalizeDetailCode(detail)
  if (code) {
    const key = `errors:${code}`
    if (i18n.exists(key)) return i18n.t(key)
  }
  const formatted = formatApiErrorDetail(detail)
  if (formatted) return formatted
  return i18n.t('common:unexpectedError')
}

export function resolveApiErrorFromUnknown(errOrDetail: unknown): string {
  if (errOrDetail && typeof errOrDetail === 'object' && 'detail' in errOrDetail) {
    const err = errOrDetail as { detail?: unknown; request_id?: string; status?: number }
    const d = resolveApiErrorDetail(err.detail)
    const rid = err.request_id
    if (rid && d && !d.includes(rid)) return `${d} (ref: ${rid})`
    if (typeof err.status === 'number' && err.status >= 500 && d.length < 200) {
      return i18n.t('auth:serverError', { status: err.status, detail: d })
    }
    return d
  }
  return resolveApiErrorDetail(errOrDetail)
}

export function humanizeCreateTripError(errOrDetail: unknown): string {
  const raw = resolveApiErrorFromUnknown(errOrDetail)
  const s = raw.toLowerCase()
  if (s.includes('timeout') || s.includes('indispon') || s.includes('abort')) {
    return i18n.t('errors:timeout')
  }
  if (s.includes('rate') || s.includes('limite') || s.includes('too many')) {
    return i18n.t('errors:rate_limited')
  }
  if (raw.length > 0 && raw.length < 160) return raw
  return i18n.t('errors:create_trip_failed')
}

export function humanizeCancelError(errOrDetail: unknown): string {
  const raw = resolveApiErrorFromUnknown(errOrDetail)
  const s = raw.toLowerCase()
  if (s.includes('timeout') || s.includes('indispon') || s.includes('network')) {
    return i18n.t('errors:cancel_network')
  }
  if (raw.length > 0 && raw.length < 160) return raw
  return i18n.t('errors:cancel_failed')
}

export function formatLoginError(err: unknown): string {
  if (err !== null && typeof err === 'object' && 'status' in err) {
    const e = err as { status?: number; detail?: unknown }
    const st = e.status ?? 0
    const d = e.detail
    if (typeof d === 'string') {
      const mapped = resolveApiErrorDetail(d.trim())
      if (normalizeDetailCode(d) || d.trim() === 'BETA cheio' || d.includes('cheio')) return mapped
      if (d.toLowerCase() === 'not available') return mapped
      if (st >= 500) {
        if (/password_hash|column|undefinedcolumn|relation/i.test(d)) {
          return i18n.t('auth:dbMismatch')
        }
        return i18n.t('auth:serverError', { status: st, detail: d.slice(0, 180) })
      }
      return d.length > 280 ? `${d.slice(0, 280)}…` : d
    }
    if (Array.isArray(d)) {
      const parts = d.map((x) =>
        typeof x === 'object' && x !== null && 'msg' in x
          ? String((x as { msg?: unknown }).msg)
          : JSON.stringify(x)
      )
      return parts.join(' · ') || i18n.t('auth:invalidRequest')
    }
    if (st >= 500) return i18n.t('auth:serverErrorMigrations', { status: st })
  }
  if (err instanceof Error && err.message) {
    return i18n.t('auth:connectionFailed', { message: err.message })
  }
  return i18n.t('auth:loginError')
}
