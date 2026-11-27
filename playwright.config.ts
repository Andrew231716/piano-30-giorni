import { defineConfig, devices } from '@playwright/test'

/**
 * E2E isolati su Chromium con server Vite locale.
 * Non puntano mai alla produzione.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    // Evita di riusare un Vite avviato da un’altra cartella/copia del progetto.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
