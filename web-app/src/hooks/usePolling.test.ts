import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { VISIBILITY_VISIBLE_EVENT } from '../constants/events'
import { usePolling } from './usePolling'

describe('usePolling (L-FE-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('ignores a late older response after a newer poll generation wins', async () => {
    type Deferred = { promise: Promise<string>; resolve: (v: string) => void }
    const deferred = (): Deferred => {
      let resolve: (v: string) => void = () => {}
      const promise = new Promise<string>((r) => {
        resolve = r
      })
      return { promise, resolve }
    }

    const first = deferred()
    const second = deferred()
    let call = 0
    const fn = vi.fn(() => {
      call += 1
      return call === 1 ? first.promise : second.promise
    })

    // Stable deps first so mount starts generation 1 with `first`
    const { result, rerender } = renderHook(
      ({ dep }: { dep: number }) => usePolling(fn, [dep], true, 60_000),
      { initialProps: { dep: 1 } }
    )

    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1))

    // Dep change remounts the poll effect: invalidates gen 1, starts gen 2 with `second`
    rerender({ dep: 2 })
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2))

    await act(async () => {
      second.resolve('newer')
    })
    await waitFor(() => expect(result.current.data).toBe('newer'))

    await act(async () => {
      first.resolve('older')
    })
    // Stale gen must not overwrite
    expect(result.current.data).toBe('newer')
  })

  it('does not start a visibility refresh while a poll is in-flight', async () => {
    let resolveFirst: (v: string) => void = () => {}
    const fn = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolveFirst = r
        })
    )

    renderHook(() => usePolling(fn, [], true, 60_000))
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1))

    await act(async () => {
      window.dispatchEvent(new CustomEvent(VISIBILITY_VISIBLE_EVENT))
      window.dispatchEvent(new CustomEvent(VISIBILITY_VISIBLE_EVENT))
    })
    expect(fn).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFirst('ok')
    })
  })

  it('does not setState after unmount when a late response arrives', async () => {
    let resolvePoll: (v: string) => void = () => {}
    const fn = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolvePoll = r
        })
    )

    const { unmount } = renderHook(() => usePolling(fn, [], true, 60_000))
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1))

    unmount()

    await act(async () => {
      resolvePoll('too-late')
    })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('uses isLoading only on first load; subsequent polls use isRefreshing', async () => {
    let resolvePoll: (v: string) => void = () => {}
    const fn = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolvePoll = r
        })
    )

    const { result } = renderHook(() => usePolling(fn, [], true, 60_000))

    await waitFor(() => expect(result.current.isLoading).toBe(true))
    expect(result.current.isRefreshing).toBe(false)

    await act(async () => {
      resolvePoll('v1')
    })
    await waitFor(() => expect(result.current.data).toBe('v1'))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isRefreshing).toBe(false)

    let resolveSecond: (v: string) => void = () => {}
    fn.mockImplementationOnce(
      () =>
        new Promise<string>((r) => {
          resolveSecond = r
        })
    )

    await act(async () => {
      window.dispatchEvent(new CustomEvent(VISIBILITY_VISIBLE_EVENT))
    })
    await waitFor(() => expect(result.current.isRefreshing).toBe(true))
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      resolveSecond('v2')
    })
    await waitFor(() => expect(result.current.data).toBe('v2'))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isRefreshing).toBe(false)
  })

  it('interval tick is skipped while previous poll is still in-flight', async () => {
    let resolveFirst: (v: string) => void = () => {}
    const fn = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolveFirst = r
        })
    )

    renderHook(() => usePolling(fn, [], true, 100))
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350)
    })
    expect(fn).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFirst('done')
    })
  })
})
