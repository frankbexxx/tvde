import { useEffect, useState } from 'react'

/**
 * True quando passou `stallMs` desde `lastSuccessAt` sem refresh em curso.
 * Reavalia a cada 2s para não depender de re-renders.
 */
export function usePollStallHint(
  lastSuccessAt: number | null,
  isRefreshing: boolean,
  enabled: boolean,
  stallMs = 8500
): boolean {
  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    if (enabled && lastSuccessAt != null) {
      return
    }
    const id = requestAnimationFrame(() => setStalled(false))
    return () => cancelAnimationFrame(id)
  }, [enabled, lastSuccessAt])

  useEffect(() => {
    if (!enabled || lastSuccessAt == null) {
      return
    }

    const tick = () => {
      if (isRefreshing) {
        setStalled(false)
        return
      }
      setStalled(Date.now() - lastSuccessAt > stallMs)
    }

    const raf = requestAnimationFrame(() => tick())
    const interval = window.setInterval(tick, 2000)
    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(interval)
    }
  }, [enabled, lastSuccessAt, isRefreshing, stallMs])

  return stalled
}
