import { useEffect, useRef, useState } from 'react'
import {
  DRIVER_REMOTE_AVAILABILITY_POLL_MS,
  driverAvailabilitySessionKey,
  fetchRemoteAvailabilityOfflineUpdate,
  shouldAcceptRemoteAvailabilityResponse,
  shouldHydrateAvailability,
} from './driverAvailabilitySync'
import { sessionEpoch } from './driverSessionFamily'

/**
 * Poll de GET /driver/status.
 * A hidratação reinicia com a família ou com o fim da sessão, não com o access token.
 */
export function useDriverAvailabilitySession<T extends { is_available: boolean }>(opts: {
  token: string | null
  sessionRole: string | null | undefined
  family: string | null
  getSyncing: () => boolean
  getCanGoOnline: () => boolean
  getToggleEpoch: () => number
  getLocalOffline: () => boolean
  getStatus: (token: string) => Promise<T>
  onApplied: (status: T) => void
  onFailed: () => void
  onOffline: (offline: boolean) => void
  onSessionCleared: () => void
}): boolean {
  const optsRef = useRef(opts)
  optsRef.current = opts
  const [hydrated, setHydrated] = useState(false)
  const signedIn = Boolean(opts.token)
  const sessionKey = driverAvailabilitySessionKey(opts.sessionRole, opts.family)

  useEffect(() => {
    const current = optsRef.current
    if (!signedIn || !sessionKey) {
      setHydrated(false)
      current.onSessionCleared()
      return
    }

    let cancelled = false
    let hydratedOnce = false
    let fetchSeq = 0
    const samples = new Map<number, { ok: true; status: T } | { ok: false }>()
    setHydrated(false)
    current.onSessionCleared()

    const tick = () => {
      const live = optsRef.current
      if (live.getSyncing()) return
      const responseSeq = ++fetchSeq
      const toggleEpoch = live.getToggleEpoch()
      const familyEpoch = sessionEpoch()
      void fetchRemoteAvailabilityOfflineUpdate({
        getStatus: async () => {
          const token = optsRef.current.token
          if (!token) {
            samples.set(responseSeq, { ok: false })
            throw new Error('signed_out')
          }
          try {
            const status = await optsRef.current.getStatus(token)
            samples.set(responseSeq, { ok: true, status })
            return status
          } catch (error) {
            samples.set(responseSeq, { ok: false })
            throw error
          }
        },
        canGoOnline: live.getCanGoOnline(),
        getLocalOffline: () => optsRef.current.getLocalOffline(),
        getSyncing: () => optsRef.current.getSyncing(),
      }).then((nextOffline) => {
        const now = optsRef.current
        const accepted = shouldAcceptRemoteAvailabilityResponse({
          cancelled,
          syncing: now.getSyncing(),
          responseSeq,
          latestSeq: fetchSeq,
          epochAtStart: toggleEpoch,
          currentEpoch: now.getToggleEpoch(),
          sessionEpochAtStart: familyEpoch,
          currentSessionEpoch: sessionEpoch(),
        })
        if (!accepted) {
          samples.delete(responseSeq)
          return
        }
        const sample = samples.get(responseSeq)
        samples.delete(responseSeq)
        if (shouldHydrateAvailability({ accepted: true, statusOk: sample?.ok === true })) {
          if (sample?.ok) now.onApplied(sample.status)
          if (!hydratedOnce) {
            hydratedOnce = true
            setHydrated(true)
          }
        } else if (sample && !sample.ok) {
          now.onFailed()
        }
        if (nextOffline !== null) now.onOffline(nextOffline)
      })
    }

    tick()
    const intervalId = window.setInterval(tick, DRIVER_REMOTE_AVAILABILITY_POLL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    const onFocus = () => tick()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [signedIn, sessionKey])

  return hydrated
}
