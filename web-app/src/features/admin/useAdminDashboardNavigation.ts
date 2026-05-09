import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  parseAdminDashboardQuery,
  type AdminDashboardTab,
  type AdminTripsListMode,
} from './adminDashboardQuery'

export type AdminDashboardUrlUpdate = {
  tab: AdminDashboardTab
  tripId: string | null
  tripsList?: AdminTripsListMode
}

/**
 * Sincroniza tab, viagem seleccionada e modo de lista (activa/histórico) com `?tab=&tripId=&tripsList=`.
 * Estado derivado da URL (sem useEffect+setState — alinhado a react-hooks/set-state-in-effect).
 */
export function useAdminDashboardNavigation(): {
  tab: AdminDashboardTab
  tripsListMode: AdminTripsListMode
  selectedTripId: string | null
  syncAdminUrl: (next: AdminDashboardUrlUpdate) => void
  selectTripsListMode: (mode: AdminTripsListMode) => void
} {
  const [searchParams, setSearchParams] = useSearchParams()
  const adminQs = searchParams.toString()

  const { tab, tripId: selectedTripId, tripsList: tripsListMode } = useMemo(() => {
    return parseAdminDashboardQuery(new URLSearchParams(adminQs))
  }, [adminQs])

  const syncAdminUrl = useCallback(
    (next: AdminDashboardUrlUpdate) => {
      setSearchParams(
        () => {
          const p = new URLSearchParams()
          if (next.tripId) {
            p.set('tab', 'trips')
            p.set('tripId', next.tripId)
            if (next.tripsList === 'history') {
              p.set('tripsList', 'history')
            }
            return p
          }
          if (next.tab === 'pending') {
            p.set('tab', 'pending')
            return p
          }
          p.set('tab', next.tab)
          if (next.tab === 'trips' && next.tripsList === 'history') {
            p.set('tripsList', 'history')
          }
          return p
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const selectTripsListMode = useCallback(
    (mode: AdminTripsListMode) => {
      syncAdminUrl({ tab: 'trips', tripId: selectedTripId, tripsList: mode })
    },
    [syncAdminUrl, selectedTripId]
  )

  return { tab, tripsListMode, selectedTripId, syncAdminUrl, selectTripsListMode }
}
