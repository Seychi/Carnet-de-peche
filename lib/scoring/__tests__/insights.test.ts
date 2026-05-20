import { describe, it, expect } from 'vitest'
import { computeInsights, computePersonalMultiplier } from '../insights'
import type { CatchSample } from '../types'
import { PERSONAL_SCORING_CONFIG as CFG } from '../personal-config'

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeSample(overrides: Partial<CatchSample> = {}): CatchSample {
  return {
    caughtAt: new Date('2026-05-20T09:00:00Z'),
    lengthCm: 40,
    windSpeedKmh: 10,
    windDirectionDeg: 220,
    tideState: 'rising',
    hourLocal: 8,
    monthLocal: 5,
    ...overrides,
  }
}

/** Génère N samples biaisés vers vent léger (10 km/h) avec grandes tailles */
function makeLightWindCatches(n: number): CatchSample[] {
  return Array.from({ length: n }, (_, i) =>
    makeSample({ windSpeedKmh: 10, lengthCm: 42 + (i % 3) * 2 })
  )
}

/** Génère N samples en vent fort avec petites tailles */
function makeStrongWindCatches(n: number): CatchSample[] {
  return Array.from({ length: n }, () =>
    makeSample({ windSpeedKmh: 35, lengthCm: 26 })
  )
}

// ─── computeInsights ──────────────────────────────────────────────────────────

describe('computeInsights', () => {
  it('< MIN_CATCHES_FOR_INSIGHTS → []', () => {
    const samples = Array.from({ length: CFG.MIN_CATCHES_FOR_INSIGHTS - 1 }, () => makeSample())
    expect(computeInsights(samples)).toEqual([])
  })

  it('exactement MIN_CATCHES_FOR_INSIGHTS → peut retourner des insights', () => {
    const samples = Array.from({ length: CFG.MIN_CATCHES_FOR_INSIGHTS }, () => makeSample())
    const insights = computeInsights(samples)
    expect(Array.isArray(insights)).toBe(true)
  })

  it('max 6 insights retournés', () => {
    const samples = [
      ...Array.from({ length: 5 }, () => makeSample({ windSpeedKmh: 10, tideState: 'rising', hourLocal: 8 })),
      ...Array.from({ length: 5 }, () => makeSample({ windSpeedKmh: 35, tideState: 'falling', hourLocal: 15 })),
      ...Array.from({ length: 5 }, () => makeSample({ windSpeedKmh: 20, tideState: 'slack', hourLocal: 20 })),
    ]
    const insights = computeInsights(samples)
    expect(insights.length).toBeLessThanOrEqual(6)
  })

  it('10 prises biaisées vent léger → insight vent positif', () => {
    // 10 grandes prises en vent léger, 5 petites en vent fort
    const samples = [
      ...makeLightWindCatches(10),  // light wind, 42-46 cm
      ...makeStrongWindCatches(5),  // strong wind, 26 cm
    ]
    const insights = computeInsights(samples)
    const windInsight = insights.find(i => i.factor === 'wind' && i.label.includes('Léger'))
    expect(windInsight).toBeDefined()
    expect(windInsight!.isPositive).toBe(true)
  })

  it('insights triés par catchRate décroissant', () => {
    const samples = [
      ...makeLightWindCatches(10),
      ...makeStrongWindCatches(5),
    ]
    const insights = computeInsights(samples)
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i].catchRate).toBeLessThanOrEqual(insights[i - 1].catchRate)
    }
  })

  it('confidence low si count < 5', () => {
    // Juste 3 samples : MIN_CATCHES = 3, count light wind = 2
    const samples = [
      makeSample({ windSpeedKmh: 10, lengthCm: 45 }),
      makeSample({ windSpeedKmh: 10, lengthCm: 42 }),
      makeSample({ windSpeedKmh: 35, lengthCm: 26 }),
    ]
    const insights = computeInsights(samples)
    const lightInsight = insights.find(i => i.factor === 'wind' && i.label.includes('Léger'))
    if (lightInsight) {
      expect(lightInsight.confidence).toBe('low') // 2 prises < 5
    }
  })
})

// ─── computePersonalMultiplier ────────────────────────────────────────────────

describe('computePersonalMultiplier', () => {
  it('< MIN_CATCHES_FOR_MULTIPLIER → multiplier = 1.0 partout', () => {
    const samples = Array.from({ length: CFG.MIN_CATCHES_FOR_MULTIPLIER - 1 }, () => makeSample())
    const m = computePersonalMultiplier(samples)
    expect(m.wind).toBe(CFG.MULTIPLIER_NEUTRAL)
    expect(m.tide).toBe(CFG.MULTIPLIER_NEUTRAL)
    expect(m.solunar).toBe(CFG.MULTIPLIER_NEUTRAL)
    expect(m.basedOnCatches).toBe(CFG.MIN_CATCHES_FOR_MULTIPLIER - 1)
  })

  it('20 catches vent léger dominant → wind > 1.0', () => {
    const samples = [
      ...makeLightWindCatches(15),  // 15 grandes prises en vent léger
      ...makeStrongWindCatches(5),  // 5 petites en vent fort
    ]
    const m = computePersonalMultiplier(samples)
    expect(m.wind).toBeGreaterThan(1.0)
    expect(m.basedOnCatches).toBe(20)
  })

  it('multiplicateur cappé entre MULTIPLIER_MIN et MULTIPLIER_MAX', () => {
    // Force un cas extrême : 20 prises en vent léger taille 90 cm, 0 en vent fort
    const extreme = Array.from({ length: 20 }, () =>
      makeSample({ windSpeedKmh: 10, lengthCm: 90, tideState: 'rising', hourLocal: 6 })
    )
    const m = computePersonalMultiplier(extreme)
    expect(m.wind).toBeGreaterThanOrEqual(CFG.MULTIPLIER_MIN)
    expect(m.wind).toBeLessThanOrEqual(CFG.MULTIPLIER_MAX)
    expect(m.tide).toBeGreaterThanOrEqual(CFG.MULTIPLIER_MIN)
    expect(m.tide).toBeLessThanOrEqual(CFG.MULTIPLIER_MAX)
    expect(m.solunar).toBeGreaterThanOrEqual(CFG.MULTIPLIER_MIN)
    expect(m.solunar).toBeLessThanOrEqual(CFG.MULTIPLIER_MAX)
  })

  it('computedAt est un ISO string valide', () => {
    const samples = Array.from({ length: 10 }, () => makeSample())
    const m = computePersonalMultiplier(samples)
    expect(() => new Date(m.computedAt).toISOString()).not.toThrow()
  })
})
