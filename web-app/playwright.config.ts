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
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 25_000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_E2E: 'true',
      // Browser → API directo (CORS * em dev). Evita depender do proxy /api ↔ localhost no Windows.
      VITE_API_URL: process.env.VITE_API_URL ?? 'http://127.0.0.1:8000',
    },
  },
})
