/**
 * Partner shell — menu tree v2 (hubs Frota/Viagens, Sair, bottom Frota → lista).
 */
import { test, expect } from '@playwright/test'
import { attachFailureArtifactsIfNeeded, resetFailureArtifactState } from './helpers/failureArtifacts'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173'

const sec = (s: number) => s * 1000

test.describe('Partner — menu tree v2', () => {
  test.beforeEach(() => {
    resetFailureArtifactState()
  })

  test.afterEach(async ({ }, testInfo) => {
    await attachFailureArtifactsIfNeeded(testInfo)
  })

  test('Sair, bottom Frota lista, hubs Frota e Viagens', async ({ browser, request }) => {
    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()

    const tokRes = await request.post(`${API}/dev/tokens`)
    expect(tokRes.ok(), await tokRes.text()).toBeTruthy()
    const tokens = (await tokRes.json()) as {
      passenger: string
      driver: string
      admin: string
      partner: string
    }

    const ctx = await browser.newContext()
    await ctx.addInitScript(
      (payload: { passenger: string; driver: string; admin: string; partner: string }) => {
        try {
          localStorage.setItem(
            'tvde_e2e_dev_tokens_json',
            JSON.stringify({
              passenger: payload.passenger,
              driver: payload.driver,
              admin: payload.admin,
              partner: payload.partner,
            })
          )
          localStorage.setItem('tvde_app_route_role', 'partner')
        } catch {
          /* ignore */
        }
      },
      tokens
    )

    const page = await ctx.newPage()
    await page.goto(`${BASE_URL}/partner`, {
      waitUntil: 'domcontentloaded',
      timeout: sec(120),
    })

    await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible({ timeout: sec(120) })
    await expect(page.getByText('Conta (BETA)')).not.toBeVisible()

    await page.getByTestId('partner-bottom-nav-fleet').click()
    const sheet = page.getByTestId('partner-side-menu')
    await expect(sheet).toBeVisible({ timeout: sec(30) })
    await expect(sheet.getByTestId('partner-fleet-drivers-section')).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'Voltar' })).toBeVisible()
    await sheet.getByRole('button', { name: 'Voltar' }).click()
    await expect(sheet.getByRole('button', { name: 'Frota' })).toBeVisible()

    await sheet.getByRole('button', { name: 'Frota' }).click()
    await expect(sheet.getByTestId('partner-fleet-hub')).toBeVisible()
    await expect(sheet.getByTestId('partner-fleet-hub-list')).toBeVisible()

    await sheet.getByRole('button', { name: 'Voltar' }).click()
    await sheet.getByRole('button', { name: 'Viagens' }).click()
    await expect(sheet.getByTestId('partner-trips-hub')).toBeVisible()

    await sheet.getByRole('button', { name: 'Voltar' }).click()
    await expect(sheet.getByTestId('partner-menu-logout')).toBeVisible()

    await ctx.close()
  })
})
