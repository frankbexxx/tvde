import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
  type Dialog,
  type Page,
} from '@playwright/test'
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

/** Menu do motorista: cabeçalho ou barra inferior (`VITE_DRIVER_BOTTOM_NAV`). */
async function openDriverMenu(page: Page) {
  const bottom = page.locator('[data-testid="driver-bottom-nav-menu"]')
  if ((await bottom.count()) > 0 && (await bottom.first().isVisible())) {
    await bottom.first().click()
    return
  }
  await page.getByTestId('driver-open-menu').click()
}

async function createTripWithRateLimitRetry(
  request: APIRequestContext,
  passengerToken: string,
  timeoutMs = 70000
) {
  let lastDetail = 'trip_retry_failed'
  let lastStatus = 500
  const startedAt = Date.now()
  let attempt = 0

  while (Date.now() - startedAt < timeoutMs) {
    attempt += 1
    const tripRes = await request.post(`${API}/trips`, {
      headers: {
        Authorization: `Bearer ${passengerToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        origin_lat: TRIP_ORIGIN.lat,
        origin_lng: TRIP_ORIGIN.lng,
        destination_lat: TRIP_DEST.lat,
        destination_lng: TRIP_DEST.lng,
      },
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

  const tripRes = await createTripWithRateLimitRetry(request, tokens.passenger)
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

async function createAuthenticatedContext(
  browser: Browser,
  tokens: { passenger: string; driver: string; admin: string },
  role: 'driver' | 'passenger',
  tripIdForPassenger?: string
) {
  const ctx = await browser.newContext()
  await ctx.addInitScript(
    ({ json, appRole, tripId }: { json: string; appRole: 'driver' | 'passenger'; tripId?: string }) => {
      try {
        localStorage.setItem('tvde_e2e_dev_tokens_json', json)
        localStorage.setItem('tvde_app_route_role', appRole)
        if (appRole === 'driver') localStorage.removeItem('tvde_driver_offline')
        if (tripId) sessionStorage.setItem('e2e_passenger_trip_id', tripId)
      } catch {
        /* ignore */
      }
    },
    { json: JSON.stringify(tokens), appRole: role, tripId: tripIdForPassenger }
  )
  await ctx.grantPermissions(['geolocation'], { origin: BASE_URL })
  await ctx.setGeolocation({ latitude: TRIP_ORIGIN.lat, longitude: TRIP_ORIGIN.lng })
  return ctx
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

    const driverCtx = await createAuthenticatedContext(browser, tokens, 'driver')
    const driverPage = await driverCtx.newPage()
    trackDriverPageForArtifacts(driverPage)

    await driverPage.goto('/driver', { waitUntil: 'domcontentloaded', timeout: sec(120) })

    // Shell com auth OK (âncora estável, sem depender de copy visível).
    await expect(driverPage.getByTestId('app-header-brand')).toBeVisible({
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

    const aceitarBtn = driverPage.getByTestId(`driver-accept-${tripId}`)
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
      timeout: sec(90),
    })
    await driverPage.getByRole('button', { name: /terminar viagem/i }).click()
    await expect
      .poll(
        async () => {
          const hasIdleOrHistory = await driverPage
            .getByText(/à espera de viagens|histórico/i)
            .first()
            .isVisible()
            .catch(() => false)
          const hasNewOffer = await driverPage.getByRole('button', { name: /^ACEITAR$/i }).isVisible().catch(() => false)
          return hasIdleOrHistory || hasNewOffer
        },
        { timeout: sec(45), intervals: pollLook }
      )
      .toBe(true)

    const passengerCtx = await createAuthenticatedContext(
      browser,
      tokens,
      'passenger',
      tripId
    )
    const passengerPage = await passengerCtx.newPage()
    trackPassengerPageForArtifacts(passengerPage)
    await passengerPage.goto('/passenger', { waitUntil: 'domcontentloaded', timeout: sec(120) })
    await expect(passengerPage.getByTestId('app-header-brand')).toBeVisible({
      timeout: sec(60),
    })
    await expect(passengerPage.getByTestId('passenger-main')).toBeVisible({
      timeout: sec(45),
    })

    await passengerCtx.close()
    await driverCtx.close()
  })

  test('driver rejeita oferta e ela desaparece da lista', async ({ browser, request }) => {
    const { tripId, tokens } = await seedAndCreateTrip(request)
    const driverCtx = await createAuthenticatedContext(browser, tokens, 'driver')
    const driverPage = await driverCtx.newPage()
    trackDriverPageForArtifacts(driverPage)
    await driverPage.goto('/driver', { waitUntil: 'domcontentloaded', timeout: sec(120) })

    const rejectBtn = driverPage.getByTestId(`driver-reject-${tripId}`)
    await expect.poll(async () => rejectBtn.isVisible(), { timeout: sec(90), intervals: pollLook }).toBe(true)
    driverPage.once('dialog', (d: Dialog) => d.accept())
    await rejectBtn.click()

    await expect
      .poll(
        async () => {
          const r = await request.get(`${API}/driver/trips/available`, {
            headers: { Authorization: `Bearer ${tokens.driver}` },
          })
          if (!r.ok()) return true
          const list = (await r.json()) as Array<{ trip_id?: string }>
          return !list.some((item) => item.trip_id === tripId)
        },
        { timeout: sec(60), intervals: pollLook }
      )
      .toBe(true)

    await driverCtx.close()
  })

  test('passenger avalia motorista após conclusão', async ({ browser, request }) => {
    const { tripId, tokens } = await seedAndCreateTrip(request)

    const driverCtx = await createAuthenticatedContext(browser, tokens, 'driver')
    const driverPage = await driverCtx.newPage()
    await driverPage.goto('/driver', { waitUntil: 'domcontentloaded', timeout: sec(120) })
    await driverPage.getByTestId(`driver-accept-${tripId}`).click()
    await expect(driverPage.getByRole('button', { name: /iniciar viagem/i })).toBeVisible({
      timeout: sec(60),
    })
    await driverPage.getByRole('button', { name: /iniciar viagem/i }).click()
    await expect(driverPage.getByRole('button', { name: /terminar viagem/i })).toBeVisible({
      timeout: sec(90),
    })
    await driverPage.getByRole('button', { name: /terminar viagem/i }).click()
    await driverCtx.close()

    const passengerCtx = await createAuthenticatedContext(browser, tokens, 'passenger', tripId)
    const passengerPage = await passengerCtx.newPage()
    trackPassengerPageForArtifacts(passengerPage)
    await passengerPage.goto('/passenger', { waitUntil: 'domcontentloaded', timeout: sec(120) })

    await expect(passengerPage.getByTestId('passenger-trip-rating')).toBeVisible({
      timeout: sec(90),
    })
    await passengerPage.getByTestId('passenger-rating-star-5').click()
    await passengerPage.getByRole('button', { name: /enviar avaliação/i }).click()

    await expect
      .poll(
        async () => {
          const r = await request.get(`${API}/trips/${tripId}`, {
            headers: { Authorization: `Bearer ${tokens.passenger}` },
          })
          if (!r.ok()) return null
          const detail = (await r.json()) as { driver_rating?: number | null }
          return detail.driver_rating ?? null
        },
        { timeout: sec(60), intervals: pollLook }
      )
      .toBe(5)

    await passengerCtx.close()
  })

  test('preferência Google Maps persiste e vira link primário', async ({ browser, request }) => {
    const { tripId, tokens } = await seedAndCreateTrip(request)

    const driverCtx = await createAuthenticatedContext(browser, tokens, 'driver')
    const driverPage = await driverCtx.newPage()
    await driverPage.goto('/driver', { waitUntil: 'domcontentloaded', timeout: sec(120) })

    await openDriverMenu(driverPage)
    await driverPage.getByTestId('driver-nav-pref-google').click()
    await driverPage.reload({ waitUntil: 'domcontentloaded' })
    await openDriverMenu(driverPage)
    await expect(driverPage.getByTestId('driver-nav-pref-google')).toBeVisible()

    // Com menu no topo do ecrã, o painel substitui o dashboard — é obrigatório fechar antes de ACEITAR.
    await driverPage.getByTestId('driver-close-menu').click()
    await expect(driverPage.getByTestId(`driver-accept-${tripId}`)).toBeVisible({ timeout: sec(60) })

    await driverPage.getByTestId(`driver-accept-${tripId}`).click()
    await expect(driverPage.getByRole('button', { name: /iniciar viagem/i })).toBeVisible({
      timeout: sec(60),
    })

    const primaryPickupNav = driverPage.getByTestId('driver-nav-pickup-primary')
    await expect(primaryPickupNav).toBeVisible({ timeout: sec(30) })
    const href = await primaryPickupNav.getAttribute('href')
    expect(href ?? '').toContain('google.com/maps')

    await driverCtx.close()
  })
})
