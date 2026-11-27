import { expect, type Page } from '@playwright/test'

export const STORAGE_KEY = 'piano30.state.v1'

export type SeedState = Record<string, unknown>

/** Date locale YYYY-MM-DD (niente UTC da toISOString). */
export function toLocalIso(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return toLocalIso(d)
}

export function todayIso(): string {
  return toLocalIso(new Date())
}

/**
 * Carica l’app con storage isolato.
 * Il seed viene applicato una sola volta (flag in sessionStorage), così i
 * reload successivi conservano le modifiche del test e non ripristinano il seed.
 */
export async function openApp(page: Page, state?: SeedState | null) {
  const seedToken = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`
  await page.addInitScript(
    ({ key, value, token }) => {
      const flag = '__piano30_e2e_seed__'
      if (window.sessionStorage.getItem(flag) === token) return
      window.sessionStorage.setItem(flag, token)
      if (value == null) {
        window.localStorage.removeItem(key)
      } else {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    },
    { key: STORAGE_KEY, value: state ?? null, token: seedToken },
  )
  await page.goto('/')
}

/** Profilo onboarded sintetico (nessun dato personale reale). */
export function syntheticOnboardedState(overrides: {
  startDate?: string
  withLogs?: boolean
  withArchives?: boolean
} = {}): SeedState {
  const startDate = overrides.startDate ?? todayIso()
  const today = todayIso()

  return {
    profile: {
      schemaVersion: 2,
      onboarded: true,
      age: 30,
      sexForFormula: 'unspecified',
      heightCm: 175,
      startWeightKg: 80,
      goalWeightKg: 75,
      startDate,
      calorieTargetKcal: 1900,
      proteinTargetG: 120,
      carbsTargetG: 200,
      fatTargetG: 60,
      lunchRoutine: 'home',
      weekendMealsOut: 1,
      sweetsPreference: false,
      health: {
        lumbarDiscHernia: false,
        radiatingLegPain: false,
        previousInguinalHerniaRepair: false,
        clinicianClearedActivity: null,
        allowedActivities: [],
        restrictedMovements: [],
        notes: 'dato-sintetico-e2e',
      },
    },
    weightEntries: [
      {
        id: 'e2e-weight-1',
        date: startDate,
        weightKg: 80,
        note: 'Peso iniziale',
      },
      {
        id: 'e2e-weight-2',
        date: today,
        weightKg: 79.5,
        note: 'Misura test',
      },
    ],
    waistEntries: [
      {
        id: 'e2e-waist-1',
        date: startDate,
        waistCm: 92,
      },
    ],
    dailyLogs: overrides.withLogs
      ? [
          {
            date: today,
            dayNumber: 1,
            habits: {
              portions: true,
              protein: true,
              fruitVegetables: false,
              sweetsManaged: false,
              hydration: false,
              restAndAllowedActivity: false,
            },
            dayStatus: 'partial',
            notes: 'nota-e2e',
          },
        ]
      : [],
    cycleArchives: overrides.withArchives
      ? [
          {
            id: 'e2e-archive-1',
            archivedAt: isoDaysAgo(1),
            profile: {
              schemaVersion: 2,
              onboarded: true,
              age: 30,
              sexForFormula: 'unspecified',
              heightCm: 175,
              startWeightKg: 82,
              goalWeightKg: 75,
              startDate: isoDaysAgo(45),
              calorieTargetKcal: 1900,
              proteinTargetG: 120,
              carbsTargetG: 200,
              fatTargetG: 60,
              lunchRoutine: 'home',
              weekendMealsOut: 1,
              sweetsPreference: false,
              health: {
                lumbarDiscHernia: false,
                radiatingLegPain: false,
                previousInguinalHerniaRepair: false,
                clinicianClearedActivity: null,
                allowedActivities: [],
                restrictedMovements: [],
              },
            },
            weightEntries: [
              {
                id: 'arch-w1',
                date: isoDaysAgo(45),
                weightKg: 82,
                note: 'Archivio',
              },
            ],
            waistEntries: [],
            dailyLogs: [],
          },
        ]
      : [],
  }
}

/** Stato con ciclo già concluso (startDate > 30 giorni fa) per test nuovo ciclo. */
export function completedCycleState(): SeedState {
  return syntheticOnboardedState({
    startDate: isoDaysAgo(35),
    withLogs: true,
  })
}

export async function completeOnboarding(page: Page) {
  await openApp(page, null)
  await expect(page.getByRole('heading', { name: 'Piano 30 Giorni' })).toBeVisible()
  await page.getByRole('button', { name: 'Inizia' }).click()
  await page.getByLabel('Età').fill('28')
  await page.getByLabel('Altezza (cm)').fill('178')
  await page.getByLabel('Peso iniziale (kg)').fill('82')
  await page.getByLabel('Obiettivo di lungo periodo (kg)').fill('76')
  await page.getByRole('button', { name: 'Continua' }).click()
  await page.getByRole('button', { name: 'Continua' }).click()
  await page.getByRole('button', { name: 'Avvia il percorso' }).click()
  await expect(page.getByRole('heading', { name: /Giorno|Ancora|Ciclo/ })).toBeVisible()
}

export async function goToTab(page: Page, label: string) {
  const bottom = page.locator('nav.bottom-nav').getByRole('button', { name: label })
  const side = page.locator('aside.side-nav').getByRole('button', { name: label })
  if (await bottom.isVisible().catch(() => false)) {
    await bottom.click()
    return
  }
  await side.click()
}

export async function readStorage(page: Page): Promise<SeedState | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as SeedState
  }, STORAGE_KEY)
}
