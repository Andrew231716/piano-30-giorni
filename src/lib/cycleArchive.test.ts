import { beforeEach, describe, expect, it } from 'vitest'
import type { AppState } from '../types'
import { SCHEMA_VERSION, STORAGE_KEY } from '../types'
import {
  buildCycleArchive,
  isFreshEmptyCycle,
  latestWeightKg,
  startNewCycleState,
} from './cycleArchive'
import { clearState, createDefaultState, exportStateJson, importStateJson, loadState, saveState } from './storage'
import { parseAppState } from './validation'

function withCycleData(overrides: Partial<AppState> = {}): AppState {
  const base = createDefaultState()
  return {
    ...base,
    profile: {
      ...base.profile,
      onboarded: true,
      startDate: '2026-10-01',
      startWeightKg: 88,
    },
    weightEntries: [
      { id: 'w1', date: '2026-10-01', weightKg: 88, note: 'Peso iniziale' },
      { id: 'w2', date: '2026-10-15', weightKg: 86.5 },
    ],
    waistEntries: [{ id: 'wa1', date: '2026-10-08', waistCm: 96 }],
    dailyLogs: [
      {
        date: '2026-10-02',
        dayNumber: 2,
        habits: {
          portions: true,
          protein: true,
          fruitVegetables: false,
          sweetsManaged: true,
          hydration: true,
          restAndAllowedActivity: false,
        },
        dayStatus: 'partial',
        notes: 'Buona regolarità',
      },
    ],
    cycleArchives: [],
    ...overrides,
  }
}

describe('cycle archive', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('crea un nuovo ciclo con archivio completo', () => {
    const prev = withCycleData()
    const next = startNewCycleState(prev, '2026-11-01')

    expect(next.cycleArchives).toHaveLength(1)
    const archive = next.cycleArchives[0]
    expect(archive.profile.startDate).toBe('2026-10-01')
    expect(archive.profile.startWeightKg).toBe(88)
    expect(archive.weightEntries).toHaveLength(2)
    expect(archive.waistEntries).toHaveLength(1)
    expect(archive.dailyLogs).toHaveLength(1)
    expect(archive.dailyLogs[0].notes).toBe('Buona regolarità')
    expect(archive.archivedAt).toBe('2026-11-01')

    expect(next.profile.startDate).toBe('2026-11-01')
    expect(next.profile.startWeightKg).toBe(86.5)
    expect(next.weightEntries).toHaveLength(1)
    expect(next.weightEntries[0].weightKg).toBe(86.5)
    expect(next.weightEntries[0].note).toBe('Inizio nuovo ciclo')
    expect(next.waistEntries).toEqual([])
    expect(next.dailyLogs).toEqual([])
  })

  it('conserva tutte le misurazioni precedenti nell’archivio', () => {
    const prev = withCycleData()
    const next = startNewCycleState(prev, '2026-11-01')
    expect(next.cycleArchives[0].weightEntries.map((w) => w.weightKg)).toEqual([
      88, 86.5,
    ])
    expect(next.cycleArchives[0].waistEntries[0].waistCm).toBe(96)
  })

  it('conserva checklist e note', () => {
    const next = startNewCycleState(withCycleData(), '2026-11-01')
    const log = next.cycleArchives[0].dailyLogs[0]
    expect(log.habits.portions).toBe(true)
    expect(log.habits.protein).toBe(true)
    expect(log.notes).toBe('Buona regolarità')
  })

  it('usa l’ultima misura disponibile come peso iniziale del nuovo ciclo', () => {
    expect(latestWeightKg(withCycleData().weightEntries, 88)).toBe(86.5)
    const next = startNewCycleState(withCycleData(), '2026-11-01')
    expect(next.profile.startWeightKg).toBe(86.5)
  })

  it('gestisce un nuovo ciclo senza misurazioni di peso', () => {
    const prev = withCycleData({
      weightEntries: [],
      waistEntries: [],
      dailyLogs: [],
      profile: {
        ...withCycleData().profile,
        startDate: '2026-09-01',
        startWeightKg: 87,
      },
    })
    const next = startNewCycleState(prev, '2026-11-01')
    expect(next.cycleArchives[0].weightEntries).toEqual([])
    expect(next.profile.startWeightKg).toBe(87)
    expect(next.weightEntries[0].weightKg).toBe(87)
  })

  it('archivia più cicli consecutivi', () => {
    let state = withCycleData()
    state = startNewCycleState(state, '2026-11-01')
    // aggiungi dati al secondo ciclo
    state = {
      ...state,
      weightEntries: [
        ...state.weightEntries,
        { id: 'w3', date: '2026-11-10', weightKg: 85 },
      ],
      dailyLogs: [
        {
          date: '2026-11-02',
          dayNumber: 2,
          habits: {
            portions: true,
            protein: false,
            fruitVegetables: false,
            sweetsManaged: false,
            hydration: true,
            restAndAllowedActivity: false,
          },
          dayStatus: 'partial',
        },
      ],
    }
    state = startNewCycleState(state, '2026-12-01')
    expect(state.cycleArchives).toHaveLength(2)
    expect(state.cycleArchives[0].profile.startDate).toBe('2026-10-01')
    expect(state.cycleArchives[1].profile.startDate).toBe('2026-11-01')
    expect(state.profile.startWeightKg).toBe(85)
  })

  it('non crea archivi duplicati su doppio avvio di ciclo fresco', () => {
    const first = startNewCycleState(withCycleData(), '2026-11-01')
    expect(first.cycleArchives).toHaveLength(1)
    expect(isFreshEmptyCycle(first, '2026-11-01')).toBe(true)
    const second = startNewCycleState(first, '2026-11-01')
    expect(second).toBe(first)
    expect(second.cycleArchives).toHaveLength(1)
  })

  it('l’archivio è indipendente dagli aggiornamenti del nuovo ciclo', () => {
    const prev = withCycleData()
    const next = startNewCycleState(prev, '2026-11-01')
    const archivedWeights = next.cycleArchives[0].weightEntries
    // mutazione intenzionale sul nuovo stato non deve toccare l’archivio
    next.weightEntries.push({ id: 'new', date: '2026-11-02', weightKg: 84 })
    expect(archivedWeights).toHaveLength(2)
    expect(next.cycleArchives[0].weightEntries).toHaveLength(2)
    // snapshot disaccoppiato dall’oggetto precedente
    expect(next.cycleArchives[0].weightEntries).not.toBe(prev.weightEntries)
    expect(next.cycleArchives[0].profile).not.toBe(prev.profile)
  })

  it('lo snapshot resta indipendente anche se si mutano i dati originali', () => {
    const prev = withCycleData()
    const next = startNewCycleState(prev, '2026-11-01')
    prev.weightEntries[0].weightKg = 1
    prev.dailyLogs[0].notes = 'mutato'
    prev.profile.startWeightKg = 1
    expect(next.cycleArchives[0].weightEntries[0].weightKg).toBe(88)
    expect(next.cycleArchives[0].dailyLogs[0].notes).toBe('Buona regolarità')
    expect(next.cycleArchives[0].profile.startWeightKg).toBe(88)
  })

  it('archivia cicli con dati parziali (solo peso, senza girovita/log)', () => {
    const prev = withCycleData({
      waistEntries: [],
      dailyLogs: [],
      weightEntries: [{ id: 'only', date: '2026-10-01', weightKg: 88, note: 'Peso iniziale' }],
    })
    const next = startNewCycleState(prev, '2026-11-01')
    expect(next.cycleArchives).toHaveLength(1)
    expect(next.cycleArchives[0].weightEntries).toHaveLength(1)
    expect(next.cycleArchives[0].waistEntries).toEqual([])
    expect(next.cycleArchives[0].dailyLogs).toEqual([])
    expect(next.profile.startWeightKg).toBe(88)
  })

  it('doppia invocazione in sequenza sullo stesso stato aggiornato non duplica', () => {
    let state = withCycleData()
    state = startNewCycleState(state, '2026-11-01')
    const afterFirst = state.cycleArchives.length
    state = startNewCycleState(state, '2026-11-01')
    expect(afterFirst).toBe(1)
    expect(state.cycleArchives).toHaveLength(1)
  })

  it('buildCycleArchive crea uno snapshot completo', () => {
    const state = withCycleData()
    const archive = buildCycleArchive(state, '2026-11-01')
    expect(archive.id).toBeTruthy()
    expect(archive.dailyLogs[0].notes).toBe('Buona regolarità')
  })
})

describe('cycle archive storage compatibility', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('importa backup V1 senza cycleArchives', () => {
    const state = createDefaultState()
    const legacy = {
      profile: { ...state.profile, schemaVersion: 1 },
      weightEntries: state.weightEntries,
      waistEntries: [{ id: 'waist-v1', date: state.profile.startDate, waistCm: 94 }],
      dailyLogs: [
        {
          date: state.profile.startDate,
          dayNumber: 1,
          habits: {
            portions: true,
            protein: false,
            fruitVegetables: false,
            sweetsManaged: false,
            hydration: false,
            restAndAllowedActivity: false,
          },
          dayStatus: 'partial',
        },
      ],
    }
    const imported = importStateJson(JSON.stringify(legacy))
    expect(imported?.cycleArchives).toEqual([])
    expect(imported?.waistEntries[0].waistCm).toBe(94)
    expect(imported?.dailyLogs).toHaveLength(1)
  })

  it('export/import V2 conserva integralmente gli archivi', () => {
    const archived = startNewCycleState(withCycleData(), '2026-11-01')
    const roundtrip = importStateJson(exportStateJson(archived))
    expect(roundtrip?.cycleArchives).toHaveLength(1)
    expect(roundtrip?.cycleArchives[0].dailyLogs[0].notes).toBe('Buona regolarità')
    expect(roundtrip?.cycleArchives[0].weightEntries).toHaveLength(2)
    expect(roundtrip?.profile.startWeightKg).toBe(86.5)
  })

  it('in localStorage, archivi malformati vengono filtrati senza perdere il resto', () => {
    const state = createDefaultState()
    const payload = {
      profile: state.profile,
      weightEntries: state.weightEntries,
      waistEntries: [],
      dailyLogs: [],
      cycleArchives: [
        { id: 'bad', archivedAt: 'not-a-date', profile: state.profile },
        { id: 'no-profile', archivedAt: '2026-10-01', profile: null },
        { id: 'empty-profile', archivedAt: '2026-10-01', profile: {} },
        {
          id: 'good',
          archivedAt: '2026-10-01',
          profile: { ...state.profile, startDate: '2026-09-01' },
          weightEntries: [{ id: 'ok', date: '2026-09-01', weightKg: 90 }],
          waistEntries: 'broken',
          dailyLogs: null,
        },
      ],
    }
    // Caricamento locale (parseAppState): tollerante. L’import manuale è rigoroso.
    const loaded = parseAppState(payload, createDefaultState())
    expect(loaded?.weightEntries.length).toBeGreaterThan(0)
    expect(loaded?.cycleArchives).toHaveLength(1)
    expect(loaded?.cycleArchives[0].id).toBe('good')
    expect(loaded?.cycleArchives[0].profile.startDate).toBe('2026-09-01')
    expect(loaded?.cycleArchives[0].waistEntries).toEqual([])
    expect(loaded?.cycleArchives[0].dailyLogs).toEqual([])

    // Import manuale: rifiuta backup V2 con archivi corrotti.
    expect(importStateJson(JSON.stringify(payload))).toBeNull()
  })

  it('mantiene la chiave localStorage V1 e schema 2 dopo nuovo ciclo', () => {
    expect(STORAGE_KEY).toBe('piano30.state.v1')
    expect(SCHEMA_VERSION).toBe(2)
    const archived = startNewCycleState(withCycleData(), '2026-11-01')
    saveState(archived)
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      cycleArchives: unknown[]
      profile: { schemaVersion: number }
    }
    expect(raw.cycleArchives).toHaveLength(1)
    expect(raw.profile.schemaVersion).toBe(SCHEMA_VERSION)
    expect(loadState().cycleArchives[0].weightEntries).toHaveLength(2)
  })

  it('cancellazione completa elimina anche gli archivi', () => {
    const archived = startNewCycleState(withCycleData(), '2026-11-01')
    saveState(archived)
    expect(loadState().cycleArchives).toHaveLength(1)
    clearState()
    const loaded = loadState()
    expect(loaded.cycleArchives).toEqual([])
  })

  it('aggiornare il nuovo ciclo non modifica l’archivio persistito', () => {
    let state = startNewCycleState(withCycleData(), '2026-11-01')
    saveState(state)
    const archiveId = state.cycleArchives[0].id
    state = {
      ...state,
      weightEntries: [
        ...state.weightEntries,
        { id: 'later', date: '2026-11-05', weightKg: 84.2 },
      ],
      dailyLogs: [
        {
          date: '2026-11-03',
          dayNumber: 3,
          habits: {
            portions: true,
            protein: true,
            fruitVegetables: true,
            sweetsManaged: true,
            hydration: true,
            restAndAllowedActivity: true,
          },
          dayStatus: 'completed',
          notes: 'solo nuovo ciclo',
        },
      ],
    }
    saveState(state)
    const loaded = loadState()
    expect(loaded.cycleArchives).toHaveLength(1)
    expect(loaded.cycleArchives[0].id).toBe(archiveId)
    expect(loaded.cycleArchives[0].dailyLogs[0].notes).toBe('Buona regolarità')
    expect(loaded.dailyLogs[0].notes).toBe('solo nuovo ciclo')
    expect(loaded.weightEntries).toHaveLength(2)
  })
})
