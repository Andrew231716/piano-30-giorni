import { describe, expect, it } from 'vitest'
import { createDefaultState } from './storage'
import { parseAppState, validateDate } from './validation'

describe('data validation', () => {
  it('rejects impossible calendar dates', () => {
    expect(validateDate('2026-02-29')).toBe('Data non valida')
    expect(validateDate('2028-02-29')).toBeNull()
  })

  it('falls back to safe profile values when imported numbers are out of range', () => {
    const fallback = createDefaultState()
    const parsed = parseAppState({
      profile: {
        ...fallback.profile,
        age: 900,
        heightCm: 0,
        calorieTargetKcal: -100,
        startDate: '2026-02-31',
      },
      weightEntries: [],
      waistEntries: [],
      dailyLogs: [],
    }, fallback)

    expect(parsed?.profile.age).toBe(fallback.profile.age)
    expect(parsed?.profile.heightCm).toBe(fallback.profile.heightCm)
    expect(parsed?.profile.calorieTargetKcal).toBe(fallback.profile.calorieTargetKcal)
    expect(parsed?.profile.startDate).toBe(fallback.profile.startDate)
  })

  it('filters invalid measurement dates and ranges from imported backups', () => {
    const fallback = createDefaultState()
    const parsed = parseAppState({
      profile: fallback.profile,
      weightEntries: [
        { id: 'valid', date: '2026-11-27', weightKg: 88 },
        { id: 'bad-date', date: '2026-02-30', weightKg: 87 },
        { id: 'bad-weight', date: '2026-11-27', weightKg: 900 },
      ],
      waistEntries: [
        { id: 'valid-waist', date: '2026-11-27', waistCm: 95 },
        { id: 'bad-waist', date: '2026-11-27', waistCm: 5 },
      ],
      dailyLogs: [
        { date: '2026-02-30', dayNumber: 1, habits: {}, dayStatus: 'partial' },
        { date: '2026-11-27', dayNumber: 99, habits: {}, dayStatus: 'partial' },
      ],
    }, fallback)

    expect(parsed?.weightEntries.map((entry) => entry.id)).toEqual(['valid'])
    expect(parsed?.waistEntries.map((entry) => entry.id)).toEqual(['valid-waist'])
    expect(parsed?.dailyLogs).toHaveLength(1)
    expect(parsed?.dailyLogs[0].dayNumber).toBe(0)
  })
})
