import { expect, test, type Locator, type Page } from '@playwright/test'

const SIM_TOP = 47
const SIM_BOTTOM = 48

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  return box!
}

async function openScene(page: Page, scene: string, insets: '0' | 'android') {
  const leaked: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (url.startsWith('data:') || url.startsWith('blob:')) return
    if (url.includes('127.0.0.1:5173') || url.includes('localhost:5173')) return
    leaked.push(url)
  })
  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.includes('127.0.0.1:5173') ||
      url.includes('localhost:5173')
    ) {
      await route.continue()
      return
    }
    await route.abort('blockedbyclient')
  })
  await page.goto(`/e2e/fixtures/p2-safe-area.html?scene=${scene}&insets=${insets}`)
  await page.waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0, null, {
    timeout: 20_000,
  })
  return leaked
}

async function settle(locator: Locator) {
  await locator.evaluate((element) => {
    element.getAnimations().forEach((animation) => animation.finish())
  })
}

test.describe('P2 diálogos e toasts', () => {
  test('perfil móvel: título e fechar fora da barra de estado', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const leaked = await openScene(page, 'profile', 'android')
    await page.getByRole('button', { name: 'Conta' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await settle(dialog)
    const viewport = page.viewportSize()!
    const dialogBox = await boxOf(dialog)
    const title = await boxOf(dialog.getByRole('heading').first())
    const close = await boxOf(dialog.getByRole('button', { name: 'Close' }))
    const maxHeight = await dialog.evaluate((element) => parseFloat(getComputedStyle(element).maxHeight))
    const limit = viewport.height - SIM_TOP - SIM_BOTTOM
    expect(maxHeight).toBeLessThanOrEqual(Math.min(viewport.height * 0.85, limit) + 1)
    expect(dialogBox.y).toBeGreaterThanOrEqual(SIM_TOP - 1)
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height - SIM_BOTTOM + 1)
    expect(title.y).toBeGreaterThanOrEqual(SIM_TOP - 1)
    expect(close.y).toBeGreaterThanOrEqual(SIM_TOP - 1)
    expect(leaked).toEqual([])
  })

  test('definições móvel: scroll até ao último link, acima da faixa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 420 })
    const leaked = await openScene(page, 'settings', 'android')
    await page.getByTestId('open-settings').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await settle(dialog)
    const viewport = page.viewportSize()!
    const title = await boxOf(dialog.getByRole('heading').first())
    const close = await boxOf(dialog.getByRole('button', { name: 'Close' }))
    expect(title.y).toBeGreaterThanOrEqual(SIM_TOP - 1)
    expect(close.y).toBeGreaterThanOrEqual(SIM_TOP - 1)
    const metrics = await dialog.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }))
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 8)
    await dialog.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    const link = await boxOf(page.getByTestId('ral-consumidor-gov-link-passenger'))
    expect(link.y).toBeGreaterThanOrEqual(SIM_TOP - 1)
    expect(link.y + link.height).toBeLessThanOrEqual(viewport.height - SIM_BOTTOM + 1)
    const pad = await dialog.evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom))
    expect(pad).toBeCloseTo(24, 0)
    expect(leaked).toEqual([])
  })

  test('perfil e definições desktop: sheet sem regressão', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 844 })
    const leaked = await openScene(page, 'profile', '0')
    await page.getByRole('button', { name: 'Conta' }).click()
    const profile = page.getByRole('dialog')
    await expect(profile).toBeVisible()
    await settle(profile)
    const profilePad = await profile.evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom))
    const profileBox = await boxOf(profile)
    expect(profilePad).toBeCloseTo(24, 0)
    expect(profileBox.y + profileBox.height).toBeGreaterThan(700)
    await page.keyboard.press('Escape')
    await page.getByTestId('open-settings').click()
    const settings = page.getByRole('dialog')
    await expect(settings).toBeVisible()
    await settle(settings)
    const settingsPad = await settings.evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom))
    expect(settingsPad).toBeCloseTo(24, 0)
    expect(await settings.getAttribute('class')).not.toContain(MOBILE_SAFE_MARK)
    expect(leaked).toEqual([])
  })

  test('toast no login com insets: acima da faixa, sem a barra da aplicação', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 })
    const leaked = await openScene(page, 'login-toast', 'android')
    await page.getByTestId('show-toast').click()
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible()
    await settle(toast)
    const viewport = page.viewportSize()!
    const box = await boxOf(toast)
    const gap = viewport.height - (box.y + box.height)
    expect(gap).toBeGreaterThanOrEqual(SIM_BOTTOM - 1)
    expect(gap).toBeLessThan(SIM_BOTTOM + 8)
    expect(leaked).toEqual([])
  })

  test('toast no motorista: acima da barra inferior', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const leaked = await openScene(page, 'driver-toast', 'android')
    const nav = page.getByRole('navigation')
    await expect(nav).toBeVisible()
    await page.getByTestId('show-toast').click()
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible()
    await settle(toast)
    const viewport = page.viewportSize()!
    const navBox = await boxOf(nav)
    const toastBox = await boxOf(toast)
    const gap = viewport.height - (toastBox.y + toastBox.height)
    expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(navBox.y + 2)
    expect(Math.abs(gap - navBox.height)).toBeLessThanOrEqual(4)
    expect(gap).toBeLessThan(navBox.height + 12)
    expect(leaked).toEqual([])
  })

  test('insets zero: login fica no afastamento do Sonner e o motorista só na barra', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 })
    let leaked = await openScene(page, 'login-toast', '0')
    await page.getByTestId('show-toast').click()
    const loginToast = page.locator('[data-sonner-toast]').first()
    await expect(loginToast).toBeVisible()
    await settle(loginToast)
    const loginGap = 700 - ((await boxOf(loginToast)).y + (await boxOf(loginToast)).height)
    expect(loginGap).toBeGreaterThanOrEqual(14)
    expect(loginGap).toBeLessThanOrEqual(20)
    expect(leaked).toEqual([])

    leaked = await openScene(page, 'driver-toast', '0')
    const nav = page.getByRole('navigation')
    await expect(nav).toBeVisible()
    await page.getByTestId('show-toast').click()
    const driverToast = page.locator('[data-sonner-toast]').first()
    await expect(driverToast).toBeVisible()
    await settle(driverToast)
    const navBox = await boxOf(nav)
    const toastBox = await boxOf(driverToast)
    const gap = 700 - (toastBox.y + toastBox.height)
    expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(navBox.y + 2)
    expect(Math.abs(gap - navBox.height)).toBeLessThanOrEqual(4)
    expect(gap).toBeLessThan(navBox.height + 12)
    expect(leaked).toEqual([])
  })
})

const MOBILE_SAFE_MARK = '100dvh-max(env(safe-area-inset-top,0px)'
