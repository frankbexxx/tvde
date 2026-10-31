import { describe, expect, it, vi } from 'vitest'
import {
  DRIVER_REMOTE_AVAILABILITY_POLL_MS,
  fetchRemoteAvailabilityOfflineUpdate,
  formatDriverAvailabilityError,
  isDriverAvailabilityOperational,
  isDriverLocationNeeded,
  isDriverLocationReportingOperational,
  isNativeDriverLocationServiceNeeded,
  keepsNativeLocationServiceDuringTokenGap,
  recoveryAfterTripProbe,
  resolveDriverTripPollFailure,
  isDrivingHoursBlockedError,
  offlineFromBackendAvailability,
  remoteAvailabilityOfflineUpdate,
  driverAvailabilitySessionKey,
  shouldAcceptRemoteAvailabilityResponse,
  shouldBootstrapDriverActiveTrip,
  shouldHydrateAvailability,
  shouldSkipRemoteAvailabilityApply,
} from './driverAvailabilitySync'

describe('offlineFromBackendAvailability', () => {
  it('backend is_available=false → UI offline mesmo com localStorage online', () => {
    expect(offlineFromBackendAvailability(false, true)).toBe(true)
  })

  it('backend is_available=true → UI online quando documentos permitem', () => {
    expect(offlineFromBackendAvailability(true, true)).toBe(false)
  })

  it('documentos bloqueiam → UI offline', () => {
    expect(offlineFromBackendAvailability(true, false)).toBe(true)
  })
})

describe('remote availability sync (Partner force-online)', () => {
  it('poll interval está entre 10s e 15s', () => {
    expect(DRIVER_REMOTE_AVAILABILITY_POLL_MS).toBeGreaterThanOrEqual(10_000)
    expect(DRIVER_REMOTE_AVAILABILITY_POLL_MS).toBeLessThanOrEqual(15_000)
  })

  it('skip apply enquanto user sync (POST) em curso', () => {
    expect(shouldSkipRemoteAvailabilityApply(true)).toBe(true)
    expect(
      remoteAvailabilityOfflineUpdate({
        remoteIsAvailable: true,
        canGoOnline: true,
        localOffline: true,
        syncing: true,
      })
    ).toBeNull()
  })

  it('remote true + local offline → aplica online (false)', () => {
    expect(
      remoteAvailabilityOfflineUpdate({
        remoteIsAvailable: true,
        canGoOnline: true,
        localOffline: true,
        syncing: false,
      })
    ).toBe(false)
  })

  it('remote false + local online → aplica offline (true)', () => {
    expect(
      remoteAvailabilityOfflineUpdate({
        remoteIsAvailable: false,
        canGoOnline: true,
        localOffline: false,
        syncing: false,
      })
    ).toBe(true)
  })

  it('sem divergência → null (não setState)', () => {
    expect(
      remoteAvailabilityOfflineUpdate({
        remoteIsAvailable: false,
        canGoOnline: true,
        localOffline: true,
        syncing: false,
      })
    ).toBeNull()
  })

  it('fetch: GET true aplica online; não exige POST', async () => {
    const getStatus = vi.fn().mockResolvedValue({ is_available: true })
    const next = await fetchRemoteAvailabilityOfflineUpdate({
      getStatus,
      canGoOnline: true,
      getLocalOffline: () => true,
      getSyncing: () => false,
    })
    expect(next).toBe(false)
    expect(getStatus).toHaveBeenCalledTimes(1)
  })

  it('fetch: GET false aplica offline', async () => {
    const getStatus = vi.fn().mockResolvedValue({ is_available: false })
    const next = await fetchRemoteAvailabilityOfflineUpdate({
      getStatus,
      canGoOnline: true,
      getLocalOffline: () => false,
      getSyncing: () => false,
    })
    expect(next).toBe(true)
  })

  it('fetch: falha GET não altera estado local', async () => {
    const getStatus = vi.fn().mockRejectedValue(new Error('network'))
    const next = await fetchRemoteAvailabilityOfflineUpdate({
      getStatus,
      canGoOnline: true,
      getLocalOffline: () => true,
      getSyncing: () => false,
    })
    expect(next).toBeNull()
  })

  it('fetch: syncing true não chama GET', async () => {
    const getStatus = vi.fn().mockResolvedValue({ is_available: true })
    const next = await fetchRemoteAvailabilityOfflineUpdate({
      getStatus,
      canGoOnline: true,
      getLocalOffline: () => true,
      getSyncing: () => true,
    })
    expect(next).toBeNull()
    expect(getStatus).not.toHaveBeenCalled()
  })

  it('fetch: syncing true após await (toggle em curso) → não aplica', async () => {
    let syncing = false
    const getStatus = vi.fn().mockImplementation(async () => {
      syncing = true
      return { is_available: true }
    })
    const next = await fetchRemoteAvailabilityOfflineUpdate({
      getStatus,
      canGoOnline: true,
      getLocalOffline: () => true,
      getSyncing: () => syncing,
    })
    expect(next).toBeNull()
  })

  it('fetch: re-lê localOffline após await (evita setState se já alinhado)', async () => {
    let localOffline = false
    const getStatus = vi.fn().mockImplementation(async () => {
      localOffline = true
      return { is_available: false }
    })
    const next = await fetchRemoteAvailabilityOfflineUpdate({
      getStatus,
      canGoOnline: true,
      getLocalOffline: () => localOffline,
      getSyncing: () => false,
    })
    expect(next).toBeNull()
  })
})

describe('shouldAcceptRemoteAvailabilityResponse', () => {
  const ok = {
    cancelled: false,
    syncing: false,
    responseSeq: 2,
    latestSeq: 2,
    epochAtStart: 1,
    currentEpoch: 1,
    sessionEpochAtStart: 4,
    currentSessionEpoch: 4,
  }

  it('aceita resposta fresca alinhada', () => {
    expect(shouldAcceptRemoteAvailabilityResponse(ok)).toBe(true)
  })

  it('rejeita cancelled / syncing', () => {
    expect(shouldAcceptRemoteAvailabilityResponse({ ...ok, cancelled: true })).toBe(false)
    expect(shouldAcceptRemoteAvailabilityResponse({ ...ok, syncing: true })).toBe(false)
  })

  it('rejeita poll sobreposto (seq stale)', () => {
    expect(
      shouldAcceptRemoteAvailabilityResponse({ ...ok, responseSeq: 1, latestSeq: 2 })
    ).toBe(false)
  })

  it('rejeita GET iniciado antes de toggle local (epoch)', () => {
    expect(
      shouldAcceptRemoteAvailabilityResponse({ ...ok, epochAtStart: 1, currentEpoch: 2 })
    ).toBe(false)
  })

  it('rejeita resposta da família anterior', () => {
    expect(
      shouldAcceptRemoteAvailabilityResponse({ ...ok, sessionEpochAtStart: 4, currentSessionEpoch: 5 })
    ).toBe(false)
  })
})

describe('driverAvailabilitySessionKey', () => {
  it('usa a família do motorista e ignora a geração do access token', () => {
    expect(driverAvailabilitySessionKey('driver', 'family-a')).toBe('family-a')
    expect(driverAvailabilitySessionKey('driver', 'family-a')).toBe(
      driverAvailabilitySessionKey('driver', 'family-a')
    )
  })

  it('logout, outro papel ou família vazia não têm chave', () => {
    expect(driverAvailabilitySessionKey('driver', null)).toBeNull()
    expect(driverAvailabilitySessionKey('driver', '  ')).toBeNull()
    expect(driverAvailabilitySessionKey('passenger', 'family-a')).toBeNull()
    expect(driverAvailabilitySessionKey(null, 'family-a')).toBeNull()
  })
})

describe('shouldHydrateAvailability', () => {
  it('só hidrata uma confirmação aceite desta sessão', () => {
    expect(shouldHydrateAvailability({ accepted: true, statusOk: true })).toBe(true)
  })

  it('falha de rede ou resposta de outra família não autorizam GPS', () => {
    expect(shouldHydrateAvailability({ accepted: true, statusOk: false })).toBe(false)
    expect(shouldHydrateAvailability({ accepted: false, statusOk: true })).toBe(false)
  })
})

describe('isDriverAvailabilityOperational', () => {
  const base = { token: 'tok', offline: false, hydrated: true, syncing: false }

  it('sucesso ao ficar online → reporter/poll activos', () => {
    expect(isDriverAvailabilityOperational(base)).toBe(true)
  })

  it('falha online pendente → permanece offline → poll inactivo', () => {
    expect(isDriverAvailabilityOperational({ ...base, offline: true })).toBe(false)
  })

  it('sync em curso → poll inactivo', () => {
    expect(isDriverAvailabilityOperational({ ...base, syncing: true })).toBe(false)
  })

  it('antes de hidratar servidor → poll inactivo', () => {
    expect(isDriverAvailabilityOperational({ ...base, hydrated: false })).toBe(false)
  })
})

describe('isDriverLocationReportingOperational', () => {
  const base = { token: 'tok', offline: false, hydrated: true, syncing: false }

  it('viagem confirmada → reporter activo mesmo se disponibilidade backend está false', () => {
    expect(
      isDriverLocationReportingOperational({
        ...base,
        offline: true,
        hydrated: false,
        syncing: true,
        activeTripId: 'trip-1',
        tripStatus: 'accepted',
      })
    ).toBe(true)
  })

  it('primeiro GET pendente, sem viagem confirmada, não liga o reporter', () => {
    expect(
      isDriverLocationReportingOperational({
        ...base,
        offline: true,
        hydrated: false,
        syncing: true,
        activeTripId: null,
        activeTripBootstrapPending: true,
      })
    ).toBe(false)
  })

  it('sem viagem activa → segue a disponibilidade operacional para ofertas', () => {
    expect(isDriverLocationReportingOperational({ ...base, activeTripId: null })).toBe(true)
    expect(
      isDriverLocationReportingOperational({
        ...base,
        offline: true,
        activeTripId: null,
      })
    ).toBe(false)
  })

  it('timeout sem viagem confirmada não mantém o reporter', () => {
    expect(
      isDriverLocationReportingOperational({
        ...base,
        offline: true,
        activeTripId: null,
        tripRecoveryUnresolved: true,
      })
    ).toBe(false)
  })

  it('viagem confirmada e falha de rede mantém o reporter offline', () => {
    expect(
      isDriverLocationReportingOperational({
        ...base,
        offline: true,
        hydrated: false,
        activeTripId: 'trip-1',
        tripStatus: null,
        tripRecoveryUnresolved: true,
        confirmedActiveTrip: true,
      })
    ).toBe(true)
  })

  it('id residual de viagem terminada não autoriza o reporter offline', () => {
    expect(
      isDriverLocationReportingOperational({
        ...base,
        offline: true,
        activeTripId: 'trip-1',
        tripStatus: 'completed',
        tripRecoveryUnresolved: true,
        confirmedActiveTrip: true,
      })
    ).toBe(false)
  })

  it('sem token → reporter inactivo mesmo com viagem activa', () => {
    expect(
      isDriverLocationReportingOperational({
        ...base,
        token: null,
        activeTripId: 'trip-1',
        tripStatus: 'ongoing',
      })
    ).toBe(false)
  })
})

describe('isNativeDriverLocationServiceNeeded', () => {
  const base = { token: 'tok', offline: false, hydrated: true, syncing: false }

  it('online confirmado pede o serviço', () => {
    expect(isNativeDriverLocationServiceNeeded({ ...base, tripStatus: null })).toBe(true)
  })

  it('offline sem viagem não pede o serviço', () => {
    expect(isNativeDriverLocationServiceNeeded({ ...base, offline: true, tripStatus: null })).toBe(false)
    expect(isNativeDriverLocationServiceNeeded({ ...base, offline: true, tripStatus: 'assigned' })).toBe(false)
  })

  it('viagem accepted, arriving ou ongoing pede o serviço mesmo offline', () => {
    for (const tripStatus of ['accepted', 'arriving', 'ongoing']) {
      expect(
        isNativeDriverLocationServiceNeeded({
          ...base,
          offline: true,
          hydrated: false,
          syncing: true,
          tripStatus,
        })
      ).toBe(true)
    }
  })

  it('primeiro GET e timeout sem viagem confirmada não pedem o serviço', () => {
    expect(
      isNativeDriverLocationServiceNeeded({
        ...base,
        offline: true,
        activeTripBootstrapPending: true,
      })
    ).toBe(false)
    expect(
      isNativeDriverLocationServiceNeeded({
        ...base,
        offline: true,
        tripRecoveryUnresolved: true,
      })
    ).toBe(false)
  })

  it('viagem confirmada e falha de rede mantêm o serviço', () => {
    expect(
      isNativeDriverLocationServiceNeeded({
        ...base,
        offline: true,
        hydrated: false,
        tripStatus: 'ongoing',
        tripRecoveryUnresolved: true,
        confirmedActiveTrip: true,
      })
    ).toBe(true)
    expect(
      isNativeDriverLocationServiceNeeded({
        ...base,
        offline: true,
        tripStatus: null,
        tripRecoveryUnresolved: true,
        confirmedActiveTrip: true,
      })
    ).toBe(true)
  })

  it('viagem terminada segue o online', () => {
    expect(isNativeDriverLocationServiceNeeded({ ...base, tripStatus: 'completed' })).toBe(true)
    expect(
      isNativeDriverLocationServiceNeeded({ ...base, offline: true, tripStatus: 'cancelled' })
    ).toBe(false)
    expect(
      isNativeDriverLocationServiceNeeded({ ...base, offline: true, tripStatus: 'failed' })
    ).toBe(false)
  })

  it('id local sem estado confirmado não pede o serviço offline', () => {
    expect(isNativeDriverLocationServiceNeeded({ ...base, offline: true })).toBe(false)
  })

  it('id residual sem estado ou com viagem terminada não pede o serviço offline', () => {
    expect(
      isNativeDriverLocationServiceNeeded({
        ...base,
        offline: true,
        tripStatus: 'completed',
      })
    ).toBe(false)
    expect(
      isNativeDriverLocationServiceNeeded({
        ...base,
        offline: true,
        tripRecoveryUnresolved: true,
        confirmedActiveTrip: true,
        tripStatus: 'cancelled',
      })
    ).toBe(false)
  })

  it('logout, sem hidratação, não pede o serviço', () => {
    expect(
      isNativeDriverLocationServiceNeeded({
        ...base,
        token: null,
        hydrated: false,
        tripStatus: 'ongoing',
      })
    ).toBe(false)
  })

  it('ausência do token com online já confirmado mantém o serviço e não autoriza uploads', () => {
    const gap = { ...base, token: null, tripStatus: 'ongoing' as const }
    expect(keepsNativeLocationServiceDuringTokenGap(gap)).toBe(true)
    expect(isNativeDriverLocationServiceNeeded(gap)).toBe(true)
    expect(isDriverLocationReportingOperational(gap)).toBe(false)
    expect(isDriverAvailabilityOperational(gap)).toBe(false)
  })

  it('ausência do token sem confirmação ou em Offline não mantém o serviço', () => {
    expect(keepsNativeLocationServiceDuringTokenGap({ ...base, token: null, hydrated: false })).toBe(false)
    expect(keepsNativeLocationServiceDuringTokenGap({ ...base, token: null, offline: true })).toBe(false)
    expect(keepsNativeLocationServiceDuringTokenGap({ ...base, token: null, syncing: true })).toBe(false)
    expect(isNativeDriverLocationServiceNeeded({ ...base, token: null, hydrated: false })).toBe(false)
  })

  it('reporter e serviço nativo coincidem', () => {
    const cases = [
      { ...base, offline: true, activeTripBootstrapPending: true },
      { ...base, offline: true, tripRecoveryUnresolved: true },
      { ...base, offline: true, tripStatus: 'accepted' as const },
      { ...base, offline: true, tripStatus: 'completed' as const, confirmedActiveTrip: true },
      {
        ...base,
        offline: true,
        tripStatus: null,
        tripRecoveryUnresolved: true,
        confirmedActiveTrip: true,
      },
    ]
    for (const entry of cases) {
      expect(isDriverLocationReportingOperational(entry)).toBe(isNativeDriverLocationServiceNeeded(entry))
      expect(isDriverLocationNeeded(entry)).toBe(isNativeDriverLocationServiceNeeded(entry))
    }
  })
})

describe('recuperação e poll entre contas', () => {
  it('timeout do primeiro GET não cria recuperação', () => {
    expect(
      recoveryAfterTripProbe({ confirmedActiveTrip: false, networkError: true, tripStatus: null })
    ).toBe(false)
  })

  it('falha de rede depois de uma viagem confirmada cria recuperação', () => {
    expect(
      recoveryAfterTripProbe({
        confirmedActiveTrip: true,
        networkError: true,
        tripStatus: 'arriving',
      })
    ).toBe(true)
    expect(
      recoveryAfterTripProbe({ confirmedActiveTrip: true, networkError: true, tripStatus: null })
    ).toBe(true)
  })

  it('viagem terminada não recupera', () => {
    expect(
      recoveryAfterTripProbe({
        confirmedActiveTrip: true,
        networkError: true,
        tripStatus: 'failed',
      })
    ).toBe(false)
  })

  it('403 e 5xx da nova conta não mantêm a viagem anterior', () => {
    expect(
      resolveDriverTripPollFailure({ requestFamily: 'family-a', currentFamily: 'family-b', httpStatus: 403 })
    ).toBe('drop')
    expect(
      resolveDriverTripPollFailure({ requestFamily: 'family-a', currentFamily: 'family-b', httpStatus: 500 })
    ).toBe('drop')
    expect(
      resolveDriverTripPollFailure({ requestFamily: 'family-a', currentFamily: 'family-b', httpStatus: 200 })
    ).toBe('drop')
  })

  it('5xx da mesma família mantém a viagem e 403 da mesma família não a recupera', () => {
    expect(
      resolveDriverTripPollFailure({ requestFamily: 'family-a', currentFamily: 'family-a', httpStatus: 503 })
    ).toBe('keep')
    expect(
      resolveDriverTripPollFailure({ requestFamily: 'family-a', currentFamily: 'family-a', httpStatus: 403 })
    ).toBe('missing')
  })
})

describe('shouldBootstrapDriverActiveTrip', () => {
  it('restaura viagem activa só para motorista autenticado sem id em memória', () => {
    expect(
      shouldBootstrapDriverActiveTrip({
        token: 'tok',
        sessionRole: 'driver',
        activeTripId: null,
      })
    ).toBe(true)
  })

  it('não consulta bootstrap quando já há viagem, sem token, ou noutra role', () => {
    expect(
      shouldBootstrapDriverActiveTrip({
        token: 'tok',
        sessionRole: 'driver',
        activeTripId: 'trip-1',
      })
    ).toBe(false)
    expect(
      shouldBootstrapDriverActiveTrip({
        token: null,
        sessionRole: 'driver',
        activeTripId: null,
      })
    ).toBe(false)
    expect(
      shouldBootstrapDriverActiveTrip({
        token: 'tok',
        sessionRole: 'passenger',
        activeTripId: null,
      })
    ).toBe(false)
  })
})

describe('formatDriverAvailabilityError', () => {
  it('driving_hours_blocked é caso específico', () => {
    const msg = formatDriverAvailabilityError({ status: 409, detail: 'driving_hours_blocked' })
    expect(isDrivingHoursBlockedError({ status: 409, detail: 'driving_hours_blocked' })).toBe(true)
    expect(msg).toMatch(/condução/i)
  })

  it('PF3D vehicle_inactive mostra mensagem amigável PT', () => {
    const msg = formatDriverAvailabilityError({ status: 409, detail: 'vehicle_inactive' })
    expect(msg).toMatch(/inactivo/i)
    expect(msg).not.toContain('vehicle_inactive')
  })

  it('PF3D no_active_vehicle mostra mensagem amigável PT', () => {
    const msg = formatDriverAvailabilityError({ status: 409, detail: 'no_active_vehicle' })
    expect(msg).toMatch(/veículo activo|associar um veículo/i)
    expect(msg).not.toContain('no_active_vehicle')
  })

  it('PF3D vehicle_documents_blocked mostra mensagem amigável PT', () => {
    const msg = formatDriverAvailabilityError({
      status: 409,
      detail: 'vehicle_documents_blocked',
    })
    expect(msg).toMatch(/documentação|documentos/i)
    expect(msg).not.toContain('vehicle_documents_blocked')
  })

  it('PF3D unknown_vehicle_compliance mostra mensagem amigável PT', () => {
    const msg = formatDriverAvailabilityError({
      status: 409,
      detail: 'unknown_vehicle_compliance',
    })
    expect(msg).toMatch(/situação documental|confirmar/i)
    expect(msg).not.toContain('unknown_vehicle_compliance')
  })

  it('outros erros não são ignorados (fallback genérico com detail)', () => {
    const msg = formatDriverAvailabilityError({ status: 500, detail: 'internal_error' })
    expect(msg).toContain('internal_error')
    expect(isDrivingHoursBlockedError({ status: 500, detail: 'internal_error' })).toBe(false)
  })
})
