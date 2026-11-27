import type {
  AppState,
  CycleArchive,
  DailyLog,
  Habits,
  HealthProfile,
  UserProfile,
  WaistEntry,
  WeightEntry,
} from '../types'
import { SCHEMA_VERSION } from '../types'
import { validateDate } from './validation'

export type ImportResult =
  | { ok: true; state: AppState }
  | { ok: false; error: string }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isWithin(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max
}

function fail(error: string): ImportResult {
  return { ok: false, error }
}

function requireArray(
  value: unknown,
  missingMessage: string,
  typeMessage: string,
): unknown[] | string {
  if (value === undefined) return missingMessage
  if (!Array.isArray(value)) return typeMessage
  return value
}

function parseStrictHabits(raw: unknown): Habits | string {
  if (!isObject(raw)) return 'Il backup contiene una checklist malformata.'
  const keys = [
    'portions',
    'protein',
    'fruitVegetables',
    'sweetsManaged',
    'hydration',
    'restAndAllowedActivity',
  ] as const
  for (const key of keys) {
    if (!isBoolean(raw[key])) {
      return 'Il backup contiene una checklist malformata.'
    }
  }
  return {
    portions: raw.portions as boolean,
    protein: raw.protein as boolean,
    fruitVegetables: raw.fruitVegetables as boolean,
    sweetsManaged: raw.sweetsManaged as boolean,
    hydration: raw.hydration as boolean,
    restAndAllowedActivity: raw.restAndAllowedActivity as boolean,
  }
}

function parseStrictHealth(raw: unknown): HealthProfile | string {
  if (!isObject(raw)) return 'Il backup è incompleto: manca il profilo.'
  if (!isBoolean(raw.lumbarDiscHernia)) {
    return 'Il backup contiene dati sanitari non validi.'
  }
  if (!isBoolean(raw.radiatingLegPain)) {
    return 'Il backup contiene dati sanitari non validi.'
  }
  if (!isBoolean(raw.previousInguinalHerniaRepair)) {
    return 'Il backup contiene dati sanitari non validi.'
  }
  if (
    raw.clinicianClearedActivity !== true &&
    raw.clinicianClearedActivity !== false &&
    raw.clinicianClearedActivity !== null
  ) {
    return 'Il backup contiene dati sanitari non validi.'
  }
  if (!Array.isArray(raw.allowedActivities) || !raw.allowedActivities.every(isString)) {
    return 'Il backup contiene dati sanitari non validi.'
  }
  if (
    !Array.isArray(raw.restrictedMovements) ||
    !raw.restrictedMovements.every(isString)
  ) {
    return 'Il backup contiene dati sanitari non validi.'
  }
  if (raw.notes !== undefined && !isString(raw.notes)) {
    return 'Il backup contiene dati sanitari non validi.'
  }
  return {
    lumbarDiscHernia: raw.lumbarDiscHernia,
    radiatingLegPain: raw.radiatingLegPain,
    previousInguinalHerniaRepair: raw.previousInguinalHerniaRepair,
    clinicianClearedActivity: raw.clinicianClearedActivity,
    allowedActivities: [...raw.allowedActivities],
    restrictedMovements: [...raw.restrictedMovements],
    notes: isString(raw.notes) ? raw.notes : undefined,
  }
}

function parseStrictProfile(raw: unknown): UserProfile | string {
  if (raw === undefined || raw === null) {
    return 'Il backup è incompleto: manca il profilo.'
  }
  if (!isObject(raw)) return 'Il backup è incompleto: manca il profilo.'

  if (!isBoolean(raw.onboarded)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isWithin(raw.age, 14, 100)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (
    raw.sexForFormula !== 'male' &&
    raw.sexForFormula !== 'female' &&
    raw.sexForFormula !== 'unspecified'
  ) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isWithin(raw.heightCm, 100, 250)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isWithin(raw.startWeightKg, 30, 300)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isWithin(raw.goalWeightKg, 30, 300)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isString(raw.startDate) || validateDate(raw.startDate)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isWithin(raw.calorieTargetKcal, 800, 6000)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isWithin(raw.proteinTargetG, 0, 500)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isWithin(raw.carbsTargetG, 0, 800)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isWithin(raw.fatTargetG, 0, 400)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (raw.lunchRoutine !== 'home' && raw.lunchRoutine !== 'other') {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isWithin(raw.weekendMealsOut, 0, 14)) {
    return 'Il backup contiene un profilo non valido.'
  }
  if (!isBoolean(raw.sweetsPreference)) {
    return 'Il backup contiene un profilo non valido.'
  }

  const health = parseStrictHealth(raw.health)
  if (typeof health === 'string') return health

  return {
    schemaVersion: SCHEMA_VERSION,
    onboarded: raw.onboarded,
    age: raw.age,
    sexForFormula: raw.sexForFormula,
    heightCm: raw.heightCm,
    startWeightKg: raw.startWeightKg,
    goalWeightKg: raw.goalWeightKg,
    startDate: raw.startDate,
    calorieTargetKcal: raw.calorieTargetKcal,
    proteinTargetG: raw.proteinTargetG,
    carbsTargetG: raw.carbsTargetG,
    fatTargetG: raw.fatTargetG,
    lunchRoutine: raw.lunchRoutine,
    weekendMealsOut: raw.weekendMealsOut,
    sweetsPreference: raw.sweetsPreference,
    health,
  }
}

function parseStrictWeightEntries(raw: unknown): WeightEntry[] | string {
  const arr = requireArray(
    raw,
    'Il backup è incompleto: mancano le misurazioni del peso.',
    'Il backup contiene misurazioni non valide.',
  )
  if (typeof arr === 'string') return arr

  const entries: WeightEntry[] = []
  for (const item of arr) {
    if (!isObject(item)) return 'Il backup contiene misurazioni non valide.'
    if (!isString(item.id) || item.id.length === 0) {
      return 'Il backup contiene misurazioni non valide.'
    }
    if (!isString(item.date) || validateDate(item.date)) {
      return 'Il backup contiene misurazioni non valide.'
    }
    if (!isWithin(item.weightKg, 30, 300)) {
      return 'Il backup contiene misurazioni non valide.'
    }
    if (item.note !== undefined && !isString(item.note)) {
      return 'Il backup contiene misurazioni non valide.'
    }
    entries.push({
      id: item.id,
      date: item.date,
      weightKg: item.weightKg,
      note: isString(item.note) ? item.note : undefined,
    })
  }
  return entries
}

function parseStrictWaistEntries(raw: unknown): WaistEntry[] | string {
  const arr = requireArray(
    raw,
    'Il backup è incompleto: mancano le misurazioni del girovita.',
    'Il backup contiene misurazioni non valide.',
  )
  if (typeof arr === 'string') return arr

  const entries: WaistEntry[] = []
  for (const item of arr) {
    if (!isObject(item)) return 'Il backup contiene misurazioni non valide.'
    if (!isString(item.id) || item.id.length === 0) {
      return 'Il backup contiene misurazioni non valide.'
    }
    if (!isString(item.date) || validateDate(item.date)) {
      return 'Il backup contiene misurazioni non valide.'
    }
    if (!isWithin(item.waistCm, 40, 200)) {
      return 'Il backup contiene misurazioni non valide.'
    }
    if (item.note !== undefined && !isString(item.note)) {
      return 'Il backup contiene misurazioni non valide.'
    }
    entries.push({
      id: item.id,
      date: item.date,
      waistCm: item.waistCm,
      note: isString(item.note) ? item.note : undefined,
    })
  }
  return entries
}

function parseStrictDailyLogs(raw: unknown): DailyLog[] | string {
  const arr = requireArray(
    raw,
    'Il backup è incompleto: mancano le registrazioni giornaliere.',
    'Il backup contiene registrazioni giornaliere non valide.',
  )
  if (typeof arr === 'string') return arr

  const logs: DailyLog[] = []
  for (const item of arr) {
    if (!isObject(item)) {
      return 'Il backup contiene registrazioni giornaliere non valide.'
    }
    if (!isString(item.date) || validateDate(item.date)) {
      return 'Il backup contiene registrazioni giornaliere non valide.'
    }
    if (!isWithin(item.dayNumber, 0, 30)) {
      return 'Il backup contiene registrazioni giornaliere non valide.'
    }
    const habits = parseStrictHabits(item.habits)
    if (typeof habits === 'string') return habits
    if (
      item.dayStatus !== 'completed' &&
      item.dayStatus !== 'partial' &&
      item.dayStatus !== 'not-started'
    ) {
      return 'Il backup contiene registrazioni giornaliere non valide.'
    }
    if (item.mealsOut !== undefined && !isWithin(item.mealsOut, 0, 20)) {
      return 'Il backup contiene registrazioni giornaliere non valide.'
    }
    if (item.sweetsNote !== undefined && !isString(item.sweetsNote)) {
      return 'Il backup contiene registrazioni giornaliere non valide.'
    }
    if (item.notes !== undefined && !isString(item.notes)) {
      return 'Il backup contiene registrazioni giornaliere non valide.'
    }

    let activity: DailyLog['activity']
    if (item.activity !== undefined) {
      if (!isObject(item.activity)) {
        return 'Il backup contiene registrazioni giornaliere non valide.'
      }
      if (!isString(item.activity.type)) {
        return 'Il backup contiene registrazioni giornaliere non valide.'
      }
      if (
        item.activity.durationMinutes !== undefined &&
        !isWithin(item.activity.durationMinutes, 0, 1440)
      ) {
        return 'Il backup contiene registrazioni giornaliere non valide.'
      }
      if (
        item.activity.symptomsDuringOrAfter !== undefined &&
        !isString(item.activity.symptomsDuringOrAfter)
      ) {
        return 'Il backup contiene registrazioni giornaliere non valide.'
      }
      activity = {
        type: item.activity.type,
        durationMinutes: isWithin(item.activity.durationMinutes, 0, 1440)
          ? item.activity.durationMinutes
          : undefined,
        symptomsDuringOrAfter: isString(item.activity.symptomsDuringOrAfter)
          ? item.activity.symptomsDuringOrAfter
          : undefined,
      }
    }

    logs.push({
      date: item.date,
      dayNumber: item.dayNumber,
      habits,
      dayStatus: item.dayStatus,
      mealsOut: isWithin(item.mealsOut, 0, 20) ? item.mealsOut : undefined,
      sweetsNote: isString(item.sweetsNote) ? item.sweetsNote : undefined,
      notes: isString(item.notes) ? item.notes : undefined,
      activity,
    })
  }
  return logs
}

function parseStrictCycleArchive(raw: unknown): CycleArchive | string {
  if (!isObject(raw)) return 'Il backup contiene archivi cicli non validi.'
  if (!isString(raw.id) || raw.id.length === 0) {
    return 'Il backup contiene archivi cicli non validi.'
  }
  if (!isString(raw.archivedAt) || validateDate(raw.archivedAt)) {
    return 'Il backup contiene archivi cicli non validi.'
  }
  const profile = parseStrictProfile(raw.profile)
  if (typeof profile === 'string') {
    if (profile.includes('profilo')) {
      return 'Il backup contiene archivi cicli non validi.'
    }
    return 'Il backup contiene archivi cicli non validi.'
  }
  const weightEntries = parseStrictWeightEntries(raw.weightEntries)
  if (typeof weightEntries === 'string') {
    return 'Il backup contiene archivi cicli non validi.'
  }
  const waistEntries = parseStrictWaistEntries(raw.waistEntries)
  if (typeof waistEntries === 'string') {
    return 'Il backup contiene archivi cicli non validi.'
  }
  const dailyLogs = parseStrictDailyLogs(raw.dailyLogs)
  if (typeof dailyLogs === 'string') {
    return 'Il backup contiene archivi cicli non validi.'
  }
  return {
    id: raw.id,
    archivedAt: raw.archivedAt,
    profile,
    weightEntries,
    waistEntries,
    dailyLogs,
  }
}

function parseStrictCycleArchives(raw: unknown): CycleArchive[] | string {
  if (!Array.isArray(raw)) {
    return 'Il backup contiene archivi cicli non validi.'
  }
  const archives: CycleArchive[] = []
  for (const item of raw) {
    const parsed = parseStrictCycleArchive(item)
    if (typeof parsed === 'string') return parsed
    archives.push(parsed)
  }
  return archives
}

function detectSchemaKind(
  raw: Record<string, unknown>,
  profile: Record<string, unknown>,
): 'v1' | 'v2' | 'unknown' {
  const version = profile.schemaVersion
  if (version === 1) return 'v1'
  if (version === 2) return 'v2'
  if (version === undefined || version === null) {
    return 'cycleArchives' in raw ? 'v2' : 'v1'
  }
  return 'unknown'
}

/**
 * Validazione rigorosa di un backup JSON già parsato.
 * Nessun fallback silenzioso: campi obbligatori mancanti o tipi errati → rifiuto.
 */
export function parseBackupStrict(raw: unknown): ImportResult {
  if (raw === null) {
    return fail('Il formato del backup non è supportato.')
  }
  if (Array.isArray(raw)) {
    return fail('Il formato del backup non è supportato.')
  }
  if (!isObject(raw)) {
    return fail('Il formato del backup non è supportato.')
  }

  if (!('profile' in raw) || raw.profile === undefined) {
    return fail('Il backup è incompleto: manca il profilo.')
  }
  if (!isObject(raw.profile)) {
    return fail('Il backup è incompleto: manca il profilo.')
  }

  const kind = detectSchemaKind(raw, raw.profile)
  if (kind === 'unknown') {
    return fail('Il formato del backup non è supportato.')
  }

  const profile = parseStrictProfile(raw.profile)
  if (typeof profile === 'string') return fail(profile)

  const weightEntries = parseStrictWeightEntries(raw.weightEntries)
  if (typeof weightEntries === 'string') return fail(weightEntries)

  const waistEntries = parseStrictWaistEntries(raw.waistEntries)
  if (typeof waistEntries === 'string') return fail(waistEntries)

  const dailyLogs = parseStrictDailyLogs(raw.dailyLogs)
  if (typeof dailyLogs === 'string') return fail(dailyLogs)

  let cycleArchives: CycleArchive[]
  if (kind === 'v1') {
    // Migrazione esplicita V1 → V2: nessun archivio.
    cycleArchives = []
  } else {
    if (!('cycleArchives' in raw) || raw.cycleArchives === undefined) {
      return fail('Il backup è incompleto: manca l’archivio cicli.')
    }
    const archives = parseStrictCycleArchives(raw.cycleArchives)
    if (typeof archives === 'string') return fail(archives)
    cycleArchives = archives
  }

  return {
    ok: true,
    state: {
      profile,
      weightEntries,
      waistEntries,
      dailyLogs,
      cycleArchives,
    },
  }
}

/** Analizza una stringa backup. Non scrive su localStorage. */
export function importBackupJson(json: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json) as unknown
  } catch {
    return fail('Il file selezionato non è un JSON valido.')
  }
  return parseBackupStrict(parsed)
}
