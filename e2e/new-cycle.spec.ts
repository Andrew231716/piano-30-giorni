import { test, expect } from '@playwright/test'
import {
  completedCycleState,
  goToTab,
  openApp,
  readStorage,
} from './helpers'

test('D. Nuovo ciclo: conferma, archivio e persistenza', async ({ page }) => {
  await openApp(page, completedCycleState())
  await expect(page.getByRole('heading', { name: 'Ciclo completato' })).toBeVisible()

  await page.getByRole('button', { name: 'Nuovo ciclo' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nuovo ciclo' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/archivio storico/)).toBeVisible()
  await expect(dialog.getByText(/misurazioni e le giornate azzerate/)).toBeVisible()

  await dialog.getByRole('button', { name: 'Annulla' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Ciclo completato' })).toBeVisible()

  await page.getByRole('button', { name: 'Nuovo ciclo' }).click()
  await page.getByRole('dialog', { name: 'Nuovo ciclo' }).getByRole('button', { name: 'Conferma' }).click()

  await expect(page.getByRole('heading', { name: /Giorno/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ciclo completato' })).toHaveCount(0)

  const after = await readStorage(page)
  expect((after?.cycleArchives as unknown[])?.length).toBe(1)
  expect((after?.dailyLogs as unknown[])?.length ?? 0).toBe(0)
  const weights = (after?.weightEntries as { note?: string }[]) ?? []
  expect(weights.some((w) => w.note === 'Inizio nuovo ciclo')).toBe(true)

  await goToTab(page, 'Progressi')
  await expect(page.getByRole('heading', { name: 'Cicli precedenti' })).toBeVisible()
  await expect(page.getByText(/Nessun ciclo archiviato/)).toHaveCount(0)
  await expect(page.getByText(/Inizio /).first()).toBeVisible()

  await page.reload()
  const persisted = await readStorage(page)
  expect((persisted?.cycleArchives as unknown[])?.length).toBe(1)
  await goToTab(page, 'Progressi')
  await expect(page.getByRole('heading', { name: 'Cicli precedenti' })).toBeVisible()
  await expect(page.getByText(/Nessun ciclo archiviato/)).toHaveCount(0)
})
