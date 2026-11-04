import { expect, test, type Locator, type Page } from '@playwright/test'

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  return box!
}

async function openScene(page: Page, scene: string, insets: '0' | 'android' | 'tall') {
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
  await page.goto(`/e2e/fixtures/p3-safe-area.html?scene=${scene}&insets=${insets}`)
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

function insetsOf(kind: '0' | 'android' | 'tall') {
  if (kind === 'android') return { top: 47, bottom: 48 }
  if (kind === 'tall') return { top: 80, bottom: 48 }
  return { top: 0, bottom: 0 }
}

test.describe('P3 avisos e diálogos restantes', () => {
  for (const kind of ['0', 'android', 'tall'] as const) {
    test(`avisos do passageiro ficam abaixo do cabeçalho com insets ${kind}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      const leaked = await openScene(page, 'passenger', kind)
      const { top } = insetsOf(kind)
      const header = await boxOf(page.getByTestId('app-header'))
      const map = await boxOf(page.getByTestId('passenger-map-stage'))
      const errorNotice = await boxOf(page.getByTestId('passenger-error-notice'))
      const historyNotice = await boxOf(page.getByTestId('passenger-history-notice'))
      const dismiss = await boxOf(page.getByRole('button', { name: 'Fechar mensagem de erro' }))
      expect(header.height).toBeGreaterThan(top + 24)
      expect(errorNotice.y).toBeGreaterThanOrEqual(header.y + header.height - 1)
      expect(historyNotice.y).toBeGreaterThanOrEqual(errorNotice.y + errorNotice.height - 1)
      expect(dismiss.y).toBeGreaterThanOrEqual(header.y + header.height - 1)
      expect(map.y).toBeGreaterThanOrEqual(header.y + header.height - 1)
      expect(map.height).toBeGreaterThan(320)
      expect(map.y + map.height).toBeGreaterThan(errorNotice.y + errorNotice.height)
      expect(leaked).toEqual([])
    })
  }

  test('diálogo longo do motorista faz scroll e mantém o fechar acima da barra', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 640 })
    const leaked = await openScene(page, 'driver', 'android')
    const dialog = page.getByTestId('driver-history-trip-detail')
    await expect(dialog).toBeVisible()
    await settle(dialog)
    const viewport = page.viewportSize()!
    const dialogBox = await boxOf(dialog)
    const title = await boxOf(dialog.getByRole('heading').first())
    const close = await boxOf(dialog.getByRole('button', { name: 'Close' }))
    const maxHeight = await dialog.evaluate((element) => parseFloat(getComputedStyle(element).maxHeight))
    const limit = viewport.height - 47 - 48
    expect(maxHeight).toBeLessThanOrEqual(Math.min(viewport.height * 0.85, limit) + 1)
    expect(dialogBox.y).toBeGreaterThanOrEqual(46)
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height - 48 + 1)
    expect(title.y).toBeGreaterThanOrEqual(46)
    expect(close.y).toBeGreaterThanOrEqual(46)
    const scroller = page.getByTestId('dialog-safe-scroll')
    const before = await scroller.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }))
    expect(before.scrollHeight).toBeGreaterThan(before.clientHeight + 8)
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    const last = await boxOf(page.getByTestId('driver-history-last'))
    const closeAfter = await boxOf(dialog.getByRole('button', { name: 'Close' }))
    expect(last.y + last.height).toBeLessThanOrEqual(viewport.height - 48 + 1)
    expect(closeAfter.y).toBeGreaterThanOrEqual(46)
    expect(closeAfter.y).toBeLessThan(dialogBox.y + 40)
    expect(leaked).toEqual([])
  })

  test('diálogo admin no desktop mantém o miolo e o fechar dentro da caixa', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const leaked = await openScene(page, 'admin', '0')
    await page.getByRole('button', { name: 'Aprovar' }).click()
    const dialog = page.getByTestId('admin-pending-approve-dialog')
    await expect(dialog).toBeVisible()
    await settle(dialog)
    const viewport = page.viewportSize()!
    const dialogBox = await boxOf(dialog)
    const close = await boxOf(dialog.getByRole('button', { name: 'Close' }))
    const confirm = await boxOf(page.getByTestId('admin-pending-approve-confirm'))
    const paddingBottom = await dialog.evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom))
    const maxHeight = await dialog.evaluate((element) => parseFloat(getComputedStyle(element).maxHeight))
    expect(paddingBottom).toBeGreaterThanOrEqual(23)
    expect(paddingBottom).toBeLessThanOrEqual(25)
    expect(maxHeight).toBeLessThanOrEqual(viewport.height * 0.85 + 1)
    expect(dialogBox.height).toBeLessThan(viewport.height * 0.55)
    expect(dialogBox.y).toBeGreaterThan(80)
    expect(close.y).toBeGreaterThanOrEqual(dialogBox.y)
    expect(close.y).toBeLessThan(dialogBox.y + 40)
    expect(confirm.y + confirm.height).toBeLessThanOrEqual(dialogBox.y + dialogBox.height + 1)
    expect(leaked).toEqual([])
  })

  test('diálogo do parceiro em altura reduzida mantém o último controlo acima da faixa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 280 })
    const leaked = await openScene(page, 'partner', 'android')
    await page.getByTestId('partner-driver-remove-from-fleet').click()
    const dialog = page.getByTestId('partner-driver-remove-dialog')
    await expect(dialog).toBeVisible()
    await settle(dialog)
    const viewport = page.viewportSize()!
    const dialogBox = await boxOf(dialog)
    const title = await boxOf(dialog.getByRole('heading').first())
    const close = await boxOf(dialog.getByRole('button', { name: 'Close' }))
    expect(dialogBox.y).toBeGreaterThanOrEqual(46)
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height - 48 + 1)
    expect(title.y).toBeGreaterThanOrEqual(46)
    expect(close.y).toBeGreaterThanOrEqual(46)
    const scroller = page.getByTestId('dialog-safe-scroll')
    const metrics = await scroller.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }))
    if (metrics.scrollHeight > metrics.clientHeight + 8) {
      await scroller.evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
    }
    const confirm = await boxOf(page.getByTestId('partner-driver-remove-confirm'))
    const closeAfter = await boxOf(dialog.getByRole('button', { name: 'Close' }))
    expect(confirm.y + confirm.height).toBeLessThanOrEqual(viewport.height - 48 + 1)
    expect(confirm.y).toBeGreaterThanOrEqual(46)
    expect(closeAfter.y).toBeGreaterThanOrEqual(46)
    expect(closeAfter.y).toBeLessThan(dialogBox.y + 40)
    expect(leaked).toEqual([])
  })
})
