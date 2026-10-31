import { useEffect, useRef, useState } from 'react'
import {
  DRIVER_REMOTE_AVAILABILITY_POLL_MS,
  DRIVER_TOKEN_GAP_MS,
  driverAvailabilitySessionKey,
  fetchRemoteAvailabilityOfflineUpdate,
  shouldAcceptRemoteAvailabilityResponse,
  shouldHydrateAvailability,
} from './driverAvailabilitySync'
import { traceAvailabilityPoll } from '../../services/gpsNeedTrace'
import { armNativeAuthorizationGap, clearNativeAuthorizationGap } from '../../services/gpsOwnership'
import { sessionEpoch } from './driverSessionFamily'

/**
 * Poll de GET /driver/status.
 * A hidratação reinicia com a família ou com o fim da sessão, não com o access token.
 * O prazo da lacuna é absoluto: um render não o renova e o looper nativo corre com a WebView em pausa.
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
  const authorizedKeyRef = useRef<string | null>(null)
  const gapDeadlineRef = useRef<number | null>(null)
  const signedIn = Boolean(opts.token)
  const sessionKey = driverAvailabilitySessionKey(opts.sessionRole, opts.family)

  useEffect(() => {
    const current = optsRef.current
    if (!sessionKey) {
      authorizedKeyRef.current = null
      gapDeadlineRef.current = null
      clearNativeAuthorizationGap()
      setHydrated(false)
      current.onSessionCleared()
      return
    }
    if (!signedIn) {
      if (authorizedKeyRef.current !== sessionKey) {
        authorizedKeyRef.current = null
        gapDeadlineRef.current = null
        clearNativeAuthorizationGap()
        setHydrated(false)
        current.onSessionCleared()
        return
      }
      if (gapDeadlineRef.current == null) {
        gapDeadlineRef.current = Date.now() + DRIVER_TOKEN_GAP_MS
      }
      const expire = () => {
        const live = optsRef.current
        if (live.token) return
        if (driverAvailabilitySessionKey(live.sessionRole, live.family) !== sessionKey) return
        if (authorizedKeyRef.current !== sessionKey) return
        authorizedKeyRef.current = null
        gapDeadlineRef.current = null
        clearNativeAuthorizationGap()
        setHydrated(false)
        live.onSessionCleared()
      }
      const remaining = gapDeadlineRef.current - Date.now()
      if (remaining <= 0) {
        expire()
        return
      }
      const timeoutId = window.setTimeout(expire, remaining)
      armNativeAuthorizationGap(remaining)
      const onWake = () => {
        const deadline = gapDeadlineRef.current
        if (deadline != null && Date.now() >= deadline) expire()
      }
      document.addEventListener('visibilitychange', onWake)
      document.addEventListener('resume', onWake)
      window.addEventListener('focus', onWake)
      window.addEventListener('pageshow', onWake)
      return () => {
        window.clearTimeout(timeoutId)
        clearNativeAuthorizationGap()
        document.removeEventListener('visibilitychange', onWake)
        document.removeEventListener('resume', onWake)
        window.removeEventListener('focus', onWake)
        window.removeEventListener('pageshow', onWake)
      }
    }

    const deadlinePassed = gapDeadlineRef.current != null && Date.now() >= gapDeadlineRef.current
    gapDeadlineRef.current = null
    clearNativeAuthorizationGap()
    const continuing = !deadlinePassed && authorizedKeyRef.current === sessionKey
    if (!continuing) {
      authorizedKeyRef.current = null
      setHydrated(false)
      current.onSessionCleared()
    }

    let cancelled = false
    let hydratedOnce = continuing
    let fetchSeq = 0
    const samples = new Map<number, { ok: true; status: T } | { ok: false }>()

    const tick = () => {
      const live = optsRef.current
      if (live.getSyncing()) {
        traceAvailabilityPoll({ phase: 'start' })
        traceAvailabilityPoll({ phase: 'end', accepted: false, statusOk: false })
        return
      }
      const responseSeq = ++fetchSeq
      const toggleEpoch = live.getToggleEpoch()
      const familyEpoch = sessionEpoch()
      traceAvailabilityPoll({ phase: 'start' })
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
          traceAvailabilityPoll({ phase: 'end', accepted: false, statusOk: false })
          return
        }
        const sample = samples.get(responseSeq)
        samples.delete(responseSeq)
        traceAvailabilityPoll({ phase: 'end', accepted: true, statusOk: sample?.ok === true })
        if (shouldHydrateAvailability({ accepted: true, statusOk: sample?.ok === true })) {
          if (sample?.ok) now.onApplied(sample.status)
          authorizedKeyRef.current = sessionKey
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
