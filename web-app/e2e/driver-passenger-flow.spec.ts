import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
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

/** Menu do motorista: barra inferior Manel ou botão legacy (sem bottom nav). */
async function openDriverMenu(page: Page) {
  const shellMenu = page.getByTestId('driver-bottom-nav-menu')
  const legacyMenu = page.getByTestId('driver-open-menu')
  const trigger = shellMenu.or(legacyMenu)
  await trigger.waitFor({ state: 'visible', timeout: sec(120) })
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
}

/**
 * Com dois passos activos (só quando `VITE_DRIVER_BOTTOM_NAV` está desligado e
 * `VITE_DRIVER_HOME_TWO_STEP=true`), o passo 1 só mostra mapa/disponibilidade.
 * Com barra inferior Manel (ambos true em `.env`), o fluxo em 2 passos fica desactivado no código.
 * Este helper é no-op se não houver passo 1.
 */
/** FIX-008: painel de oferta só abre após toque no marcador do mapa. */
async function openDriverOfferPanel(page: Page, tripId: string) {
  const marker = page.getByTestId(`driver-map-offer-${tripId}`)
  const slideTrack = page.getByTestId(`driver-accept-${tripId}-track`)
  await expect
    .poll(
      async () => {
        if (await slideTrack.isVisible().catch(() => false)) {
          return true
        }
        if (await marker.isVisible().catch(() => false)) {
          await marker.click()
          return await slideTrack.isVisible().catch(() => false)
        }
        return false
      },
      { timeout: sec(90), intervals: pollLook }
    )
    .toBe(true)
}

/** G08: deslizar ~metade da faixa para aceitar (sem botão «um toque»). */
async function slideDriverAccept(page: Page, tripId: string) {
  const track = page.getByTestId(`driver-accept-${tripId}-track`)
  await expect(track).toBeVisible({ timeout: sec(30) })
  const box = await track.boundingBox()
  if (!box) throw new Error(`slide track missing: driver-accept-${tripId}-track`)
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + 10, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.55, y, { steps: 10 })
  await page.mouse.up()
}

async function acceptDriverTripFromMap(page: Page, tripId: string) {
  await openDriverOfferPanel(page, tripId)
  await slideDriverAccept(page, tripId)
}

async function closeDriverOfferPanelFromMap(page: Page, tripId: string) {
  await openDriverOfferPanel(page, tripId)
  await page.getByTestId('driver-offer-panel-close').click()
  await expect(page.getByTestId(`driver-accept-${tripId}-track`)).toHaveCount(0, {
    timeout: sec(15),
  })
}

async function leaveDriverHomeStep1IfPresent(page: Page) {
  const step1 = page.getByTestId('driver-home-step1')
  if (!(await step1.isVisible().catch(() => false))) return
  const fixed = page.getByTestId('driver-home-step1-continue-fixed')
  const inline = page.getByTestId('driver-home-step1-continue')
  if (await fixed.isVisible().catch(() => false)) {
    await fixed.click()
  } else if (await inline.isVisible().catch(() => false)) {
    await inline.click()
  }
}

/** Espera POST feito pelo browser após "Iniciar viagem" (markArriving → startTrip). */
function waitForDriverTripPost(page: Page, tripId: string, suffix: 'arriving' | 'start') {
  return page.waitForResponse(
    (res) =>
      res.request().method() === 'POST' &&
      res.url().includes(`/driver/trips/${tripId}/${suffix}`),
    { timeout: sec(60) }
  )
}

/** Garante coordenadas no browser (Playwright) + última posição no servidor antes de «Iniciar viagem» (gate de proximidade). */
async function syncDriverNearPickupForStart(page: Page, request: APIRequestContext, driverToken: string) {
  await page.context().setGeolocation({ latitude: TRIP_ORIGIN.lat, longitude: TRIP_ORIGIN.lng })
  await refreshDriverLocationNearPickup(request, driverToken)
}

/** Refresca última posição no servidor (o start valida contra isto; gates no backend podem exigir timestamp recente). */
async function refreshDriverLocationNearPickup(request: APIRequestContext, driverToken: string) {
  const locRes = await request.post(`${API}/drivers/location`, {
    headers: {
      Authorization: `Bearer ${driverToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      lat: TRIP_ORIGIN.lat,
      lng: TRIP_ORIGIN.lng,
      timestamp: Date.now(),
    },
  })
  expect(locRes.ok(), `driver location refresh: ${locRes.status()} ${await locRes.text()}`).toBeTruthy()
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

  test.afterEach(async ({ }, testInfo) => {
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
    await leaveDriverHomeStep1IfPresent(driverPage)

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

    await acceptDriverTripFromMap(driverPage, tripId)
    await refreshDriverLocationNearPickup(request, tokens.driver)
    await expect(driverPage.getByRole('button', { name: /iniciar viagem/i })).toBeVisible({
      timeout: sec(60),
    })
    const startBtn = driverPage.getByRole('button', { name: /iniciar viagem/i })
    await expect(startBtn).toBeEnabled({ timeout: sec(45) })
    await refreshDriverLocationNearPickup(request, tokens.driver)
    const arrivingResP = waitForDriverTripPost(driverPage, tripId, 'arriving')
    const startResP = waitForDriverTripPost(driverPage, tripId, 'start')
    await syncDriverNearPickupForStart(driverPage, request, tokens.driver)
    await startBtn.click()
    const arrivingRes = await arrivingResP
    expect(
      arrivingRes.ok(),
      `driver markArriving: ${arrivingRes.status()} ${await arrivingRes.text()}`
    ).toBeTruthy()
    const startRes = await startResP
    expect(
      startRes.ok(),
      `driver startTrip: ${startRes.status()} ${await startRes.text()}`
    ).toBeTruthy()
    await expect
      .poll(
        async () => {
          const r = await request.get(`${API}/driver/trips/${tripId}`, {
            headers: { Authorization: `Bearer ${tokens.driver}` },
          })
          if (!r.ok()) return null
          const d = (await r.json()) as { status?: string }
          return d.status ?? null
        },
        { timeout: sec(120), intervals: pollLook }
      )
      .toBe('ongoing')
    await expect(driverPage.getByRole('button', { name: /terminar viagem/i })).toBeVisible({
      timeout: sec(90),
    })
    await driverPage.getByRole('button', { name: /terminar viagem/i }).click()
    const continuarBtn = driverPage.getByRole('button', { name: /^continuar$/i })
    await expect(continuarBtn).toBeVisible({ timeout: sec(60) })
    await continuarBtn.click()
    await expect
      .poll(
        async () => {
          const hasIdleOrHistory = await driverPage
            .getByText(/à espera de viagens|toca num marcador|histórico/i)
            .first()
            .isVisible()
            .catch(() => false)
          const hasNewOffer = await driverPage
            .getByTestId(/driver-map-offer-/)
            .first()
            .isVisible()
            .catch(() => false)
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
    await expect(passengerPage.getByTestId('app-header-user-compact')).toBeVisible({
      timeout: sec(60),
    })
    await expect(passengerPage.getByTestId('app-header-brand')).toBeVisible({
      timeout: sec(60),
    })
    await expect(passengerPage.getByTestId('app-header-role-pill')).toHaveCount(0)
    await expect(passengerPage.getByTestId('passenger-main')).toBeVisible({
      timeout: sec(45),
    })

    await passengerCtx.close()
    await driverCtx.close()
  })

  test('driver fecha painel e oferta permanece no mapa', async ({ browser, request }) => {
    const { tripId, tokens } = await seedAndCreateTrip(request)
    const driverCtx = await createAuthenticatedContext(browser, tokens, 'driver')
    const driverPage = await driverCtx.newPage()
    trackDriverPageForArtifacts(driverPage)
    await driverPage.goto('/driver', { waitUntil: 'domcontentloaded', timeout: sec(120) })
    await expect(driverPage.getByTestId('app-header-brand')).toBeVisible({ timeout: sec(120) })
    await leaveDriverHomeStep1IfPresent(driverPage)

    const marker = driverPage.getByTestId(`driver-map-offer-${tripId}`)
    const tripStillAvailable = async () => {
      const r = await request.get(`${API}/driver/trips/available`, {
        headers: { Authorization: `Bearer ${tokens.driver}` },
      })
      if (!r.ok()) return false
      const list = (await r.json()) as Array<{ trip_id?: string }>
      return list.some((item) => item.trip_id === tripId)
    }

    await closeDriverOfferPanelFromMap(driverPage, tripId)
    await expect(marker).toBeVisible({ timeout: sec(30) })
    await expect.poll(tripStillAvailable, { timeout: sec(30), intervals: pollLook }).toBe(true)

    await closeDriverOfferPanelFromMap(driverPage, tripId)
    await expect(marker).toBeVisible({ timeout: sec(30) })
    await expect.poll(tripStillAvailable, { timeout: sec(30), intervals: pollLook }).toBe(true)

    await driverCtx.close()
  })

  test('passenger avalia motorista após conclusão', async ({ browser, request }) => {
    const { tripId, tokens } = await seedAndCreateTrip(request)

    const driverCtx = await createAuthenticatedContext(browser, tokens, 'driver')
    const driverPage = await driverCtx.newPage()
    trackDriverPageForArtifacts(driverPage)
    await driverPage.goto('/driver', { waitUntil: 'domcontentloaded', timeout: sec(120) })

    await expect(driverPage.getByTestId('app-header-brand')).toBeVisible({
      timeout: sec(120),
    })
    await leaveDriverHomeStep1IfPresent(driverPage)

    await acceptDriverTripFromMap(driverPage, tripId)
    await refreshDriverLocationNearPickup(request, tokens.driver)
    await expect(driverPage.getByRole('button', { name: /iniciar viagem/i })).toBeVisible({
      timeout: sec(60),
    })
    const startBtn = driverPage.getByRole('button', { name: /iniciar viagem/i })
    await expect(startBtn).toBeEnabled({ timeout: sec(45) })
    await refreshDriverLocationNearPickup(request, tokens.driver)
    const arrivingResP = waitForDriverTripPost(driverPage, tripId, 'arriving')
    const startResP = waitForDriverTripPost(driverPage, tripId, 'start')
    await syncDriverNearPickupForStart(driverPage, request, tokens.driver)
    await startBtn.click()
    const arrivingRes = await arrivingResP
    expect(
      arrivingRes.ok(),
      `driver markArriving: ${arrivingRes.status()} ${await arrivingRes.text()}`
    ).toBeTruthy()
    const startRes = await startResP
    expect(
      startRes.ok(),
      `driver startTrip: ${startRes.status()} ${await startRes.text()}`
    ).toBeTruthy()
    await expect
      .poll(
        async () => {
          const r = await request.get(`${API}/driver/trips/${tripId}`, {
            headers: { Authorization: `Bearer ${tokens.driver}` },
          })
          if (!r.ok()) return null
          const d = (await r.json()) as { status?: string }
          return d.status ?? null
        },
        { timeout: sec(120), intervals: pollLook }
      )
      .toBe('ongoing')
    await expect(driverPage.getByRole('button', { name: /terminar viagem/i })).toBeVisible({
      timeout: sec(90),
    })
    await driverPage.getByRole('button', { name: /terminar viagem/i }).click()

    await expect(driverPage.getByRole('button', { name: /^continuar$/i })).toBeVisible({
      timeout: sec(90),
    })
    await driverPage.getByRole('button', { name: /^continuar$/i }).click()

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
    await expect(driverPage.getByTestId('app-header-brand')).toBeVisible({ timeout: sec(120) })
    await leaveDriverHomeStep1IfPresent(driverPage)

    await openDriverMenu(driverPage)
    // Menu agora é drawer por camadas; preferências estão num screen dedicado.
    await driverPage.getByRole('button', { name: /navegação/i }).click()
    const prefGoogle = driverPage.getByTestId('driver-nav-pref-google')
    await prefGoogle.scrollIntoViewIfNeeded()
    await prefGoogle.click()
    await driverPage.reload({ waitUntil: 'domcontentloaded' })
    await expect(driverPage.getByTestId('app-header-brand')).toBeVisible({ timeout: sec(120) })
    await leaveDriverHomeStep1IfPresent(driverPage)
    await openDriverMenu(driverPage)
    await driverPage.getByRole('button', { name: /navegação/i }).click()
    await expect(driverPage.getByTestId('driver-nav-pref-google')).toBeVisible()

    // Com menu no topo do ecrã, o painel substitui o dashboard — é obrigatório fechar antes de ACEITAR.
    await driverPage.getByTestId('driver-close-menu').click()
    await leaveDriverHomeStep1IfPresent(driverPage)
    await acceptDriverTripFromMap(driverPage, tripId)
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
