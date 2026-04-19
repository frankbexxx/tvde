/**
 * Painel admin — tab Saúde consome GET /admin/system-health (browser + Vite E2E).
 * Complementa `api-flows.spec.ts` (só HTTP).
 */
import { test, expect } from '@playwright/test'
import { attachFailureArtifactsIfNeeded, resetFailureArtifactState } from './helpers/failureArtifacts'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173'

const sec = (s: number) => s * 1000

test.describe('Admin — tab Saúde (system-health UI)', () => {
  test.beforeEach(() => {
    resetFailureArtifactState()
  })

  test.afterEach(async ({}, testInfo) => {
    await attachFailureArtifactsIfNeeded(testInfo)
  })

  test('mostra Saúde do sistema e status ok ou degraded', async ({ browser, request }) => {
    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()

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
    await page.goto(`${BASE_URL}/admin?tab=health`, {
      waitUntil: 'domcontentloaded',
      timeout: sec(120),
    })

    await expect(page.getByRole('heading', { name: 'Saúde do sistema' })).toBeVisible({
      timeout: sec(120),
    })
    await expect(page.getByRole('button', { name: 'Atualizar' })).toBeVisible({ timeout: sec(30) })
    await expect(page.getByText(/Status:\s*(ok|degraded)/)).toBeVisible({ timeout: sec(90) })

    await ctx.close()
  })
})
