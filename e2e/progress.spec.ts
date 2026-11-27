import { test, expect } from '@playwright/test'
import { goToTab, openApp, syntheticOnboardedState } from './helpers'

test.describe('C. Progressi', () => {
  test('mostra dati, grafici e archivio vuoto', async ({ page }) => {
    await openApp(page, syntheticOnboardedState())
    await goToTab(page, 'Progressi')

    await expect(page.getByRole('heading', { name: 'Progressi' })).toBeVisible()
    await page.getByRole('button', { name: 'Grafici' }).click()
    await expect(page.getByRole('heading', { name: 'Peso (kg)' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Girovita (cm)' })).toBeVisible()
    await expect(page.locator('.chart-wrap').first()).toBeVisible()

    await expect(
      page.getByRole('heading', { name: 'Cicli precedenti' }),
    ).toBeVisible()
    await expect(page.getByText(/Nessun ciclo archiviato/)).toBeVisible()
  })

  test('mostra archivio quando presente', async ({ page }) => {
    await openApp(page, syntheticOnboardedState({ withArchives: true }))
    await goToTab(page, 'Progressi')
    await expect(page.getByText(/Inizio /).first()).toBeVisible()
    await expect(page.getByText(/Archiviato il /).first()).toBeVisible()
  })
})
