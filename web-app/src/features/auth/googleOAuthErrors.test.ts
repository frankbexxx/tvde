import { describe, expect, it } from 'vitest'
import '../../i18n'
import {
  formatGoogleOAuthCallbackError,
  mapLoginMethodsApiError,
  oauthRecoveryTarget,
  safeOAuthReturnPath,
} from './googleOAuthErrors'
import i18n from '@/i18n'

describe('formatGoogleOAuthCallbackError', () => {
  it('maps known backend codes to PT messages', () => {
    expect(formatGoogleOAuthCallbackError({ detail: 'identity_revoked' })).toMatch(
      /já não está activo/i,
    )
    expect(formatGoogleOAuthCallbackError({ detail: 'google_exchange_failed' })).toMatch(
      /ligação com o Google/i,
    )
  })

  it('never returns raw slug for unknown codes', () => {
    const msg = formatGoogleOAuthCallbackError({ detail: 'some_internal_debug_code_xyz' })
    expect(msg).not.toMatch(/some_internal_debug_code_xyz/)
    expect(msg).toMatch(/login com Google/i)
  })

  it('maps timeout to connection message', () => {
    expect(formatGoogleOAuthCallbackError({ status: 0, detail: 'timeout' })).toMatch(/ligar/i)
  })
})

describe('oauthRecoveryTarget', () => {
  it('login without session returns passenger login label', () => {
    const r = oauthRecoveryTarget({ flow: 'login', hasSession: false })
    expect(r.path).toBe('/passenger')
    expect(r.backLabel).toBe(i18n.t('auth:googleOAuthBackToLogin'))
  })

  it('add identity uses validated return path', () => {
    const r = oauthRecoveryTarget({
      flow: 'add_identity',
      hasSession: true,
      returnPath: '/passenger/account',
    })
    expect(r.path).toBe('/passenger/account')
    expect(r.backLabel).toBe(i18n.t('auth:googleOAuthBackToAccount'))
  })
})

describe('safeOAuthReturnPath', () => {
  it('rejects open redirects', () => {
    expect(safeOAuthReturnPath('//evil.com')).toBe('/passenger')
  })
})

describe('mapLoginMethodsApiError', () => {
  const t = i18n.getFixedT('pt', 'common')

  it('maps invalid_token and timeout', () => {
    expect(mapLoginMethodsApiError({ status: 401, detail: 'invalid_token' }, t)).toMatch(
      /sessão expirou/i,
    )
    expect(mapLoginMethodsApiError({ status: 0, detail: 'timeout' }, t)).toMatch(/rede/i)
  })

  it('preserves identity conflict copy', () => {
    expect(
      mapLoginMethodsApiError({ detail: { code: 'identity_subject_taken' } }, t),
    ).toMatch(/outra conta/i)
  })

  it('preserves invalid_credentials', () => {
    expect(mapLoginMethodsApiError({ status: 403, detail: 'invalid_credentials' }, t)).toMatch(
      /incorrecta/i,
    )
  })
})
