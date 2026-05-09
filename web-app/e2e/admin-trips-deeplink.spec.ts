/**
 * Admin — deep link `?tab=trips&tripId=…` (+ histórico quando a viagem já não está activa).
 */
import { test, expect } from '@playwright/test'
import { attachFailureArtifactsIfNeeded, resetFailureArtifactState } from './helpers/failureArtifacts'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173'

const sec = (s: number) => s * 1000

test.describe('Admin — deep link viagens (tripId + histórico)', () => {
  test.beforeEach(() => {
    resetFailureArtifactState()
  })

  test.afterEach(async ({}, testInfo) => {
    await attachFailureArtifactsIfNeeded(testInfo)
  })

  test('abre tab Viagens com tripId na URL e mostra a viagem no histórico', async ({ browser, request }) => {
    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()

    const auto = await request.post(`${API}/dev/auto-trip`)
    expect(auto.ok(), await auto.text()).toBeTruthy()
    const { trip_id: tripId } = (await auto.json()) as { trip_id: string }
    expect(tripId.length).toBeGreaterThan(10)

    const tokRes = await request.post(`${API}/dev/tokens`)
    expect(tokRes.ok()).toBeTruthy()
    const tokens = (await tokRes.json()) as { passenger: string; driver: string; admin: string }

    const ctx = await browser.newContext()
    await ctx.addInitScript(
      (json: string) => {
        try {
          localStorage.setItem('tvde_e2e_dev_tokens_json', json)
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

    const page = await ctx.newPage()
    const q = new URLSearchParams({
      tab: 'trips',
      tripId,
      tripsList: 'history',
    })
    await page.goto(`${BASE_URL}/admin?${q.toString()}`, {
      waitUntil: 'domcontentloaded',
      timeout: sec(120),
    })

    await expect(page.getByRole('heading', { name: 'Viagens' })).toBeVisible({ timeout: sec(120) })

    const shortId = tripId.slice(0, 8)
    await expect(page.getByText(new RegExp(`${shortId}…`))).toBeVisible({ timeout: sec(90) })

    const histBtn = page.getByRole('button', { name: 'Histórico' })
    await expect(histBtn).toBeVisible({ timeout: sec(30) })

    await ctx.close()
  })
})
