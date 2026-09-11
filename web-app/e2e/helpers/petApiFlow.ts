/**
 * PET-5C — shared API helpers for Pet E2E (API-first, no parallel framework).
 * Reuses the same /dev/seed + tokens + geo origin pattern as driver-passenger-flow.
 */
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test'

export const API = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000'

export const TRIP_ORIGIN = { lat: 38.7, lng: -9.1 }
export const TRIP_DEST = { lat: 38.75, lng: -9.15 }

export const PET_SURCHARGE_EUR = 1.5

export type DevTokens = {
  passenger: string
  driver: string
  admin: string
  partner: string
}

export type TripCreateOverrides = {
  vehicle_category?: string
  has_pet?: boolean
  pet_size?: string | null
  pet_transport?: string | null
  is_assistance_animal?: boolean
  pet_occupies_seat?: boolean
  passenger_count?: number
}

const sec = (s: number) => s * 1000
const pollLook = [200, 400, 800, 1500]

export function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function resetAndSeed(request: APIRequestContext): Promise<DevTokens> {
  const reset = await request.post(`${API}/dev/reset`)
  expect(reset.ok(), `reset: ${reset.status()} ${await reset.text()}`).toBeTruthy()

  const seed = await request.post(`${API}/dev/seed`)
  expect(seed.ok(), `seed: ${seed.status()} ${await seed.text()}`).toBeTruthy()
  const seedBody = (await seed.json()) as { e2e_vehicle_max_passengers?: number | null }
  expect(
    seedBody.e2e_vehicle_max_passengers,
    'seed must assign demo vehicle with max_passengers=4'
  ).toBe(4)

  const tokRes = await request.post(`${API}/dev/tokens`)
  expect(tokRes.ok(), `tokens: ${tokRes.status()}`).toBeTruthy()
  return (await tokRes.json()) as DevTokens
}

export async function setDriverLocation(
  request: APIRequestContext,
  driverToken: string,
  coords: { lat: number; lng: number } = TRIP_ORIGIN
) {
  const locRes = await request.post(`${API}/drivers/location`, {
    headers: authHeaders(driverToken),
    data: {
      lat: coords.lat,
      lng: coords.lng,
      timestamp: Date.now(),
    },
  })
  expect(locRes.ok(), `driver location: ${locRes.status()} ${await locRes.text()}`).toBeTruthy()
}

export async function ensureDriverOnline(request: APIRequestContext, driverToken: string) {
  const on = await request.post(`${API}/driver/status/online`, {
    headers: authHeaders(driverToken),
  })
  expect(on.ok(), `driver online: ${on.status()} ${await on.text()}`).toBeTruthy()
}

export async function setDriverCategories(
  request: APIRequestContext,
  driverToken: string,
  categories: string[]
) {
  const res = await request.patch(`${API}/driver/preferences/vehicle-categories`, {
    headers: authHeaders(driverToken),
    data: { categories },
  })
  expect(res.ok(), `vehicle-categories: ${res.status()} ${await res.text()}`).toBeTruthy()
}

/** App default LOCATION_MAX_AGE_SECONDS — diagnostic only (not a product change). */
const LOCATION_MAX_AGE_SECONDS_HINT = 45

export async function createTripWithRateLimitRetry(
  request: APIRequestContext,
  passengerToken: string,
  overrides: TripCreateOverrides = {},
  timeoutMs = 70000,
  /** When set, refresh driver GPS before each create attempt (avoids stale-location zero offers). */
  driverToken?: string
): Promise<APIResponse> {
  let lastDetail = 'trip_retry_failed'
  let lastStatus = 500
  const startedAt = Date.now()
  let attempt = 0

  const data = {
    origin_lat: TRIP_ORIGIN.lat,
    origin_lng: TRIP_ORIGIN.lng,
    destination_lat: TRIP_DEST.lat,
    destination_lng: TRIP_DEST.lng,
    vehicle_category: overrides.vehicle_category ?? 'x',
    has_pet: overrides.has_pet ?? false,
    pet_size: overrides.pet_size ?? undefined,
    pet_transport: overrides.pet_transport ?? undefined,
    is_assistance_animal: overrides.is_assistance_animal ?? false,
    pet_occupies_seat: overrides.pet_occupies_seat ?? false,
    passenger_count: overrides.passenger_count ?? 1,
  }

  while (Date.now() - startedAt < timeoutMs) {
    attempt += 1
    // Keep location fresh relative to LOCATION_MAX_AGE before each dispatch attempt.
    if (driverToken) {
      await setDriverLocation(request, driverToken)
    }
    const tripRes = await request.post(`${API}/trips`, {
      headers: authHeaders(passengerToken),
      data,
    })
    if (tripRes.ok()) return tripRes

    const detail = await tripRes.text()
    lastDetail = detail
    lastStatus = tripRes.status()
    const isRateLimited = tripRes.status() === 429 || detail.includes('rate_limit_exceeded')
    if (!isRateLimited) break

    await new Promise((resolve) => setTimeout(resolve, Math.min(2000 + attempt * 400, 5000)))
  }

  throw new Error(`create trip failed (${lastStatus}): ${lastDetail}`)
}

export type AvailableRow = {
  trip_id?: string
  offer_id?: string | null
  has_pet?: boolean
  is_assistance_animal?: boolean
  pet_surcharge?: number | null
  pet_occupies_seat?: boolean
  passenger_count?: number
  vehicle_category?: string | null
  pet_size?: string | null
  pet_transport?: string | null
}

export async function listAvailable(
  request: APIRequestContext,
  driverToken: string
): Promise<AvailableRow[]> {
  const r = await request.get(`${API}/driver/trips/available`, {
    headers: authHeaders(driverToken),
  })
  expect(r.ok(), `available: ${r.status()} ${await r.text()}`).toBeTruthy()
  return (await r.json()) as AvailableRow[]
}

type SoftFetchResult = {
  ok: boolean
  status: number
  body: unknown
  error?: string
}

async function softJsonGet(
  request: APIRequestContext,
  url: string,
  token: string
): Promise<SoftFetchResult> {
  try {
    const r = await request.get(url, { headers: authHeaders(token) })
    const text = await r.text()
    let body: unknown = text
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      /* keep raw text */
    }
    return { ok: r.ok(), status: r.status(), body }
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

async function buildWaitForOfferDiagnostics(
  request: APIRequestContext,
  driverToken: string,
  tripId: string,
  opts: {
    passengerToken?: string
    adminToken?: string
    pollHttpErrors: string[]
    lastAvailable: AvailableRow[] | null
  }
): Promise<string> {
  const nowMs = Date.now()
  const tripAsPassenger = opts.passengerToken
    ? await softJsonGet(request, `${API}/trips/${tripId}`, opts.passengerToken)
    : null
  const tripAsAdmin = opts.adminToken
    ? await softJsonGet(request, `${API}/admin/trips/${tripId}`, opts.adminToken)
    : null
  const offers = await softJsonGet(request, `${API}/driver/offers`, driverToken)
  const locationLast = await softJsonGet(
    request,
    `${API}/drivers/location/last`,
    driverToken
  )
  const availableAgain = await softJsonGet(
    request,
    `${API}/driver/trips/available`,
    driverToken
  )

  let locationAgeSec: number | null = null
  let locationStaleHint: string | null = null
  if (
    locationLast.ok &&
    locationLast.body &&
    typeof locationLast.body === 'object' &&
    locationLast.body !== null &&
    'timestamp' in locationLast.body
  ) {
    const ts = Number((locationLast.body as { timestamp?: unknown }).timestamp)
    if (Number.isFinite(ts)) {
      locationAgeSec = Math.round((nowMs - ts) / 1000)
      locationStaleHint =
        locationAgeSec > LOCATION_MAX_AGE_SECONDS_HINT
          ? `stale_vs_default_max_age_${LOCATION_MAX_AGE_SECONDS_HINT}s`
          : `fresh_vs_default_max_age_${LOCATION_MAX_AGE_SECONDS_HINT}s`
    }
  }

  const tripStatus =
    (tripAsPassenger?.ok &&
      tripAsPassenger.body &&
      typeof tripAsPassenger.body === 'object' &&
      (tripAsPassenger.body as { status?: unknown }).status) ||
    (tripAsAdmin?.ok &&
      tripAsAdmin.body &&
      typeof tripAsAdmin.body === 'object' &&
      (tripAsAdmin.body as { status?: unknown }).status) ||
    null

  return [
    `waitForOffer timeout trip_id=${tripId}`,
    `trip_status=${String(tripStatus)}`,
    `passenger_trip_http=${tripAsPassenger ? `${tripAsPassenger.status}` : 'n/a'}`,
    `admin_trip_http=${tripAsAdmin ? `${tripAsAdmin.status}` : 'n/a'}`,
    `driver_offers_http=${offers.status} body=${JSON.stringify(offers.body)}`,
    `listAvailable_last_poll=${JSON.stringify(opts.lastAvailable)}`,
    `listAvailable_final_http=${availableAgain.status} body=${JSON.stringify(availableAgain.body)}`,
    `driver_location_last_http=${locationLast.status} body=${JSON.stringify(locationLast.body)}`,
    `location_age_sec=${locationAgeSec ?? 'n/a'} location_freshness=${locationStaleHint ?? 'n/a'}`,
    `poll_http_errors=${opts.pollHttpErrors.length ? opts.pollHttpErrors.join(' | ') : 'none'}`,
  ].join('\n')
}

export async function waitForOffer(
  request: APIRequestContext,
  driverToken: string,
  tripId: string,
  timeoutMs = sec(60),
  diagTokens?: { passengerToken?: string; adminToken?: string }
): Promise<AvailableRow> {
  let found: AvailableRow | null = null
  let lastAvailable: AvailableRow[] | null = null
  const pollHttpErrors: string[] = []

  try {
    await expect
      .poll(
        async () => {
          try {
            const list = await listAvailable(request, driverToken)
            lastAvailable = list
            found = list.find((row) => row.trip_id === tripId) ?? null
            return found != null
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            pollHttpErrors.push(msg.slice(0, 240))
            throw e
          }
        },
        { timeout: timeoutMs, intervals: pollLook }
      )
      .toBe(true)
  } catch (pollErr) {
    const diag = await buildWaitForOfferDiagnostics(request, driverToken, tripId, {
      passengerToken: diagTokens?.passengerToken,
      adminToken: diagTokens?.adminToken,
      pollHttpErrors,
      lastAvailable,
    })
    const base = pollErr instanceof Error ? pollErr.message : String(pollErr)
    throw new Error(`${base}\n--- waitForOffer diagnostics ---\n${diag}`)
  }

  if (!found) throw new Error(`offer not found for trip ${tripId}`)
  return found
}

export async function waitForOfferAbsent(
  request: APIRequestContext,
  driverToken: string,
  tripId: string,
  timeoutMs = sec(20)
) {
  await expect
    .poll(
      async () => {
        const list = await listAvailable(request, driverToken)
        return list.some((row) => row.trip_id === tripId)
      },
      { timeout: timeoutMs, intervals: pollLook }
    )
    .toBe(false)
}

export async function acceptTrip(
  request: APIRequestContext,
  driverToken: string,
  tripId: string
) {
  const res = await request.post(`${API}/driver/trips/${tripId}/accept`, {
    headers: authHeaders(driverToken),
  })
  return res
}

export async function rejectOffer(
  request: APIRequestContext,
  driverToken: string,
  offerId: string,
  body?: { reason_code?: string; reason_detail?: string }
) {
  return request.post(`${API}/driver/offers/${offerId}/reject`, {
    headers: authHeaders(driverToken),
    data: body ?? {},
  })
}

export async function cancelTripAsDriver(
  request: APIRequestContext,
  driverToken: string,
  tripId: string,
  body: { reason_code?: string; reason_detail?: string; reason?: string }
) {
  return request.post(`${API}/driver/trips/${tripId}/cancel`, {
    headers: authHeaders(driverToken),
    data: body,
  })
}

export async function cancelTripAsPassenger(
  request: APIRequestContext,
  passengerToken: string,
  tripId: string,
  reason = 'pet-e2e cleanup'
) {
  const res = await request.post(`${API}/trips/${tripId}/cancel`, {
    headers: authHeaders(passengerToken),
    data: { reason },
  })
  return res
}

export async function getPassengerTrip(
  request: APIRequestContext,
  passengerToken: string,
  tripId: string
) {
  const res = await request.get(`${API}/trips/${tripId}`, {
    headers: authHeaders(passengerToken),
  })
  expect(res.ok(), `passenger trip: ${res.status()} ${await res.text()}`).toBeTruthy()
  return (await res.json()) as Record<string, unknown>
}

export async function getDriverTrip(
  request: APIRequestContext,
  driverToken: string,
  tripId: string
) {
  const res = await request.get(`${API}/driver/trips/${tripId}`, {
    headers: authHeaders(driverToken),
  })
  expect(res.ok(), `driver trip: ${res.status()} ${await res.text()}`).toBeTruthy()
  return (await res.json()) as Record<string, unknown>
}

export async function getPartnerTrip(
  request: APIRequestContext,
  partnerToken: string,
  tripId: string
) {
  const res = await request.get(`${API}/partner/trips/${tripId}`, {
    headers: authHeaders(partnerToken),
  })
  expect(res.ok(), `partner trip: ${res.status()} ${await res.text()}`).toBeTruthy()
  return (await res.json()) as Record<string, unknown>
}

export async function getAdminTrip(
  request: APIRequestContext,
  adminToken: string,
  tripId: string
) {
  const res = await request.get(`${API}/admin/trips/${tripId}`, {
    headers: authHeaders(adminToken),
  })
  expect(res.ok(), `admin trip: ${res.status()} ${await res.text()}`).toBeTruthy()
  return (await res.json()) as Record<string, unknown>
}

/** Accept → arriving → start → complete (proximity via /drivers/location). */
export async function driveTripToCompleted(
  request: APIRequestContext,
  tokens: Pick<DevTokens, 'driver'>,
  tripId: string
) {
  const accept = await acceptTrip(request, tokens.driver, tripId)
  expect(accept.ok(), `accept: ${accept.status()} ${await accept.text()}`).toBeTruthy()

  await setDriverLocation(request, tokens.driver)

  const arriving = await request.post(`${API}/driver/trips/${tripId}/arriving`, {
    headers: authHeaders(tokens.driver),
  })
  expect(arriving.ok(), `arriving: ${arriving.status()} ${await arriving.text()}`).toBeTruthy()

  await setDriverLocation(request, tokens.driver)

  const start = await request.post(`${API}/driver/trips/${tripId}/start`, {
    headers: authHeaders(tokens.driver),
  })
  expect(start.ok(), `start: ${start.status()} ${await start.text()}`).toBeTruthy()

  const complete = await request.post(`${API}/driver/trips/${tripId}/complete`, {
    headers: authHeaders(tokens.driver),
    data: {},
  })
  expect(complete.ok(), `complete: ${complete.status()} ${await complete.text()}`).toBeTruthy()

  const driverDetail = await getDriverTrip(request, tokens.driver, tripId)
  expect(driverDetail.status).toBe('completed')
}

export async function seedReadyDriver(
  request: APIRequestContext,
  opts?: { categories?: string[] }
): Promise<DevTokens> {
  const tokens = await resetAndSeed(request)
  await setDriverCategories(request, tokens.driver, opts?.categories ?? ['x'])
  await ensureDriverOnline(request, tokens.driver)
  await setDriverLocation(request, tokens.driver)
  return tokens
}

export async function createOfferedTrip(
  request: APIRequestContext,
  tokens: DevTokens,
  overrides: TripCreateOverrides = {}
): Promise<{ tripId: string; createBody: Record<string, unknown>; offer: AvailableRow }> {
  // Fresh GPS immediately before create (and again inside each rate-limit retry).
  await setDriverLocation(request, tokens.driver)
  const tripRes = await createTripWithRateLimitRetry(
    request,
    tokens.passenger,
    overrides,
    70000,
    tokens.driver
  )
  expect(tripRes.ok(), `create: ${tripRes.status()} ${await tripRes.text()}`).toBeTruthy()
  const createBody = (await tripRes.json()) as Record<string, unknown>
  const tripId = String(createBody.trip_id)
  const offer = await waitForOffer(request, tokens.driver, tripId, sec(60), {
    passengerToken: tokens.passenger,
    adminToken: tokens.admin,
  })
  return { tripId, createBody, offer }
}
