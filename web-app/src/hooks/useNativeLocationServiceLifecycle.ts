import { useEffect, useRef } from 'react'
import { isNativeDriverLocationServiceNeeded } from '../features/driver/driverAvailabilitySync'
import { logGpsNeed } from '../services/gpsNeedLog'
import { syncNativeLocationServiceNeed } from '../services/gpsOwnership'
import { traceLifecycle, traceReactDecision } from '../services/gpsNeedTrace'

/** Liga a necessidade já calculada ao serviço. Não arma o upload. */
export function useNativeLocationServiceLifecycle(opts: {
  token: string | null
  offline: boolean
  hydrated: boolean
  syncing: boolean
  activeTripBootstrapPending?: boolean
  tripRecoveryUnresolved?: boolean
  confirmedActiveTrip?: boolean
  tripStatus?: string | null
  /** Quando presente, a decisão já foi tomada. O hook só a entrega. */
  needed?: boolean
}): boolean {
  const needed = opts.needed ?? isNativeDriverLocationServiceNeeded(opts)
  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
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
        needed: false,
        tokenPresent: Boolean(current.token),
        hydrated: current.hydrated,
        offline: current.offline,
        syncing: current.syncing,
      })
      syncNativeLocationServiceNeed(false)
    }
  }, [])
  useEffect(() => {
    syncNativeLocationServiceNeed(needed)
  }, [needed])
  return needed
}
