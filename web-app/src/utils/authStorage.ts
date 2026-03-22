/** Chaves alinhadas com A020 (sem cookies). */

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

export function clearAuthStorage(): void {
  localStorage.removeItem(LS_ACCESS_TOKEN)
  localStorage.removeItem(LS_REFRESH_TOKEN)
  localStorage.removeItem(LS_TOKEN_LEGACY)
}
