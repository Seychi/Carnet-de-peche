import { describe, it, expect } from 'vitest'
import { computeStreak } from '../streaks'

describe('computeStreak', () => {
  it('liste vide → tout à zéro', () => {
    expect(computeStreak([])).toEqual({ activeDays: 0, activeWeeks: 0, longestWeekStreak: 0 })
  })

  it('ignore les valeurs nulles/vides', () => {
    expect(computeStreak([null, undefined, ''])).toEqual({
      activeDays: 0,
      activeWeeks: 0,
      longestWeekStreak: 0,
    })
  })

  it('compte les jours distincts (deux prises le même jour = 1 jour)', () => {
    const s = computeStreak(['2026-06-15T08:00:00Z', '2026-06-15T18:00:00Z'])
    expect(s.activeDays).toBe(1)
    expect(s.activeWeeks).toBe(1)
    expect(s.longestWeekStreak).toBe(1)
  })

  it('compte les semaines consécutives (3 semaines d’affilée)', () => {
    // 3 lundis consécutifs.
    const s = computeStreak([
      '2026-06-01T10:00:00Z',
      '2026-06-08T10:00:00Z',
      '2026-06-15T10:00:00Z',
    ])
    expect(s.activeWeeks).toBe(3)
    expect(s.longestWeekStreak).toBe(3)
  })

  it('casse la série quand une semaine est sautée', () => {
    // Semaine 1, puis saut, puis 2 semaines consécutives → plus longue série = 2.
    const s = computeStreak([
      '2026-06-01T10:00:00Z', // semaine A
      '2026-06-22T10:00:00Z', // semaine A+3 (saut)
      '2026-06-29T10:00:00Z', // semaine A+4
    ])
    expect(s.activeWeeks).toBe(3)
    expect(s.longestWeekStreak).toBe(2)
  })
})
