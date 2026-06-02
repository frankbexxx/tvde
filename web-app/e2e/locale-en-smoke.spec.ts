import { test, expect } from '@playwright/test'

/**
 * Smoke opcional EN — não corre em CI por defeito (Playwright project filter).
 * Local: npx playwright test e2e/locale-en-smoke.spec.ts
 */
test.describe('locale EN smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tvde_locale', 'en')
    })
  })

  test('passenger bottom nav shows English labels', async ({ page }) => {
    await page.goto('/passenger')
    await expect(page.getByTestId('passenger-bottom-nav-home')).toContainText('Home')
    await expect(page.getByTestId('passenger-bottom-nav-history')).toContainText('History')
  })
})
