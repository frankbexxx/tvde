/* eslint-disable react-refresh/only-export-components -- o hook acompanha o provider, como em src/context */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getDriverStatus, type DriverAvailabilityStatus } from '../../api/trips'
import { useActiveTrip } from '../../context/ActiveTripContext'
import { useAuth } from '../../context/AuthContext'
import {
  documentEligibilityAllowsCollection,
  driverAvailabilitySessionKey,
  isConfirmedActiveDriverTrip,
  isEndedDriverTrip,
  isNativeDriverLocationServiceNeeded,
  recoveryAfterTripProbe,
  type DriverDocumentEligibility,
} from './driverAvailabilitySync'
import { currentSessionFamily, subscribeSessionFamily } from './driverSessionFamily'
import { useDriverActiveTripPoll, type DriverActiveTripPollState } from './useDriverActiveTripPoll'
import { useDriverAvailabilitySession } from './useDriverAvailabilitySession'

/** Eventos do GET /driver/status. O ecrã desenha o aviso; o provider fica dono do poll. */
export type DriverAvailabilityEvent =
  | { type: 'applied'; status: DriverAvailabilityStatus }
  | { type: 'failed' }
  | { type: 'cleared' }

type AvailabilityListener = (event: DriverAvailabilityEvent) => void

type DriverLocationContextValue = {
  offline: boolean
  setOffline: (next: boolean) => void
  syncing: boolean
  setSyncing: (next: boolean) => void
  hydrated: boolean
  bumpToggleEpoch: () => void
  publishDocumentEligibility: (next: DriverDocumentEligibility) => void
  subscribeAvailability: (listener: AvailabilityListener) => () => void
  /** O mesmo poll do ecrã. Um segundo hook para o mesmo id ficaria concorrente. */
  activeTripPoll: DriverActiveTripPollState
  tripStatus: string | null
  confirmedActiveTrip: boolean
  tripRecoveryUnresolved: boolean
  /** Decisão já calculada. Nesta etapa ninguém a envia para a ponte. */
  locationNeeded: boolean
  /** Estado devolvido por POST/GET. Um valor local anterior à resposta não entra. */
  noteTripStatus: (status: string | null) => void
}

const DriverLocationContext = createContext<DriverLocationContextValue | null>(null)

/**
 * Disponibilidade acima das rotas.
 * A hidratação e a lacuna de token seguem a família, dentro de useDriverAvailabilitySession.
 * A viagem confirmada também fica aqui. setServiceNeeded fica no DriverGpsManager.
 */
export function DriverLocationProvider({ children }: { children: ReactNode }) {
  const { token, sessionRole } = useAuth()
  const { driverActiveTripId } = useActiveTrip()
  const [family, setFamily] = useState(currentSessionFamily)
  const [offline, setOffline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const offlineRef = useRef(offline)
  const syncingRef = useRef(syncing)
  const epochRef = useRef(0)
  const listenersRef = useRef(new Set<AvailabilityListener>())
  const [documentEligibility, setDocumentEligibility] = useState<DriverDocumentEligibility>('checking')
  const [authorizedDocumentFamily, setAuthorizedDocumentFamily] = useState<string | null>(null)
  const sessionKey = driverAvailabilitySessionKey(sessionRole, family)
  const [appliedKey, setAppliedKey] = useState(sessionKey)
  const [confirmedActiveTrip, setConfirmedActiveTrip] = useState(false)
  const [reported, setReported] = useState<{ status: string; stamp: number | null } | null>(null)
  const epochKeyRef = useRef(sessionKey)
  const activeTripPoll = useDriverActiveTripPoll(
    driverActiveTripId,
    token,
    Boolean(driverActiveTripId && token),
  )
  const polledStatus = sessionKey && driverActiveTripId
    ? (activeTripPoll.poll?.trip?.status ?? null)
    : null
  const reportApplies = reported != null && reported.stamp === activeTripPoll.lastSuccessAt
  const tripStatus = sessionKey && driverActiveTripId
    ? (reportApplies ? reported.status : polledStatus)
    : null
  const [seenTrip, setSeenTrip] = useState<{ id: string | null; status: string | null }>({
    id: driverActiveTripId,
    status: tripStatus,
  })
  const sessionChanged = appliedKey !== sessionKey
  if (sessionChanged) {
    setAppliedKey(sessionKey)
    setOffline(true)
    setSyncing(false)
    setConfirmedActiveTrip(false)
    setReported(null)
    setAuthorizedDocumentFamily(null)
    setDocumentEligibility('checking')
  }
  if (documentEligibility === 'blocked' && authorizedDocumentFamily) {
    setAuthorizedDocumentFamily(null)
  }
  if (activeTripPoll.poll?.notFound && confirmedActiveTrip && !reportApplies) {
    setConfirmedActiveTrip(false)
  }
  if (seenTrip.id !== driverActiveTripId || seenTrip.status !== tripStatus) {
    setSeenTrip({ id: driverActiveTripId, status: tripStatus })
    if (isConfirmedActiveDriverTrip(tripStatus)) setConfirmedActiveTrip(true)
    else if (isEndedDriverTrip(tripStatus) || !driverActiveTripId) setConfirmedActiveTrip(false)
  }

  useEffect(() => subscribeSessionFamily(setFamily), [])

  useEffect(() => {
    if (epochKeyRef.current !== sessionKey) {
      epochKeyRef.current = sessionKey
      epochRef.current += 1
    }
    offlineRef.current = offline
    syncingRef.current = syncing
  }, [sessionKey, offline, syncing])

  const emit = useCallback((event: DriverAvailabilityEvent) => {
    listenersRef.current.forEach((listener) => listener(event))
  }, [])

  const hydrated = useDriverAvailabilitySession({
    token,
    sessionRole,
    family,
    getSyncing: () => syncingRef.current,
    getToggleEpoch: () => epochRef.current,
    getLocalOffline: () => offlineRef.current,
    getStatus: (current) => getDriverStatus(current),
    onApplied: (status) => emit({ type: 'applied', status }),
    onFailed: () => emit({ type: 'failed' }),
    onOffline: setOffline,
    onSessionCleared: () => emit({ type: 'cleared' }),
  })

  const bumpToggleEpoch = useCallback(() => {
    epochRef.current += 1
  }, [])
  const publishDocumentEligibility = useCallback((next: DriverDocumentEligibility) => {
    setDocumentEligibility((current) => (current === next ? current : next))
  }, [])
  const subscribeAvailability = useCallback((listener: AvailabilityListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])
  const noteTripStatus = useCallback((status: string | null) => {
    if (!status) return
    if (!isConfirmedActiveDriverTrip(status) && !isEndedDriverTrip(status)) return
    setReported({ status, stamp: activeTripPoll.lastSuccessAt })
  }, [activeTripPoll.lastSuccessAt])

  const tripRecoveryUnresolved = recoveryAfterTripProbe({
    confirmedActiveTrip,
    networkError: activeTripPoll.pollFault,
    tripStatus,
  })
  const availabilityNeeded = isNativeDriverLocationServiceNeeded({
    token,
    offline,
    hydrated,
    syncing,
    tripStatus,
    tripRecoveryUnresolved,
    confirmedActiveTrip,
  })
  const previouslyAuthorized = documentEligibility !== 'blocked'
    && sessionKey != null
    && authorizedDocumentFamily === sessionKey
  if (
    !sessionChanged
    && sessionKey
    && documentEligibility === 'clear'
    && availabilityNeeded
    && authorizedDocumentFamily !== sessionKey
  ) {
    setAuthorizedDocumentFamily(sessionKey)
  }
  const locationNeeded = documentEligibilityAllowsCollection({
    eligibility: documentEligibility,
    previouslyAuthorized,
  }) && availabilityNeeded

  const value = useMemo<DriverLocationContextValue>(
    () => ({
      offline,
      setOffline,
      syncing,
      setSyncing,
      hydrated,
      bumpToggleEpoch,
      publishDocumentEligibility,
      subscribeAvailability,
      activeTripPoll,
      tripStatus,
      confirmedActiveTrip,
      tripRecoveryUnresolved,
      locationNeeded,
      noteTripStatus,
    }),
    [
      offline,
      syncing,
      hydrated,
      bumpToggleEpoch,
      publishDocumentEligibility,
      subscribeAvailability,
      activeTripPoll,
      tripStatus,
      confirmedActiveTrip,
      tripRecoveryUnresolved,
      locationNeeded,
      noteTripStatus,
    ],
  )

  return (
    <DriverLocationContext.Provider value={value}>
      {children}
    </DriverLocationContext.Provider>
  )
}

export function useDriverLocation(): DriverLocationContextValue {
  const ctx = useContext(DriverLocationContext)
  if (!ctx) throw new Error('useDriverLocation must be used within DriverLocationProvider')
  return ctx
}
