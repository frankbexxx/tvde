import { useEffect, useLayoutEffect, useRef } from 'react'
import { playDriverSessionSound } from '../services/driverSessionSounds'

/**
 * (a) New trip offer appears in filtered list.
 * (b) Accept success.
 * (c) Trip completed (caller fires).
 */
export function useDriverOfferSounds(options: {
  enabled: boolean
  /** Sorted trip ids joined with `|` — stable fingerprint of current offers. */
  offerIdsFingerprint: string
  acceptSignal: number
  completeSignal: number
}): void {
  const { enabled, offerIdsFingerprint, acceptSignal, completeSignal } = options
  const seenRef = useRef<Set<string>>(new Set())
  const bootRef = useRef(true)

  useLayoutEffect(() => {
    if (!enabled) {
      const ids = offerIdsFingerprint ? offerIdsFingerprint.split('|').filter(Boolean) : []
      seenRef.current = new Set(ids)
      bootRef.current = false
      return
    }
    const incoming = new Set(
      offerIdsFingerprint ? offerIdsFingerprint.split('|').filter(Boolean) : []
    )
    if (bootRef.current) {
      seenRef.current = incoming
      bootRef.current = false
      return
    }
    let isNew = false
    for (const id of incoming) {
      if (!seenRef.current.has(id)) {
        isNew = true
        break
      }
    }
    seenRef.current = incoming
    if (isNew && incoming.size > 0) {
      playDriverSessionSound('offer')
    }
  }, [enabled, offerIdsFingerprint])

  const prevAccept = useRef(acceptSignal)
  useEffect(() => {
    if (!enabled) return
    if (acceptSignal > prevAccept.current) {
      playDriverSessionSound('accept')
    }
    prevAccept.current = acceptSignal
  }, [enabled, acceptSignal])

  const prevComplete = useRef(completeSignal)
  useEffect(() => {
    if (!enabled) return
    if (completeSignal > prevComplete.current) {
      playDriverSessionSound('complete')
    }
    prevComplete.current = completeSignal
  }, [enabled, completeSignal])
}
