import type { TFunction } from 'i18next'
import type { ApiError } from '@/api/client'
import { extractApiDetailCode } from '@/utils/apiErrorDetail'
import i18n from '@/i18n'

/** Valores internos guardados em estado React — nunca mostrar ao utilizador. */
export const GOOGLE_CALLBACK_INTERNAL = {
  onboardingRestart: 'google_onboarding_restart',
  addIdentitySessionLost: 'google_add_identity_session_lost',
} as const

export type GoogleOAuthRecoveryFlow = 'login' | 'add_identity'

export function safeOAuthReturnPath(path: string | null | undefined): string {
  const p = (path ?? '').trim() || '/passenger'
  if (!p.startsWith('/') || p.startsWith('//')) return '/passenger'
  return p
}

export function oauthRecoveryTarget(opts: {
  flow: GoogleOAuthRecoveryFlow
  hasSession: boolean
  returnPath?: string | null
}): { path: string; backLabel: string } {
  if (opts.flow === 'add_identity' || opts.hasSession) {
    return {
      path: safeOAuthReturnPath(opts.returnPath),
      backLabel: i18n.t('auth:googleOAuthBackToAccount'),
    }
  }
  return {
    path: '/passenger',
    backLabel: i18n.t('auth:googleOAuthBackToLogin'),
  }
}

export function resolveGoogleCallbackMessage(resolvedFetchErr: string | null): string {
  if (!resolvedFetchErr) return ''
  if (resolvedFetchErr === GOOGLE_CALLBACK_INTERNAL.onboardingRestart) {
    return i18n.t('auth:googleOnboardingRestart')
  }
  if (resolvedFetchErr === GOOGLE_CALLBACK_INTERNAL.addIdentitySessionLost) {
    return i18n.t('auth:googleOAuthAddIdentitySessionLost')
  }
  return resolvedFetchErr
}

/** Erros do exchange/login no callback — nunca expor slugs crus. */
export function formatGoogleOAuthCallbackError(err: unknown): string {
  if (err !== null && typeof err === 'object' && 'detail' in err) {
    const e = err as ApiError
    const code = extractApiDetailCode(e.detail)
    if (code) {
      const key = `auth:googleOAuthErrors.${code}`
      if (i18n.exists(key)) return i18n.t(key)
    }
    if (e.status === 0 || code === 'timeout') {
      return i18n.t('auth:loginConnectionFailed')
    }
    if (typeof e.status === 'number' && e.status >= 500) {
      return i18n.t('auth:loginServiceUnavailable')
    }
  }
  if (err instanceof Error && err.message) {
    return i18n.t('auth:loginConnectionFailed')
  }
  return i18n.t('auth:googleOAuthGenericFailure')
}

/** Erros do POST /auth/identities/google e métodos na Conta. */
export function mapLoginMethodsApiError(err: unknown, t: TFunction<'common'>): string {
  const e =
    err !== null && typeof err === 'object' && ('detail' in err || 'status' in err)
      ? (err as ApiError)
      : null
  const code = e ? extractApiDetailCode(e.detail) : extractApiDetailCode(err)
  if (e?.status === 401 || code === 'invalid_token' || code === 'not_authenticated') {
    return t('profilePanel.loginMethods.errors.invalid_token')
  }
  if (e?.status === 0 || code === 'timeout') {
    return t('profilePanel.loginMethods.errors.timeout')
  }
  if (code) {
    const key = `profilePanel.loginMethods.errors.${code}` as const
    const translated = t(key)
    if (translated !== key) return translated
  }
  return t('profilePanel.loginMethods.errors.generic')
}
