import { useEffect, useRef, useState } from 'react'
import type { GpsFix } from '../../hooks/useGeolocation'
import {
  GPS_RECOVERY_BACKOFF_MS,
  GPS_RECOVERY_COOLDOWN_MS,
  GPS_RECOVERY_MAX_FAILURES,
  GPS_RECOVERY_OBSERVE_MS,
  GPS_RECOVERY_TIMEOUT_MS,
  GPS_RECOVERY_TRIGGER_AGE_MS,
  gpsRecoveryAction,
  isNewerGpsTimestamp,
} from './driverWebGpsRecovery'

type GeolocationLike = {
  getCurrentPosition: (
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options?: PositionOptions,
  ) => void
}

export function useDriverWebGpsRecovery(opts: {
  /** Disponível, autenticado, e não é a shell nativa. */
  enabled: boolean
  lastFixTimestampMs: number | null
  adoptFix: (fix: GpsFix) => boolean
  geolocation?: GeolocationLike | null
}): { attention: 'none' | 'refreshing' | 'cooldown' } {
  const { enabled, lastFixTimestampMs, adoptFix, geolocation } = opts
  const [attention, setAttention] = useState<'none' | 'refreshing' | 'cooldown'>('none')
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  )
  const lastFixRef = useRef(lastFixTimestampMs)
  const adoptRef = useRef(adoptFix)
  const enabledRef = useRef(enabled)
  const visibleRef = useRef(visible)
  const enabledAtRef = useRef<number | null>(null)
  const geolocationRef = useRef(geolocation)

  useEffect(() => {
    lastFixRef.current = lastFixTimestampMs
    adoptRef.current = adoptFix
    enabledRef.current = enabled
    visibleRef.current = visible
    geolocationRef.current = geolocation
  }, [adoptFix, enabled, geolocation, lastFixTimestampMs, visible])

  useEffect(() => {
    const onVisibility = () => {
      setVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!enabled || !visible) {
      if (!enabled) enabledAtRef.current = null
      return
    }
    if (enabledAtRef.current == null) enabledAtRef.current = Date.now()

    const geo = geolocationRef.current ?? (typeof navigator === 'undefined' ? null : navigator.geolocation)
    if (!geo) return

    let cancelled = false
    let inFlight = false
    let failures = 0
    let nextAttemptAtMs: number | null = null
    const waitingSinceMs = enabledAtRef.current ?? Date.now()

    const finish = () => {
      inFlight = false
    }

    const scheduleAfterMiss = () => {
      failures += 1
      if (failures >= GPS_RECOVERY_MAX_FAILURES) {
        failures = GPS_RECOVERY_MAX_FAILURES
        nextAttemptAtMs = Date.now() + GPS_RECOVERY_COOLDOWN_MS
        setAttention('cooldown')
        return
      }
      nextAttemptAtMs = Date.now() + GPS_RECOVERY_BACKOFF_MS
      setAttention('refreshing')
    }

    const consider = () => {
      if (cancelled || !visibleRef.current || !enabledRef.current) return
      const nowMs = Date.now()
      const lastFix = lastFixRef.current
      if (lastFix != null && nowMs - lastFix < GPS_RECOVERY_TRIGGER_AGE_MS) {
        if (failures !== 0 || nextAttemptAtMs != null) {
          failures = 0
          nextAttemptAtMs = null
          setAttention('none')
        }
        return
      }
      const action = gpsRecoveryAction({
        enabled: enabledRef.current,
        visible: visibleRef.current,
        inFlight,
        consecutiveFailures: failures,
        nowMs,
        nextAttemptAtMs,
        waitingSinceMs,
        lastFixTimestampMs: lastFix,
      })
      if (action !== 'request') return

      inFlight = true
      setAttention('refreshing')
      const startedFix = lastFixRef.current
      geo.getCurrentPosition(
        (pos) => {
          finish()
          if (cancelled || !enabledRef.current) return
          if (!isNewerGpsTimestamp(startedFix, pos.timestamp)) {
            scheduleAfterMiss()
            return
          }
          if (!isNewerGpsTimestamp(lastFixRef.current, pos.timestamp)) {
            scheduleAfterMiss()
            return
          }
          const adopted = adoptRef.current({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: pos.timestamp,
          })
          if (adopted) {
            failures = 0
            nextAttemptAtMs = null
            setAttention('none')
          } else {
            scheduleAfterMiss()
          }
        },
        () => {
          finish()
          if (cancelled || !enabledRef.current) return
          scheduleAfterMiss()
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: GPS_RECOVERY_TIMEOUT_MS,
        },
      )
    }

    const kick = window.setTimeout(consider, 0)
    const timer = window.setInterval(consider, GPS_RECOVERY_OBSERVE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(kick)
      window.clearInterval(timer)
      setAttention('none')
    }
  }, [enabled, visible])

  return { attention }
}
