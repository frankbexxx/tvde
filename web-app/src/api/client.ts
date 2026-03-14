/**
 * API client with base URL from env, token injection, 401 handling, and timeout.
 * Token stored in memory (AuthContext).
 */

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

/** Default timeout (ms). Prevents infinite loading on cold start / slow mobile. */
export const DEFAULT_TIMEOUT_MS = 15_000

/** Longer timeout for initial load (config, tokens) — cold start can take 60s. */
export const INITIAL_LOAD_TIMEOUT_MS = 45_000

export interface ApiError {
  status: number
  detail: string | { detail?: string }
}

export type TokenGetter = () => string | null

let tokenGetter: TokenGetter | null = null

export function setTokenGetter(getter: TokenGetter) {
  tokenGetter = getter
}

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ac = new AbortController()
  const id = setTimeout(() => ac.abort(), timeoutMs)
  return fetch(url, { ...init, signal: ac.signal }).finally(() => clearTimeout(id))
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null; timeoutMs?: number } = {}
): Promise<T> {
  const token = options.token ?? tokenGetter?.() ?? null
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  const { token: _, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options
  let res: Response
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers }, timeoutMs)
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw { status: 0, detail: 'Servidor indisponível. Tenta novamente.' } as ApiError
    }
    throw e
  }
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
