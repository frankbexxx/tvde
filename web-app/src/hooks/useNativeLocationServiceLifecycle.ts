import { useEffect } from 'react'
import { isNativeDriverLocationServiceNeeded } from '../features/driver/driverAvailabilitySync'
import { syncNativeLocationServiceNeed } from '../services/gpsOwnership'

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
  useEffect(() => {
    syncNativeLocationServiceNeed(needed)
  }, [needed])
  useEffect(() => {
    return () => {
      syncNativeLocationServiceNeed(false)
    }
  }, [])
  return needed
}
