import { act, render, waitFor } from '@testing-library/react'
import { useEffect, useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDriverStatus } from '../../api/trips'
import { resetSessionRefreshState, subscribeAccessToken } from '../../api/sessionRefresh'
import { useNativeLocationServiceLifecycle } from '../../hooks/useNativeLocationServiceLifecycle'
import {
  resetGpsNeedTraceForTests,
  subscribeGpsNeedTrace,
  type GpsNeedTraceEvent,
} from '../../services/gpsNeedTrace'
import { LS_AUTH_CONTRACT, setStoredAccessToken } from '../../utils/authStorage'
import { DRIVER_REMOTE_AVAILABILITY_POLL_MS, DRIVER_TOKEN_GAP_MS } from './driverAvailabilitySync'
import { noteSessionFamily, resetSessionFamilyForTests } from './driverSessionFamily'
import { useDriverAvailabilitySession } from './useDriverAvailabilitySession'

vi.mock('../../sentry', () => ({
  reportApiServerError: vi.fn(),
}))

const bridgeCalls: boolean[] = []
const events: GpsNeedTraceEvent[] = []
let stopTrace: () => void = () => undefined

function installBridge() {
  window.vamulaGps = {
    nativeOwnsUpload: () => false,
    beginWebViewSend: () => true,
    endWebViewSend: () => undefined,
    sessionChanged: () => undefined,
    setServiceNeeded: (needed: boolean) => {
      bridgeCalls.push(needed)
    },
    serviceOperational: () => false,
    serviceCollecting: () => false,
    serviceSending: () => false,
    serviceStopReason: () => '',
  }
}

function androidCalls(): boolean[] {
  return events.flatMap((event) => (event.kind === 'android' ? [event.needed] : []))
}

function refreshOutcomes(): string[] {
  return events.flatMap((event) => (event.kind === 'refresh' ? [event.outcome] : []))
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    headers: { get: () => null },
    json: async () => body,
  }
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function SessionHarness(props: {
  token: string | null
  family: string | null
  offlineNow?: boolean
  getStatus: (token: string) => Promise<{ is_available: boolean }>
}) {
  const [liveToken, setLiveToken] = useState(props.token)
  const [seenToken, setSeenToken] = useState(props.token)
  if (props.token !== seenToken) {
    setSeenToken(props.token)
    setLiveToken(props.token)
  }
  const [offline, setOffline] = useState(true)
  const [seenOfflineNow, setSeenOfflineNow] = useState(false)
  if ((props.offlineNow ?? false) !== seenOfflineNow) {
    setSeenOfflineNow(props.offlineNow ?? false)
    if (props.offlineNow) setOffline(true)
  }
  const offlineRef = useRef(offline)
  useEffect(() => {
    offlineRef.current = offline
  }, [offline])
  useEffect(() => subscribeAccessToken(setLiveToken), [])
  const hydrated = useDriverAvailabilitySession({
    token: liveToken,
    sessionRole: 'driver',
    family: props.family,
    getSyncing: () => false,
    getCanGoOnline: () => true,
    getToggleEpoch: () => 1,
    getLocalOffline: () => offlineRef.current,
    getStatus: props.getStatus,
    onApplied: () => undefined,
    onFailed: () => undefined,
    onOffline: setOffline,
    onSessionCleared: () => undefined,
  })
  useNativeLocationServiceLifecycle({
    token: liveToken,
    offline,
    hydrated,
    syncing: false,
  })
  return null
}

async function onlineWith(props: {
  token?: string | null
  family?: string | null
  getStatus?: (token: string) => Promise<{ is_available: boolean }>
}) {
  const view = render(
    <SessionHarness
      token={props.token === undefined ? 'access-1' : props.token}
      family={props.family === undefined ? 'family-a' : props.family}
      getStatus={props.getStatus ?? (() => Promise.resolve({ is_available: true }))}
    />
  )
  await waitFor(() => expect(bridgeCalls.at(-1)).toBe(true))
  return view
}

describe('reprodução da paragem L4', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    bridgeCalls.length = 0
    events.length = 0
    resetSessionFamilyForTests()
    resetSessionRefreshState()
    localStorage.clear()
    installBridge()
    noteSessionFamily('family-a')
    resetGpsNeedTraceForTests()
    stopTrace = subscribeGpsNeedTrace((event) => events.push(event))
  })

  afterEach(() => {
    stopTrace()
    vi.useRealTimers()
    resetSessionFamilyForTests()
    resetSessionRefreshState()
    vi.unstubAllGlobals()
    delete window.vamulaGps
  })

  it('erro transitório de /driver/status não pára o serviço', async () => {
    let fail = false
    await onlineWith({
      getStatus: () =>
        fail ? Promise.reject(new Error('status_unavailable')) : Promise.resolve({ is_available: true }),
    })
    fail = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DRIVER_REMOTE_AVAILABILITY_POLL_MS)
    })
    expect(bridgeCalls).toEqual([false, true])
    expect(androidCalls()).toEqual(bridgeCalls)
    expect(events.some((event) => event.kind === 'availability-poll' && event.phase === 'end' && event.statusOk === false)).toBe(true)
    expect(refreshOutcomes()).toEqual([])
  })

  it('refresh pelo apiFetch real mantém a necessidade', async () => {
    localStorage.setItem(LS_AUTH_CONTRACT, 'web')
    setStoredAccessToken('access-1')
    let expired = false
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const href = String(url)
      if (href.includes('/auth/refresh')) return jsonResponse(200, { access_token: 'access-2' })
      if (href.includes('/driver/status')) {
        const headers = (init?.headers ?? {}) as Record<string, string>
        if (expired && headers.Authorization === 'Bearer access-1') {
          return jsonResponse(401, { detail: 'invalid_token' })
        }
        return jsonResponse(200, { is_available: true })
      }
      throw new Error(`pedido inesperado ${href}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    await onlineWith({ getStatus: (token) => getDriverStatus(token) })
    expired = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DRIVER_REMOTE_AVAILABILITY_POLL_MS)
    })
    expect(refreshOutcomes()).toEqual(['refreshed'])
    expect(bridgeCalls).toEqual([false, true])
    expect(androidCalls()).toEqual(bridgeCalls)
    expect(events.some((event) => event.kind === 'react' && event.familyChanged)).toBe(false)
  })

  it('token ausente brevemente na mesma família não pára o serviço', async () => {
    const view = await onlineWith({})
    view.rerender(<SessionHarness token={null} family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    view.rerender(<SessionHarness token="access-2" family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(bridgeCalls).toEqual([false, true])
    expect(androidCalls()).toEqual(bridgeCalls)
    expect(events.some((event) => event.kind === 'family')).toBe(false)
    expect(events.some((event) => event.kind === 'lifecycle' && event.phase === 'unmount')).toBe(false)
    expect(events.some((event) => event.kind === 'react' && event.needed === true && event.tokenPresent === false && event.hydrated)).toBe(true)
  })

  it('token ausente numa sessão ainda não confirmada não arranca o GPS', async () => {
    const status = vi.fn(() => Promise.resolve({ is_available: true }))
    render(<SessionHarness token={null} family="family-a" getStatus={status} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DRIVER_TOKEN_GAP_MS)
    })
    expect(status).not.toHaveBeenCalled()
    expect(bridgeCalls).toEqual([false])
    expect(androidCalls()).toEqual(bridgeCalls)
  })

  it('ausência prolongada retira a autorização e a reposição exige nova confirmação', async () => {
    const view = await onlineWith({})
    view.rerender(<SessionHarness token={null} family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    expect(bridgeCalls).toEqual([false, true])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DRIVER_TOKEN_GAP_MS)
    })
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(false))
    expect(bridgeCalls).toEqual([false, true, false])
    view.rerender(<SessionHarness token="access-2" family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(true))
    expect(bridgeCalls).toEqual([false, true, false, true])
    expect(androidCalls()).toEqual(bridgeCalls)
  })

  it('renders repetidos não renovam o prazo de 15 s', async () => {
    const armed: number[] = []
    const view = await onlineWith({})
    const current = window.vamulaGps
    if (!current?.setServiceNeeded) throw new Error('ponte em falta')
    window.vamulaGps = {
      ...current,
      armAuthorizationGap: (delayMs: number) => {
        armed.push(delayMs)
      },
      clearAuthorizationGap: () => undefined,
    }
    view.rerender(<SessionHarness token={null} family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    expect(armed).toEqual([DRIVER_TOKEN_GAP_MS])
    for (let i = 0; i < 6; i += 1) {
      view.rerender(<SessionHarness token={null} family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    }
    expect(armed).toEqual([DRIVER_TOKEN_GAP_MS])
    expect(bridgeCalls).toEqual([false, true])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    for (let i = 0; i < 4; i += 1) {
      view.rerender(<SessionHarness token={null} family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    }
    expect(bridgeCalls).toEqual([false, true])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(false))
    expect(bridgeCalls).toEqual([false, true, false])
    expect(armed).toEqual([DRIVER_TOKEN_GAP_MS])
  })

  it('com o temporizador suspenso o relógio e o resume terminam o prazo', async () => {
    const status = vi.fn(() => Promise.resolve({ is_available: true }))
    const view = await onlineWith({ getStatus: status })
    const confirmed = status.mock.calls.length
    view.rerender(<SessionHarness token={null} family="family-a" getStatus={status} />)
    expect(bridgeCalls).toEqual([false, true])
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(bridgeCalls).toEqual([false, true])
    vi.clearAllTimers()
    vi.setSystemTime(Date.now() + DRIVER_TOKEN_GAP_MS + 1_000)
    await act(async () => {
      document.dispatchEvent(new Event('resume'))
    })
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(false))
    expect(bridgeCalls).toEqual([false, true, false])
    view.rerender(<SessionHarness token="access-2" family="family-a" getStatus={status} />)
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(true))
    expect(bridgeCalls).toEqual([false, true, false, true])
    expect(status.mock.calls.length).toBeGreaterThan(confirmed)
  })

  it('token reposto depois do prazo, sem o temporizador, exige nova confirmação', async () => {
    const status = vi.fn(() => Promise.resolve({ is_available: true }))
    const view = await onlineWith({ getStatus: status })
    view.rerender(<SessionHarness token={null} family="family-a" getStatus={status} />)
    vi.clearAllTimers()
    vi.setSystemTime(Date.now() + DRIVER_TOKEN_GAP_MS + 1_000)
    view.rerender(<SessionHarness token="access-2" family="family-a" getStatus={status} />)
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(true))
    expect(bridgeCalls).toEqual([false, true, false, true])
  })

  it('logout durante a lacuna pára de imediato', async () => {
    const view = await onlineWith({})
    view.rerender(<SessionHarness token={null} family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    expect(bridgeCalls).toEqual([false, true])
    act(() => {
      noteSessionFamily(null)
    })
    view.rerender(<SessionHarness token={null} family={null} getStatus={() => Promise.resolve({ is_available: true })} />)
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(false))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(bridgeCalls).toEqual([false, true, false])
  })

  it('troca de família durante a lacuna pára de imediato', async () => {
    const view = await onlineWith({})
    view.rerender(<SessionHarness token={null} family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    expect(bridgeCalls).toEqual([false, true])
    act(() => {
      noteSessionFamily('family-b')
    })
    view.rerender(<SessionHarness token={null} family="family-b" getStatus={() => Promise.resolve({ is_available: true })} />)
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(false))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(bridgeCalls).toEqual([false, true, false])
  })

  it('offline durante a lacuna pára de imediato', async () => {
    const view = await onlineWith({})
    view.rerender(<SessionHarness token={null} family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    expect(bridgeCalls).toEqual([false, true])
    view.rerender(
      <SessionHarness token={null} family="family-a" offlineNow getStatus={() => Promise.resolve({ is_available: true })} />
    )
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(false))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(bridgeCalls).toEqual([false, true, false])
    expect(events.some((event) => event.kind === 'lifecycle' && event.phase === 'unmount')).toBe(false)
  })

  it('refresh inválido termina a sessão e pára o GPS', async () => {
    localStorage.setItem(LS_AUTH_CONTRACT, 'web')
    setStoredAccessToken('access-1')
    let expired = false
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const href = String(url)
      if (href.includes('/auth/refresh')) return jsonResponse(401, { detail: 'invalid' })
      if (href.includes('/driver/status')) {
        const headers = (init?.headers ?? {}) as Record<string, string>
        if (expired && headers.Authorization === 'Bearer access-1') return jsonResponse(401, { detail: 'invalid_token' })
        return jsonResponse(200, { is_available: true })
      }
      throw new Error(`pedido inesperado ${href}`)
    })
    function InvalidRefreshProbe() {
      const [token, setToken] = useState<string | null>('access-1')
      const [family, setFamily] = useState<string | null>('family-a')
      useEffect(() => {
        const on401 = () => {
          noteSessionFamily(null)
          setToken(null)
          setFamily(null)
        }
        window.addEventListener('api:401', on401)
        return () => window.removeEventListener('api:401', on401)
      }, [])
      return <SessionHarness token={token} family={family} getStatus={(current) => getDriverStatus(current)} />
    }
    render(<InvalidRefreshProbe />)
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(true))
    expired = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DRIVER_REMOTE_AVAILABILITY_POLL_MS)
    })
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(false))
    expect(refreshOutcomes()).toEqual(['invalid'])
    expect(events.some((event) => event.kind === 'family')).toBe(true)
    expect(bridgeCalls).toEqual([false, true, false])
    expect(androidCalls()).toEqual(bridgeCalls)
  })

  it('desmontar e remontar a mesma família pára e volta a pedir o serviço', async () => {
    const first = await onlineWith({})
    first.unmount()
    expect(bridgeCalls.at(-1)).toBe(false)
    render(<SessionHarness token="access-1" family="family-a" getStatus={() => Promise.resolve({ is_available: true })} />)
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(true))
    expect(bridgeCalls).toEqual([false, true, false, false, true])
    expect(androidCalls()).toEqual(bridgeCalls)
    expect(events.filter((event) => event.kind === 'lifecycle').map((event) => event.phase)).toEqual([
      'mount',
      'unmount',
      'mount',
    ])
    expect(events.some((event) => event.kind === 'family')).toBe(false)
  })

  it('mudança real de família pára e volta a pedir o serviço', async () => {
    const view = await onlineWith({})
    act(() => {
      noteSessionFamily('family-b')
    })
    view.rerender(<SessionHarness token="access-1" family="family-b" getStatus={() => Promise.resolve({ is_available: true })} />)
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(true))
    expect(bridgeCalls).toEqual([false, true, false, true])
    expect(androidCalls()).toEqual(bridgeCalls)
    expect(events.filter((event) => event.kind === 'family')).toEqual([{ kind: 'family', changed: true }])
  })

  it('logout pára o serviço e não o religa', async () => {
    const view = await onlineWith({})
    act(() => {
      noteSessionFamily(null)
    })
    view.rerender(<SessionHarness token={null} family={null} getStatus={() => Promise.resolve({ is_available: true })} />)
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(false))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DRIVER_REMOTE_AVAILABILITY_POLL_MS)
    })
    expect(bridgeCalls).toEqual([false, true, false])
    expect(androidCalls()).toEqual(bridgeCalls)
    expect(events.some((event) => event.kind === 'family')).toBe(true)
  })

  it('passagem explícita a Offline pára o serviço e não o religa', async () => {
    const view = await onlineWith({})
    view.rerender(
      <SessionHarness
        token="access-1"
        family="family-a"
        offlineNow
        getStatus={() => Promise.resolve({ is_available: true })}
      />
    )
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(false))
    expect(bridgeCalls).toEqual([false, true, false])
    expect(androidCalls()).toEqual(bridgeCalls)
    expect(events.some((event) => event.kind === 'family')).toBe(false)
    expect(events.some((event) => event.kind === 'lifecycle' && event.phase === 'unmount')).toBe(false)
    expect(events.some((event) => event.kind === 'react' && event.needed === false && event.offline && event.tokenPresent && event.hydrated)).toBe(true)
  })

  it('poll atrasado da família anterior não altera a necessidade da família nova', async () => {
    const lateA = deferred<{ is_available: boolean }>()
    const lateB = deferred<{ is_available: boolean }>()
    let calls = 0
    const view = await onlineWith({
      getStatus: () => {
        calls += 1
        if (calls === 1) return Promise.resolve({ is_available: true })
        if (calls === 2) return lateA.promise
        return lateB.promise
      },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DRIVER_REMOTE_AVAILABILITY_POLL_MS)
    })
    expect(calls).toBe(2)
    act(() => {
      noteSessionFamily('family-b')
    })
    view.rerender(<SessionHarness token="access-1" family="family-b" getStatus={() => lateB.promise} />)
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(false))
    const whileLate = bridgeCalls.slice()
    await act(async () => {
      lateA.resolve({ is_available: false })
      await Promise.resolve()
    })
    expect(bridgeCalls).toEqual(whileLate)
    expect(events.some((event) => event.kind === 'availability-poll' && event.phase === 'end' && event.accepted === false)).toBe(true)
    await act(async () => {
      lateB.resolve({ is_available: true })
    })
    await waitFor(() => expect(bridgeCalls.at(-1)).toBe(true))
    expect(bridgeCalls).toEqual([false, true, false, true])
    expect(androidCalls()).toEqual(bridgeCalls)
  })
})
