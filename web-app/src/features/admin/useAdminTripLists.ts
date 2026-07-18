import { useCallback, useState } from 'react'
import { type ApiError } from '../../api/client'
import { getActiveTrips, getAdminTripHistory, type TripActiveItem } from '../../api/admin'
import type { TripHistoryItem } from '../../api/trips'

/** Listagens admin: viagens activas + histórico (P3 — lógica movida de `AdminDashboard.tsx`). */
export function useAdminTripLists(token: string | null): {
  activeTrips: TripActiveItem[]
  historyTrips: TripHistoryItem[]
  historyTripsError: string | null
  fetchActiveTrips: () => Promise<boolean>
  fetchHistoryTrips: () => Promise<void>
} {
  const [activeTrips, setActiveTrips] = useState<TripActiveItem[]>([])
  const [historyTrips, setHistoryTrips] = useState<TripHistoryItem[]>([])
  const [historyTripsError, setHistoryTripsError] = useState<string | null>(null)

  const fetchActiveTrips = useCallback(async (): Promise<boolean> => {
    if (!token) return false
    try {
      const data = await getActiveTrips(token)
      setActiveTrips(data)
      return true
    } catch {
      setActiveTrips([])
      return false
    }
  }, [token])

  const fetchHistoryTrips = useCallback(async () => {
    if (!token) return
    setHistoryTripsError(null)
    try {
      const data = await getAdminTripHistory(token, { limit: 50 })
      setHistoryTrips(data)
    } catch (e) {
      setHistoryTrips([])
      const err = e as ApiError
      const raw = err.detail
      const detail = typeof raw === 'string' ? raw : ''
      if (err.status === 404) {
        setHistoryTripsError(
          'O backend não expõe o histórico (404). Faz deploy do backend com GET /admin/trip-history, ou confirma o URL da API (VITE_API_URL).'
        )
      } else {
        setHistoryTripsError(
          detail || (err.status ? `Erro ao carregar histórico (${err.status}).` : 'Erro ao carregar histórico.')
        )
      }
    }
  }, [token])

  return { activeTrips, historyTrips, historyTripsError, fetchActiveTrips, fetchHistoryTrips }
}
