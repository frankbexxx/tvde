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

/** Login Google pediu a palavra-passe da conta existente. Não traz o papel. */
export function readExistingAccountLink(err: unknown): { idToken: string | null } | null {
  if (err === null || typeof err !== 'object' || !('detail' in err)) return null
  const detail = (err as ApiError).detail
  if (detail === null || typeof detail !== 'object' || Array.isArray(detail)) return null
  if (detail.code !== 'existing_account_link_required' || detail.proof !== 'password') return null
  const idToken = typeof detail.id_token === 'string' && detail.id_token ? detail.id_token : null
  return { idToken }
}

/** Nome e email do id token Google, só para preencher o ecrã. Não valida a assinatura. */
export function googleIdTokenProfile(idToken: string): { name: string; email: string } | null {
  const payload = idToken.split('.')[1]
  if (!payload) return null
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='))) as {
      name?: unknown
      email?: unknown
    }
    const email = typeof json.email === 'string' ? json.email.trim() : ''
    if (!email) return null
    const name = typeof json.name === 'string' ? json.name.trim() : ''
    return { name, email }
  } catch {
    return null
  }
}

export function apiDetailCode(err: unknown): string | null {
  if (err === null || typeof err !== 'object' || !('detail' in err)) return null
  const detail = (err as ApiError).detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && typeof detail.code === 'string') return detail.code
  return null
}
