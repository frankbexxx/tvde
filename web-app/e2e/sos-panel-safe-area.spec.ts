import { expect, test, type Locator, type Page } from '@playwright/test'

const SIM_TOP = 47
const SIM_BOTTOM = 48

function fullyInside(
  box: { x: number; y: number; width: number; height: number },
  top: number,
  bottom: number,
  viewport: { width: number; height: number },
) {
  expect(box.width).toBeGreaterThan(0)
  expect(box.height).toBeGreaterThan(0)
  expect(box.x).toBeGreaterThanOrEqual(-1)
  expect(box.y).toBeGreaterThanOrEqual(top - 1)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - bottom + 1)
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  return box!
}

async function assertNoExternalRequests(page: Page) {
  const leaked: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (url.startsWith('data:') || url.startsWith('blob:')) return
    if (url.includes('127.0.0.1:5173') || url.includes('localhost:5173')) return
    leaked.push(url)
  })
  return leaked
}

async function openPanel(page: Page, query: string) {
  const leaked = await assertNoExternalRequests(page)
  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (url.includes('127.0.0.1:5173') || url.includes('localhost:5173')) {
      await route.continue()
      return
    }
    await route.abort('blockedbyclient')
  })
  await page.goto(`/e2e/fixtures/sos-panel-viewport.html${query}`)
  await expect(page.getByTestId('emergency-sos-panel')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Emergência' })).toBeVisible()
  await expect(page.getByTestId('emergency-sos-summary')).toBeVisible()
  return leaked
}

test.describe('painel SOS isolado', () => {
  test('insets a zero: título e botões dentro do ecrã, sem padding de sistema', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const leaked = await openPanel(page, '?insets=0&content=short')
    const viewport = page.viewportSize()!
    const frame = page.getByTestId('emergency-sos-safe-frame')
    const padding = await frame.evaluate((element) => {
      const style = getComputedStyle(element)
      return { top: parseFloat(style.paddingTop), bottom: parseFloat(style.paddingBottom) }
    })
    expect(padding.top).toBe(0)
    expect(padding.bottom).toBe(0)

    for (const locator of [
      page.getByRole('heading', { name: 'Emergência' }),
      page.getByTestId('emergency-call-112'),
      page.getByTestId('emergency-share-trip'),
      page.getByTestId('emergency-sos-close'),
    ]) {
      fullyInside(await boxOf(locator), 0, 0, viewport)
    }

    await page.screenshot({ path: 'test-results/sos-safe-area/01-zero-insets.png', fullPage: true })
    expect(leaked).toEqual([])
  })

  test('insets Android simulados: controlos fora das faixas e padding uma vez', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const leaked = await openPanel(page, '?insets=android&content=short')
    const viewport = page.viewportSize()!
    const frame = page.getByTestId('emergency-sos-safe-frame')
    const padding = await frame.evaluate((element) => {
      const style = getComputedStyle(element)
      return { top: parseFloat(style.paddingTop), bottom: parseFloat(style.paddingBottom) }
    })
    expect(padding.top).toBe(SIM_TOP)
    expect(padding.bottom).toBe(SIM_BOTTOM)

    for (const locator of [
      page.getByRole('heading', { name: 'Emergência' }),
      page.getByTestId('emergency-call-112'),
      page.getByTestId('emergency-share-trip'),
      page.getByTestId('emergency-sos-close'),
    ]) {
      fullyInside(await boxOf(locator), SIM_TOP, SIM_BOTTOM, viewport)
    }

    await page.screenshot({ path: 'test-results/sos-safe-area/02-android-insets.png', fullPage: true })
    expect(leaked).toEqual([])
  })

  test('altura reduzida: o scroll revela o fecho acima da faixa inferior', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 360 })
    const leaked = await openPanel(page, '?insets=android&content=short')
    const viewport = page.viewportSize()!
    const scroller = page.getByTestId('emergency-sos-scroll')
    const title = await boxOf(page.getByRole('heading', { name: 'Emergência' }))
    fullyInside(title, SIM_TOP, 0, viewport)

    const metrics = await scroller.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }))
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 8)

    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    const close = await boxOf(page.getByTestId('emergency-sos-close'))
    fullyInside(close, SIM_TOP, SIM_BOTTOM, viewport)
    const call = await boxOf(page.getByTestId('emergency-call-112'))
    fullyInside(call, SIM_TOP, SIM_BOTTOM, viewport)

    await page.screenshot({ path: 'test-results/sos-safe-area/03-short-scroll.png', fullPage: true })
    expect(leaked).toEqual([])
  })

  test('conteúdo longo: o texto fica na área segura e o scroll chega ao fim', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 520 })
    const leaked = await openPanel(page, '?insets=android&content=long')
    const viewport = page.viewportSize()!
    const summary = page.getByTestId('emergency-sos-summary')
    const summaryBox = await boxOf(summary)
    const scrollerBox = await boxOf(page.getByTestId('emergency-sos-scroll'))
    fullyInside(scrollerBox, SIM_TOP, SIM_BOTTOM, viewport)
    expect(summaryBox.y).toBeGreaterThanOrEqual(SIM_TOP - 1)
    expect(summaryBox.x + summaryBox.width).toBeLessThanOrEqual(viewport.width + 1)
    await expect(summary).toContainText('detalhe')

    const scroller = page.getByTestId('emergency-sos-scroll')
    const metrics = await scroller.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }))
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 8)
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    fullyInside(await boxOf(page.getByTestId('emergency-sos-close')), SIM_TOP, SIM_BOTTOM, viewport)
    fullyInside(await boxOf(page.getByTestId('emergency-share-trip')), SIM_TOP, SIM_BOTTOM, viewport)

    await page.screenshot({ path: 'test-results/sos-safe-area/04-long-content.png', fullPage: true })
    expect(leaked).toEqual([])
  })
})
