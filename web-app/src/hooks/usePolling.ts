import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_POLL_INTERVAL_MS = 3000

/**
 * Hook for polling. Callback is invoked immediately and then every interval.
 * Pass deps to stabilize refetch (e.g. [token]) — avoids re-running on every render.
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

  return { data, refetch, isLoading }
}
