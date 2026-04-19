/**
 * Fluxos só API (sem browser): rápidos e estáveis no CI.
 */
import { test, expect } from '@playwright/test'
import { attachFailureArtifactsIfNeeded, resetFailureArtifactState } from './helpers/failureArtifacts'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000'

const ORIGIN = { lat: 38.7, lng: -9.1 }
const DEST = { lat: 38.75, lng: -9.15 }

test.describe('API flows (sem browser)', () => {
  test.beforeEach(() => {
    resetFailureArtifactState()
  })

  test.afterEach(async ({}, testInfo) => {
    await attachFailureArtifactsIfNeeded(testInfo)
  })

  test('GET /health responde OK', async ({ request }) => {
    const r = await request.get(`${API}/health`)
    expect(r.ok(), await r.text()).toBeTruthy()
    const body = (await r.json()) as { status?: string }
    expect(body.status).toBe('ok')
  })

  test('passageiro cria viagem e cancela (requested)', async ({ request }) => {
    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()

    const tokRes = await request.post(`${API}/dev/tokens`)
    expect(tokRes.ok()).toBeTruthy()
    const tokens = (await tokRes.json()) as { passenger: string }

    const tripRes = await request.post(`${API}/trips`, {
      headers: {
        Authorization: `Bearer ${tokens.passenger}`,
        'Content-Type': 'application/json',
      },
      data: {
        origin_lat: ORIGIN.lat,
        origin_lng: ORIGIN.lng,
        destination_lat: DEST.lat,
        destination_lng: DEST.lng,
      },
    })
    expect(tripRes.ok(), await tripRes.text()).toBeTruthy()
    const { trip_id: tripId } = (await tripRes.json()) as { trip_id: string }

    const cancel = await request.post(`${API}/trips/${tripId}/cancel`, {
      headers: {
        Authorization: `Bearer ${tokens.passenger}`,
        'Content-Type': 'application/json',
      },
      data: { reason: 'e2e api-flows' },
    })
    expect(cancel.ok(), await cancel.text()).toBeTruthy()
    const st = (await cancel.json()) as { status: string }
    expect(st.status).toBe('cancelled')

    const detail = await request.get(`${API}/trips/${tripId}`, {
      headers: { Authorization: `Bearer ${tokens.passenger}` },
    })
    expect(detail.ok()).toBeTruthy()
    const d = (await detail.json()) as { status: string }
    expect(d.status).toBe('cancelled')
  })

  test('motorista offline não vê viagens em /driver/trips/available', async ({ request }) => {
    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()

    const tokRes = await request.post(`${API}/dev/tokens`)
    expect(tokRes.ok()).toBeTruthy()
    const tokens = (await tokRes.json()) as { passenger: string; driver: string }

    const locRes = await request.post(`${API}/drivers/location`, {
      headers: {
        Authorization: `Bearer ${tokens.driver}`,
        'Content-Type': 'application/json',
      },
      data: { lat: ORIGIN.lat, lng: ORIGIN.lng, timestamp: Date.now() },
    })
    expect(locRes.ok(), await locRes.text()).toBeTruthy()

    await request.post(`${API}/driver/status/online`, {
      headers: { Authorization: `Bearer ${tokens.driver}` },
    })

    const tripRes = await request.post(`${API}/trips`, {
      headers: {
        Authorization: `Bearer ${tokens.passenger}`,
        'Content-Type': 'application/json',
      },
      data: {
        origin_lat: ORIGIN.lat,
        origin_lng: ORIGIN.lng,
        destination_lat: DEST.lat,
        destination_lng: DEST.lng,
      },
    })
    expect(tripRes.ok(), await tripRes.text()).toBeTruthy()

    await expect
      .poll(async () => {
        const r = await request.get(`${API}/driver/trips/available`, {
          headers: { Authorization: `Bearer ${tokens.driver}` },
        })
        if (!r.ok()) return 0
        return ((await r.json()) as unknown[]).length
      })
      .toBeGreaterThan(0)

    const off = await request.post(`${API}/driver/status/offline`, {
      headers: { Authorization: `Bearer ${tokens.driver}` },
    })
    expect(off.ok(), await off.text()).toBeTruthy()

    const avail = await request.get(`${API}/driver/trips/available`, {
      headers: { Authorization: `Bearer ${tokens.driver}` },
    })
    expect(avail.ok()).toBeTruthy()
    const list = (await avail.json()) as unknown[]
    expect(list.length).toBe(0)
  })

  test('admin regista nota operacional de pagamento (audit)', async ({ request }) => {
    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()

    const auto = await request.post(`${API}/dev/auto-trip`)
    expect(auto.ok(), await auto.text()).toBeTruthy()
    const { trip_id: tripId } = (await auto.json()) as { trip_id: string }

    const tokRes = await request.post(`${API}/dev/tokens`)
    expect(tokRes.ok()).toBeTruthy()
    const { admin } = (await tokRes.json()) as { admin: string }

    const noteRes = await request.post(`${API}/admin/trips/${tripId}/payment-ops-note`, {
      headers: {
        Authorization: `Bearer ${admin}`,
        'Content-Type': 'application/json',
      },
      data: {
        confirmation: 'REGISTAR_NOTA_PAGAMENTO',
        note: 'Nota e2e — contacto operacional (mín. 3 chars).',
      },
    })
    expect(noteRes.ok(), await noteRes.text()).toBeTruthy()
    const body = (await noteRes.json()) as { status?: string; payment_id?: string }
    expect(body.status).toBe('ok')
    expect(body.payment_id).toBeTruthy()
  })

  test('GET /admin/system-health (JWT admin)', async ({ request }) => {
    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()

    const tokRes = await request.post(`${API}/dev/tokens`)
    expect(tokRes.ok()).toBeTruthy()
    const { admin } = (await tokRes.json()) as { admin: string }

    const r = await request.get(`${API}/admin/system-health`, {
      headers: { Authorization: `Bearer ${admin}` },
    })
    expect(r.ok(), await r.text()).toBeTruthy()
    const body = (await r.json()) as {
      status?: string
      stuck_payments?: unknown[]
      warnings?: unknown[]
    }
    expect(body.status).toMatch(/^(ok|degraded)$/)
    expect(Array.isArray(body.stuck_payments)).toBe(true)
    expect(Array.isArray(body.warnings)).toBe(true)
  })

  test('BETA login inclui display_name (admin seed)', async ({ request }) => {
    const cfg = await request.get(`${API}/config`)
    expect(cfg.ok()).toBeTruthy()
    const { beta_mode: beta } = (await cfg.json()) as { beta_mode?: boolean }
    test.skip(!beta, 'API sem BETA_MODE — login BETA indisponível')

    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()

    const login = await request.post(`${API}/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        phone: '+351900000000',
        password: '123456',
      }),
    })
    expect(login.ok(), await login.text()).toBeTruthy()
    const body = (await login.json()) as { display_name?: string; role?: string }
    expect(body.role).toBe('admin')
    expect(body.display_name).toBe('+351900000000')
  })
})
