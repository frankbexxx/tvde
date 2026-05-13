/**
 * Smoke automatizado para itens do painel EXTRA (2026-05-13): download/QR, menu documentos motorista, documentos partner.
 * Som, tema e wake lock permanecem sob verificação manual em dispositivos reais.
 */
import { test, expect, type Page } from '@playwright/test'
import { attachFailureArtifactsIfNeeded, resetFailureArtifactState } from './helpers/failureArtifacts'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173'

const sec = (s: number) => s * 1000

async function openDriverMenu(page: Page) {
  const bottom = page.locator('[data-testid="driver-bottom-nav-menu"]')
  if ((await bottom.count()) > 0 && (await bottom.first().isVisible())) {
    await bottom.first().click()
    return
  }
  await page.getByTestId('driver-open-menu').first().click()
}

test.describe('EXTRA panel — smoke', () => {
  test.beforeEach(() => {
    resetFailureArtifactState()
  })

  test.afterEach(async ({ }, testInfo) => {
    await attachFailureArtifactsIfNeeded(testInfo)
  })

  test('landing /download (QR) visível sem sessão', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(`${BASE_URL}/download`, { waitUntil: 'domcontentloaded', timeout: sec(120) })
    await expect(page.getByRole('heading', { name: 'Continua na app web' })).toBeVisible({
      timeout: sec(30),
    })
    await ctx.close()
  })

  test('motorista: Menu → Documentos mostra painel', async ({ browser, request }) => {
    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()
    const tokRes = await request.post(`${API}/dev/tokens`)
    expect(tokRes.ok(), await tokRes.text()).toBeTruthy()
    const tokens = (await tokRes.json()) as { driver: string }

    const ctx = await browser.newContext()
    await ctx.addInitScript(
      (payload: { driver: string }) => {
        try {
          localStorage.setItem(
            'tvde_e2e_dev_tokens_json',
            JSON.stringify({
              passenger: payload.driver,
              driver: payload.driver,
              admin: payload.driver,
              partner: payload.driver,
            })
          )
          localStorage.setItem('tvde_app_route_role', 'driver')
        } catch {
          /* ignore */
        }
      },
      { driver: tokens.driver }
    )
    const page = await ctx.newPage()
    await page.goto(`${BASE_URL}/driver`, { waitUntil: 'domcontentloaded', timeout: sec(120) })
    const step1 = page.getByTestId('driver-home-step1')
    if (await step1.isVisible().catch(() => false)) {
      const fixed = page.getByTestId('driver-home-step1-continue-fixed')
      const inline = page.getByTestId('driver-home-step1-continue')
      if (await fixed.isVisible().catch(() => false)) await fixed.click()
      else if (await inline.isVisible().catch(() => false)) await inline.click()
    }
    await expect(
      page.getByTestId('driver-open-menu').or(page.getByTestId('driver-bottom-nav-menu')).first()
    ).toBeVisible({ timeout: sec(120) })
    await openDriverMenu(page)
    const sheet = page.getByTestId('driver-side-menu')
    await expect(sheet).toBeVisible({ timeout: sec(30) })
    await sheet.getByRole('button', { name: 'Documentos' }).click()
    await expect(page.getByTestId('driver-menu-documents-panel')).toBeVisible({ timeout: sec(30) })
    await ctx.close()
  })

  test('partner: detalhe motorista — bloco documentos', async ({ browser, request }) => {
    const seed = await request.post(`${API}/dev/seed`)
    expect(seed.ok(), await seed.text()).toBeTruthy()
    const tokRes = await request.post(`${API}/dev/tokens`)
    expect(tokRes.ok(), await tokRes.text()).toBeTruthy()
    const tokens = (await tokRes.json()) as { partner: string }

    const ctx = await browser.newContext()
    await ctx.addInitScript(
      (payload: { partner: string }) => {
        try {
          localStorage.setItem(
            'tvde_e2e_dev_tokens_json',
            JSON.stringify({
              passenger: payload.partner,
              driver: payload.partner,
              admin: payload.partner,
              partner: payload.partner,
            })
          )
          localStorage.setItem('tvde_app_route_role', 'partner')
        } catch {
          /* ignore */
        }
      },
      { partner: tokens.partner }
    )
    const page = await ctx.newPage()
    await page.goto(`${BASE_URL}/partner`, { waitUntil: 'domcontentloaded', timeout: sec(120) })
    await expect(page.getByRole('heading', { name: 'Frota (partner)' })).toBeVisible({
      timeout: sec(120),
    })
    const firstDriver = page.locator('a[href^="/partner/drivers/"]').first()
    await expect(firstDriver).toBeVisible({ timeout: sec(60) })
    await firstDriver.click()
    await expect(page.getByText('Documentos do motorista')).toBeVisible({ timeout: sec(60) })
    await ctx.close()
  })
})
