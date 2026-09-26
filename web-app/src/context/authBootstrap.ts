import type { AppRouteRoleStored } from '../utils/authStorage'
import { isBackofficeStaffRole, type Role } from './authRoles'

export type AppRouteRole = AppRouteRoleStored

export type AuthBootstrapMode = 'login_session' | 'dev_tokens'

export interface AuthBootstrapEnv {
  /** Backend `GET /config` → `beta_mode`. */
  serverBetaMode: boolean
  /** Vite `import.meta.env.DEV` (local `vite`). */
  isViteDev: boolean
  /** Playwright `VITE_E2E === 'true'`. */
  isE2E: boolean
  /** Seed inject em localStorage (`tvde_e2e_dev_tokens_json` válido). */
  e2eInjectValid: boolean
}

/**
 * Decide se o bootstrap deve usar `/dev/tokens` (multi-token) ou sessão JWT + LoginScreen.
 *
 * Regras:
 * - E2E inject → multi-token local (sem POST `/dev/tokens`).
 * - `beta_mode` → login session (comportamento actual).
 * - Build deployed (`!isViteDev` e não E2E) → **sempre** login session; nunca `/dev/tokens`.
 * - Só DEV (ou E2E sem inject) com `beta_mode=false` → `/dev/tokens`.
 */
export function resolveAuthBootstrapMode(env: AuthBootstrapEnv): AuthBootstrapMode {
  if (env.e2eInjectValid) return 'dev_tokens'
  if (env.serverBetaMode) return 'login_session'
  // Produção/staging (static build): LoginScreen independente de BETA.
  if (!env.isViteDev && !env.isE2E) return 'login_session'
  return 'dev_tokens'
}

export function shellsForSessionRole(sessionRole: Role | string | undefined): AppRouteRole[] {
  if (sessionRole === 'driver') return ['passenger', 'driver']
  if (sessionRole === 'partner') return ['passenger', 'partner']
  if (isBackofficeStaffRole(sessionRole)) return ['passenger', 'admin']
  return ['passenger']
}

/**
 * Shell a partir do papel real do JWT.
 * O valor gravado só se aplica quando esse papel o permite. Não altera `User.role`.
 */
export function resolveAppRouteRoleFromSession(
  sessionRole: Role | string | undefined,
  savedShell: AppRouteRole | null
): AppRouteRole {
  const allowed = shellsForSessionRole(sessionRole)
  if (savedShell && allowed.includes(savedShell)) return savedShell
  if (sessionRole === 'driver') return 'driver'
  if (sessionRole === 'partner') return 'partner'
  if (isBackofficeStaffRole(sessionRole)) return 'admin'
  return 'passenger'
}

/** Admin/backoffice apenas por claim de role — nunca por existência de slot `tokens.admin`. */
export function isAdminFromSessionRole(sessionRole: Role | string | undefined): boolean {
  return isBackofficeStaffRole(sessionRole)
}
