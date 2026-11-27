import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY } from '../types'
import {
  createDefaultState,
  exportStateJson,
  importStateJson,
  loadState,
  saveState,
} from './storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads defaults when empty', () => {
    const state = loadState()
    expect(state.profile.startWeightKg).toBe(88)
    expect(state.profile.heightCm).toBe(180)
    expect(state.profile.goalWeightKg).toBe(80)
    expect(state.profile.calorieTargetKcal).toBe(1900)
    expect(state.waistEntries).toEqual([])
  })

  it('persists and reloads', () => {
    const state = createDefaultState()
    state.profile.onboarded = true
    state.profile.age = 27
    saveState(state)
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy()
    const loaded = loadState()
    expect(loaded.profile.age).toBe(27)
    expect(loaded.profile.onboarded).toBe(true)
  })

  it('survives malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    const state = loadState()
    expect(state.profile.startWeightKg).toBe(88)
  })

  it('exports and imports JSON roundtrip', () => {
    const state = createDefaultState()
    state.dailyLogs.push({
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
    })
    const json = exportStateJson(state)
    const imported = importStateJson(json)
    expect(imported?.dailyLogs).toHaveLength(1)
    expect(imported?.dailyLogs[0].habits.portions).toBe(true)
  })

  it('rejects invalid import payload', () => {
    expect(importStateJson('[]')).toBeNull()
  })
  it('preserves archived cycles through JSON export and import', () => {
    const state = createDefaultState()
    state.cycleArchives = [{
      id: 'cycle-previous',
      archivedAt: '2026-11-27',
      profile: { ...state.profile, startDate: '2026-10-28', startWeightKg: 90 },
      weightEntries: [{
        id: 'weight-previous',
        date: '2026-10-28',
        weightKg: 90,
        note: 'Peso iniziale',
      }],
      waistEntries: [{
        id: 'waist-previous',
        date: '2026-10-29',
        waistCm: 96,
      }],
      dailyLogs: [],
    }]

    const imported = importStateJson(exportStateJson(state))

    expect(imported?.cycleArchives).toHaveLength(1)
    expect(imported?.cycleArchives[0].id).toBe('cycle-previous')
    expect(imported?.cycleArchives[0].weightEntries[0].weightKg).toBe(90)
    expect(imported?.cycleArchives[0].waistEntries[0].waistCm).toBe(96)
  })

  it('loads legacy V1 data without losing current measurements', () => {
    const state = createDefaultState()
    const legacy = {
      profile: { ...state.profile, schemaVersion: 1 },
      weightEntries: state.weightEntries,
      waistEntries: [{ id: 'waist-v1', date: state.profile.startDate, waistCm: 94 }],
      dailyLogs: [],
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const loaded = loadState()

    expect(loaded.waistEntries).toHaveLength(1)
    expect(loaded.waistEntries[0].waistCm).toBe(94)
    expect(loaded.cycleArchives).toEqual([])
  })

})
