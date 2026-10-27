import { describe, expect, it } from 'vitest'
import {
  INITIAL_GPS_OFFER_NOTICE,
  reduceGpsOfferNotice,
  type DriverStatusEligibilitySnapshot,
  type GpsOfferNoticeState,
} from './driverGpsOfferNotice'

function status(partial: DriverStatusEligibilitySnapshot) {
  return reduceGpsOfferNotice(INITIAL_GPS_OFFER_NOTICE, { type: 'status', status: partial })
}

function online(partial: Omit<DriverStatusEligibilitySnapshot, 'is_available'>): DriverStatusEligibilitySnapshot {
  return { is_available: true, ...partial }
}

describe('driver GPS offer notice', () => {
  it('online com GPS recente não mostra aviso', () => {
    const next = status(
      online({
        matching_eligible: true,
        gps_fix_age_seconds: 8,
        location_stale_for_matching: false,
        matching_ineligible_reason: null,
      }),
    )
    expect(next.visibleReason).toBeNull()
    expect(next.fetchFailed).toBe(false)
  })

  it('online com GPS claramente acima de 45 s mostra aviso stale', () => {
    const next = status(
      online({
        matching_eligible: false,
        gps_fix_age_seconds: 70,
        location_stale_for_matching: true,
        matching_ineligible_reason: 'location_stale',
      }),
    )
    expect(next.visibleReason).toBe('location_stale')
  })

  it('online sem localização mostra aviso missing', () => {
    const next = status(
      online({
        matching_eligible: false,
        gps_fix_age_seconds: null,
        location_stale_for_matching: false,
        matching_ineligible_reason: 'location_missing',
      }),
    )
    expect(next.visibleReason).toBe('location_missing')
  })

  it('offline não mostra aviso de ofertas mesmo com GPS antigo', () => {
    const next = status({
      is_available: false,
      matching_eligible: false,
      gps_fix_age_seconds: 90,
      matching_ineligible_reason: 'location_stale',
    })
    expect(next.visibleReason).toBeNull()
  })

  it('GPS recuperado com fix recente remove o aviso', () => {
    const stale = status(
      online({
        matching_eligible: false,
        gps_fix_age_seconds: 120,
        matching_ineligible_reason: 'location_stale',
      }),
    )
    const recovered = reduceGpsOfferNotice(stale, {
      type: 'status',
      status: online({
        matching_eligible: true,
        gps_fix_age_seconds: 2,
        location_stale_for_matching: false,
        matching_ineligible_reason: null,
      }),
    })
    expect(recovered.visibleReason).toBeNull()
  })

  it('documentos ou viatura não mostram o aviso de GPS', () => {
    for (const reason of ['driver_documents_incomplete', 'vehicle_inactive', 'driver_not_approved']) {
      const next = status(
        online({
          matching_eligible: false,
          gps_fix_age_seconds: 4,
          matching_ineligible_reason: reason,
        }),
      )
      expect(next.visibleReason).toBeNull()
    }
  })

  it('a primeira resposta stale mostra o aviso', () => {
    const next = status(
      online({
        matching_eligible: false,
        gps_fix_age_seconds: 46,
        location_stale_for_matching: true,
        matching_ineligible_reason: 'location_stale',
      }),
    )
    expect(next.visibleReason).toBe('location_stale')
  })

  it('44, 45 e 46 segundos seguem só o resultado do backend', () => {
    const at = (age: number, eligible: boolean, reason: string | null) =>
      status(
        online({
          matching_eligible: eligible,
          gps_fix_age_seconds: age,
          location_stale_for_matching: !eligible,
          matching_ineligible_reason: reason,
        }),
      )

    expect(at(44, true, null).visibleReason).toBeNull()
    expect(at(45, true, null).visibleReason).toBeNull()
    expect(at(46, true, null).visibleReason).toBeNull()
    expect(at(44, false, 'location_stale').visibleReason).toBe('location_stale')
    expect(at(45, false, 'location_stale').visibleReason).toBe('location_stale')
    expect(at(46, false, 'location_stale').visibleReason).toBe('location_stale')
  })

  it('recuperação confirmada pelo backend remove o aviso na mesma leitura', () => {
    const shown = status(
      online({
        matching_eligible: false,
        gps_fix_age_seconds: 80,
        matching_ineligible_reason: 'location_stale',
      }),
    )
    const cleared = reduceGpsOfferNotice(shown, {
      type: 'status',
      status: online({
        matching_eligible: true,
        gps_fix_age_seconds: 40,
        matching_ineligible_reason: null,
      }),
    })
    expect(cleared.visibleReason).toBeNull()
  })

  it('falha da API mantém o aviso e não o trata como GPS operacional', () => {
    const shown = status(
      online({
        matching_eligible: false,
        gps_fix_age_seconds: 90,
        matching_ineligible_reason: 'location_stale',
      }),
    )
    const failed = reduceGpsOfferNotice(shown, { type: 'fetch_failed' })
    expect(failed.visibleReason).toBe('location_stale')
    expect(failed.fetchFailed).toBe(true)
  })

  it('falha sem leitura anterior fica explícita e sem aviso de GPS', () => {
    const failed = reduceGpsOfferNotice(INITIAL_GPS_OFFER_NOTICE, { type: 'fetch_failed' })
    expect(failed.visibleReason).toBeNull()
    expect(failed.fetchFailed).toBe(true)
    expect(failed.hasReading).toBe(false)
  })

  it('falha depois de elegível não inventa um problema de GPS', () => {
    const eligible = status(
      online({
        matching_eligible: true,
        gps_fix_age_seconds: 5,
        matching_ineligible_reason: null,
      }),
    )
    const failed = reduceGpsOfferNotice(eligible, { type: 'fetch_failed' })
    expect(failed.visibleReason).toBeNull()
    expect(failed.fetchFailed).toBe(true)
  })

  it('resposta antiga só com is_available não mostra o aviso', () => {
    const next = status({ is_available: true })
    expect(next.visibleReason).toBeNull()
    expect(next.fetchFailed).toBe(false)
  })

  it('resposta antiga não apaga um aviso já confirmado', () => {
    const shown = status(
      online({
        matching_eligible: false,
        gps_fix_age_seconds: null,
        matching_ineligible_reason: 'location_missing',
      }),
    )
    const held = reduceGpsOfferNotice(shown, {
      type: 'status',
      status: { is_available: true },
    })
    expect(held.visibleReason).toBe('location_missing')
  })

  it('passar a offline limpa o aviso sem mexer em viagens', () => {
    const shown: GpsOfferNoticeState = status(
      online({
        matching_eligible: false,
        gps_fix_age_seconds: 100,
        matching_ineligible_reason: 'location_stale',
      }),
    )
    expect(reduceGpsOfferNotice(shown, { type: 'went_offline' })).toEqual(INITIAL_GPS_OFFER_NOTICE)
  })
})
