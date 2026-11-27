import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  goToTab,
  openApp,
  readStorage,
  syntheticOnboardedState,
} from './helpers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.join(__dirname, 'fixtures')

async function importFile(page: import('@playwright/test').Page, filePath: string) {
  await page.getByRole('button', { name: 'Importa backup' }).click()
  await page.locator('input[type="file"]').setInputFiles(filePath)
}

test.describe('V1.3 Secure import', () => {
  test('1. importa backup V1 valido con migrazione archivi', async ({ page }) => {
    await openApp(page, syntheticOnboardedState({ withArchives: true }))
    await goToTab(page, 'Profilo')

    page.once('dialog', (dialog) => dialog.accept())
    await importFile(page, path.join(fixtures, 'backup-v1-valid.json'))
    await expect(page.getByText('Backup importato correttamente.')).toBeVisible()

    const stored = await readStorage(page)
    expect((stored?.profile as { age?: number })?.age).toBe(30)
    expect((stored?.cycleArchives as unknown[]) ?? []).toEqual([])
    expect(
      ((stored?.waistEntries as { waistCm: number }[]) ?? []).some((w) => w.waistCm === 94),
    ).toBe(true)
  })

  test('2. importa backup V2 valido con archivi', async ({ page }) => {
    await openApp(page, syntheticOnboardedState())
    await goToTab(page, 'Profilo')

    page.once('dialog', (dialog) => dialog.accept())
    await importFile(page, path.join(fixtures, 'backup-v2-valid.json'))
    await expect(page.getByText('Backup importato correttamente.')).toBeVisible()

    const stored = await readStorage(page)
    expect((stored?.profile as { age?: number })?.age).toBe(31)
    expect((stored?.cycleArchives as unknown[])?.length).toBe(1)
  })

  test('3. rifiuta JSON invalido senza alterare i dati', async ({ page }) => {
    await openApp(
      page,
      syntheticOnboardedState({ withArchives: true, withLogs: true }),
    )
    await goToTab(page, 'Profilo')

    // Nessuna conferma: validazione fallisce prima.
    await importFile(page, path.join(fixtures, 'invalid-backup.json'))
    await expect(page.getByText(/non è un JSON valido/)).toBeVisible()
    await expect(page.getByText(/non sono stati modificati/)).toBeVisible()

    const stored = await readStorage(page)
    expect((stored?.cycleArchives as unknown[])?.length).toBe(1)
    expect((stored?.profile as { age?: number })?.age).toBe(30)
  })

  test('4. rifiuta JSON valido ma incompleto', async ({ page }) => {
    await openApp(page, syntheticOnboardedState({ withArchives: true }))
    await goToTab(page, 'Profilo')

    await importFile(page, path.join(fixtures, 'backup-incomplete.json'))
    await expect(page.getByText(/manca il profilo/)).toBeVisible()
    await expect(page.getByText(/non sono stati modificati/)).toBeVisible()

    const stored = await readStorage(page)
    expect((stored?.cycleArchives as unknown[])?.length).toBe(1)
  })

  test('5. dopo errore i dati precedenti restano disponibili', async ({ page }) => {
    await openApp(
      page,
      syntheticOnboardedState({ withArchives: true, withLogs: true }),
    )
    await goToTab(page, 'Profilo')
    await importFile(page, path.join(fixtures, 'backup-incomplete.json'))
    await expect(page.getByText(/non sono stati modificati/)).toBeVisible()

    await goToTab(page, 'Progressi')
    await expect(page.getByRole('heading', { name: 'Cicli precedenti' })).toBeVisible()
    await expect(page.getByText(/Inizio /).first()).toBeVisible()
    await expect(page.getByText(/Nessun ciclo archiviato/)).toHaveCount(0)
  })
})
