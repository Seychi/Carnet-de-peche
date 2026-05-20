import { describe, it, expect } from 'vitest'
import {
  bucketizeWind,
  bucketizeHour,
  bucketizeSeason,
  computeMedianLength,
  computeConditionStats,
  toCatchSamples,
  type DbCatch,
} from '../catch-analysis'
import type { CatchSample } from '../types'

// ─── bucketizeWind ────────────────────────────────────────────────────────────

describe('bucketizeWind', () => {
  it('null → calm', () => expect(bucketizeWind(null)).toBe('calm'))
  it('0 km/h → calm', () => expect(bucketizeWind(0)).toBe('calm'))
  it('4.9 km/h → calm', () => expect(bucketizeWind(4.9)).toBe('calm'))
  it('5 km/h → light', () => expect(bucketizeWind(5)).toBe('light'))
  it('10 km/h → light', () => expect(bucketizeWind(10)).toBe('light'))
  it('14.9 km/h → light', () => expect(bucketizeWind(14.9)).toBe('light'))
  it('15 km/h → moderate', () => expect(bucketizeWind(15)).toBe('moderate'))
  it('20 km/h → moderate', () => expect(bucketizeWind(20)).toBe('moderate'))
  it('24.9 km/h → moderate', () => expect(bucketizeWind(24.9)).toBe('moderate'))
  it('25 km/h → strong', () => expect(bucketizeWind(25)).toBe('strong'))
  it('35 km/h → strong', () => expect(bucketizeWind(35)).toBe('strong'))
  it('39.9 km/h → strong', () => expect(bucketizeWind(39.9)).toBe('strong'))
  it('40 km/h → gale', () => expect(bucketizeWind(40)).toBe('gale'))
  it('50 km/h → gale', () => expect(bucketizeWind(50)).toBe('gale'))
  it('100 km/h → gale', () => expect(bucketizeWind(100)).toBe('gale'))
})

// ─── bucketizeHour ────────────────────────────────────────────────────────────

describe('bucketizeHour', () => {
  it('0h → night', () => expect(bucketizeHour(0)).toBe('night'))
  it('3h → night', () => expect(bucketizeHour(3)).toBe('night'))
  it('4h → dawn', () => expect(bucketizeHour(4)).toBe('dawn'))
  it('6h → dawn', () => expect(bucketizeHour(6)).toBe('dawn'))
  it('7h → morning', () => expect(bucketizeHour(7)).toBe('morning'))
  it('10h → morning', () => expect(bucketizeHour(10)).toBe('morning'))
  it('11h → midday', () => expect(bucketizeHour(11)).toBe('midday'))
  it('12h → midday', () => expect(bucketizeHour(12)).toBe('midday'))
  it('13h → midday', () => expect(bucketizeHour(13)).toBe('midday'))
  it('14h → afternoon', () => expect(bucketizeHour(14)).toBe('afternoon'))
  it('17h → afternoon', () => expect(bucketizeHour(17)).toBe('afternoon'))
  it('18h → dusk', () => expect(bucketizeHour(18)).toBe('dusk'))
  it('20h → dusk', () => expect(bucketizeHour(20)).toBe('dusk'))
  it('22h → dusk', () => expect(bucketizeHour(22)).toBe('dusk'))
  it('23h → night', () => expect(bucketizeHour(23)).toBe('night'))
})

// ─── bucketizeSeason ──────────────────────────────────────────────────────────

describe('bucketizeSeason', () => {
  it('mars → spring', () => expect(bucketizeSeason(3)).toBe('spring'))
  it('mai → spring', () => expect(bucketizeSeason(5)).toBe('spring'))
  it('juin → summer', () => expect(bucketizeSeason(6)).toBe('summer'))
  it('août → summer', () => expect(bucketizeSeason(8)).toBe('summer'))
  it('septembre → autumn', () => expect(bucketizeSeason(9)).toBe('autumn'))
  it('novembre → autumn', () => expect(bucketizeSeason(11)).toBe('autumn'))
  it('décembre → winter', () => expect(bucketizeSeason(12)).toBe('winter'))
  it('janvier → winter', () => expect(bucketizeSeason(1)).toBe('winter'))
  it('février → winter', () => expect(bucketizeSeason(2)).toBe('winter'))
})

// ─── computeMedianLength ─────────────────────────────────────────────────────

describe('computeMedianLength', () => {
  const sample = (l: number | null): CatchSample => ({
    caughtAt: new Date(),
    lengthCm: l,
    windSpeedKmh: null,
    windDirectionDeg: null,
    tideState: 'unknown',
    hourLocal: 10,
    monthLocal: 5,
  })

  it('tous null → null', () => {
    expect(computeMedianLength([sample(null), sample(null), sample(null)])).toBeNull()
  })

  it('liste vide → null', () => {
    expect(computeMedianLength([])).toBeNull()
  })

  it('[30, 40, 50] → 40', () => {
    expect(computeMedianLength([sample(30), sample(40), sample(50)])).toBe(40)
  })

  it('[30] → 30', () => {
    expect(computeMedianLength([sample(30)])).toBe(30)
  })

  it('[30, 50] → 40 (moyenne des deux centraux)', () => {
    expect(computeMedianLength([sample(30), sample(50)])).toBe(40)
  })

  it('ignore les nulls dans le calcul', () => {
    expect(computeMedianLength([sample(null), sample(30), sample(50)])).toBe(40)
  })
})

// ─── computeConditionStats ───────────────────────────────────────────────────

describe('computeConditionStats', () => {
  const sample = (l: number | null, wind: number | null = 10): CatchSample => ({
    caughtAt: new Date(),
    lengthCm: l,
    windSpeedKmh: wind,
    windDirectionDeg: null,
    tideState: 'rising',
    hourLocal: 8,
    monthLocal: 5,
  })

  it('count = nombre de samples filtrés', () => {
    const samples = [sample(40), sample(35), sample(50)]
    const stats = computeConditionStats(samples, s => s.windSpeedKmh !== null, null)
    expect(stats.count).toBe(3)
  })

  it('avgLength = null si aucune taille', () => {
    const samples = [sample(null), sample(null)]
    const stats = computeConditionStats(samples, () => true, null)
    expect(stats.avgLength).toBeNull()
  })

  it('avgLength correct', () => {
    const samples = [sample(30), sample(50)]
    const stats = computeConditionStats(samples, () => true, null)
    expect(stats.avgLength).toBe(40)
  })

  it('catchRate avec medianLength = part au-dessus de la médiane', () => {
    // 3 prises, médiane = 40 → [35, 40, 50] → 1 au-dessus (50) sur 3 avec longueur → 1/3
    const samples = [sample(35), sample(40), sample(50)]
    const stats = computeConditionStats(samples, () => true, 40)
    expect(stats.catchRate).toBeCloseTo(1 / 3, 5)
  })

  it('catchRate sans medianLength = count/total', () => {
    const samples = [sample(40), sample(30), sample(50), sample(45)]
    // filtre : windSpeedKmh === 10 → les 4 → 4/4 = 1
    const stats = computeConditionStats(samples, s => s.windSpeedKmh === 10, null)
    expect(stats.catchRate).toBe(1)
  })

  it('catchRate sans medianLength = part dans les samples totaux', () => {
    const samples = [sample(40, 10), sample(30, 10), sample(50, 30), sample(45, 30)]
    // filtre : vent 10 → 2 sur 4 total = 0.5
    const stats = computeConditionStats(samples, s => s.windSpeedKmh === 10, null)
    expect(stats.catchRate).toBe(0.5)
  })
})

// ─── toCatchSamples ───────────────────────────────────────────────────────────

describe('toCatchSamples', () => {
  const makeDbCatch = (overrides: Partial<DbCatch> = {}): DbCatch => ({
    id: 'uuid',
    user_id: 'user',
    caught_at: '2026-05-20T09:30:00.000Z',
    size_cm: 45,
    wind_speed_kmh: 12,
    wind_direction_deg: 220,
    tide_state: 'rising',
    spot_id: null,
    ...overrides,
  })

  it('mappe size_cm → lengthCm', () => {
    const samples = toCatchSamples([makeDbCatch({ size_cm: 42 })])
    expect(samples[0].lengthCm).toBe(42)
  })

  it('tide_state null → unknown', () => {
    const samples = toCatchSamples([makeDbCatch({ tide_state: null })])
    expect(samples[0].tideState).toBe('unknown')
  })

  it('calcule hourLocal', () => {
    const samples = toCatchSamples([makeDbCatch({ caught_at: '2026-05-20T07:00:00.000Z' })])
    expect(typeof samples[0].hourLocal).toBe('number')
    expect(samples[0].hourLocal).toBeGreaterThanOrEqual(0)
    expect(samples[0].hourLocal).toBeLessThan(24)
  })

  it('calcule monthLocal', () => {
    const samples = toCatchSamples([makeDbCatch({ caught_at: '2026-05-20T09:00:00.000Z' })])
    expect(samples[0].monthLocal).toBe(5)
  })
})
