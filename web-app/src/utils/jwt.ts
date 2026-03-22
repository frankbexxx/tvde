/**
 * Lê payload JWT (sem verificar assinatura — só exp/claims para UX).
 * A validação real continua no servidor em cada pedido.
 */
function base64UrlToJson(part: string): string {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
  return atob(padded)
}

export function parseJwtPayload(token: string): {
  sub?: string
  role?: string
  exp?: number
} | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const json = base64UrlToJson(parts[1])
    return JSON.parse(json) as { sub?: string; role?: string; exp?: number }
  } catch {
    return null
  }
}

export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const p = parseJwtPayload(token)
  if (p?.exp == null) return true
  return p.exp * 1000 <= Date.now() + skewSeconds * 1000
}
