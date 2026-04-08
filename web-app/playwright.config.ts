import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173'

/**
 * E2E: requer API em http://127.0.0.1:8000 (uvicorn) com /dev/seed e dev tools.
 * Em CI o workflow inicia o backend antes do Playwright; aqui só arranca o Vite com VITE_E2E.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  /** Sem 2× tempo em falhas — o problema era ordem do teste, não flakiness. */
  retries: 0,
  workers: 1,
  /** CI: cold start Vite + 2 browser contexts; sem minutos “em silêncio” (falha rápida se algo está mal). */
  timeout: process.env.CI ? 300_000 : 180_000,
  /** CI: polls no E2E usam até 90s — o default global 60s cortava expect.poll antes do fim. */
  expect: { timeout: process.env.CI ? 120_000 : 25_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'on-first-retry',
    /** Primeiro hit ao Vite (compilação) no CI costuma ser >30s. */
    navigationTimeout: 120_000,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180_000 : 120_000,
    env: {
      ...process.env,
      VITE_E2E: 'true',
      // Browser → API directo (CORS * em dev). Evita depender do proxy /api ↔ localhost no Windows.
      VITE_API_URL: process.env.VITE_API_URL ?? 'http://127.0.0.1:8000',
    },
  },
})
