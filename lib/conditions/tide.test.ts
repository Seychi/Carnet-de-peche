import { describe, it, expect } from 'vitest'
import {
  tideTrendAt,
  refineExtremumHour,
  dailyMarnage,
  upcomingExtrema,
  formatHourFraction,
  formatCountdown,
} from './tide'
import type { TidePoint, TideExtremum } from './spot-forecast'

// Courbe synthétique : basse mer ~6h, pleine mer ~12h, basse ~18h.
// Symétrique → extrema pile aux heures pleines.
const POINTS: TidePoint[] = Array.from({ length: 24 }, (_, h) => ({
  hour: h,
  height_m: 3 + 2 * Math.cos(((h - 12) / 6) * Math.PI),
}))

const EXTREMA: TideExtremum[] = [
  { type: 'high', hour: 12, height_m: 5 },
  { type: 'low', hour: 6, height_m: 1 },
  { type: 'low', hour: 18, height_m: 1 },
]

describe('tideTrendAt', () => {
  it('montante avant la pleine mer', () => {
    expect(tideTrendAt(POINTS, 9)).toBe('rising')
  })
  it('descendante après la pleine mer', () => {
    expect(tideTrendAt(POINTS, 15)).toBe('falling')
  })
  it('étale au sommet', () => {
    expect(tideTrendAt(POINTS, 12)).toBe('slack')
  })
  it('slack si trop peu de points', () => {
    expect(tideTrendAt([{ hour: 0, height_m: 1 }], 0)).toBe('slack')
  })
})

describe('refineExtremumHour', () => {
  it('reste proche de l’heure entière pour un extremum symétrique', () => {
    const refined = refineExtremumHour(POINTS, 12)
    expect(Math.abs(refined - 12)).toBeLessThan(0.05)
  })
  it('borne le décalage à ±0.5h', () => {
    const refined = refineExtremumHour(POINTS, 6)
    expect(refined).toBeGreaterThanOrEqual(5.5)
    expect(refined).toBeLessThanOrEqual(6.5)
  })
  it('retombe sur l’heure si voisins manquants', () => {
    expect(refineExtremumHour([{ hour: 12, height_m: 5 }], 12)).toBe(12)
  })
})

describe('dailyMarnage', () => {
  it('amplitude = max - min', () => {
    expect(dailyMarnage(POINTS)).toBeCloseTo(4, 5) // 5 - 1
  })
  it('null si aucun point', () => {
    expect(dailyMarnage([])).toBeNull()
  })
})

describe('upcomingExtrema', () => {
  it('à 13h, prochaine basse = 18h, pas de pleine restante', () => {
    const { high, low } = upcomingExtrema(POINTS, EXTREMA, 13)
    expect(low?.type).toBe('low')
    expect(Math.round(low!.hourFraction)).toBe(18)
    expect(high).toBeNull()
  })
  it('à 8h, prochaine pleine = 12h', () => {
    const { high } = upcomingExtrema(POINTS, EXTREMA, 8)
    expect(Math.round(high!.hourFraction)).toBe(12)
  })
})

describe('formatHourFraction', () => {
  it('14.53 → 14h32', () => {
    expect(formatHourFraction(14.533)).toBe('14h32')
  })
  it('arrondi des minutes qui débordent', () => {
    expect(formatHourFraction(13.999)).toBe('14h00')
  })
})

describe('formatCountdown', () => {
  it('moins d’une heure', () => {
    expect(formatCountdown(0.5)).toBe('dans 30 min')
  })
  it('heures + minutes', () => {
    expect(formatCountdown(2.25)).toBe('dans 2 h 15')
  })
  it('zéro ou négatif → maintenant', () => {
    expect(formatCountdown(0)).toBe('maintenant')
    expect(formatCountdown(-1)).toBe('maintenant')
  })
})
