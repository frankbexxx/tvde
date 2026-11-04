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

async function padding(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      top: parseFloat(style.paddingTop),
      bottom: parseFloat(style.paddingBottom),
    }
  })
}

async function openScene(page: Page, scene: string, insets: '0' | 'android') {
  const leaked: string[] = []
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text())
  })
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
  await page.goto(`/e2e/fixtures/p1-safe-area.html?scene=${scene}&insets=${insets}`)
  await page.waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0, null, {
    timeout: 20_000,
  }).catch(() => undefined)
  if ((await page.locator('#root').locator('> *').count()) === 0) {
    throw new Error(pageErrors.join('\n') || 'o cenário não renderizou')
  }
  return leaked
}

async function scrollToEnd(locator: Locator) {
  await locator.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
}

test.describe('P1 safe areas isoladas', () => {
  test('login sem insets: marca, formulário e rodapé dentro do ecrã', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const leaked = await openScene(page, 'login', '0')
    const viewport = page.viewportSize()!
    const root = page.getByTestId('login-scroll-root')
    await expect(root).toBeVisible()
    const pad = await padding(root)
    expect(pad.top).toBeCloseTo(16, 0)
    expect(pad.bottom).toBeCloseTo(24, 0)
    fullyInside(await boxOf(page.getByTestId('login-brand')), 0, 0, viewport)
    await scrollToEnd(root)
    for (const locator of [page.locator('#phone'), page.locator('#password'), page.getByRole('button', { name: 'Entrar' }), page.getByTestId('login-version-footer')]) {
      fullyInside(await boxOf(locator), 0, 0, viewport)
    }
    await page.screenshot({ path: 'test-results/p1-safe-area/01-login-zero.png' })
    expect(leaked).toEqual([])
  })

  test('login com insets: marca abaixo da faixa e rodapé acima da barra', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const leaked = await openScene(page, 'login', 'android')
    const viewport = page.viewportSize()!
    const root = page.getByTestId('login-scroll-root')
    const pad = await padding(root)
    expect(pad.top).toBeCloseTo(SIM_TOP, 0)
    expect(pad.bottom).toBeCloseTo(SIM_BOTTOM, 0)
    fullyInside(await boxOf(page.getByTestId('login-brand')), SIM_TOP, 0, viewport)
    await scrollToEnd(root)
    for (const locator of [page.locator('#phone'), page.locator('#password'), page.getByRole('button', { name: 'Entrar' }), page.getByTestId('login-version-footer')]) {
      fullyInside(await boxOf(locator), SIM_TOP, SIM_BOTTOM, viewport)
    }
    await page.screenshot({ path: 'test-results/p1-safe-area/02-login-android.png' })
    expect(leaked).toEqual([])
  })

  test('login com altura reduzida: o scroll chega ao rodapé', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 360 })
    await openScene(page, 'login', 'android')
    const viewport = page.viewportSize()!
    const root = page.getByTestId('login-scroll-root')
    const metrics = await root.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }))
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 8)
    await scrollToEnd(root)
    fullyInside(await boxOf(page.getByTestId('login-version-footer')), SIM_TOP, SIM_BOTTOM, viewport)
    fullyInside(await boxOf(page.getByRole('button', { name: 'Entrar' })), SIM_TOP, SIM_BOTTOM, viewport)
    await page.screenshot({ path: 'test-results/p1-safe-area/03-login-short.png' })
  })

  test('onboarding sem insets: o último botão fica no ecrã depois do scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openScene(page, 'onboarding', '0')
    const viewport = page.viewportSize()!
    const root = page.getByTestId('google-onboarding')
    const pad = await padding(root)
    expect(pad.top).toBeCloseTo(16, 0)
    expect(pad.bottom).toBeCloseTo(16, 0)
    await scrollToEnd(root)
    fullyInside(await boxOf(page.getByTestId('google-onboarding-submit')), 0, 0, viewport)
    await page.screenshot({ path: 'test-results/p1-safe-area/04-onboarding-zero.png' })
  })

  test('onboarding com insets: scroll até ao envio, acima da faixa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openScene(page, 'onboarding', 'android')
    const viewport = page.viewportSize()!
    const root = page.getByTestId('google-onboarding')
    const pad = await padding(root)
    expect(pad.top).toBeCloseTo(SIM_TOP, 0)
    expect(pad.bottom).toBeCloseTo(SIM_BOTTOM, 0)
    fullyInside(await boxOf(page.getByRole('heading').first()), SIM_TOP, 0, viewport)
    await scrollToEnd(root)
    fullyInside(await boxOf(page.getByTestId('google-onboarding-submit')), SIM_TOP, SIM_BOTTOM, viewport)
    await page.screenshot({ path: 'test-results/p1-safe-area/05-onboarding-android.png' })
  })

  test('onboarding com altura reduzida: o scroll chega ao envio', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 360 })
    await openScene(page, 'onboarding', 'android')
    const viewport = page.viewportSize()!
    const root = page.getByTestId('google-onboarding')
    const metrics = await root.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }))
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 8)
    const name = page.getByTestId('google-onboarding-name')
    await name.scrollIntoViewIfNeeded()
    fullyInside(await boxOf(name), SIM_TOP, SIM_BOTTOM, viewport)
    await scrollToEnd(root)
    fullyInside(await boxOf(page.getByTestId('google-onboarding-submit')), SIM_TOP, SIM_BOTTOM, viewport)
    await page.screenshot({ path: 'test-results/p1-safe-area/05b-onboarding-short.png' })
  })

  test('onboarding com teclado simulado por encolhimento do viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openScene(page, 'onboarding', 'android')
    await page.setViewportSize({ width: 390, height: 480 })
    const viewport = page.viewportSize()!
    const root = page.getByTestId('google-onboarding')
    const phone = page.getByTestId('google-onboarding-phone')
    await phone.focus()
    await phone.scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'test-results/p1-safe-area/06-onboarding-keyboard.png' })
    fullyInside(await boxOf(phone), SIM_TOP, SIM_BOTTOM, viewport)
    await scrollToEnd(root)
    fullyInside(await boxOf(page.getByTestId('google-onboarding-submit')), SIM_TOP, SIM_BOTTOM, viewport)
  })

  test('perfil em sheet: padding 24 px sem insets e sem segunda classe', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 844 })
    await openScene(page, 'profile', '0')
    await page.getByRole('button', { name: 'Conta' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const pad = await padding(dialog)
    expect(pad.bottom).toBeCloseTo(24, 0)
    const className = await dialog.getAttribute('class')
    expect(className).not.toContain('safe-area-pb')
    expect(className?.match(/safe-area-inset-bottom/g)?.length).toBe(2)
    await page.screenshot({ path: 'test-results/p1-safe-area/07-profile-sheet-zero.png' })
  })

  test('perfil em sheet: o inset substitui os 24 px, não se soma', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 844 })
    await openScene(page, 'profile', 'android')
    await page.getByRole('button', { name: 'Conta' }).click()
    const dialog = page.getByRole('dialog')
    const pad = await padding(dialog)
    const sheetClass = (await dialog.getAttribute('class')) ?? ''
    console.log(`profile-sheet-pad=${pad.bottom} class=${sheetClass}`)
    await page.screenshot({ path: 'test-results/p1-safe-area/08-profile-sheet-android.png' })
    expect(pad.bottom).toBeCloseTo(SIM_BOTTOM, 0)
    expect(pad.bottom).not.toBeCloseTo(24 + SIM_BOTTOM, 0)
  })

  test('definições em sheet baixo: o último texto fica acima da faixa', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 420 })
    await openScene(page, 'settings', 'android')
    await page.getByTestId('open-settings').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.evaluate((element) => {
      element.getAnimations().forEach((animation) => animation.finish())
    })
    const pad = await padding(dialog)
    expect(pad.bottom).toBeCloseTo(SIM_BOTTOM, 0)
    const metrics = await dialog.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }))
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 8)
    await scrollToEnd(dialog)
    const viewport = page.viewportSize()!
    fullyInside(await boxOf(dialog.locator('p, button').last()), 0, SIM_BOTTOM, viewport)
    fullyInside(
      await boxOf(page.getByTestId('ral-consumidor-gov-link-passenger')),
      0,
      SIM_BOTTOM,
      viewport,
    )
    await page.screenshot({ path: 'test-results/p1-safe-area/09-settings-sheet-short.png' })
  })

  test('perfil móvel em diálogo: pendente de P2, sem fórmula de safe area', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openScene(page, 'profile', 'android')
    await page.getByRole('button', { name: 'Conta' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const className = (await dialog.getAttribute('class')) ?? ''
    const pad = await padding(dialog)
    const box = await boxOf(dialog)
    expect(className).not.toContain('safe-area-inset')
    test.info().annotations.push({
      type: 'pending-p2',
      description: `dialog perfil padding-bottom=${pad.bottom} top=${Math.round(box.y)} bottom=${Math.round(box.y + box.height)}`,
    })
    await page.screenshot({ path: 'test-results/p1-safe-area/10-profile-dialog-mobile.png' })
  })

  test('definições móveis em diálogo: pendente de P2, sem fórmula de safe area', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openScene(page, 'settings', 'android')
    await page.getByTestId('open-settings').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const className = (await dialog.getAttribute('class')) ?? ''
    const pad = await padding(dialog)
    const box = await boxOf(dialog)
    expect(className).not.toContain('safe-area-inset')
    test.info().annotations.push({
      type: 'pending-p2',
      description: `dialog definições padding-bottom=${pad.bottom} top=${Math.round(box.y)} bottom=${Math.round(box.y + box.height)}`,
    })
    await page.screenshot({ path: 'test-results/p1-safe-area/11-settings-dialog-mobile.png' })
  })

  test('admin sem insets: o fundo do conteúdo mantém 16 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const leaked = await openScene(page, 'admin', '0')
    const root = page.getByTestId('admin-page-root')
    await expect(root).toBeVisible()
    const pad = await padding(root)
    expect(pad.bottom).toBeCloseTo(16, 0)
    expect(pad.top).toBeCloseTo(16, 0)
    const headerPad = await padding(page.getByTestId('app-header'))
    expect(headerPad.top).toBeCloseTo(0, 0)
    await page.screenshot({ path: 'test-results/p1-safe-area/12-admin-zero.png' })
    expect(leaked).toEqual([])
  })

  test('admin com insets: a marca fica abaixo da faixa e o fim acima da barra', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openScene(page, 'admin', 'android')
    const viewport = page.viewportSize()!
    const root = page.getByTestId('admin-page-root')
    await expect(root).toBeVisible()
    const pad = await padding(root)
    expect(pad.bottom).toBeCloseTo(SIM_BOTTOM, 0)
    fullyInside(await boxOf(page.getByTestId('app-header-brand')), SIM_TOP, 0, viewport)
    const scroller = page.getByTestId('p1-admin-scroll')
    const metrics = await scroller.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }))
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 8)
    await scrollToEnd(scroller)
    const last = root.locator('nav, p, button').last()
    fullyInside(await boxOf(last), 0, SIM_BOTTOM, viewport)
    await page.screenshot({ path: 'test-results/p1-safe-area/13-admin-android.png' })
  })

  test('admin com altura reduzida: o scroll revela o fim acima da faixa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 320 })
    await openScene(page, 'admin', 'android')
    const viewport = page.viewportSize()!
    const scroller = page.getByTestId('p1-admin-scroll')
    await scrollToEnd(scroller)
    fullyInside(await boxOf(page.getByTestId('admin-page-root').locator('button').last()), 0, SIM_BOTTOM, viewport)
    await page.screenshot({ path: 'test-results/p1-safe-area/14-admin-short.png' })
  })

  test('planeador sem insets: o CTA fica 28 px acima da barra, mapa até ao fundo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openScene(page, 'planner', '0')
    await expect(page.getByTestId('passenger-confirm-trip-cta')).toBeVisible()
    const viewport = page.viewportSize()!
    const stage = await boxOf(page.getByTestId('p1-map'))
    expect(stage.y + stage.height).toBeGreaterThanOrEqual(viewport.height - 1)
    const overlayPadBottom = await page.getByTestId('passenger-confirm-cta-row').evaluate((element) => {
      let node = element.parentElement
      while (node) {
        const bottom = parseFloat(getComputedStyle(node).paddingBottom)
        if (bottom >= 70) return bottom
        node = node.parentElement
      }
      return -1
    })
    expect(overlayPadBottom).toBeCloseTo(80, 0)
    const nav = page.getByRole('navigation')
    const navPad = await padding(nav)
    expect(navPad.bottom).toBeCloseTo(0, 0)
    const ctaPad = await padding(page.getByTestId('passenger-confirm-cta-row'))
    expect(ctaPad.bottom).toBeLessThan(8)
    const cta = await boxOf(page.getByTestId('passenger-confirm-trip-cta'))
    const navBox = await boxOf(nav)
    const gap = navBox.y - (cta.y + cta.height)
    expect(gap).toBeGreaterThan(16)
    expect(gap).toBeLessThan(52)
    await page.screenshot({ path: 'test-results/p1-safe-area/15-planner-zero.png' })
  })

  test('planeador com insets: uma folga de 5rem mais o inset, sem segunda compensação no CTA', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const leaked = await openScene(page, 'planner', 'android')
    const viewport = page.viewportSize()!
    const stage = await boxOf(page.getByTestId('p1-map'))
    expect(stage.y + stage.height).toBeGreaterThanOrEqual(viewport.height - 1)
    const overlayPadBottom = await page.getByTestId('passenger-confirm-cta-row').evaluate((element) => {
      let node = element.parentElement
      while (node) {
        const bottom = parseFloat(getComputedStyle(node).paddingBottom)
        if (bottom >= 70) return bottom
        node = node.parentElement
      }
      return -1
    })
    expect(overlayPadBottom).toBeCloseTo(80 + SIM_BOTTOM, 0)
    const nav = page.getByRole('navigation')
    const navPad = await padding(nav)
    expect(navPad.bottom).toBeCloseTo(SIM_BOTTOM, 0)
    const ctaRow = page.getByTestId('passenger-confirm-cta-row')
    const ctaClass = (await ctaRow.getAttribute('class')) ?? ''
    expect(ctaClass).not.toContain('safe-area')
    const ctaPad = await padding(ctaRow)
    expect(ctaPad.bottom).toBeLessThan(8)
    const cta = await boxOf(page.getByTestId('passenger-confirm-trip-cta'))
    const navBox = await boxOf(nav)
    const gap = navBox.y - (cta.y + cta.height)
    console.log(`planner-android-gap=${Math.round(gap)} overlay=${overlayPadBottom} navH=${Math.round(navBox.height)}`)
    expect(gap).toBeGreaterThan(16)
    expect(gap).toBeLessThan(52)
    fullyInside(cta, 0, navBox.height, viewport)
    await page.screenshot({ path: 'test-results/p1-safe-area/16-planner-android.png' })
    expect(leaked).toEqual([])
  })

  test('planeador baixo: o CTA continua acima da barra', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 360 })
    await openScene(page, 'planner', 'android')
    const sheet = page.getByTestId('passenger-confirm-cta-row').locator('xpath=ancestor::*[@class]').nth(1)
    await sheet.evaluate((element) => {
      const scroller = element.closest('.overflow-y-auto')
      if (scroller) scroller.scrollTop = scroller.scrollHeight
    })
    const cta = await boxOf(page.getByTestId('passenger-confirm-trip-cta'))
    const navBox = await boxOf(page.getByRole('navigation'))
    expect(cta.y + cta.height).toBeLessThanOrEqual(navBox.y + 1)
    await page.screenshot({ path: 'test-results/p1-safe-area/17-planner-short.png' })
  })

  test('mapa do motorista: o inset está só no overlay exterior', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openScene(page, 'driver-map', 'android')
    const stage = page.getByTestId('p1-driver-map')
    await expect(stage).toBeVisible()
    const viewport = page.viewportSize()!
    const stageBox = await boxOf(stage)
    expect(stageBox.y + stageBox.height).toBeGreaterThanOrEqual(viewport.height - 1)
    const inner = page.getByTestId('p1-driver-inner')
    const innerPad = await padding(inner)
    expect(innerPad.bottom).toBeLessThan(16)
    const outer = inner.locator('xpath=..')
    const outerPad = await padding(outer)
    expect(outerPad.bottom).toBeCloseTo(80 + SIM_BOTTOM, 0)
    const notice = await boxOf(page.getByTestId('p1-driver-bottom'))
    const navBox = await boxOf(page.getByRole('navigation'))
    const gap = navBox.y - (notice.y + notice.height)
    test.info().annotations.push({
      type: 'driver-gap',
      description: `gap=${Math.round(gap)} outer=${outerPad.bottom} inner=${innerPad.bottom} nav=${Math.round(navBox.height)}`,
    })
    console.log(`driver-gap=${Math.round(gap)} outer=${outerPad.bottom} inner=${innerPad.bottom} navH=${Math.round(navBox.height)}`)
    await page.screenshot({ path: 'test-results/p1-safe-area/18-driver-map-android.png' })
    expect(gap).toBeGreaterThan(16)
    expect(gap).toBeLessThan(52)
  })
})
