/**
 * Contexto Passenger para um admin, sem mudar o papel.
 * A exclusão da própria viagem de um motorista está em pytest
 * (test_passenger_base_capability): o seed não cria um utilizador que seja os dois.
 */
import { test, expect } from '@playwright/test'
import { attachFailureArtifactsIfNeeded, resetFailureArtifactState } from './helpers/failureArtifacts'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173'

const sec = (s: number) => s * 1000

test.describe('Passenger base capability — admin context', () => {
  test.beforeEach(() => {
    resetFailureArtifactState()
  })

  test.afterEach(async ({}, testInfo) => {
    await attachFailureArtifactsIfNeeded(testInfo)
  })

  test('admin abre Passenger e volta ao painel', async ({ browser, request }) => {
    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()

    const tokRes = await request.post(`${API}/dev/tokens`)
    expect(tokRes.ok()).toBeTruthy()
    const tokens = (await tokRes.json()) as { admin: string }

    const legal = await request.post(`${API}/auth/legal-acceptance`, {
      headers: {
        Authorization: `Bearer ${tokens.admin}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ source: 'login_reaccept' }),
    })
    expect(legal.ok(), await legal.text()).toBeTruthy()

    const ctx = await browser.newContext()
    await ctx.addInitScript((token: string) => {
      localStorage.setItem('access_token', token)
      localStorage.setItem('tvde_app_route_role', 'admin')
    }, tokens.admin)

    const page = await ctx.newPage()
    await page.goto(`${BASE_URL}/admin?tab=health`, {
      waitUntil: 'domcontentloaded',
      timeout: sec(120),
    })
    await expect(page.getByRole('heading', { name: 'Saúde do sistema' })).toBeVisible({
      timeout: sec(120),
    })

    await page.getByTestId('context-passenger').click()
    await expect(page.getByTestId('passenger-main')).toBeVisible({ timeout: sec(60) })

    await page.getByTestId('passenger-bottom-nav-menu').click()
    await page.getByTestId('passenger-menu-settings').click()
    await page.getByTestId('context-admin').click()

    await expect(page.getByText('Estado agora')).toBeVisible({ timeout: sec(60) })
    await expect(page.getByText(/Sessão \(JWT\):\s*admin/)).toBeVisible({ timeout: sec(30) })

    await ctx.close()
  })
})
