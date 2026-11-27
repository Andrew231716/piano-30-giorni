import { beforeEach, describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, STORAGE_KEY } from '../types'
import { importBackupJson, parseBackupStrict } from './backupImport'
import {
  CORRUPT_STORAGE_KEY,
  createDefaultState,
  exportStateJson,
  importStateJson,
  loadState,
  saveState,
} from './storage'

function validProfile(overrides: Record<string, unknown> = {}) {
  const base = createDefaultState().profile
  return { ...base, schemaVersion: SCHEMA_VERSION, onboarded: true, ...overrides }
}

function validV2State(overrides: Record<string, unknown> = {}) {
  const state = createDefaultState()
  state.profile = validProfile()
  state.weightEntries = [
    {
      id: 'w1',
      date: state.profile.startDate,
      weightKg: 88,
      note: 'Peso iniziale',
    },
  ]
  state.waistEntries = []
  state.dailyLogs = []
  state.cycleArchives = []
  return { ...state, ...overrides }
}

function validV1Payload() {
  const state = validV2State()
  return {
    profile: { ...state.profile, schemaVersion: 1 },
    weightEntries: state.weightEntries,
    waistEntries: [
      { id: 'waist-v1', date: state.profile.startDate, waistCm: 94 },
    ],
    dailyLogs: [
      {
        date: state.profile.startDate,
        dayNumber: 1,
        habits: {
          portions: true,
          protein: false,
          fruitVegetables: false,
          sweetsManaged: false,
          hydration: true,
          restAndAllowedActivity: false,
        },
        dayStatus: 'partial',
        notes: 'nota-v1',
      },
    ],
  }
}

describe('backupImport — validi', () => {
  it('accetta backup V1 completo e migra cycleArchives a []', () => {
    const result = importBackupJson(JSON.stringify(validV1Payload()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.cycleArchives).toEqual([])
    expect(result.state.waistEntries[0].waistCm).toBe(94)
    expect(result.state.dailyLogs).toHaveLength(1)
    expect(result.state.profile.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('accetta backup V2 completo', () => {
    const state = validV2State()
    const result = importBackupJson(exportStateJson(state))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.profile.startWeightKg).toBe(88)
    expect(result.state.cycleArchives).toEqual([])
  })

  it('accetta V2 con più archivi cicli', () => {
    const state = validV2State()
    const archiveProfile = validProfile({ startDate: '2026-09-01', startWeightKg: 90 })
    state.cycleArchives = [
      {
        id: 'a1',
        archivedAt: '2026-10-01',
        profile: archiveProfile,
        weightEntries: [
          { id: 'aw1', date: '2026-09-01', weightKg: 90 },
        ],
        waistEntries: [],
        dailyLogs: [],
      },
      {
        id: 'a2',
        archivedAt: '2026-11-01',
        profile: validProfile({ startDate: '2026-10-02', startWeightKg: 88 }),
        weightEntries: [
          { id: 'aw2', date: '2026-10-02', weightKg: 88 },
        ],
        waistEntries: [{ id: 'aa1', date: '2026-10-05', waistCm: 93 }],
        dailyLogs: [],
      },
    ]
    const result = importBackupJson(exportStateJson(state))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.cycleArchives).toHaveLength(2)
    expect(result.state.cycleArchives[1].waistEntries[0].waistCm).toBe(93)
  })

  it('accetta V2 con array vuoti validi', () => {
    const state = validV2State()
    state.weightEntries = []
    state.waistEntries = []
    state.dailyLogs = []
    state.cycleArchives = []
    const result = parseBackupStrict(state)
    expect(result.ok).toBe(true)
  })
})

describe('backupImport — non validi', () => {
  it('rifiuta JSON non analizzabile', () => {
    const result = importBackupJson('{not-json')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/non è un JSON valido/)
  })

  it('rifiuta null', () => {
    const result = parseBackupStrict(null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/non è supportato/)
  })

  it('rifiuta array al posto dell’oggetto principale', () => {
    const result = importBackupJson('[]')
    expect(result.ok).toBe(false)
  })

  it('rifiuta profilo mancante', () => {
    const result = parseBackupStrict({
      weightEntries: [],
      waistEntries: [],
      dailyLogs: [],
      cycleArchives: [],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/manca il profilo/)
  })

  it('rifiuta misure peso mancanti', () => {
    const result = parseBackupStrict({
      profile: validProfile(),
      waistEntries: [],
      dailyLogs: [],
      cycleArchives: [],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/peso/)
  })

  it('rifiuta proprietà con tipo errato', () => {
    const result = parseBackupStrict({
      profile: validProfile({ age: 'trent' }),
      weightEntries: [],
      waistEntries: [],
      dailyLogs: [],
      cycleArchives: [],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/profilo non valido/)
  })

  it('rifiuta peso non numerico', () => {
    const result = parseBackupStrict({
      profile: validProfile(),
      weightEntries: [{ id: 'w', date: '2026-11-27', weightKg: 'ottanta' }],
      waistEntries: [],
      dailyLogs: [],
      cycleArchives: [],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/misurazioni non valide/)
  })

  it('rifiuta date impossibili', () => {
    const result = parseBackupStrict({
      profile: validProfile({ startDate: '2026-02-30' }),
      weightEntries: [],
      waistEntries: [],
      dailyLogs: [],
      cycleArchives: [],
    })
    expect(result.ok).toBe(false)
  })

  it('rifiuta checklist malformata', () => {
    const result = parseBackupStrict({
      profile: validProfile(),
      weightEntries: [],
      waistEntries: [],
      dailyLogs: [
        {
          date: '2026-11-27',
          dayNumber: 1,
          habits: { portions: true },
          dayStatus: 'partial',
        },
      ],
      cycleArchives: [],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/checklist malformata/)
  })

  it('rifiuta V2 senza cycleArchives', () => {
    const result = parseBackupStrict({
      profile: validProfile({ schemaVersion: 2 }),
      weightEntries: [],
      waistEntries: [],
      dailyLogs: [],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/archivio cicli/)
  })

  it('rifiuta archivio senza profilo', () => {
    const result = parseBackupStrict({
      profile: validProfile({ schemaVersion: 2 }),
      weightEntries: [],
      waistEntries: [],
      dailyLogs: [],
      cycleArchives: [
        {
          id: 'a1',
          archivedAt: '2026-10-01',
          profile: null,
          weightEntries: [],
          waistEntries: [],
          dailyLogs: [],
        },
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/archivi cicli non validi/)
  })

  it('rifiuta archivio senza data valida', () => {
    const result = parseBackupStrict({
      profile: validProfile({ schemaVersion: 2 }),
      weightEntries: [],
      waistEntries: [],
      dailyLogs: [],
      cycleArchives: [
        {
          id: 'a1',
          archivedAt: 'ieri',
          profile: validProfile({ startDate: '2026-09-01' }),
          weightEntries: [],
          waistEntries: [],
          dailyLogs: [],
        },
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/archivi cicli non validi/)
  })

  it('rifiuta versione schema sconosciuta', () => {
    const result = parseBackupStrict({
      profile: validProfile({ schemaVersion: 99 }),
      weightEntries: [],
      waistEntries: [],
      dailyLogs: [],
      cycleArchives: [],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/non è supportato/)
  })

  it('rifiuta JSON formalmente valido ma incompleto (solo not/profile null)', () => {
    const result = parseBackupStrict({
      not: 'a valid piano30 backup',
      profile: null,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/manca il profilo/)
  })
})

describe('backupImport — integrità', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('import fallito non modifica localStorage', () => {
    const current = validV2State()
    current.cycleArchives = [
      {
        id: 'keep-me',
        archivedAt: '2026-10-01',
        profile: validProfile({ startDate: '2026-09-01' }),
        weightEntries: [],
        waistEntries: [],
        dailyLogs: [],
      },
    ]
    saveState(current)
    const before = localStorage.getItem(STORAGE_KEY)

    expect(importStateJson('{"profile":null}')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
    expect(loadState().cycleArchives[0].id).toBe('keep-me')
  })

  it('import valido sostituisce completamente lo stato', () => {
    saveState(validV2State())
    const incoming = validV1Payload()
    const imported = importStateJson(JSON.stringify(incoming))
    expect(imported).not.toBeNull()
    expect(imported?.waistEntries[0].waistCm).toBe(94)
    expect(imported?.cycleArchives).toEqual([])
    // Chiama save solo dopo applicazione esplicita (come fa il context).
    saveState(imported!)
    expect(loadState().waistEntries[0].waistCm).toBe(94)
  })

  it('non perde archivi in roundtrip V2', () => {
    const state = validV2State()
    state.cycleArchives = [
      {
        id: 'a1',
        archivedAt: '2026-10-01',
        profile: validProfile({ startDate: '2026-09-01', startWeightKg: 91 }),
        weightEntries: [{ id: 'w', date: '2026-09-01', weightKg: 91 }],
        waistEntries: [],
        dailyLogs: [],
      },
    ]
    const roundtrip = importStateJson(exportStateJson(state))
    expect(roundtrip?.cycleArchives).toHaveLength(1)
    expect(roundtrip?.cycleArchives[0].weightEntries[0].weightKg).toBe(91)
  })

  it('preserva payload corrotto senza cancellarlo al load', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    const loaded = loadState()
    expect(loaded.profile.startWeightKg).toBe(88)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{not-json')
    expect(localStorage.getItem(CORRUPT_STORAGE_KEY)).toBe('{not-json')
  })
})
