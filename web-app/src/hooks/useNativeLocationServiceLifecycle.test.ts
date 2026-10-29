import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useNativeLocationServiceLifecycle } from './useNativeLocationServiceLifecycle'

const calls: boolean[] = []

afterEach(() => {
  calls.length = 0
  delete window.vamulaGps
})

function installBridge() {
  window.vamulaGps = {
    nativeOwnsUpload: () => false,
    beginWebViewSend: () => true,
    endWebViewSend: () => undefined,
    sessionChanged: () => undefined,
    setServiceNeeded: (needed: boolean) => {
      calls.push(needed)
    },
    serviceOperational: () => false,
    serviceCollecting: () => false,
    serviceSending: () => false,
    serviceStopReason: () => '',
  }
}

describe('useNativeLocationServiceLifecycle', () => {
  it('passa de offline para online e volta a parar sem repetir o mesmo valor', () => {
    installBridge()
    const offline: {
      token: string | null
      offline: boolean
      hydrated: boolean
      syncing: boolean
      tripStatus: string | null
    } = {
      token: 'tok',
      offline: true,
      hydrated: true,
      syncing: false,
      tripStatus: null,
    }
    const first = renderHook(
      (props: typeof offline) => useNativeLocationServiceLifecycle(props),
      { initialProps: offline }
    )
    expect(first.result.current).toBe(false)
    expect(calls).toEqual([false])

    first.rerender({ ...offline, offline: false })
    expect(first.result.current).toBe(true)
    expect(calls).toEqual([false, true])

    first.rerender({ ...offline, offline: false })
    expect(calls).toEqual([false, true])

    first.rerender({ ...offline, offline: true, tripStatus: 'accepted' })
    expect(calls).toEqual([false, true])

    first.rerender({ ...offline, offline: true, tripStatus: 'completed' })
    expect(calls).toEqual([false, true, false])

    first.rerender({ ...offline, token: null, tripStatus: 'ongoing' })
    expect(first.result.current).toBe(false)
    expect(calls[calls.length - 1]).toBe(false)
  })

  it('ao desmontar pede a paragem mesmo que a necessidade ainda estivesse ligada', () => {
    installBridge()
    const hook = renderHook(() =>
      useNativeLocationServiceLifecycle({
        token: 'tok',
        offline: true,
        hydrated: true,
        syncing: false,
        tripStatus: 'ongoing',
      })
    )
    expect(hook.result.current).toBe(true)
    expect(calls).toEqual([true])
    hook.unmount()
    expect(calls).toEqual([true, false])
  })

  it('sem ponte não chama o serviço', () => {
    const hook = renderHook(() =>
      useNativeLocationServiceLifecycle({
        token: 'tok',
        offline: false,
        hydrated: true,
        syncing: false,
      })
    )
    expect(hook.result.current).toBe(true)
    expect(calls).toEqual([])
  })
})
