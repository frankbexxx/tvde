import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNativeLocationServiceLifecycle } from '../../hooks/useNativeLocationServiceLifecycle'
import { resetGpsNeedLogForTests } from '../../services/gpsNeedLog'
import { DRIVER_TOKEN_GAP_MS } from './driverAvailabilitySync'
import { noteSessionFamily, resetSessionFamilyForTests } from './driverSessionFamily'
import { useDriverAvailabilitySession } from './useDriverAvailabilitySession'

const serviceCalls: boolean[] = []
const needLogs: string[] = []

function installBridge() {
  window.vamulaGps = {
    nativeOwnsUpload: () => false,
    beginWebViewSend: () => true,
    endWebViewSend: () => undefined,
    sessionChanged: () => undefined,
    setServiceNeeded: (needed: boolean) => {
      serviceCalls.push(needed)
    },
    serviceOperational: () => false,
    serviceCollecting: () => false,
    serviceSending: () => false,
    serviceStopReason: () => '',
    logGpsNeed: (code: string) => {
      needLogs.push(code)
    },
  }
}

function deferred<T>() {
  let resolve: (value: T) => void = () => { }
  let reject: (error: unknown) => void = () => { }
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useDriverAvailabilitySession', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    resetSessionFamilyForTests()
    resetGpsNeedLogForTests()
    serviceCalls.length = 0
    needLogs.length = 0
    installBridge()
    noteSessionFamily('family-a')
  })

  afterEach(() => {
    vi.useRealTimers()
    resetSessionFamilyForTests()
    delete window.vamulaGps
  })

  function mount(initial: { token: string | null; family: string | null; offline: boolean }) {
    const seenTokens: string[] = []
    const offlineUpdates: boolean[] = []
    const status = vi.fn((token: string) => {
      seenTokens.push(token)
      return Promise.resolve({ is_available: !initial.offline })
    })
    const hook = renderHook(
      (props: { token: string | null; family: string | null; offline: boolean }) => {
        const hydrated = useDriverAvailabilitySession({
          token: props.token,
          sessionRole: 'driver',
          family: props.family,
          getSyncing: () => false,
          getToggleEpoch: () => 1,
          getLocalOffline: () => props.offline,
          getStatus: status,
          onApplied: () => undefined,
          onFailed: () => undefined,
          onOffline: (next) => offlineUpdates.push(next),
          onSessionCleared: () => undefined,
        })
        const needed = useNativeLocationServiceLifecycle({
          token: props.token,
          offline: props.offline,
          hydrated,
          syncing: false,
        })
        return { hydrated, needed }
      },
      { initialProps: initial }
    )
    return { ...hook, seenTokens, offlineUpdates, status }
  }

  it('sessão sem família não autoriza GPS mesmo com access token', async () => {
    resetSessionFamilyForTests()
    const hook = mount({ token: 'access-1', family: null, offline: false })
    await act(async () => {
      await Promise.resolve()
    })
    expect(hook.result.current.hydrated).toBe(false)
    expect(hook.result.current.needed).toBe(false)
    expect(hook.status).not.toHaveBeenCalled()
    expect(serviceCalls).toEqual([false])
  })

  it('refresh da mesma família com motorista Online mantém o GPS necessário', async () => {
    const hook = mount({ token: 'access-1', family: 'family-a', offline: false })
    await waitFor(() => expect(hook.result.current.hydrated).toBe(true))
    expect(hook.result.current.needed).toBe(true)
    expect(serviceCalls).toEqual([false, true])

    hook.rerender({ token: 'access-2', family: 'family-a', offline: false })
    await act(async () => {
      await Promise.resolve()
    })

    expect(hook.result.current.hydrated).toBe(true)
    expect(hook.result.current.needed).toBe(true)
    expect(serviceCalls).toEqual([false, true])
  })

  it('refresh da mesma família com motorista Offline não inicia GPS', async () => {
    const hook = mount({ token: 'access-1', family: 'family-a', offline: true })
    await waitFor(() => expect(hook.result.current.hydrated).toBe(true))
    expect(hook.result.current.needed).toBe(false)
    expect(serviceCalls).toEqual([false])

    hook.rerender({ token: 'access-2', family: 'family-a', offline: true })
    await act(async () => {
      await Promise.resolve()
    })

    expect(hook.result.current.needed).toBe(false)
    expect(serviceCalls).toEqual([false])
  })

  it('mudança de família invalida a hidratação anterior', async () => {
    const familyB = deferred<{ is_available: boolean }>()
    const status = vi.fn((token: string) => {
      if (token === 'access-b') return familyB.promise
      return Promise.resolve({ is_available: true })
    })
    const hook = renderHook(
      (props: { token: string; family: string }) => {
        const hydrated = useDriverAvailabilitySession({
          token: props.token,
          sessionRole: 'driver',
          family: props.family,
          getSyncing: () => false,
          getToggleEpoch: () => 1,
          getLocalOffline: () => false,
          getStatus: status,
          onApplied: () => undefined,
          onFailed: () => undefined,
          onOffline: () => undefined,
          onSessionCleared: () => undefined,
        })
        const needed = useNativeLocationServiceLifecycle({
          token: props.token,
          offline: false,
          hydrated,
          syncing: false,
        })
        return { hydrated, needed }
      },
      { initialProps: { token: 'access-a', family: 'family-a' } }
    )
    await waitFor(() => expect(hook.result.current.hydrated).toBe(true))
    expect(serviceCalls.at(-1)).toBe(true)

    noteSessionFamily('family-b')
    hook.rerender({ token: 'access-b', family: 'family-b' })
    await waitFor(() => expect(hook.result.current.hydrated).toBe(false))
    expect(hook.result.current.needed).toBe(false)
    expect(serviceCalls.at(-1)).toBe(false)

    await act(async () => {
      familyB.resolve({ is_available: true })
    })
    await waitFor(() => expect(hook.result.current.hydrated).toBe(true))
    expect(hook.result.current.needed).toBe(true)
  })

  it('logout invalida a hidratação e pára o GPS', async () => {
    const hook = mount({ token: 'access-1', family: 'family-a', offline: false })
    await waitFor(() => expect(hook.result.current.needed).toBe(true))

    noteSessionFamily(null)
    hook.rerender({ token: null, family: null, offline: true })

    await waitFor(() => expect(hook.result.current.hydrated).toBe(false))
    expect(hook.result.current.needed).toBe(false)
    expect(serviceCalls[serviceCalls.length - 1]).toBe(false)
  })

  it('resposta atrasada da família A é descartada depois de entrar B', async () => {
    const familyA = deferred<{ is_available: boolean }>()
    const offlineUpdates: boolean[] = []
    const status = vi.fn((token: string) => {
      if (token === 'access-a') return familyA.promise
      return Promise.reject(new Error('status_failed'))
    })
    const hook = renderHook(
      (props: { token: string; family: string }) =>
        useDriverAvailabilitySession({
          token: props.token,
          sessionRole: 'driver',
          family: props.family,
          getSyncing: () => false,
          getToggleEpoch: () => 1,
          getLocalOffline: () => true,
          getStatus: status,
          onApplied: () => undefined,
          onFailed: () => undefined,
          onOffline: (next) => offlineUpdates.push(next),
          onSessionCleared: () => undefined,
        }),
      { initialProps: { token: 'access-a', family: 'family-a' } }
    )

    await waitFor(() => expect(status).toHaveBeenCalledWith('access-a'))
    noteSessionFamily('family-b')
    hook.rerender({ token: 'access-b', family: 'family-b' })
    await act(async () => {
      familyA.resolve({ is_available: true })
    })

    expect(offlineUpdates).toEqual([])
    expect(hook.result.current).toBe(false)
  })

  it('falha de /driver/status numa sessão nova não autoriza GPS', async () => {
    const status = vi.fn(() => Promise.reject(new Error('offline')))
    const hook = renderHook(() => {
      const hydrated = useDriverAvailabilitySession({
        token: 'access-1',
        sessionRole: 'driver',
        family: 'family-a',
        getSyncing: () => false,
        getToggleEpoch: () => 1,
        getLocalOffline: () => false,
        getStatus: status,
        onApplied: () => undefined,
        onFailed: () => undefined,
        onOffline: () => undefined,
        onSessionCleared: () => undefined,
      })
      const needed = useNativeLocationServiceLifecycle({
        token: 'access-1',
        offline: false,
        hydrated,
        syncing: false,
      })
      return { hydrated, needed }
    })

    await waitFor(() => expect(status).toHaveBeenCalled())
    await act(async () => {
      await Promise.resolve()
    })
    expect(hook.result.current.hydrated).toBe(false)
    expect(hook.result.current.needed).toBe(false)
    expect(serviceCalls).toEqual([false])
  })

  it('o poll seguinte usa o access token renovado', async () => {
    const hook = mount({ token: 'access-1', family: 'family-a', offline: false })
    await waitFor(() => expect(hook.seenTokens).toEqual(['access-1']))

    hook.rerender({ token: 'access-2', family: 'family-a', offline: false })
    await act(async () => {
      vi.advanceTimersByTime(12_000)
    })

    await waitFor(() => expect(hook.seenTokens.at(-1)).toBe('access-2'))
    expect(hook.seenTokens).not.toContain(undefined)
  })

  it('regista uma vez a ausência do token e a expiração do prazo', async () => {
    const hook = mount({ token: 'access-1', family: 'family-a', offline: false })
    await waitFor(() => expect(hook.result.current.hydrated).toBe(true))
    needLogs.length = 0
    resetGpsNeedLogForTests()
    hook.rerender({ token: null, family: 'family-a', offline: false })
    hook.rerender({ token: null, family: 'family-a', offline: false })
    expect(needLogs).toEqual(['token-absent'])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DRIVER_TOKEN_GAP_MS)
    })
    expect(needLogs).toEqual(['token-absent', 'gap-expired', 'hydration-cleared'])
    expect(serviceCalls.at(-1)).toBe(false)
    expect(needLogs.join(' ')).not.toContain('access-1')
    expect(needLogs.join(' ')).not.toContain('family-a')
  })
})
