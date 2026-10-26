import { test, expect } from '@playwright/test'
import {
  expectFooterReachableByScroll,
  loginE2eBeforeEach,
  waitForLoginScreen,
} from './helpers/loginScreenE2e'

test.describe('login screen mobile UX-LOGIN-MOB-02', () => {
  test.beforeEach(async ({ page }) => {
    await loginE2eBeforeEach(page)
  })

  test('não regista o wrapper login-scroll-center (anti UX-LOGIN-MOB-01)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/passenger')
    await waitForLoginScreen(page)
    await expect(page.getByTestId('login-scroll-center')).toHaveCount(0)
  })

  for (const viewport of [
    { width: 360, height: 640, label: '360x640' },
    { width: 390, height: 844, label: '390x844' },
    { width: 360, height: 520, label: '360x520' },
  ]) {
    test(`rodapé legal alcançável ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/passenger')
      await waitForLoginScreen(page)

      await expect(page.getByTestId('language-selector-compact')).toBeVisible()
      await expect(page.getByTestId('legal-accept-checkbox')).toBeVisible()
      await expect(page.getByTestId('google-sign-in')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()

      await expectFooterReachableByScroll(page)
    })
  }

  test('recuperação de palavra-passe a partir do login', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/passenger')
    await waitForLoginScreen(page)
    await page.getByTestId('forgot-password').click()
    await expect(page.getByTestId('recovery-back')).toBeVisible()
  })

  test('perfil motorista — rodapé alcançável', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto('/driver')
    await waitForLoginScreen(page)
    await expect(page.getByRole('tab', { name: 'Motorista', selected: true })).toBeVisible()
    await expectFooterReachableByScroll(page)
  })
})
