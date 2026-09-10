/**
 * PET-5C — Pet feature E2E (API-first).
 * Covers E2E-1…6, attendable reject, Partner/Admin reporting minima.
 */
import { test, expect } from '@playwright/test'
import { attachFailureArtifactsIfNeeded, resetFailureArtifactState } from './helpers/failureArtifacts'
import {
  API,
  PET_SURCHARGE_EUR,
  acceptTrip,
  authHeaders,
  cancelTripAsDriver,
  cancelTripAsPassenger,
  createOfferedTrip,
  createTripWithRateLimitRetry,
  driveTripToCompleted,
  getAdminTrip,
  getDriverTrip,
  getPassengerTrip,
  getPartnerTrip,
  rejectOffer,
  seedReadyDriver,
  waitForOfferAbsent,
} from './helpers/petApiFlow'

test.describe('PET-5C feature (API-first)', () => {
  test.beforeEach(() => {
    resetFailureArtifactState()
  })

  test.afterEach(async ({ }, testInfo) => {
    await attachFailureArtifactsIfNeeded(testInfo)
  })

  test('E2E-1 baseline normal GO 1 pax no pet', async ({ request }) => {
    const tokens = await seedReadyDriver(request)
    const { tripId, createBody } = await createOfferedTrip(request, tokens, {
      vehicle_category: 'x',
      passenger_count: 1,
      has_pet: false,
    })

    expect(createBody.has_pet).toBe(false)
    expect(Number(createBody.pet_surcharge ?? 0)).toBe(0)

    await driveTripToCompleted(request, tokens, tripId)

    const pax = await getPassengerTrip(request, tokens.passenger, tripId)
    expect(pax.status).toBe('completed')
    expect(pax.has_pet).toBe(false)
    expect(pax.passenger_count).toBe(1)
  })

  test('E2E-2 GO + small pet carrier surcharge 1.50', async ({ request }) => {
    const tokens = await seedReadyDriver(request)
    const { tripId, createBody, offer } = await createOfferedTrip(request, tokens, {
      vehicle_category: 'x',
      passenger_count: 1,
      has_pet: true,
      pet_size: 'small',
      pet_transport: 'carrier',
      pet_occupies_seat: false,
    })

    expect(createBody.has_pet).toBe(true)
    expect(Number(createBody.pet_surcharge)).toBe(PET_SURCHARGE_EUR)
    expect(offer.has_pet).toBe(true)
    expect(offer.is_assistance_animal).toBeFalsy()
    expect(Number(offer.pet_surcharge)).toBe(PET_SURCHARGE_EUR)

    await driveTripToCompleted(request, tokens, tripId)

    const pax = await getPassengerTrip(request, tokens.passenger, tripId)
    expect(pax.status).toBe('completed')
    expect(pax.has_pet).toBe(true)
    expect(Number(pax.pet_surcharge)).toBe(PET_SURCHARGE_EUR)
    const bd = pax.price_breakdown as { pet_surcharge?: number } | null | undefined
    if (bd) expect(Number(bd.pet_surcharge)).toBe(PET_SURCHARGE_EUR)

    const drvHist = await request.get(`${API}/driver/trips/history`, {
      headers: authHeaders(tokens.driver),
    })
    expect(drvHist.ok()).toBeTruthy()
    const histRows = (await drvHist.json()) as Array<{
      trip_id?: string
      has_pet?: boolean
      pet_surcharge?: number | null
    }>
    const hist = histRows.find((r) => r.trip_id === tripId)
    expect(hist?.has_pet).toBe(true)
    expect(Number(hist?.pet_surcharge)).toBe(PET_SURCHARGE_EUR)
  })

  test('E2E-3 Comfort + medium pet harness occupies seat', async ({ request }) => {
    const tokens = await seedReadyDriver(request, { categories: ['x', 'comfort'] })
    const { tripId, createBody, offer } = await createOfferedTrip(request, tokens, {
      vehicle_category: 'comfort',
      has_pet: true,
      pet_size: 'medium',
      pet_transport: 'harness',
      pet_occupies_seat: true,
      passenger_count: 1,
    })

    expect(createBody.has_pet).toBe(true)
    expect(Number(createBody.pet_surcharge)).toBe(PET_SURCHARGE_EUR)
    expect(offer.vehicle_category).toBe('comfort')
    expect(offer.pet_occupies_seat).toBe(true)
    expect(Number(offer.pet_surcharge)).toBe(PET_SURCHARGE_EUR)

    await driveTripToCompleted(request, tokens, tripId)

    const pax = await getPassengerTrip(request, tokens.passenger, tripId)
    expect(pax.vehicle_category).toBe('comfort')
    expect(pax.pet_occupies_seat).toBe(true)
    expect(Number(pax.pet_surcharge)).toBe(PET_SURCHARGE_EUR)
  })

  test('E2E-4 assistance dog surcharge 0 no pet opt-in', async ({ request }) => {
    const tokens = await seedReadyDriver(request, { categories: ['x'] })
    const { tripId, createBody, offer } = await createOfferedTrip(request, tokens, {
      vehicle_category: 'x',
      is_assistance_animal: true,
      passenger_count: 1,
    })

    expect(createBody.is_assistance_animal).toBe(true)
    expect(Number(createBody.pet_surcharge ?? 0)).toBe(0)
    expect(offer.is_assistance_animal).toBe(true)
    expect(Number(offer.pet_surcharge ?? 0)).toBe(0)

    await driveTripToCompleted(request, tokens, tripId)

    const pax = await getPassengerTrip(request, tokens.passenger, tripId)
    expect(pax.is_assistance_animal).toBe(true)
    expect(Number(pax.pet_surcharge ?? 0)).toBe(0)

    const drv = await getDriverTrip(request, tokens.driver, tripId)
    expect(drv.is_assistance_animal).toBe(true)
  })

  test('E2E-5 capacity exact 4 pax max=4 accept PASS', async ({ request }) => {
    const tokens = await seedReadyDriver(request)
    const { tripId, offer } = await createOfferedTrip(request, tokens, {
      vehicle_category: 'x',
      passenger_count: 4,
      has_pet: false,
      pet_occupies_seat: false,
    })

    expect(offer.passenger_count).toBe(4)
    const accept = await acceptTrip(request, tokens.driver, tripId)
    expect(
      accept.ok(),
      `accept should PASS (no 409 capacity): ${accept.status()} ${await accept.text()}`
    ).toBeTruthy()

    await cancelTripAsDriver(request, tokens.driver, tripId, {
      reason: 'pet-e2e capacity exact cleanup',
    })
  })

  test('E2E-6 capacity blocked 4 pax + pet seat → ineligible / 409', async ({ request }) => {
    const tokens = await seedReadyDriver(request)
    const tripRes = await createTripWithRateLimitRetry(request, tokens.passenger, {
      vehicle_category: 'x',
      passenger_count: 4,
      has_pet: true,
      pet_size: 'large',
      pet_transport: 'harness',
      pet_occupies_seat: true,
    })
    expect(tripRes.ok(), await tripRes.text()).toBeTruthy()
    const { trip_id: tripId } = (await tripRes.json()) as { trip_id: string }

    await waitForOfferAbsent(request, tokens.driver, tripId)

    const assign = await request.post(`${API}/admin/trips/${tripId}/assign`, {
      headers: authHeaders(tokens.admin),
      data: { governance_reason: 'PET-5C E2E-6 capacity forced accept path' },
    })
    expect(assign.ok(), `assign: ${assign.status()} ${await assign.text()}`).toBeTruthy()

    const forced = await acceptTrip(request, tokens.driver, tripId)
    expect(forced.status()).toBe(409)
    const detail = await forced.text()
    expect(detail).toContain('vehicle_capacity_insufficient')

    await cancelTripAsPassenger(request, tokens.passenger, tripId)
  })

  test('attendable reason: reject requires code; inadequate_accommodation persists', async ({
    request,
  }) => {
    const tokens = await seedReadyDriver(request)
    const { tripId, offer } = await createOfferedTrip(request, tokens, {
      vehicle_category: 'x',
      has_pet: true,
      pet_size: 'small',
      pet_transport: 'carrier',
    })
    expect(offer.offer_id, 'offer_id required for reject').toBeTruthy()
    const offerId = String(offer.offer_id)

    const missing = await rejectOffer(request, tokens.driver, offerId)
    expect(missing.status()).toBe(422)

    const ok = await rejectOffer(request, tokens.driver, offerId, {
      reason_code: 'inadequate_accommodation',
    })
    expect(ok.ok(), await ok.text()).toBeTruthy()

    await waitForOfferAbsent(request, tokens.driver, tripId)

    // Pre-accept reject: trip has no driver yet → Partner detail 404 by design.
    // Admin support detail still recovers offer rejection audit.
    const admin = await getAdminTrip(request, tokens.admin, tripId)
    const rejections = (admin.offer_rejections as Array<{ reason_code?: string }>) ?? []
    expect(rejections.some((r) => r.reason_code === 'inadequate_accommodation')).toBe(true)

    await cancelTripAsPassenger(request, tokens.passenger, tripId)
  })

  test('Partner + Admin reporting minima on completed pet trip', async ({ request }) => {
    const tokens = await seedReadyDriver(request)
    const { tripId } = await createOfferedTrip(request, tokens, {
      vehicle_category: 'x',
      passenger_count: 2,
      has_pet: true,
      pet_size: 'small',
      pet_transport: 'carrier',
      pet_occupies_seat: false,
    })

    await driveTripToCompleted(request, tokens, tripId)

    const partner = await getPartnerTrip(request, tokens.partner, tripId)
    expect(partner.has_pet).toBe(true)
    expect(partner.passenger_count).toBe(2)
    expect(Number(partner.pet_surcharge)).toBe(PET_SURCHARGE_EUR)

    const listRes = await request.get(`${API}/partner/trips`, {
      headers: authHeaders(tokens.partner),
    })
    expect(listRes.ok()).toBeTruthy()
    const list = (await listRes.json()) as Array<{
      trip_id?: string
      has_pet?: boolean
      passenger_count?: number
      pet_surcharge?: number | null
    }>
    const row = list.find((t) => t.trip_id === tripId)
    expect(row?.has_pet).toBe(true)
    expect(row?.passenger_count).toBe(2)
    expect(Number(row?.pet_surcharge)).toBe(PET_SURCHARGE_EUR)

    const admin = await getAdminTrip(request, tokens.admin, tripId)
    expect(admin.has_pet).toBe(true)
    expect(admin.is_assistance_animal).toBeFalsy()
    expect(Number(admin.pet_surcharge)).toBe(PET_SURCHARGE_EUR)
    expect(admin.passenger_count).toBe(2)
  })

  test('post-accept cancel: passenger sees safe label only', async ({ request }) => {
    const tokens = await seedReadyDriver(request)
    const { tripId } = await createOfferedTrip(request, tokens, {
      has_pet: true,
      pet_size: 'small',
      pet_transport: 'carrier',
    })

    const accept = await acceptTrip(request, tokens.driver, tripId)
    expect(accept.ok(), await accept.text()).toBeTruthy()

    const cancel = await cancelTripAsDriver(request, tokens.driver, tripId, {
      reason_code: 'other_attendable_reason',
      reason_detail: 'INTERNAL_FREE_TEXT_MUST_NOT_LEAK_TO_PASSENGER',
    })
    expect(cancel.ok(), await cancel.text()).toBeTruthy()

    const pax = await getPassengerTrip(request, tokens.passenger, tripId)
    expect(pax.status).toBe('cancelled')
    expect(String(pax.cancellation_reason ?? '')).not.toContain(
      'INTERNAL_FREE_TEXT_MUST_NOT_LEAK_TO_PASSENGER'
    )
    expect(String(pax.cancellation_reason ?? '').length).toBeGreaterThan(0)
    expect(pax.cancellation_reason_detail ?? null).toBeNull()

    const partner = await getPartnerTrip(request, tokens.partner, tripId)
    expect(partner.cancel_reason_code).toBe('other_attendable_reason')
    expect(String(partner.cancel_reason_detail ?? '')).toContain('INTERNAL_FREE_TEXT')
  })
})
