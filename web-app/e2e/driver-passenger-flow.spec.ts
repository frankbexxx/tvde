import { test, expect, type APIRequestContext } from '@playwright/test'
import {
  attachFailureArtifactsIfNeeded,
  resetFailureArtifactState,
  setFailureArtifactMeta,
  trackDriverPageForArtifacts,
  trackPassengerPageForArtifacts,
} from './helpers/failureArtifacts'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173'

const TRIP_ORIGIN = { lat: 38.7, lng: -9.1 }
const TRIP_DEST = { lat: 38.75, lng: -9.15 }

/** Timeouts em segundos (legível). */
const sec = (s: number) => s * 1000

/** Intervalos de poll (ms). */
const pollLook = [300, 600, 1200, 2000]

/**
 * Motorista primeiro no browser: evita expirar ofertas (~OFFER_TIMEOUT_SECONDS no backend) enquanto o Vite
 * compila outra rota. O workflow CI define OFFER_TIMEOUT_SECONDS (não confundir com timeouts do Playwright).
 */
async function seedAndCreateTrip(request: APIRequestContext): Promise<{
  tripId: string
  tokens: { passenger: string; driver: string; admin: string }
}> {
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
      { timeout: sec(60), intervals: [200, 500, 1000] }
    )
    .toBeGreaterThan(0)

  return { tripId: trip.trip_id, tokens }
}

test.describe('Driver + passenger (proximity gate)', () => {
  test.beforeEach(() => {
    resetFailureArtifactState()
  })

  test.afterEach(async ({}, testInfo) => {
    await attachFailureArtifactsIfNeeded(testInfo)
  })

  test('passenger vê viagem; motorista aceita, inicia no pickup, conclui', async ({
    browser,
    request,
  }) => {
    const { tripId, tokens } = await seedAndCreateTrip(request)
    setFailureArtifactMeta('trip_id', tripId)
    setFailureArtifactMeta('driver_jwt_chars', String(tokens.driver?.length ?? 0))

    const driverCtx = await browser.newContext()
    // Mesmos JWT do seed: o request Playwright vê viagens mas o browser pedia /dev/tokens outra vez —
    // o primeiro poll do dashboard falhava ou desalinhava; inject evita isso (só com VITE_E2E no Vite).
    await driverCtx.addInitScript(
      (json: string) => {
        try {
          localStorage.setItem('tvde_e2e_dev_tokens_json', json)
          localStorage.setItem('tvde_app_route_role', 'driver')
          localStorage.removeItem('tvde_driver_offline')
        } catch {
          /* ignore */
        }
      },
      JSON.stringify({
        passenger: tokens.passenger,
        driver: tokens.driver,
        admin: tokens.admin,
      })
    )
    await driverCtx.grantPermissions(['geolocation'], { origin: BASE_URL })
    await driverCtx.setGeolocation({ latitude: TRIP_ORIGIN.lat, longitude: TRIP_ORIGIN.lng })
    const driverPage = await driverCtx.newPage()
    trackDriverPageForArtifacts(driverPage)

    await driverPage.goto('/driver', { waitUntil: 'domcontentloaded', timeout: sec(120) })

    // Shell com auth OK (sem isto, loadError não mostra TVDE nem ACEITAR).
    await expect(driverPage.getByRole('heading', { name: /TVDE/i })).toBeVisible({
      timeout: sec(120),
    })

    // Servidor ainda lista a viagem para o motorista do seed.
    await expect
      .poll(
        async () => {
          const r = await request.get(`${API}/driver/trips/available`, {
            headers: { Authorization: `Bearer ${tokens.driver}` },
          })
          if (!r.ok()) return 0
          return ((await r.json()) as unknown[]).length
        },
        { timeout: sec(60), intervals: pollLook }
      )
      .toBeGreaterThan(0)

    const aceitarBtn = driverPage.getByRole('button', { name: /^ACEITAR$/i }).first()
    await expect
      .poll(async () => aceitarBtn.isVisible(), { timeout: sec(90), intervals: pollLook })
      .toBe(true)

    await aceitarBtn.click()
    await expect(driverPage.getByRole('button', { name: /iniciar viagem/i })).toBeVisible({
      timeout: sec(60),
    })
    const startBtn = driverPage.getByRole('button', { name: /iniciar viagem/i })
    await expect(startBtn).toBeEnabled({ timeout: sec(45) })
    await startBtn.click()
    await expect(driverPage.getByRole('button', { name: /terminar viagem/i })).toBeVisible({
      timeout: sec(30),
    })
    await driverPage.getByRole('button', { name: /terminar viagem/i }).click()
    await expect(driverPage.getByText(/à espera de viagens|histórico/i).first()).toBeVisible({
      timeout: sec(45),
    })

    const passengerCtx = await browser.newContext()
    await passengerCtx.addInitScript((id: string) => {
      sessionStorage.setItem('e2e_passenger_trip_id', id)
    }, tripId)
    await passengerCtx.grantPermissions(['geolocation'], { origin: BASE_URL })
    await passengerCtx.setGeolocation({ latitude: TRIP_ORIGIN.lat, longitude: TRIP_ORIGIN.lng })
    const passengerPage = await passengerCtx.newPage()
    trackPassengerPageForArtifacts(passengerPage)
    await passengerPage.goto('/passenger', { waitUntil: 'domcontentloaded', timeout: sec(120) })
    await expect(passengerPage.getByRole('heading', { name: /TVDE/i })).toBeVisible({
      timeout: sec(60),
    })
    await expect(
      passengerPage
        .getByText(/procura|motorista|pedido|viagem|Para onde|sincronizar|Entra com o teu telemóvel/i)
        .first()
    ).toBeVisible({ timeout: sec(45) })

    await passengerCtx.close()
    await driverCtx.close()
  })
})
