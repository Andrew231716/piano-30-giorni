import type { AppState, CycleArchive, UserProfile } from '../types'
import { SCHEMA_VERSION } from '../types'
import { todayIso } from './dates'

function cloneJson<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

/** Snapshot indipendente del ciclo corrente. */
export function buildCycleArchive(
  state: Pick<AppState, 'profile' | 'weightEntries' | 'waistEntries' | 'dailyLogs'>,
  archivedAt: string = todayIso(),
): CycleArchive {
  return {
    id: crypto.randomUUID(),
    archivedAt,
    profile: cloneJson(state.profile),
    weightEntries: cloneJson(state.weightEntries),
    waistEntries: cloneJson(state.waistEntries),
    dailyLogs: cloneJson(state.dailyLogs),
  }
}

export function latestWeightKg(
  weightEntries: AppState['weightEntries'],
  fallbackKg: number,
): number {
  const latest = [...weightEntries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)
  return latest?.weightKg ?? fallbackKg
}

/**
 * Evita archivi duplicati da doppio click:
 * se il ciclo corrente è appena stato creato oggi e non ha ancora
 * dati significativi, non archiviare di nuovo.
 */
export function isFreshEmptyCycle(state: AppState, today: string = todayIso()): boolean {
  if (state.profile.startDate !== today) return false
  if (state.dailyLogs.length > 0) return false
  if (state.waistEntries.length > 0) return false
  if (state.weightEntries.length > 1) return false
  if (state.weightEntries.length === 1) {
    return state.weightEntries[0]?.note === 'Inizio nuovo ciclo'
  }
  return true
}

/**
 * Se l’ultimo archivio rappresenta già lo stesso ciclo (stessa data di inizio
 * e stesso insieme di misurazioni), non crearne un altro.
 */
export function isDuplicateOfLastArchive(
  archives: CycleArchive[],
  candidate: CycleArchive,
): boolean {
  const last = archives.at(-1)
  if (!last) return false
  if (last.profile.startDate !== candidate.profile.startDate) return false
  if (last.archivedAt !== candidate.archivedAt) return false
  if (last.weightEntries.length !== candidate.weightEntries.length) return false
  if (last.waistEntries.length !== candidate.waistEntries.length) return false
  if (last.dailyLogs.length !== candidate.dailyLogs.length) return false
  const lastWeightIds = last.weightEntries.map((w) => w.id).join('|')
  const nextWeightIds = candidate.weightEntries.map((w) => w.id).join('|')
  return lastWeightIds === nextWeightIds
}

export function startNewCycleState(
  prev: AppState,
  today: string = todayIso(),
): AppState {
  if (isFreshEmptyCycle(prev, today)) {
    return prev
  }

  const archive = buildCycleArchive(prev, today)
  const archives = prev.cycleArchives ?? []
  if (isDuplicateOfLastArchive(archives, archive)) {
    return prev
  }

  const latest = latestWeightKg(prev.weightEntries, prev.profile.startWeightKg)
  const nextProfile: UserProfile = {
    ...cloneJson(prev.profile),
    schemaVersion: SCHEMA_VERSION,
    startDate: today,
    startWeightKg: latest,
    onboarded: true,
  }

  return {
    ...prev,
    profile: nextProfile,
    weightEntries: [
      {
        id: crypto.randomUUID(),
        date: today,
        weightKg: latest,
        note: 'Inizio nuovo ciclo',
      },
    ],
    waistEntries: [],
    dailyLogs: [],
    cycleArchives: [...archives, archive],
  }
}
