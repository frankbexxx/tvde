import { useEffect, useRef } from 'react'
import {
  isNativeDriverLocationServiceNeeded,
  type NativeLocationOrder,
} from '../features/driver/driverAvailabilitySync'
import { logGpsNeed } from '../services/gpsNeedLog'
import { syncNativeLocationServiceNeed } from '../services/gpsOwnership'
import { traceLifecycle, traceReactDecision } from '../services/gpsNeedTrace'

/**
 * Entrega a ordem já calculada. `unknown` não chama a ponte.
 * Desmontar a interface não é Offline nem logout: o cleanup não pára o serviço.
 */
export function useNativeLocationServiceLifecycle(opts: {
  token: string | null
  offline: boolean
  hydrated: boolean
  syncing: boolean
  activeTripBootstrapPending?: boolean
  tripRecoveryUnresolved?: boolean
  confirmedActiveTrip?: boolean
  tripStatus?: string | null
  /** Quando presente, substitui o booleano legado. */
  order?: NativeLocationOrder
  /** Legado dos testes que ainda passam a decisão booleana. */
  needed?: boolean
}): boolean {
  const derived = opts.needed ?? isNativeDriverLocationServiceNeeded(opts)
  const order: NativeLocationOrder = opts.order ?? (derived ? 'needed' : 'not-needed')
  const needed = order === 'needed'
  const optsRef = useRef(opts)
  const neededRef = useRef(needed)
  useEffect(() => {
    optsRef.current = opts
    neededRef.current = needed
  })
  traceReactDecision({
    needed,
    tokenPresent: Boolean(opts.token),
    offline: opts.offline,
    hydrated: opts.hydrated,
    syncing: opts.syncing,
  })
  useEffect(() => {
    traceLifecycle('mount')
    return () => {
      const current = optsRef.current
      traceLifecycle('unmount')
      logGpsNeed('dashboard-unmount', {
        needed: neededRef.current,
        tokenPresent: Boolean(current.token),
        hydrated: current.hydrated,
        offline: current.offline,
        syncing: current.syncing,
      })
    }
  }, [])
  useEffect(() => {
    if (order === 'unknown') return
    syncNativeLocationServiceNeed(order === 'needed')
  }, [order])
  return needed
}
