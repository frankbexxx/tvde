import { expect, type Page } from '@playwright/test'

export const LOGIN_CONFIG_STUB = {
  beta_mode: true,
  google_oauth_enabled: true,
  google_oauth_client_id: 'cid.apps.googleusercontent.com',
  otp_signup_enabled: false,
}

export async function stubAuthConfigFetch(page: Page) {
  await page.addInitScript((cfg) => {
    const orig = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url.includes('/config') && (init?.method ?? 'GET').toUpperCase() === 'GET') {
        return new Response(JSON.stringify(cfg), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return orig(input, init)
    }
  }, LOGIN_CONFIG_STUB)
}

export async function waitForLoginScreen(page: Page) {
  await expect(page.getByTestId('login-scroll-root')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
}

export async function scrollLoginRootToBottom(page: Page) {
  await page.getByTestId('login-scroll-root').evaluate((el) => {
    el.scrollTop = el.scrollHeight - el.clientHeight
  })
}

export async function expectFooterReachableByScroll(page: Page) {
  const root = page.getByTestId('login-scroll-root')
  const lre = page.getByTestId('lre-link-public')
  const metrics = await root.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }))

  if (metrics.scrollHeight > metrics.clientHeight + 2) {
    await scrollLoginRootToBottom(page)
  }

  await expect(page.getByTestId('login-version-footer')).toBeVisible()
  await expect(page.getByTestId('app-build-label')).toBeInViewport()
  await expect(lre).toBeInViewport()
  await expect(page.getByTestId('ral-caccl-link-public')).toBeInViewport()
  await expect(page.getByTestId('ral-cniacc-link-public')).toBeInViewport()
}

export async function loginE2eBeforeEach(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await stubAuthConfigFetch(page)
}
