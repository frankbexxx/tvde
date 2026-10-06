import { useCallback, useEffect, useState } from 'react'

/**
 * Segundos em `requested` antes de mostrar «Ainda à procura de motorista» (P24).
 * Só muda a cópia: a Trip mantém-se a mesma enquanto o passageiro quiser esperar.
 */
export const PASSENGER_SEARCH_FALLBACK_AFTER_SEC = 25

export function passengerSearchFallbackVisible(opts: {
  nowMs: number
  createdAtMs: number
  continuedAtMs: number | null
}): boolean {
  const since = Math.max(opts.createdAtMs, opts.continuedAtMs ?? 0)
  if (!Number.isFinite(since)) return false
  return opts.nowMs - since >= PASSENGER_SEARCH_FALLBACK_AFTER_SEC * 1000
}

/**
 * «Continuar à espera» só reinicia o aviso para a mesma `tripId`;
 * nunca cancela nem cria outra Trip.
 */
export function usePassengerSearchFallback(opts: {
  tripId: string | null
  createdAtIso: string | null | undefined
  searching: boolean
}): { showFallback: boolean; continueWaiting: () => void } {
  const { tripId, createdAtIso, searching } = opts
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [continued, setContinued] = useState<{ tripId: string; atMs: number } | null>(null)

  useEffect(() => {
    if (!searching) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [searching])

  const continueWaiting = useCallback(() => {
    if (!tripId) return
    const at = Date.now()
    setContinued({ tripId, atMs: at })
    setNowMs(at)
  }, [tripId])

  const showFallback =
    searching &&
    !!tripId &&
    !!createdAtIso &&
    passengerSearchFallbackVisible({
      nowMs,
      createdAtMs: new Date(createdAtIso).getTime(),
      continuedAtMs: continued?.tripId === tripId ? continued.atMs : null,
    })

  return { showFallback, continueWaiting }
}
