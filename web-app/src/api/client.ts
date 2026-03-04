/**
 * API client with base URL from env, token injection, and 401 handling.
 * Token stored in memory (AuthContext).
 */

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface ApiError {
  status: number
  detail: string | { detail?: string }
}

export type TokenGetter = () => string | null

let tokenGetter: TokenGetter | null = null

export function setTokenGetter(getter: TokenGetter) {
  tokenGetter = getter
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const token = options.token ?? tokenGetter?.() ?? null
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  const { token: _, ...init } = options
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('api:401'))
    const body = await res.json().catch(() => ({}))
    const detail = body.detail ?? body.message ?? res.statusText
    throw { status: 401, detail } as ApiError
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body.detail ?? body.message ?? res.statusText
    throw { status: res.status, detail } as ApiError
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }
  return res.json() as Promise<T>
}
