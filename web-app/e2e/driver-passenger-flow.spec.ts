import { test, expect, type APIRequestContext } from '@playwright/test'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173'

const TRIP_ORIGIN = { lat: 38.7, lng: -9.1 }
const TRIP_DEST = { lat: 38.75, lng: -9.15 }

async function seedAndCreateTrip(request: APIRequestContext): Promise<{ tripId: string }> {
  const seed = await request.post(`${API}/dev/seed`)
  expect(seed.ok(), `seed: ${seed.status()} ${await seed.text()}`).toBeTruthy()

  const tokRes = await request.post(`${API}/dev/tokens`)
  expect(tokRes.ok(), `tokens: ${tokRes.status()}`).toBeTruthy()
  const tokens = (await tokRes.json()) as { passenger: string; driver: string; admin: string }

  const locRes = await request.post(`${API}/drivers/location`, {
    headers: {
      Authorization: `Bearer ${tokens.driver}`,
      'Content-Type': 'application/json',
    },
    data: {
      lat: TRIP_ORIGIN.lat,
      lng: TRIP_ORIGIN.lng,
      timestamp: Date.now(),
    },
  })
  expect(locRes.ok(), `driver location: ${locRes.status()} ${await locRes.text()}`).toBeTruthy()

  const tripRes = await request.post(`${API}/trips`, {
    headers: {
      Authorization: `Bearer ${tokens.passenger}`,
      'Content-Type': 'application/json',
    },
    data: {
      origin_lat: TRIP_ORIGIN.lat,
      origin_lng: TRIP_ORIGIN.lng,
      destination_lat: TRIP_DEST.lat,
      destination_lng: TRIP_DEST.lng,
    },
  })
  expect(tripRes.ok(), `create trip: ${tripRes.status()} ${await tripRes.text()}`).toBeTruthy()
  const trip = (await tripRes.json()) as { trip_id: string }

  await expect
    .poll(
      async () => {
        const r = await request.get(`${API}/driver/trips/available`, {
          headers: { Authorization: `Bearer ${tokens.driver}` },
        })
        if (!r.ok()) return 0
        const list = (await r.json()) as unknown[]
        return list.length
      },
      { timeout: 60_000, intervals: [500, 1000, 2000] }
    )
    .toBeGreaterThan(0)

  return { tripId: trip.trip_id }
}

test.describe('Driver + passenger (proximity gate)', () => {
  test('passenger vê viagem; motorista aceita, inicia no pickup, conclui', async ({
    browser,
    request,
  }) => {
    const { tripId } = await seedAndCreateTrip(request)

    const passengerCtx = await browser.newContext()
    await passengerCtx.addInitScript((id: string) => {
      sessionStorage.setItem('e2e_passenger_trip_id', id)
    }, tripId)
    await passengerCtx.grantPermissions(['geolocation'], { origin: BASE_URL })
    await passengerCtx.setGeolocation({ latitude: TRIP_ORIGIN.lat, longitude: TRIP_ORIGIN.lng })
    const passengerPage = await passengerCtx.newPage()
    await passengerPage.goto('/passenger', { waitUntil: 'domcontentloaded' })
    // Shell da app (após auth dev ou ecrã BETA) — se falhar, API não respondeu (ver VITE_API_URL / proxy 127.0.0.1:8000).
    await expect(passengerPage.getByRole('heading', { name: /TVDE/i })).toBeVisible({ timeout: 120_000 })
    await expect(
      passengerPage
        .getByText(/procura|motorista|pedido|viagem|Para onde|sincronizar|Entra com o teu telemóvel/i)
        .first()
    ).toBeVisible({ timeout: 90_000 })

    const driverCtx = await browser.newContext()
    await driverCtx.addInitScript(() => {
      localStorage.setItem('tvde_app_route_role', 'driver')
    })
    await driverCtx.grantPermissions(['geolocation'], { origin: BASE_URL })
    await driverCtx.setGeolocation({ latitude: TRIP_ORIGIN.lat, longitude: TRIP_ORIGIN.lng })
    const driverPage = await driverCtx.newPage()
    await driverPage.goto('/driver')
    await expect(driverPage.getByRole('button', { name: /^ACEITAR$/i })).toBeVisible({ timeout: 90_000 })
    await driverPage.getByRole('button', { name: /^ACEITAR$/i }).click()
    await expect(driverPage.getByRole('button', { name: /iniciar viagem/i })).toBeVisible({ timeout: 30_000 })
    const startBtn = driverPage.getByRole('button', { name: /iniciar viagem/i })
    await expect(startBtn).toBeEnabled({ timeout: 30_000 })
    await startBtn.click()
    await expect(driverPage.getByRole('button', { name: /terminar viagem/i })).toBeVisible({ timeout: 30_000 })
    await driverPage.getByRole('button', { name: /terminar viagem/i }).click()
    await expect(driverPage.getByText(/à espera de viagens|histórico/i).first()).toBeVisible({
      timeout: 45_000,
    })

    await passengerCtx.close()
    await driverCtx.close()
  })
})
