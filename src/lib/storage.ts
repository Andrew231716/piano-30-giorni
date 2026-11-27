import type { AppState, UserProfile } from '../types'
import { SCHEMA_VERSION, STORAGE_KEY } from '../types'
import { importBackupJson } from './backupImport'
import { todayIso } from './dates'
import { parseAppState } from './validation'

export const CORRUPT_STORAGE_KEY = `${STORAGE_KEY}.corrupt`

let lastLoadUsedFallback = false

/** True se l’ultimo loadState ha usato i default (JSON assente/corrotto). */
export function didLoadUseFallback(): boolean {
  return lastLoadUsedFallback
}

function preserveCorruptPayload(raw: string): void {
  try {
    localStorage.setItem(CORRUPT_STORAGE_KEY, raw)
  } catch {
    // Quota o storage non disponibile: non bloccare l’avvio.
  }
}

export function createDefaultProfile(): UserProfile {
  return {
    schemaVersion: SCHEMA_VERSION,
    onboarded: false,
    age: 26,
    sexForFormula: 'male',
    heightCm: 180,
    startWeightKg: 88,
    goalWeightKg: 80,
    startDate: todayIso(),
    calorieTargetKcal: 1900,
    proteinTargetG: 130,
    carbsTargetG: 200,
    fatTargetG: 65,
    lunchRoutine: 'home',
    weekendMealsOut: 2,
    sweetsPreference: true,
    health: {
      lumbarDiscHernia: true,
      radiatingLegPain: true,
      previousInguinalHerniaRepair: true,
      clinicianClearedActivity: null,
      allowedActivities: [],
      restrictedMovements: [],
    },
  }
}

export function createDefaultState(): AppState {
  const profile = createDefaultProfile()
  return {
    profile,
    weightEntries: [
      {
        id: crypto.randomUUID(),
        date: profile.startDate,
        weightKg: profile.startWeightKg,
        note: 'Peso iniziale',
      },
    ],
    waistEntries: [],
    dailyLogs: [],
    cycleArchives: [],
  }
}

/**
 * Caricamento localStorage: tollerante a migrazioni V1 e dati storici.
 * In caso di corruzione non cancella la chiave originale; salva una copia
 * di recupero e segnala fallback (il provider evita di sovrascrivere subito).
 */
export function loadState(): AppState {
  lastLoadUsedFallback = false
  const fallback = createDefaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      lastLoadUsedFallback = true
      return fallback
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      preserveCorruptPayload(raw)
      lastLoadUsedFallback = true
      return fallback
    }
    const state = parseAppState(parsed, fallback)
    if (!state) {
      preserveCorruptPayload(raw)
      lastLoadUsedFallback = true
      return fallback
    }
    return state
  } catch {
    lastLoadUsedFallback = true
    return fallback
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(CORRUPT_STORAGE_KEY)
}

export function exportStateJson(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

/**
 * Import manuale rigoroso (nessun fallback silenzioso).
 * Restituisce null se il backup non è accettabile; non scrive su storage.
 */
export function importStateJson(json: string): AppState | null {
  const result = importBackupJson(json)
  return result.ok ? result.state : null
}

export { importBackupJson }

export function exportWeightsCsv(state: AppState): string {
  const lines = ['tipo,data,valore,unita,nota']
  for (const w of state.weightEntries) {
    lines.push(
      `peso,${w.date},${w.weightKg},kg,"${(w.note ?? '').replace(/"/g, '""')}"`,
    )
  }
  for (const w of state.waistEntries) {
    lines.push(
      `girovita,${w.date},${w.waistCm},cm,"${(w.note ?? '').replace(/"/g, '""')}"`,
    )
  }
  return lines.join('\n')
}
