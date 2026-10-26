import { test, expect } from '@playwright/test'
import {
  expectFooterReachableByScroll,
  loginE2eBeforeEach,
  waitForLoginScreen,
} from './helpers/loginScreenE2e'

test.describe('login screen desktop UX-LOGIN-MOB-02', () => {
  test.beforeEach(async ({ page }) => {
    await loginE2eBeforeEach(page)
  })

  test('1280×720 — rodapé legal visível sem regressão de layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/passenger')
    await waitForLoginScreen(page)

    await expect(page.getByTestId('language-selector-compact')).toBeVisible()
    await expect(page.getByTestId('google-sign-in')).toBeVisible()
    await expect(page.getByTestId('login-scroll-center')).toHaveCount(0)

    await expectFooterReachableByScroll(page)
  })
})
