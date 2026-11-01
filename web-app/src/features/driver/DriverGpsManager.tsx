import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  currentLegalAcceptancePhase,
  subscribeLegalAcceptancePhase,
  type LegalAcceptancePhase,
} from '../auth/legalAcceptancePhase'
import { logGpsNeed } from '../../services/gpsNeedLog'
import { useNativeLocationServiceLifecycle } from '../../hooks/useNativeLocationServiceLifecycle'
import { currentSessionFamily, subscribeSessionFamily } from './driverSessionFamily'
import { useDriverLocation } from './DriverLocationProvider'

/**
 * Único caller de setServiceNeeded.
 * Montado com o provider, fora da rota /driver e do ramo visual da aceitação legal.
 */
export function DriverGpsManager() {
  const { token } = useAuth()
  const location = useDriverLocation()
  const [family, setFamily] = useState(currentSessionFamily)
  const [published, setPublished] = useState(currentLegalAcceptancePhase)
  const [openFamily, setOpenFamily] = useState<string | null>(null)

  useEffect(() => subscribeSessionFamily(setFamily), [])
  useEffect(() => subscribeLegalAcceptancePhase(setPublished), [])

  const phase: LegalAcceptancePhase = published.family === family ? published.phase : 'checking'
  if (openFamily && openFamily !== family && phase !== 'open') setOpenFamily(null)
  if (phase === 'open' && family && openFamily !== family) setOpenFamily(family)
  if (phase === 'blocked' && openFamily) setOpenFamily(null)

  const sameFamilyCheck = phase === 'checking' && openFamily === family && Boolean(family)
  const serviceNeeded = location.locationNeeded && phase !== 'blocked' && (phase === 'open' || sameFamilyCheck)

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
    needed: serviceNeeded,
  })

  return null
}
