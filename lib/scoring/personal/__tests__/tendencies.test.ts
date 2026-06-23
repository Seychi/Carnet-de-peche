import { describe, it, expect } from 'vitest'
import { toCatchSamples, type DbCatchRow } from '../buckets'
import { computePersonalTendencies } from '../tendencies'

// ─── Fixtures ──────────────────────────────────────────────────────────────────
// 4 bars le matin (09:00 Paris), en été (juin), même jour → tendances nettes.
// 1 dorade au crépuscule (21:00 Paris), en hiver (janvier).
function bar(extra: Partial<DbCatchRow> = {}): DbCatchRow {
  return {
    species: 'bar',
    spot_id: 'spot-A',
    caught_at: '2026-06-15T07:00:00Z', // 09:00 Europe/Paris (CEST) → matin, été
    wind_speed_kmh: 8, // léger
    tide_state: 'rising',
    conditions: null,
    ...extra,
  }
}
const dorade: DbCatchRow = {
  species: 'dorade_royale',
  spot_id: 'spot-B',
  caught_at: '2026-01-15T20:00:00Z', // 21:00 Europe/Paris (CET) → crépuscule, hiver
  wind_speed_kmh: null,
  tide_state: null,
  conditions: null,
}

describe('computePersonalTendencies — distribution descriptive', () => {
  it('dérive le créneau et la saison dominants avec leur part', () => {
    const samples = toCatchSamples([bar(), bar(), bar(), bar(), dorade])
    const res = computePersonalTendencies(samples)

    expect(res.sampleCount).toBe(5)
    expect(res.hasEnough).toBe(true)
    const hour = res.tendencies.find((t) => t.factor === 'hour')!
    expect(hour.label).toBe('le matin')
    expect(hour.count).toBe(4)
    expect(hour.sampleCount).toBe(5)
    expect(hour.share).toBeCloseTo(0.8, 5)
    const season = res.tendencies.find((t) => t.factor === 'season')!
    expect(season.label).toBe('en été')
    expect(season.share).toBeCloseTo(0.8, 5)
  })

  it('segmente par espèce (part = 100 % sur un sous-ensemble homogène)', () => {
    const samples = toCatchSamples([bar(), bar(), bar(), bar(), dorade])
    const res = computePersonalTendencies(samples, { species: 'bar' })

    expect(res.species).toBe('bar')
    expect(res.sampleCount).toBe(4)
    const hour = res.tendencies.find((t) => t.factor === 'hour')!
    expect(hour.label).toBe('le matin')
    expect(hour.share).toBe(1)
    expect(res.confidence).toBe('low') // 4 prises → faible
  })

  it('segmente par spot', () => {
    const samples = toCatchSamples([bar(), bar(), bar(), bar(), dorade])
    const res = computePersonalTendencies(samples, { spotId: 'spot-A' })
    expect(res.sampleCount).toBe(4)
    expect(res.tendencies.every((t) => t.sampleCount <= 4)).toBe(true)
  })

  it('un facteur sous MIN_PER_FACTOR (2) prises n’est pas exposé', () => {
    const samples = toCatchSamples([dorade]) // 1 seule prise
    const res = computePersonalTendencies(samples)
    expect(res.sampleCount).toBe(1)
    expect(res.hasEnough).toBe(false)
    expect(res.minToUnlock).toBe(2)
    expect(res.tendencies).toHaveLength(0) // 1 < MIN_PER_FACTOR
  })

  it('le vent ne compte que les prises renseignées (absence ≠ valeur)', () => {
    // 3 bars avec vent, 2 dorades sans vent → tendance vent sur 3 échantillons.
    const samples = toCatchSamples([bar(), bar(), bar(), { ...dorade }, { ...dorade }])
    const res = computePersonalTendencies(samples)
    const wind = res.tendencies.find((t) => t.factor === 'wind')
    expect(wind).toBeDefined()
    expect(wind!.sampleCount).toBe(3)
    expect(wind!.label).toBe('par vent léger')
  })

  it('réconcilie le vent colonne → jsonb quand la colonne est nulle', () => {
    const rows: DbCatchRow[] = [
      bar({ wind_speed_kmh: null, conditions: { wind_speed_kmh: 30 } }), // jsonb fort
      bar({ wind_speed_kmh: null, conditions: { wind_speed_kmh: 30 } }),
    ]
    const samples = toCatchSamples(rows)
    expect(samples[0].windSpeedKmh).toBe(30)
    const res = computePersonalTendencies(samples)
    const wind = res.tendencies.find((t) => t.factor === 'wind')!
    expect(wind.label).toBe('par vent fort')
    expect(wind.sampleCount).toBe(2)
  })

  it('exclut les prises hors couverture (out_of_coverage)', () => {
    const rows: DbCatchRow[] = [bar(), bar(), { ...bar(), conditions: { out_of_coverage: true } }]
    const samples = toCatchSamples(rows)
    expect(samples).toHaveLength(2) // la 3e est exclue
  })

  it('paliers de confiance < 5 / ≤ 20 / > 20', () => {
    const mk = (n: number) => computePersonalTendencies(toCatchSamples(Array.from({ length: n }, () => bar())))
    expect(mk(4).confidence).toBe('low')
    expect(mk(5).confidence).toBe('medium')
    expect(mk(20).confidence).toBe('medium')
    expect(mk(21).confidence).toBe('high')
  })
})
