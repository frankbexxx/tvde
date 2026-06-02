import { test, expect } from '@playwright/test'

/**
 * Smoke opcional EN — não corre em CI por defeito (Playwright project filter).
 * Local: npx playwright test e2e/locale-en-smoke.spec.ts
 */
test.describe('locale EN smoke', () => {
  test('login locale toggle switches to English before sign-in', async ({ page }) => {
    await page.goto('/passenger')
    await page.getByTestId('login-locale-en').click()
    await expect(page.getByText('Sign in with your phone')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Passenger' })).toBeVisible()
  })

  test('passenger bottom nav shows English labels', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tvde_locale', 'en')
    })
    await page.goto('/passenger')
    await expect(page.getByTestId('passenger-bottom-nav-home')).toContainText('Home')
    await expect(page.getByTestId('passenger-bottom-nav-history')).toContainText('History')
  })
})
