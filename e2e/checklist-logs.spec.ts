import { test, expect } from '@playwright/test'
import {
  goToTab,
  openApp,
  readStorage,
  syntheticOnboardedState,
} from './helpers'

test('B. Checklist, note, peso, girovita e persistenza', async ({ page }) => {
  await openApp(page, syntheticOnboardedState())
  await expect(page.getByRole('heading', { name: /Giorno/ })).toBeVisible()

  const firstHabit = page.locator('.check-item').first()
  await firstHabit.click()
  await expect(firstHabit).toHaveAttribute('aria-pressed', 'true')

  await page.getByLabel('Note del giorno').fill('nota-sintetica-e2e')
  await expect(page.getByLabel('Note del giorno')).toHaveValue('nota-sintetica-e2e')

  await page.getByRole('button', { name: 'Registra peso' }).click()
  await page.getByLabel('Peso (kg)').fill('79.2')
  await page.getByRole('dialog', { name: 'Registra peso' }).getByRole('button', { name: 'Salva' }).click()
  await expect(page.getByText('79.2 kg')).toBeVisible()

  await page.getByRole('button', { name: 'Registra girovita' }).click()
  await page.getByLabel('Circonferenza (cm)').fill('90.5')
  await page
    .getByRole('dialog', { name: 'Registra girovita' })
    .getByRole('button', { name: 'Salva' })
    .click()
  await expect(page.getByText('90.5 cm')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Note del giorno')).toHaveValue('nota-sintetica-e2e')
  await expect(page.getByText('79.2 kg')).toBeVisible()
  await expect(page.getByText('90.5 cm')).toBeVisible()
  await expect(page.locator('.check-item').first()).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const stored = await readStorage(page)
  const logs = (stored?.dailyLogs as { notes?: string }[]) ?? []
  expect(logs.length).toBeGreaterThan(0)
  expect(logs.some((l) => l.notes === 'nota-sintetica-e2e')).toBe(true)
  const weights = (stored?.weightEntries as { weightKg: number }[]) ?? []
  expect(weights.some((w) => w.weightKg === 79.2)).toBe(true)
  const waists = (stored?.waistEntries as { waistCm: number }[]) ?? []
  expect(waists.some((w) => w.waistCm === 90.5)).toBe(true)

  await goToTab(page, 'Progressi')
  await expect(page.getByRole('heading', { name: 'Progressi' })).toBeVisible()
})
