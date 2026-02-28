import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface ActiveTripState {
  passengerActiveTripId: string | null
  driverActiveTripId: string | null
}

interface ActiveTripContextValue extends ActiveTripState {
  setPassengerActiveTripId: (id: string | null) => void
  setDriverActiveTripId: (id: string | null) => void
}

const ActiveTripContext = createContext<ActiveTripContextValue | null>(null)

export function ActiveTripProvider({ children }: { children: ReactNode }) {
  const [passengerActiveTripId, setPassengerActiveTripIdState] = useState<string | null>(null)
  const [driverActiveTripId, setDriverActiveTripIdState] = useState<string | null>(null)

  const setPassengerActiveTripId = useCallback((id: string | null) => {
    setPassengerActiveTripIdState(id)
  }, [])

  const setDriverActiveTripId = useCallback((id: string | null) => {
    setDriverActiveTripIdState(id)
  }, [])

  const value = useMemo<ActiveTripContextValue>(
    () => ({
      passengerActiveTripId,
      driverActiveTripId,
      setPassengerActiveTripId,
      setDriverActiveTripId,
    }),
    [passengerActiveTripId, driverActiveTripId, setPassengerActiveTripId, setDriverActiveTripId]
  )

  return (
    <ActiveTripContext.Provider value={value}>
      {children}
    </ActiveTripContext.Provider>
  )
}

export function useActiveTrip() {
  const ctx = useContext(ActiveTripContext)
  if (!ctx) throw new Error('useActiveTrip must be used within ActiveTripProvider')
  return ctx
}
