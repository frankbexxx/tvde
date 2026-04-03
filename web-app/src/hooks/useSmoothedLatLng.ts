import { useEffect, useRef, useState } from 'react'

type Pt = { lat: number; lng: number }

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/**
 * Interpolação curta entre atualizações de GPS (evita “saltos” no marcador).
 */
export function useSmoothedLatLng(
  target: Pt | null | undefined,
  durationMs = 480
): Pt | null {
  const [out, setOut] = useState<Pt | null>(target ?? null)
  const fromRef = useRef<Pt | null>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)

  useEffect(() => {
    if (!target) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      fromRef.current = null
      queueMicrotask(() => setOut(null))
      return
    }

    if (!fromRef.current) {
      fromRef.current = target
      queueMicrotask(() => setOut(target))
      return
    }

    const from = { ...fromRef.current }
    if (from.lat === target.lat && from.lng === target.lng) return

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    startTimeRef.current = performance.now()

    const step = (now: number) => {
      const t = Math.min((now - startTimeRef.current) / durationMs, 1)
      const e = easeOutCubic(t)
      const lat = from.lat + (target.lat - from.lat) * e
      const lng = from.lng + (target.lng - from.lng) * e
      const next = { lat, lng }
      setOut(next)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        fromRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lat/lng apenas; identidade de `target` instável
  }, [target?.lat, target?.lng, durationMs])

  return out
}
