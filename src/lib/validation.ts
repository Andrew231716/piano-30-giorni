import type { AppState, CycleArchive, DailyLog, Habits, UserProfile, WaistEntry, WeightEntry } from '../types'
import { EMPTY_HABITS, SCHEMA_VERSION } from '../types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isWithin(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max
}

export function validateWeightKg(value: number): string | null {
  if (!Number.isFinite(value)) return 'Inserisci un peso valido'
  if (value < 30 || value > 300) return 'Il peso deve essere tra 30 e 300 kg'
  return null
}

export function validateHeightCm(value: number): string | null {
  if (!Number.isFinite(value)) return 'Inserisci un’altezza valida'
  if (value < 100 || value > 250) return 'L’altezza deve essere tra 100 e 250 cm'
  return null
}

export function validateWaistCm(value: number): string | null {
  if (!Number.isFinite(value)) return 'Inserisci una misura valida'
  if (value < 40 || value > 200) return 'La circonferenza deve essere tra 40 e 200 cm'
  return null
}

export function validateAge(value: number): string | null {
  if (!Number.isFinite(value)) return 'Inserisci un’età valida'
  if (value < 14 || value > 100) return 'L’età deve essere tra 14 e 100 anni'
  return null
}

export function validateDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Data non valida'
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return 'Data non valida'
  }
  return null
}

function parseHabits(raw: unknown): Habits {
  if (!isObject(raw)) return { ...EMPTY_HABITS }
  return {
    portions: raw.portions === true,
    protein: raw.protein === true,
    fruitVegetables: raw.fruitVegetables === true,
    sweetsManaged: raw.sweetsManaged === true,
    hydration: raw.hydration === true,
    restAndAllowedActivity: raw.restAndAllowedActivity === true,
  }
}

function parseProfile(raw: unknown, fallback: UserProfile): UserProfile {
  if (!isObject(raw)) return fallback
  const healthRaw = isObject(raw.health) ? raw.health : {}
  return {
    ...fallback,
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    onboarded: raw.onboarded === true,
    age: isWithin(raw.age, 14, 100) ? raw.age : fallback.age,
    sexForFormula:
      raw.sexForFormula === 'male' ||
      raw.sexForFormula === 'female' ||
      raw.sexForFormula === 'unspecified'
        ? raw.sexForFormula
        : fallback.sexForFormula,
    heightCm: isWithin(raw.heightCm, 100, 250) ? raw.heightCm : fallback.heightCm,
    startWeightKg: isWithin(raw.startWeightKg, 30, 300)
      ? raw.startWeightKg
      : fallback.startWeightKg,
    goalWeightKg: isWithin(raw.goalWeightKg, 30, 300)
      ? raw.goalWeightKg
      : fallback.goalWeightKg,
    startDate: isString(raw.startDate) && !validateDate(raw.startDate)
      ? raw.startDate
      : fallback.startDate,
    calorieTargetKcal: isWithin(raw.calorieTargetKcal, 800, 6000)
      ? raw.calorieTargetKcal
      : fallback.calorieTargetKcal,
    proteinTargetG: isWithin(raw.proteinTargetG, 0, 500)
      ? raw.proteinTargetG
      : fallback.proteinTargetG,
    carbsTargetG: isWithin(raw.carbsTargetG, 0, 800)
      ? raw.carbsTargetG
      : fallback.carbsTargetG,
    fatTargetG: isWithin(raw.fatTargetG, 0, 400)
      ? raw.fatTargetG
      : fallback.fatTargetG,
    lunchRoutine: raw.lunchRoutine === 'other' ? 'other' : 'home',
    weekendMealsOut: isWithin(raw.weekendMealsOut, 0, 14)
      ? raw.weekendMealsOut
      : fallback.weekendMealsOut,
    sweetsPreference: typeof raw.sweetsPreference === 'boolean'
      ? raw.sweetsPreference
      : fallback.sweetsPreference,
    health: {
      lumbarDiscHernia: typeof healthRaw.lumbarDiscHernia === 'boolean'
        ? healthRaw.lumbarDiscHernia
        : fallback.health.lumbarDiscHernia,
      radiatingLegPain: typeof healthRaw.radiatingLegPain === 'boolean'
        ? healthRaw.radiatingLegPain
        : fallback.health.radiatingLegPain,
      previousInguinalHerniaRepair: typeof healthRaw.previousInguinalHerniaRepair === 'boolean'
        ? healthRaw.previousInguinalHerniaRepair
        : fallback.health.previousInguinalHerniaRepair,
      clinicianClearedActivity:
        healthRaw.clinicianClearedActivity === true
          ? true
          : healthRaw.clinicianClearedActivity === false
            ? false
            : null,
      allowedActivities: Array.isArray(healthRaw.allowedActivities)
        ? healthRaw.allowedActivities.filter(isString)
        : [],
      restrictedMovements: Array.isArray(healthRaw.restrictedMovements)
        ? healthRaw.restrictedMovements.filter(isString)
        : [],
      notes: isString(healthRaw.notes) ? healthRaw.notes : undefined,
    },
  }
}

function parseWeightEntries(raw: unknown): WeightEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isObject)
    .map((item) => ({
      id: isString(item.id) && item.id.length > 0 ? item.id : crypto.randomUUID(),
      date: isString(item.date) ? item.date : '',
      weightKg: isFiniteNumber(item.weightKg) ? item.weightKg : NaN,
      note: isString(item.note) ? item.note : undefined,
    }))
    .filter((entry) =>
      !validateDate(entry.date) && isWithin(entry.weightKg, 30, 300),
    )
}

function parseWaistEntries(raw: unknown): WaistEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isObject)
    .map((item) => ({
      id: isString(item.id) && item.id.length > 0 ? item.id : crypto.randomUUID(),
      date: isString(item.date) ? item.date : '',
      waistCm: isFiniteNumber(item.waistCm) ? item.waistCm : NaN,
      note: isString(item.note) ? item.note : undefined,
    }))
    .filter((entry) =>
      !validateDate(entry.date) && isWithin(entry.waistCm, 40, 200),
    )
}

function parseDailyLogs(raw: unknown): DailyLog[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isObject)
    .map((item) => {
      const habits = parseHabits(item.habits)
      const status =
        item.dayStatus === 'completed' ||
        item.dayStatus === 'partial' ||
        item.dayStatus === 'not-started'
          ? item.dayStatus
          : 'not-started'
      return {
        date: isString(item.date) ? item.date : '',
        dayNumber: isWithin(item.dayNumber, 0, 30) ? item.dayNumber : 0,
        habits,
        dayStatus: status,
        mealsOut: isWithin(item.mealsOut, 0, 20) ? item.mealsOut : undefined,
        sweetsNote: isString(item.sweetsNote) ? item.sweetsNote : undefined,
        notes: isString(item.notes) ? item.notes : undefined,
        activity: isObject(item.activity)
          ? {
              type: isString(item.activity.type) ? item.activity.type : '',
              durationMinutes: isWithin(item.activity.durationMinutes, 0, 1440)
                ? item.activity.durationMinutes
                : undefined,
              symptomsDuringOrAfter: isString(item.activity.symptomsDuringOrAfter)
                ? item.activity.symptomsDuringOrAfter
                : undefined,
            }
          : undefined,
      } satisfies DailyLog
    })
    .filter((entry) => !validateDate(entry.date))
}

function parseCycleArchives(raw: unknown, fallback: UserProfile): CycleArchive[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isObject).flatMap((item) => {
    if (!isString(item.archivedAt) || validateDate(item.archivedAt)) return []
    // Require a real profile object with a valid startDate so a missing/empty
    // profile cannot be silently replaced by the current fallback profile.
    if (!isObject(item.profile)) return []
    if (!isString(item.profile.startDate) || validateDate(item.profile.startDate)) {
      return []
    }
    return [{
      id: isString(item.id) && item.id.length > 0 ? item.id : crypto.randomUUID(),
      archivedAt: item.archivedAt,
      profile: parseProfile(item.profile, fallback),
      weightEntries: parseWeightEntries(item.weightEntries),
      waistEntries: parseWaistEntries(item.waistEntries),
      dailyLogs: parseDailyLogs(item.dailyLogs),
    }]
  })
}

export function parseAppState(raw: unknown, fallback: AppState): AppState | null {
  if (!isObject(raw)) return null
  try {
    const profile = parseProfile(raw.profile, fallback.profile)
    return {
      profile,
      weightEntries: parseWeightEntries(raw.weightEntries),
      waistEntries: parseWaistEntries(raw.waistEntries),
      dailyLogs: parseDailyLogs(raw.dailyLogs),
      // Legacy V1 backups have no archive collection; their data remains intact.
      cycleArchives: parseCycleArchives(raw.cycleArchives, fallback.profile),
    }
  } catch {
    return null
  }
}
