import type { ApiError } from '../../api/client'

export type GoogleOnboardingPrompt = {
  name: string
  email: string
  /** Present only on the web code exchange. Native keeps the plugin token in memory. */
  idToken: string | null
}

export function readGoogleOnboarding(err: unknown): GoogleOnboardingPrompt | null {
  if (err === null || typeof err !== 'object' || !('detail' in err)) return null
  const detail = (err as ApiError).detail
  if (detail === null || typeof detail !== 'object' || Array.isArray(detail)) return null
  if (detail.code !== 'google_onboarding_required') return null
  const email = typeof detail.email === 'string' ? detail.email.trim() : ''
  if (!email) return null
  const name = typeof detail.name === 'string' ? detail.name.trim() : ''
  const idToken = typeof detail.id_token === 'string' && detail.id_token ? detail.id_token : null
  return { name, email, idToken }
}

/** Portugal V1: `+351` and 9 digits. Returns null when the input cannot be a mobile. */
export function normalizePtPhone(input: string): string | null {
  const compact = input.replace(/[\s\-()]/g, '')
  let value = compact
  if (value.startsWith('00351')) value = `+${value.slice(2)}`
  else if (value.startsWith('351') && !value.startsWith('+')) value = `+${value}`
  else if (/^\d{9}$/.test(value)) value = `+351${value}`
  if (!/^\+351\d{9}$/.test(value)) return null
  return value
}

export function apiDetailCode(err: unknown): string | null {
  if (err === null || typeof err !== 'object' || !('detail' in err)) return null
  const detail = (err as ApiError).detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && typeof detail.code === 'string') return detail.code
  return null
}
