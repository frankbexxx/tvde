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
): {
  data: T | null
  refetch: () => Promise<void>
  isLoading: boolean
  /** True durante um poll quando já existiam dados da última resposta bem-sucedida. */
  isRefreshing: boolean
  /** Timestamp (ms) da última resposta bem-sucedida do callback. */
  lastSuccessAt: number | null
  /** Último poll falhou (rede/5xx); dados anteriores mantêm-se até ao próximo sucesso. */
  pollFault: boolean
} {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null)
  const [pollFault, setPollFault] = useState(false)
  const dataRef = useRef<T | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refetch = useCallback(async () => {
    const background = dataRef.current !== null
    try {
      if (background) setIsRefreshing(true)
      setIsLoading(true)
      const result = await fn()
      setPollFault(false)
      setData(result)
      dataRef.current = result
      setLastSuccessAt(Date.now())
    } catch (err) {
      console.error('Poll error:', err)
      setPollFault(true)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
    // deps is intentional (callers pass [token] etc.); fn is latest from closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (!enabled) {
      dataRef.current = null
      setLastSuccessAt(null)
      setIsRefreshing(false)
      setPollFault(false)
      setData(null)
      setIsLoading(false)
      return
    }
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

  return { data, refetch, isLoading, isRefreshing, lastSuccessAt, pollFault }
}
