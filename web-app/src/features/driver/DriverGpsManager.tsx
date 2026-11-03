import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  currentLegalAcceptancePhase,
  subscribeLegalAcceptancePhase,
  type LegalAcceptancePhase,
} from '../auth/legalAcceptancePhase'
import { logGpsNeed } from '../../services/gpsNeedLog'
import { useNativeLocationServiceLifecycle } from '../../hooks/useNativeLocationServiceLifecycle'
import {
  documentEligibilityAllowsCollection,
  driverAvailabilitySessionKey,
  nativeLocationServiceOrder,
} from './driverAvailabilitySync'
import { currentSessionFamily, subscribeSessionFamily } from './driverSessionFamily'
import { useDriverLocation } from './DriverLocationProvider'

/**
 * Único caller de setServiceNeeded.
 * Montado com o provider, fora da rota /driver e do ramo visual da aceitação legal.
 */
export function DriverGpsManager() {
  const { token, sessionRole, isLoading } = useAuth()
  const location = useDriverLocation()
  const [family, setFamily] = useState(currentSessionFamily)
  const [published, setPublished] = useState(currentLegalAcceptancePhase)
  const [openFamily, setOpenFamily] = useState<string | null>(null)
  const observedSessionKey = useRef<string | null>(null)

  useEffect(() => subscribeSessionFamily(setFamily), [])
  useEffect(() => subscribeLegalAcceptancePhase(setPublished), [])

  const phase: LegalAcceptancePhase = published.family === family ? published.phase : 'checking'
  if (openFamily && openFamily !== family && phase !== 'open') setOpenFamily(null)
  if (phase === 'open' && family && openFamily !== family) setOpenFamily(family)
  if (phase === 'blocked' && openFamily) setOpenFamily(null)

  const sameFamilyCheck = phase === 'checking' && openFamily === family && Boolean(family)
  const sessionKey = driverAvailabilitySessionKey(sessionRole, family)
  // A chave anterior tem de entrar nesta ordem. O efeito só a substitui depois de a ponte receber a paragem.
  // eslint-disable-next-line react-hooks/refs -- leitura intencional da sessão já observada
  const previousSessionKey = observedSessionKey.current
  const order = nativeLocationServiceOrder({
    sessionKey,
    observedSessionKey: previousSessionKey,
    tokenPresent: Boolean(token),
    hydrated: location.hydrated,
    offline: location.offline,
    syncing: location.syncing,
    confirmedActiveTrip: location.confirmedActiveTrip,
    tripStatus: location.tripStatus,
    tripRecoveryUnresolved: location.tripRecoveryUnresolved,
    sessionPending: isLoading === true,
    legalBlocked: phase === 'blocked',
    legalAllows: phase === 'open' || sameFamilyCheck,
    documentsBlocked: location.documentEligibility === 'blocked',
    documentsAllow: documentEligibilityAllowsCollection({
      eligibility: location.documentEligibility,
      previouslyAuthorized: location.documentsPreviouslyAuthorized,
    }),
    availabilityConfirmation: location.availabilityConfirmation,
  })

  useEffect(() => {
    if (phase !== 'blocked') return
    logGpsNeed('legal-blocked', {
      needed: false,
      tokenPresent: Boolean(token),
      hydrated: location.hydrated,
      offline: location.offline,
      syncing: location.syncing,
    })
  }, [phase, token, location.hydrated, location.offline, location.syncing])

  useNativeLocationServiceLifecycle({
    token,
    offline: location.offline,
    hydrated: location.hydrated,
    syncing: location.syncing,
    tripStatus: location.tripStatus,
    tripRecoveryUnresolved: location.tripRecoveryUnresolved,
    confirmedActiveTrip: location.confirmedActiveTrip,
    order,
  })

  useEffect(() => {
    observedSessionKey.current = sessionKey
  }, [sessionKey])

  return null
}
