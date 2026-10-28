import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 700 } })

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return !(a.y + a.height <= b.y || b.y + b.height <= a.y || a.x + a.width <= b.x || b.x + b.width <= a.x)
}

test('F11 aviso stale visível em 390x700 sem tapar os controlos', async ({ page }) => {
  await page.goto('/e2e/fixtures/gps-offer-notice-viewport.html?mode=stale')
  const banner = page.getByTestId('driver-gps-offer-notice')
  await expect(banner).toBeVisible()
  await expect(banner).toHaveAttribute('data-gps-reason', 'location_stale')
  await expect(banner).toContainText('Localização indisponível — não estás a receber novas ofertas.')
  const arrived = page.getByRole('button', { name: 'Cheguei' })
  const start = page.getByRole('button', { name: 'Iniciar viagem' })
  await expect(arrived).toBeVisible()
  await expect(start).toBeVisible()
  const bannerBox = await banner.boundingBox()
  const arrivedBox = await arrived.boundingBox()
  const startBox = await start.boundingBox()
  expect(bannerBox).not.toBeNull()
  expect(arrivedBox).not.toBeNull()
  expect(startBox).not.toBeNull()
  if (!bannerBox || !arrivedBox || !startBox) return
  expect(bannerBox.y).toBeGreaterThanOrEqual(0)
  expect(bannerBox.y + bannerBox.height).toBeLessThanOrEqual(700)
  expect(arrivedBox.y + arrivedBox.height).toBeLessThanOrEqual(700)
  expect(boxesOverlap(bannerBox, arrivedBox)).toBe(false)
  expect(boxesOverlap(bannerBox, startBox)).toBe(false)
})

test('F12 aviso desaparece quando a elegibilidade regressa', async ({ page }) => {
  await page.goto('/e2e/fixtures/gps-offer-notice-viewport.html?mode=recovered')
  await expect(page.getByTestId('driver-gps-offer-notice')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cheguei' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Iniciar viagem' })).toBeVisible()
})
