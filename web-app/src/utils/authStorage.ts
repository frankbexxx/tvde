/** Chaves alinhadas com A020 (sem cookies). */

/** Papel da app (UI): passageiro, motorista ou partner — definido no login, não pela URL. */
export const LS_APP_ROUTE_ROLE = 'tvde_app_route_role'
/** Último telemóvel usado no login BETA (sincronizado com LoginScreen). */
export const LS_LAST_PHONE = 'tvde_last_phone'

export const LS_ACCESS_TOKEN = 'access_token'
export const LS_REFRESH_TOKEN = 'refresh_token'
/** Legado — migrar para access_token */
export const LS_TOKEN_LEGACY = 'token'

export function getStoredAccessToken(): string | null {
  const a = localStorage.getItem(LS_ACCESS_TOKEN)
  if (a) return a
  const legacy = localStorage.getItem(LS_TOKEN_LEGACY)
  if (legacy) {
    localStorage.setItem(LS_ACCESS_TOKEN, legacy)
    localStorage.removeItem(LS_TOKEN_LEGACY)
    return legacy
  }
  return null
}

export function setStoredAccessToken(token: string): void {
  localStorage.setItem(LS_ACCESS_TOKEN, token)
  localStorage.removeItem(LS_TOKEN_LEGACY)
}

export type AppRouteRoleStored = 'passenger' | 'driver' | 'partner'

/** Valor em `localStorage` sem fallback (null = nunca gravado). */
export function getRawStoredAppRouteRole(): AppRouteRoleStored | null {
  const r = localStorage.getItem(LS_APP_ROUTE_ROLE)
  return r === 'driver' || r === 'passenger' || r === 'partner' ? r : null
}

export function getStoredAppRouteRole(): AppRouteRoleStored {
  return getRawStoredAppRouteRole() ?? 'passenger'
}

export function setStoredAppRouteRole(role: AppRouteRoleStored): void {
  localStorage.setItem(LS_APP_ROUTE_ROLE, role)
}

export function getStoredLastPhone(): string | null {
  try {
    const p = localStorage.getItem(LS_LAST_PHONE)
    const t = p?.trim()
    return t || null
  } catch {
    return null
  }
}

export function clearAuthStorage(): void {
  localStorage.removeItem(LS_ACCESS_TOKEN)
  localStorage.removeItem(LS_REFRESH_TOKEN)
  localStorage.removeItem(LS_TOKEN_LEGACY)
  localStorage.removeItem(LS_APP_ROUTE_ROLE)
}
