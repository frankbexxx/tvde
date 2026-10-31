import { isCapacitorNative } from '../features/auth/capacitorPlatform'
import {
  activateAndroidRefreshIfReady,
  androidRefreshEnabled,
  logoutAndroidSession,
  refreshAndroidSession,
  resetAndroidRefreshForTests,
} from '../features/auth/androidSession'
import { LS_AUTH_CONTRACT, setStoredAccessToken } from '../utils/authStorage'
import { releaseDriverLocationOwnership } from '../services/gpsOwnership'
import { noteSessionFamily } from '../features/driver/driverSessionFamily'
import { traceRefresh } from '../services/gpsNeedTrace'

export const AUTH_CONTRACT = 'refresh-v1'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export type RefreshOutcome = 'refreshed' | 'stale' | 'invalid' | 'transient'

let epoch = 0
let inflight: Promise<RefreshOutcome> | null = null
let inflightAbort: AbortController | null = null
const listeners = new Set<(token: string) => void>()

export function resetSessionRefreshState(): void {
  resetAndroidRefreshForTests()
  epoch = 0
  inflight = null
  inflightAbort?.abort()
  inflightAbort = null
  listeners.clear()
}

function pathOnly(path: string): string {
  return path.split('?')[0]
}

export function isSessionIssuer(path: string): boolean {
  const pathName = pathOnly(path)
  return (
    pathName === '/auth/login' ||
    pathName === '/auth/otp/verify' ||
    pathName === '/auth/google/exchange' ||
    pathName === '/auth/google/id-token' ||
    pathName === '/auth/google/onboarding' ||
    pathName === '/auth/google/link'
  )
}

export function mustNotRefresh(path: string): boolean {
  const pathName = pathOnly(path)
  return (
    isSessionIssuer(pathName) ||
    pathName.startsWith('/auth/otp/') ||
    pathName.startsWith('/auth/password/') ||
    pathName === '/auth/refresh' ||
    pathName === '/auth/logout' ||
    pathName.startsWith('/auth/google/')
  )
}

export function browserUsesRefresh(): boolean {
  return !isCapacitorNative() && localStorage.getItem(LS_AUTH_CONTRACT) === 'web'
}

export function markBrowserRefreshSession(): void {
  if (isCapacitorNative()) return
  localStorage.setItem(LS_AUTH_CONTRACT, 'web')
}

export function subscribeAccessToken(listener: (token: string) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function contractHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Auth-Contract': AUTH_CONTRACT,
    'X-Auth-Client': 'web',
  }
}

export function authRequestExtras(path: string): {
  headers: Record<string, string>
  credentials?: RequestCredentials
} {
  const pathName = pathOnly(path)
  if (androidRefreshEnabled()) {
    const sending =
      isSessionIssuer(pathName) || pathName === '/auth/refresh' || pathName === '/auth/logout'
    if (!sending) return { headers: {} }
    return {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Contract': AUTH_CONTRACT,
        'X-Auth-Client': 'android',
      },
    }
  }
  if (isCapacitorNative()) return { headers: {} }
  const sending =
    isSessionIssuer(pathName) ||
    ((pathName === '/auth/refresh' || pathName === '/auth/logout') && browserUsesRefresh())
  if (!sending) return { headers: {} }
  return { headers: contractHeaders(), credentials: 'include' }
}

export function noteIssuerSuccess(path: string): void {
  if (isSessionIssuer(path)) markBrowserRefreshSession()
}

export async function prepareNewCredentials(): Promise<void> {
  epoch += 1
  const pending = inflight
  inflightAbort?.abort()
  if (pending) {
    try {
      await pending
    } catch {
      /* a resposta atrasada não substitui credenciais mais recentes */
    }
  }
}

async function performRefresh(started: number): Promise<RefreshOutcome> {
  const controller = new AbortController()
  inflightAbort = controller
  let response: Response
  try {
    response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: contractHeaders(),
      body: JSON.stringify({ idempotency_key: crypto.randomUUID() }),
      signal: controller.signal,
    })
  } catch {
    return traceRefresh(started === epoch ? 'transient' : 'stale')
  } finally {
    if (inflightAbort === controller) inflightAbort = null
  }
  if (started !== epoch) return traceRefresh('stale')
  if (response.status === 401 || response.status === 400) return traceRefresh('invalid')
  if (response.status >= 500) return traceRefresh('transient')
  if (!response.ok) return traceRefresh('invalid')
  const body = (await response.json().catch(() => null)) as { access_token?: unknown } | null
  const token = body?.access_token
  if (typeof token !== 'string' || token.length === 0) {
    return traceRefresh(started === epoch ? 'invalid' : 'stale')
  }
  if (started !== epoch) return traceRefresh('stale')
  setStoredAccessToken(token)
  if (started !== epoch) return traceRefresh('stale')
  listeners.forEach((listener) => listener(token))
  return traceRefresh('refreshed')
}

export async function refreshSession(): Promise<RefreshOutcome> {
  await activateAndroidRefreshIfReady()
  if (androidRefreshEnabled()) {
    if (!inflight) {
      const started = epoch
      inflight = performAndroidRefresh(started).finally(() => {
        inflight = null
      })
    }
    return inflight
  }
  if (!browserUsesRefresh()) return traceRefresh('invalid')
  if (!inflight) {
    const started = epoch
    inflight = performRefresh(started).finally(() => {
      inflight = null
    })
  }
  return inflight
}

async function performAndroidRefresh(started: number): Promise<RefreshOutcome> {
  let outcome: Awaited<ReturnType<typeof refreshAndroidSession>>
  try {
    outcome = await refreshAndroidSession()
  } catch {
    return traceRefresh(started === epoch ? 'transient' : 'stale')
  }
  if (started !== epoch) return traceRefresh('stale')
  if (outcome.kind === 'refreshed' && outcome.accessToken) {
    setStoredAccessToken(outcome.accessToken)
    if (started !== epoch) return traceRefresh('stale')
    const token = outcome.accessToken
    listeners.forEach((listener) => listener(token))
    return traceRefresh('refreshed')
  }
  if (outcome.kind === 'transient' || outcome.kind === 'stale') return traceRefresh(outcome.kind)
  return traceRefresh('invalid')
}

export function logoutBrowserSession(): void {
  epoch += 1
  inflightAbort?.abort()
  releaseDriverLocationOwnership()
  noteSessionFamily(null)
  if (androidRefreshEnabled()) {
    void logoutAndroidSession()
    return
  }
  if (!browserUsesRefresh()) return
  void fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: contractHeaders(),
    body: '{}',
  }).catch(() => undefined)
}
