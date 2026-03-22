import { API_BASE } from './client'

const VALIDATE_TIMEOUT_MS = 10_000

/**
 * Valida access token no servidor (401 = inválido; 403 = token válido mas rota não permitida, ex. admin).
 */
export async function validateAccessToken(token: string): Promise<boolean> {
  const ac = new AbortController()
  const id = setTimeout(() => ac.abort(), VALIDATE_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}/trips/history`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ac.signal,
    })
    if (res.status === 401) return false
    if (res.status === 403) return true
    if (res.status >= 500) return true
    return res.ok
  } catch {
    // Rede/timeout: não invalidar sessão local (JWT ainda pode ser válido)
    return true
  } finally {
    clearTimeout(id)
  }
}
