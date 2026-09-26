import { describe, expect, it } from 'vitest'
import {
  isAdminFromSessionRole,
  resolveAppRouteRoleFromSession,
  resolveAuthBootstrapMode,
  shellsForSessionRole,
} from './authBootstrap'
import { isBackofficeStaffRole } from './authRoles'

describe('resolveAuthBootstrapMode', () => {
  it('BETA=true → login_session (preserva comportamento actual)', () => {
    expect(
      resolveAuthBootstrapMode({
        serverBetaMode: true,
        isViteDev: false,
        isE2E: false,
        e2eInjectValid: false,
      })
    ).toBe('login_session')
    expect(
      resolveAuthBootstrapMode({
        serverBetaMode: true,
        isViteDev: true,
        isE2E: false,
        e2eInjectValid: false,
      })
    ).toBe('login_session')
  })

  it('deployed (PROD build) com BETA=false → login_session, nunca /dev/tokens', () => {
    expect(
      resolveAuthBootstrapMode({
        serverBetaMode: false,
        isViteDev: false,
        isE2E: false,
        e2eInjectValid: false,
      })
    ).toBe('login_session')
  })

  it('Vite DEV com BETA=false → dev_tokens', () => {
    expect(
      resolveAuthBootstrapMode({
        serverBetaMode: false,
        isViteDev: true,
        isE2E: false,
        e2eInjectValid: false,
      })
    ).toBe('dev_tokens')
  })

  it('E2E inject → dev_tokens (seed local, sem POST)', () => {
    expect(
      resolveAuthBootstrapMode({
        serverBetaMode: true,
        isViteDev: true,
        isE2E: true,
        e2eInjectValid: true,
      })
    ).toBe('dev_tokens')
  })

  it('E2E sem inject e BETA=false → dev_tokens (API local)', () => {
    expect(
      resolveAuthBootstrapMode({
        serverBetaMode: false,
        isViteDev: false,
        isE2E: true,
        e2eInjectValid: false,
      })
    ).toBe('dev_tokens')
  })
})

describe('isAdminFromSessionRole / isBackofficeStaffRole', () => {
  it('passenger/driver/partner nunca são admin', () => {
    expect(isAdminFromSessionRole('passenger')).toBe(false)
    expect(isAdminFromSessionRole('driver')).toBe(false)
    expect(isAdminFromSessionRole('partner')).toBe(false)
    expect(isBackofficeStaffRole('passenger')).toBe(false)
  })

  it('admin e super_admin são admin', () => {
    expect(isAdminFromSessionRole('admin')).toBe(true)
    expect(isAdminFromSessionRole('super_admin')).toBe(true)
  })

  it('existência de slot tokens.admin NÃO implica admin (contrato documentado)', () => {
    // Regressão L-FE-14: !!tokens?.admin era incorrecto.
    // isAdmin deriva só do role JWT/session.
    const tokensAdminSlotFilled = true
    const sessionRole = 'passenger'
    expect(tokensAdminSlotFilled && isAdminFromSessionRole(sessionRole)).toBe(false)
  })
})

describe('shellsForSessionRole', () => {
  it('cada papel vê só os contextos permitidos', () => {
    expect(shellsForSessionRole('passenger')).toEqual(['passenger'])
    expect(shellsForSessionRole('driver')).toEqual(['passenger', 'driver'])
    expect(shellsForSessionRole('partner')).toEqual(['passenger', 'partner'])
    expect(shellsForSessionRole('admin')).toEqual(['passenger', 'admin'])
    expect(shellsForSessionRole('super_admin')).toEqual(['passenger', 'admin'])
  })
})

describe('resolveAppRouteRoleFromSession', () => {
  it('partner JWT → shell partner por omissão; permite saved passenger', () => {
    expect(resolveAppRouteRoleFromSession('partner', 'driver')).toBe('partner')
    expect(resolveAppRouteRoleFromSession('partner', null)).toBe('partner')
    expect(resolveAppRouteRoleFromSession('partner', 'passenger')).toBe('passenger')
  })

  it('driver JWT → shell driver por omissão; permite saved passenger', () => {
    expect(resolveAppRouteRoleFromSession('driver', null)).toBe('driver')
    expect(resolveAppRouteRoleFromSession('driver', 'passenger')).toBe('passenger')
    expect(resolveAppRouteRoleFromSession('driver', 'admin')).toBe('driver')
  })

  it('passenger JWT → shell passenger (não herda driver/partner/admin)', () => {
    expect(resolveAppRouteRoleFromSession('passenger', 'driver')).toBe('passenger')
    expect(resolveAppRouteRoleFromSession('passenger', 'partner')).toBe('passenger')
    expect(resolveAppRouteRoleFromSession('passenger', 'admin')).toBe('passenger')
  })

  it('admin/super_admin → admin por omissão; passenger gravado mantém-se', () => {
    expect(resolveAppRouteRoleFromSession('admin', null)).toBe('admin')
    expect(resolveAppRouteRoleFromSession('super_admin', null)).toBe('admin')
    expect(resolveAppRouteRoleFromSession('admin', 'passenger')).toBe('passenger')
    expect(resolveAppRouteRoleFromSession('super_admin', 'driver')).toBe('admin')
    expect(resolveAppRouteRoleFromSession('admin', 'partner')).toBe('admin')
  })
})
