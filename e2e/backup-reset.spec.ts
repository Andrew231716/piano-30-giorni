import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  goToTab,
  openApp,
  readStorage,
  STORAGE_KEY,
  syntheticOnboardedState,
} from './helpers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.join(__dirname, 'fixtures')

test.describe('E. Backup', () => {
  test('esporta JSON, importa valido e rifiuta invalido', async ({ page }) => {
    await openApp(
      page,
      syntheticOnboardedState({ withArchives: true, withLogs: true }),
    )
    await goToTab(page, 'Profilo')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Esporta JSON' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.json$/)

    const exportPath = path.join(fixtures, '_tmp-export.json')
    await download.saveAs(exportPath)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Importa backup' }).click()
    await page.locator('input[type="file"]').setInputFiles(exportPath)
    await expect(page.getByText('Backup importato correttamente.')).toBeVisible()

    const afterValid = await readStorage(page)
    expect((afterValid?.cycleArchives as unknown[])?.length).toBe(1)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Importa backup' }).click()
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(fixtures, 'invalid-backup.json'))
    await expect(page.getByText(/Import fallito/)).toBeVisible()

    const afterInvalid = await readStorage(page)
    expect((afterInvalid?.cycleArchives as unknown[])?.length).toBe(1)
  })
})

test.describe('F. Reset', () => {
  test('conferma richiesta e cancellazione completa', async ({ page }) => {
    await openApp(
      page,
      syntheticOnboardedState({ withArchives: true, withLogs: true }),
    )
    await goToTab(page, 'Profilo')

    page.once('dialog', (dialog) => {
      expect(dialog.message()).toMatch(/Cancellare definitivamente/)
      dialog.dismiss()
    })
    await page.getByRole('button', { name: 'Cancella tutti i dati' }).click()
    expect(((await readStorage(page))?.cycleArchives as unknown[])?.length).toBe(1)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Cancella tutti i dati' }).click()

    await expect(page.getByRole('heading', { name: 'Piano 30 Giorni' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Inizia' })).toBeVisible()

    const cleared = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    if (cleared) {
      const parsed = JSON.parse(cleared) as {
        profile: { onboarded: boolean }
        cycleArchives: unknown[]
      }
      expect(parsed.profile.onboarded).toBe(false)
      expect(parsed.cycleArchives ?? []).toEqual([])
    }
  })
})
