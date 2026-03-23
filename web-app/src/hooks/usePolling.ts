import { useCallback, useEffect, useRef, useState } from 'react'
import { VISIBILITY_VISIBLE_EVENT } from '../constants/events'

const DEFAULT_POLL_INTERVAL_MS = 3000

/**
 * Hook for polling. Callback is invoked immediately and then every interval.
 * Pass deps to stabilize refetch (e.g. [token]) — avoids re-running on every render.
 * Auto-refetches when tab becomes visible again (after dormancy).
 */
export function usePolling<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  enabled = true,
  intervalMs = DEFAULT_POLL_INTERVAL_MS
): { data: T | null; refetch: () => Promise<void>; isLoading: boolean } {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await fn()
      setData(result)
    } catch (err) {
      console.error('Poll error:', err)
    } finally {
      setIsLoading(false)
    }
    // deps is intentional (callers pass [token] etc.); fn is latest from closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (!enabled) return
    refetch()
    intervalRef.current = setInterval(refetch, intervalMs)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, refetch, intervalMs])

  useEffect(() => {
    const onVisible = () => {
      if (enabled) refetch()
    }
    window.addEventListener(VISIBILITY_VISIBLE_EVENT, onVisible)
    return () => window.removeEventListener(VISIBILITY_VISIBLE_EVENT, onVisible)
  }, [enabled, refetch])

  return { data, refetch, isLoading }
}
