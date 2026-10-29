import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ value: false }))

vi.mock('./capacitorPlatform', () => ({
  isCapacitorNative: () => native.value,
}))

vi.mock('../../sentry', () => ({
  reportApiServerError: vi.fn(),
}))

import { apiFetch } from '../../api/client'
import { logoutBrowserSession, prepareNewCredentials, resetSessionRefreshState } from '../../api/sessionRefresh'
import { LS_ACCESS_TOKEN, LS_AUTH_CONTRACT, LS_REFRESH_TOKEN } from '../../utils/authStorage'
import { AUTH_LOGOUT_EVENT } from '../../constants/events'
import {
  currentSessionFamily,
  noteSessionFamily,
  resetSessionFamilyForTests,
  subscribeSessionFamily,
} from '../driver/driverSessionFamily'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    headers: { get: () => null },
    json: async () => body,
  }
}

function installBridge(handler: (message: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>) {
  const bridge = {
    postMessage(raw: string) {
      const message = JSON.parse(raw) as Record<string, unknown>
      void Promise.resolve(handler(message)).then((reply) => {
        bridge.onmessage?.({ data: JSON.stringify({ id: message.id, ...reply }) } as MessageEvent)
      })
    },
    onmessage: null as ((event: MessageEvent) => void) | null,
  }
  window.vamulaVault = bridge
}

describe('circuito Android', () => {
  beforeEach(() => {
    native.value = true
    localStorage.clear()
    resetSessionRefreshState()
    delete window.vamulaVault
    vi.unstubAllGlobals()
    resetSessionFamilyForTests()
  })

  it('sem o contrato android-refresh-v1 não envia cabeçalhos', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { access_token: 'legacy' }))
    vi.stubGlobal('fetch', fetchMock)
    await apiFetch('/auth/login', { method: 'POST', body: '{}' })
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['X-Auth-Contract']).toBeUndefined()
    expect(localStorage.getItem(LS_AUTH_CONTRACT)).toBeNull()
    expect(localStorage.getItem(LS_REFRESH_TOKEN)).toBeNull()
  })

  it('só conclui o login depois da escrita e não guarda o refresh na web', async () => {
    const captured: { message: Record<string, unknown> | null } = { message: null }
    installBridge((message) => {
      if (message.op === 'contract') return { ok: true, contract: 'android-refresh-v1' }
      if (message.op === 'commit') {
        captured.message = message
        return { ok: true }
      }
      return { ok: false, error: 'rejected' }
    })
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        session_id: 'family-1',
        user_id: 'user-1',
        role: 'driver',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const body = await apiFetch<Record<string, unknown>>('/auth/login', { method: 'POST', body: '{}' })
    expect(body.refresh_token).toBeUndefined()
    expect(body.access_token).toBe('access-1')
    expect(captured.message?.refresh_token).toBe('refresh-1')
    expect(captured.message?.session_id).toBe('family-1')
    expect(localStorage.getItem(LS_REFRESH_TOKEN)).toBeNull()
    expect(localStorage.getItem(LS_ACCESS_TOKEN)).toBeNull()
    expect(localStorage.getItem(LS_AUTH_CONTRACT)).toBeNull()
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['X-Auth-Contract']).toBe('refresh-v1')
    expect(headers['X-Auth-Client']).toBe('android')
    expect(init.credentials).toBeUndefined()
    expect(currentSessionFamily()).toBe('family-1')
  })

  it('uma escrita falhada não deixa token de acesso', async () => {
    installBridge((message) => {
      if (message.op === 'contract') return { ok: true, contract: 'android-refresh-v1' }
      return { ok: false, error: 'vault_unavailable' }
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { access_token: 'access-1', refresh_token: 'refresh-1', session_id: 'family-1' })),
    )
    await expect(apiFetch('/auth/login', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 503 })
    expect(localStorage.getItem(LS_ACCESS_TOKEN)).toBeNull()
    expect(localStorage.getItem(LS_REFRESH_TOKEN)).toBeNull()
  })

  it('renovação com sucesso não termina a sessão nem a viagem local', async () => {
    localStorage.setItem(LS_ACCESS_TOKEN, 'old')
    installBridge((message) => {
      if (message.op === 'contract') return { ok: true, contract: 'android-refresh-v1' }
      if (message.op === 'refresh') return { ok: true, kind: 'refreshed', access_token: 'access-new' }
      return { ok: false }
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const headers = (init?.headers ?? {}) as Record<string, string>
        if (headers.Authorization === 'Bearer old') return jsonResponse(401, { detail: 'invalid_token' })
        return jsonResponse(200, { status: 'online' })
      }),
    )
    noteSessionFamily('family-keep')
    let familyChanges = 0
    const stopFamily = subscribeSessionFamily(() => {
      familyChanges += 1
    })
    const on401 = vi.fn()
    const onLogout = vi.fn()
    window.addEventListener('api:401', on401)
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout)
    const body = await apiFetch<{ status: string }>('/driver/status')
    expect(body.status).toBe('online')
    expect(localStorage.getItem(LS_ACCESS_TOKEN)).toBe('access-new')
    expect(localStorage.getItem(LS_REFRESH_TOKEN)).toBeNull()
    expect(on401).not.toHaveBeenCalled()
    expect(onLogout).not.toHaveBeenCalled()
    expect(familyChanges).toBe(0)
    expect(currentSessionFamily()).toBe('family-keep')
    stopFamily()
    window.removeEventListener('api:401', on401)
    window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout)
  })

  it('5xx da renovação não faz logout e 401 inválido faz', async () => {
    localStorage.setItem(LS_ACCESS_TOKEN, 'old')
    installBridge((message) => {
      if (message.op === 'contract') return { ok: true, contract: 'android-refresh-v1' }
      if (message.op === 'refresh') return { ok: true, kind: 'transient' }
      return { ok: false }
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'invalid_token' })))
    const on401 = vi.fn()
    const onLogout = vi.fn()
    window.addEventListener('api:401', on401)
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout)
    await expect(apiFetch('/driver/status')).rejects.toMatchObject({ status: 503 })
    expect(on401).not.toHaveBeenCalled()
    expect(onLogout).not.toHaveBeenCalled()
    expect(localStorage.getItem(LS_ACCESS_TOKEN)).toBe('old')

    resetSessionRefreshState()
    installBridge((message) => {
      if (message.op === 'contract') return { ok: true, contract: 'android-refresh-v1' }
      if (message.op === 'refresh') return { ok: true, kind: 'invalid' }
      return { ok: false }
    })
    await expect(apiFetch('/driver/status')).rejects.toMatchObject({ status: 401 })
    expect(on401).toHaveBeenCalledTimes(1)
    expect(onLogout).not.toHaveBeenCalled()
    window.removeEventListener('api:401', on401)
    window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout)
  })

  it('uma resposta atrasada não substitui a sessão mais recente', async () => {
    localStorage.setItem(LS_ACCESS_TOKEN, 'old')
    let release: (reply: Record<string, unknown>) => void = () => {}
    let parked = false
    installBridge((message) => {
      if (message.op === 'contract') return { ok: true, contract: 'android-refresh-v1' }
      if (message.op === 'refresh') {
        return new Promise((resolve) => {
          release = resolve
          parked = true
        })
      }
      return { ok: false }
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'invalid_token' })))
    const pending = apiFetch('/driver/status')
    await vi.waitFor(() => expect(parked).toBe(true))
    const preparing = prepareNewCredentials()
    localStorage.setItem(LS_ACCESS_TOKEN, 'newer')
    release({ ok: true, kind: 'refreshed', access_token: 'late' })
    await preparing
    await expect(pending).rejects.toMatchObject({ status: 503 })
    expect(localStorage.getItem(LS_ACCESS_TOKEN)).toBe('newer')
    expect(localStorage.getItem(LS_REFRESH_TOKEN)).toBeNull()
  })

  it('o logout local pede a revogação mesmo quando a rede não confirma', async () => {
    let revoked: boolean | null = null
    installBridge((message) => {
      if (message.op === 'contract') return { ok: true, contract: 'android-refresh-v1' }
      if (message.op === 'logout') {
        revoked = message.revoked === true
        return { ok: true, kind: 'logged_out', revoked: false }
      }
      return { ok: false }
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, {})))
    await apiFetch('/config')
    logoutBrowserSession()
    await vi.waitFor(() => expect(revoked).toBe(false))
  })
})
