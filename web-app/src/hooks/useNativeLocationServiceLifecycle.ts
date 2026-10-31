import { useEffect } from 'react'
import { isNativeDriverLocationServiceNeeded } from '../features/driver/driverAvailabilitySync'
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
}): boolean {
  const needed = isNativeDriverLocationServiceNeeded(opts)
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
      traceLifecycle('unmount')
      syncNativeLocationServiceNeed(false)
    }
  }, [])
  useEffect(() => {
    syncNativeLocationServiceNeed(needed)
  }, [needed])
  return needed
}
