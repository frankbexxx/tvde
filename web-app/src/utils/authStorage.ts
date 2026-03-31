/** Chaves alinhadas com A020 (sem cookies). */

/** Papel da app (UI): passageiro ou motorista — definido no login, não pela URL. */
export const LS_APP_ROUTE_ROLE = 'tvde_app_route_role'

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

/** Valor em `localStorage` sem fallback (null = nunca gravado). */
export function getRawStoredAppRouteRole(): 'passenger' | 'driver' | null {
  const r = localStorage.getItem(LS_APP_ROUTE_ROLE)
  return r === 'driver' ? 'driver' : r === 'passenger' ? 'passenger' : null
}

export function getStoredAppRouteRole(): 'passenger' | 'driver' {
  return getRawStoredAppRouteRole() ?? 'passenger'
}

export function setStoredAppRouteRole(role: 'passenger' | 'driver'): void {
  localStorage.setItem(LS_APP_ROUTE_ROLE, role)
}

export function clearAuthStorage(): void {
  localStorage.removeItem(LS_ACCESS_TOKEN)
  localStorage.removeItem(LS_REFRESH_TOKEN)
  localStorage.removeItem(LS_TOKEN_LEGACY)
  localStorage.removeItem(LS_APP_ROUTE_ROLE)
}
