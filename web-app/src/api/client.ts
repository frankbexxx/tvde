/**
 * API client with base URL from env, token injection, 401 handling, and timeout.
 * Token: AuthContext + localStorage access_token (A020).
 */
import { getStoredAccessToken } from '../utils/authStorage'

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

/** Default timeout (ms). Prevents infinite loading on cold start / slow mobile. */
export const DEFAULT_TIMEOUT_MS = 15_000

/** Primeira tentativa (cold start Render): não reduzir abaixo disto. */
export const COLD_START_FIRST_TIMEOUT_MS = 45_000

/** Retries após timeout: tentativas mais curtas (servidor já pode estar quente). */
export const COLD_START_RETRY_TIMEOUT_MS = 12_000

/** @deprecated use COLD_START_FIRST_TIMEOUT_MS — alias para auth inicial */
export const INITIAL_LOAD_TIMEOUT_MS = COLD_START_FIRST_TIMEOUT_MS

export interface ApiError {
  status: number
  detail: string | { detail?: string }
  request_id?: string
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
  const authToken = options.token ?? tokenGetter?.() ?? getStoredAccessToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`
  }
  const { token: _omitToken, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options
  void _omitToken
  let res: Response
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers }, timeoutMs)
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw { status: 0, detail: 'timeout' } as ApiError
    }
    throw e
  }
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('api:401'))
    const requestId = res.headers.get('X-Request-ID') ?? undefined
    const body = await res.json().catch(() => ({}))
    const detail = body.detail ?? body.message ?? res.statusText
    throw { status: 401, detail, request_id: requestId } as ApiError
  }
  if (!res.ok) {
    const requestId = res.headers.get('X-Request-ID') ?? undefined
    const body = await res.json().catch(() => ({}))
    const detail = body.detail ?? body.message ?? res.statusText
    throw { status: res.status, detail, request_id: requestId } as ApiError
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }
  return res.json() as Promise<T>
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Timeout / rede instável no arranque — candidato a retry (não erros HTTP 4xx/5xx explícitos). */
export function isTimeoutLikeError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return true
  if (err instanceof TypeError && /fetch|network|failed/i.test(String(err.message))) return true
  if (err !== null && typeof err === 'object' && 'status' in err) {
    const st = (err as ApiError).status
    if (st === 0) return true
  }
  const d =
    err !== null && typeof err === 'object' && 'detail' in err && typeof (err as ApiError).detail === 'string'
      ? ((err as ApiError).detail as string)
      : ''
  if (d.includes('timeout') || d.includes('Servidor indisponível')) return true
  return false
}

/**
 * Até 4 tentativas (1 + 3 retries) com delays 0s, 0s, 2s, 5s entre tentativas.
 * Primeira: timeout longo (cold start); seguintes: timeout mais curto.
 */
export async function withColdStartRetries<T>(fn: (timeoutMs: number) => Promise<T>): Promise<T> {
  const delaysBeforeAttempt = [0, 0, 2000, 5000]
  let lastErr: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await delay(delaysBeforeAttempt[attempt])
    }
    const ms = attempt === 0 ? COLD_START_FIRST_TIMEOUT_MS : COLD_START_RETRY_TIMEOUT_MS
    try {
      return await fn(ms)
    } catch (e) {
      lastErr = e
      if (!isTimeoutLikeError(e)) throw e
      if (attempt === 3) throw e
    }
  }
  throw lastErr
}
