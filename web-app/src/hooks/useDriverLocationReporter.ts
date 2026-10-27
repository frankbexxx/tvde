import { useEffect, useState } from 'react'
import type { DriverLocationUploadOrigin } from '../services/driverLocationUpload'
import { shouldUploadDriverLocation } from '../services/driverLocationUpload'
import { sendDriverLocation } from '../services/locationService'
import { warn as logWarn } from '../utils/logger'
import type { ApiError } from '../api/client'

/** Survives dashboard remounts. Cleared when reporting is turned off. */
const lastSentFixByToken = new Map<string, number>()

export function resetDriverLocationReporterDedupeForTests(): void {
  lastSentFixByToken.clear()
}

export function useDriverLocationReporter(options: {
  /** Ex.: motorista online, com token e fix GPS. */
  enabled: boolean
  /** Origem da posição — só `device_gps` (e mock em E2E) chega ao backend. */
  uploadOrigin: DriverLocationUploadOrigin
  /** JWT motorista — obrigatório quando enabled (E2E pode não ter access_token em localStorage). */
  accessToken: string | null
  lat: number | undefined
  lng: number | undefined
  /**
   * `GeolocationPosition.timestamp` do mesmo par lat/lng.
   * Obrigatório para `device_gps`. Mock E2E não o envia como fix real.
   */
  fixTimestampMs?: number | null
  /** Não altera a cadência: cada fix novo é enviado uma vez, com ou sem viagem. */
  hasActiveTrip: boolean
}): {
  lastOkAt: number | null
  lastError: ApiError | null
} {
  const { enabled, uploadOrigin, accessToken, lat, lng, fixTimestampMs, hasActiveTrip } = options
  void hasActiveTrip
  const canUpload = shouldUploadDriverLocation(uploadOrigin)
  const [lastOkAt, setLastOkAt] = useState<number | null>(null)
  const [lastError, setLastError] = useState<ApiError | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (accessToken) lastSentFixByToken.delete(accessToken)
      return
    }
    if (!canUpload || !accessToken || lat == null || lng == null) return

    if (uploadOrigin === 'device_gps') {
      if (fixTimestampMs == null || !Number.isFinite(fixTimestampMs)) return
      const alreadySent = lastSentFixByToken.get(accessToken)
      if (alreadySent != null && fixTimestampMs <= alreadySent) {
        return
      }
      const stamp = fixTimestampMs
      lastSentFixByToken.set(accessToken, stamp)
      let cancelled = false
      void sendDriverLocation(lat, lng, accessToken, uploadOrigin, stamp)
        .then(() => {
          if (cancelled) return
          setLastOkAt(stamp)
          setLastError(null)
        })
        .catch((err) => {
          if (cancelled) return
          if (lastSentFixByToken.get(accessToken) === stamp) {
            lastSentFixByToken.delete(accessToken)
          }
          logWarn('Failed to send driver location', err)
          setLastError(err as ApiError)
        })
      return () => {
        cancelled = true
      }
    }

    let cancelled = false
    void sendDriverLocation(lat, lng, accessToken, uploadOrigin)
      .then(() => {
        if (cancelled) return
        setLastOkAt(Date.now())
        setLastError(null)
      })
      .catch((err) => {
        if (cancelled) return
        logWarn('Failed to send driver location', err)
        setLastError(err as ApiError)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, canUpload, uploadOrigin, accessToken, lat, lng, fixTimestampMs])

  return { lastOkAt, lastError }
}
