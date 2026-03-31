import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

type DevToolsMode = 'passenger' | 'driver'

interface DevToolsCallbackContextValue {
  setPassengerOnAssigned: (fn: (() => void) | undefined) => void
  setDriverOnAssigned: (fn: (() => void) | undefined) => void
  notifyAfterDevMutation: (mode: DevToolsMode) => void
}

const DevToolsCallbackContext = createContext<DevToolsCallbackContextValue | null>(null)

/**
 * Liga ações dos DevTools (Configuração) aos refetch dos dashboards,
 * que deixaram de renderizar DevTools inline.
 */
export function DevToolsCallbackProvider({ children }: { children: ReactNode }) {
  const passengerRef = useRef<(() => void) | undefined>(undefined)
  const driverRef = useRef<(() => void) | undefined>(undefined)

  const setPassengerOnAssigned = useCallback((fn: (() => void) | undefined) => {
    passengerRef.current = fn
  }, [])

  const setDriverOnAssigned = useCallback((fn: (() => void) | undefined) => {
    driverRef.current = fn
  }, [])

  const notifyAfterDevMutation = useCallback((mode: DevToolsMode) => {
    if (mode === 'passenger') passengerRef.current?.()
    else driverRef.current?.()
  }, [])

  const value = useMemo(
    () => ({
      setPassengerOnAssigned,
      setDriverOnAssigned,
      notifyAfterDevMutation,
    }),
    [setPassengerOnAssigned, setDriverOnAssigned, notifyAfterDevMutation]
  )

  return (
    <DevToolsCallbackContext.Provider value={value}>{children}</DevToolsCallbackContext.Provider>
  )
}

export function useDevToolsCallbacks() {
  const ctx = useContext(DevToolsCallbackContext)
  if (!ctx) throw new Error('useDevToolsCallbacks must be used within DevToolsCallbackProvider')
  return ctx
}
