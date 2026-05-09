import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { readInitialAdminQuery } from './adminDashboardHelpers'
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
 * Comportamento espelha o bloco original em `AdminDashboard.tsx` (P2 — sem mudança de semântica).
 */
export function useAdminDashboardNavigation(): {
  tab: AdminDashboardTab
  tripsListMode: AdminTripsListMode
  selectedTripId: string | null
  syncAdminUrl: (next: AdminDashboardUrlUpdate) => void
  selectTripsListMode: (mode: AdminTripsListMode) => void
} {
  const [searchParams, setSearchParams] = useSearchParams()
  const initial = readInitialAdminQuery()

  const [tab, setTab] = useState<AdminDashboardTab>(() => initial.tab)
  const [tripsListMode, setTripsListMode] = useState<AdminTripsListMode>(() => initial.tripsList)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(() => initial.tripId)

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
      setTripsListMode(mode)
      syncAdminUrl({ tab: 'trips', tripId: selectedTripId, tripsList: mode })
    },
    [syncAdminUrl, selectedTripId]
  )

  const adminQs = searchParams.toString()
  useEffect(() => {
    const sp = new URLSearchParams(adminQs)
    const { tab: t, tripId, tripsList } = parseAdminDashboardQuery(sp)
    setTab(t)
    setSelectedTripId(tripId)
    setTripsListMode(t === 'trips' ? tripsList : 'active')
  }, [adminQs])

  return { tab, tripsListMode, selectedTripId, syncAdminUrl, selectTripsListMode }
}
