import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ value: false }))

vi.mock('../features/auth/capacitorPlatform', () => ({
  isCapacitorNative: () => native.value,
}))

vi.mock('../sentry', () => ({
  reportApiServerError: vi.fn(),
}))

import { apiFetch } from './client'
import { LS_AUTH_CONTRACT, LS_ACCESS_TOKEN } from '../utils/authStorage'
import {
  prepareNewCredentials,
  refreshSession,
  resetSessionRefreshState,
} from './sessionRefresh'

function jsonResponse(status: number, body: unknown, requestId?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    headers: { get: (name: string) => (name === 'X-Request-ID' ? requestId ?? null : null) },
    json: async () => body,
  }
}

describe('renovação web', () => {
  beforeEach(() => {
    native.value = false
    localStorage.clear()
    resetSessionRefreshState()
    vi.unstubAllGlobals()
  })

  it('login do browser pede refresh-v1 e não trata 401 de login como fim de sessão', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'invalid_credentials' }))
    vi.stubGlobal('fetch', fetchMock)
    const on401 = vi.fn()
    window.addEventListener('api:401', on401)
    await expect(apiFetch('/auth/login', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      status: 401,
    })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['X-Auth-Contract']).toBe('refresh-v1')
    expect(headers['X-Auth-Client']).toBe('web')
    expect(init.credentials).toBe('include')
    expect(on401).not.toHaveBeenCalled()
    expect(localStorage.getItem(LS_AUTH_CONTRACT)).toBeNull()
    window.removeEventListener('api:401', on401)
  })

  it('a WebView Capacitor não activa o contrato', async () => {
    native.value = true
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { access_token: 'legacy' }))
    vi.stubGlobal('fetch', fetchMock)
    await apiFetch('/auth/login', { method: 'POST', body: '{}' })
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['X-Auth-Contract']).toBeUndefined()
    expect(localStorage.getItem(LS_AUTH_CONTRACT)).toBeNull()
  })

  it('dois 401 partilham uma única renovação e repetem o pedido uma vez', async () => {
    localStorage.setItem(LS_AUTH_CONTRACT, 'web')
    localStorage.setItem(LS_ACCESS_TOKEN, 'old')
    let refreshCalls = 0
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCalls += 1
        await new Promise((resolve) => setTimeout(resolve, 20))
        return jsonResponse(200, { access_token: 'new' })
      }
      const headers = (init?.headers ?? {}) as Record<string, string>
      if (headers.Authorization === 'Bearer old') return jsonResponse(401, { detail: 'invalid_token' })
      return jsonResponse(200, { status: 'online' })
    })
    vi.stubGlobal('fetch', fetchMock)
    const [first, second] = await Promise.all([
      apiFetch<{ status: string }>('/driver/status'),
      apiFetch<{ status: string }>('/driver/trips/active'),
    ])
    expect(first.status).toBe('online')
    expect(second.status).toBe('online')
    expect(refreshCalls).toBe(1)
    expect(localStorage.getItem(LS_ACCESS_TOKEN)).toBe('new')
    const refreshInit = fetchMock.mock.calls.find((call) => String(call[0]).includes('/auth/refresh'))?.[1] as RequestInit
    expect(refreshInit.credentials).toBe('include')
    expect((refreshInit.headers as Record<string, string>)['X-Auth-Contract']).toBe('refresh-v1')
  })

  it('refresh inválido pede logout e um segundo 401 não renova outra vez', async () => {
    localStorage.setItem(LS_AUTH_CONTRACT, 'web')
    localStorage.setItem(LS_ACCESS_TOKEN, 'old')
    let refreshCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/auth/refresh')) {
          refreshCalls += 1
          return jsonResponse(401, { detail: 'invalid_grant' })
        }
        return jsonResponse(401, { detail: 'invalid_token' })
      }),
    )
    const on401 = vi.fn()
    window.addEventListener('api:401', on401)
    await expect(apiFetch('/driver/status')).rejects.toMatchObject({ status: 401 })
    expect(refreshCalls).toBe(1)
    expect(on401).toHaveBeenCalledTimes(1)
    window.removeEventListener('api:401', on401)
  })

  it('5xx e timeout da renovação não terminam a sessão', async () => {
    localStorage.setItem(LS_AUTH_CONTRACT, 'web')
    localStorage.setItem(LS_ACCESS_TOKEN, 'old')
    const on401 = vi.fn()
    window.addEventListener('api:401', on401)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/auth/refresh')) return jsonResponse(503, { detail: 'refresh_unavailable' })
        return jsonResponse(401, { detail: 'invalid_token' })
      }),
    )
    await expect(apiFetch('/driver/status')).rejects.toMatchObject({ status: 503 })
    expect(on401).not.toHaveBeenCalled()
    expect(localStorage.getItem(LS_ACCESS_TOKEN)).toBe('old')

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/auth/refresh')) throw new TypeError('Failed to fetch')
        return jsonResponse(401, { detail: 'invalid_token' })
      }),
    )
    await expect(apiFetch('/driver/status')).rejects.toMatchObject({ status: 503 })
    expect(on401).not.toHaveBeenCalled()
    expect(localStorage.getItem(LS_ACCESS_TOKEN)).toBe('old')
    window.removeEventListener('api:401', on401)
  })

  it('uma resposta atrasada não substitui o token mais recente', async () => {
    localStorage.setItem(LS_AUTH_CONTRACT, 'web')
    localStorage.setItem(LS_ACCESS_TOKEN, 'old')
    let refreshParked = false
    let release = (): void => {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/auth/refresh')) {
          await new Promise<void>((resolve) => {
            release = () => resolve()
            refreshParked = true
          })
          return jsonResponse(200, { access_token: 'late' })
        }
        return jsonResponse(401, { detail: 'invalid_token' })
      }),
    )
    const pending = apiFetch('/driver/status')
    await vi.waitFor(() => expect(refreshParked).toBe(true))
    const preparing = prepareNewCredentials()
    release()
    await preparing
    localStorage.setItem(LS_ACCESS_TOKEN, 'newer')
    await expect(pending).rejects.toMatchObject({ status: 503 })
    expect(localStorage.getItem(LS_ACCESS_TOKEN)).toBe('newer')
  })

  it('sem contrato, o 401 continua a terminar a sessão e não chama o refresh', async () => {
    let refreshCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/auth/refresh')) refreshCalls += 1
        return jsonResponse(401, { detail: 'invalid_token' })
      }),
    )
    const on401 = vi.fn()
    window.addEventListener('api:401', on401)
    await expect(apiFetch('/trips/active')).rejects.toMatchObject({ status: 401 })
    expect(refreshCalls).toBe(0)
    expect(on401).toHaveBeenCalledTimes(1)
    expect(await refreshSession()).toBe('invalid')
    window.removeEventListener('api:401', on401)
  })
})
