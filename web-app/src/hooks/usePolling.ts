import { useCallback, useEffect, useRef, useState } from 'react'
import { VISIBILITY_VISIBLE_EVENT } from '../constants/events'
import { error as logError } from '../utils/logger'

const DEFAULT_POLL_INTERVAL_MS = 3000

export type UsePollingOptions<T> = {
  /**
   * When the callback returns data semantically equal to the last success, keep the
   * previous state reference — avoids re-renders (e.g. passenger trip panel blink).
   */
  equals?: (prev: T, next: T) => boolean
}

/**
 * Hook for polling. Callback is invoked immediately and then every interval.
 * Pass deps to stabilize refetch (e.g. [token]) — avoids re-running on every render.
 * Auto-refetches when tab becomes visible again (after dormancy).
 *
 * L-FE-01: no overlapping in-flight polls; stale/late responses are ignored via generation.
 */
export function usePolling<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  enabled = true,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  options?: UsePollingOptions<T>
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
  const inFlightRef = useRef(false)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      generationRef.current += 1
      inFlightRef.current = false
    }
  }, [])

  const refetch = useCallback(async () => {
    if (inFlightRef.current) return
    const generation = ++generationRef.current
    inFlightRef.current = true
    const background = dataRef.current !== null
    try {
      if (background) setIsRefreshing(true)
      else setIsLoading(true)
      const result = await fn()
      if (generation !== generationRef.current || !mountedRef.current) return
      setPollFault(false)
      const prev = dataRef.current
      const next =
        prev !== null && options?.equals?.(prev, result) ? prev : result
      dataRef.current = next
      setData(next)
      setLastSuccessAt(Date.now())
    } catch (err) {
      if (generation !== generationRef.current || !mountedRef.current) return
      logError('Poll error:', err)
      setPollFault(true)
    } finally {
      inFlightRef.current = false
      if (generation === generationRef.current && mountedRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
    // deps + equals from caller; fn closes over latest fn from render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, options?.equals])

  useEffect(() => {
    if (!enabled) {
      generationRef.current += 1
      inFlightRef.current = false
      dataRef.current = null
      setLastSuccessAt(null)
      setIsRefreshing(false)
      setPollFault(false)
      setData(null)
      setIsLoading(false)
      return
    }
    void refetch()
    intervalRef.current = setInterval(() => {
      void refetch()
    }, intervalMs)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      generationRef.current += 1
      inFlightRef.current = false
    }
  }, [enabled, refetch, intervalMs])

  useEffect(() => {
    const onVisible = () => {
      if (enabled) void refetch()
    }
    window.addEventListener(VISIBILITY_VISIBLE_EVENT, onVisible)
    return () => window.removeEventListener(VISIBILITY_VISIBLE_EVENT, onVisible)
  }, [enabled, refetch])

  return { data, refetch, isLoading, isRefreshing, lastSuccessAt, pollFault }
}
