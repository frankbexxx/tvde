import { useEffect } from 'react'

type WakeLockSentinel = { release: () => Promise<void> }

/**
 * Mantém o ecrã ligado enquanto `enabled` (Screen Wake Lock API), quando o browser suporta.
 * Falha silenciosamente (iOS / permissões / contexto inseguro).
 */
export function useScreenWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined') return
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> }
    }
    if (!nav.wakeLock?.request) return

    let lock: WakeLockSentinel | null = null
    let cancelled = false

    void nav.wakeLock
      .request('screen')
      .then((l) => {
        if (cancelled) {
          void l.release()
          return
        }
        lock = l
      })
      .catch(() => {
        /* sem permissão ou não suportado */
      })

    return () => {
      cancelled = true
      if (lock) void lock.release()
      lock = null
    }
  }, [enabled])
}
