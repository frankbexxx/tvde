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

/**
 * Shell passageiro/motorista/partner a partir do papel real do JWT.
 * O valor em `tvde_app_route_role` só se aplica quando é compatível com o role.
 */
export function resolveAppRouteRoleFromSession(
  sessionRole: Role | string | undefined,
  savedShell: AppRouteRole | null
): AppRouteRole {
  const r = sessionRole ?? 'passenger'
  if (r === 'partner') return 'partner'
  if (r === 'driver') {
    return savedShell === 'passenger' ? 'passenger' : 'driver'
  }
  if (isBackofficeStaffRole(r)) {
    return savedShell === 'driver' ? 'driver' : 'passenger'
  }
  // passenger (e desconhecidos): nunca herdar driver/partner de sessão anterior
  return 'passenger'
}

/** Admin/backoffice apenas por claim de role — nunca por existência de slot `tokens.admin`. */
export function isAdminFromSessionRole(sessionRole: Role | string | undefined): boolean {
  return isBackofficeStaffRole(sessionRole)
}
