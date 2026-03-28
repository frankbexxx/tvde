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
    if (!enabled || lastSuccessAt == null) {
      setStalled(false)
      return
    }

    const tick = () => {
      if (isRefreshing) {
        setStalled(false)
        return
      }
      setStalled(Date.now() - lastSuccessAt > stallMs)
    }

    tick()
    const id = window.setInterval(tick, 2000)
    return () => window.clearInterval(id)
  }, [enabled, lastSuccessAt, isRefreshing, stallMs])

  return stalled
}
