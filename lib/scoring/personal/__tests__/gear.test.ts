import { describe, it, expect } from 'vitest'
import { toCatchSamples, type DbCatchRow } from '../buckets'
import { computePersonalTendencies, computeTendencies } from '../tendencies'

// ─── Fixtures ──────────────────────────────────────────────────────────────────
// Le facteur « gear » (leurre) doit se comporter EXACTEMENT comme vent/marée :
// descriptif, et l'absence de matériel n'entre pas au dénominateur.
function bar(extra: Partial<DbCatchRow> = {}): DbCatchRow {
  return {
    species: 'bar',
    spot_id: 'spot-A',
    caught_at: '2026-06-15T07:00:00Z', // 09:00 Europe/Paris (CEST)
    wind_speed_kmh: 8,
    tide_state: 'rising',
    conditions: null,
    ...extra,
  }
}

describe('facteur gear (leurre) — descriptif', () => {
  it('≥ 3 bars dont ≥ 2 au même leurre → tendance gear avec part/sampleCount corrects', () => {
    const samples = toCatchSamples([
      bar({ gear_label: 'Fiiish Black Minnow chartreuse' }),
      bar({ gear_label: 'Fiiish Black Minnow chartreuse' }),
      bar({ gear_label: 'Megabass Vision 110' }),
    ])
    const res = computePersonalTendencies(samples, { species: 'bar' })

    expect(res.sampleCount).toBe(3)
    expect(res.hasEnough).toBe(true)
    const gear = res.tendencies.find((t) => t.factor === 'gear')
    expect(gear).toBeDefined()
    expect(gear!.label).toBe('Fiiish Black Minnow chartreuse')
    expect(gear!.count).toBe(2)
    expect(gear!.sampleCount).toBe(3)
    expect(gear!.share).toBeCloseTo(2 / 3, 5)
    expect(gear!.confidence).toBe('low') // 3 < 5
  })

  it('les prises SANS matériel ne faussent pas le dénominateur (absence ≠ valeur)', () => {
    // 3 bars au même leurre + 2 bars sans matériel → tendance gear sur 3 échantillons,
    // part = 100 % (et non 3/5), exactement comme le vent ignore les prises sans vent.
    const samples = toCatchSamples([
      bar({ gear_label: 'Fiiish Black Minnow chartreuse' }),
      bar({ gear_label: 'Fiiish Black Minnow chartreuse' }),
      bar({ gear_label: 'Fiiish Black Minnow chartreuse' }),
      bar({ gear_label: null }),
      bar({ gear_label: null }),
    ])
    const res = computePersonalTendencies(samples, { species: 'bar' })

    expect(res.sampleCount).toBe(5)
    const gear = res.tendencies.find((t) => t.factor === 'gear')!
    expect(gear.sampleCount).toBe(3) // pas 5
    expect(gear.count).toBe(3)
    expect(gear.share).toBe(1)
  })

  it('fallback sur la saisie texte legacy (lure_model puis lure_brand)', () => {
    const samples = toCatchSamples([
      bar({ gear_label: null, lure_model: 'Black Minnow', lure_brand: 'Fiiish' }),
      bar({ gear_label: null, lure_model: 'Black Minnow', lure_brand: 'Fiiish' }),
      bar({ gear_label: null, lure_model: null, lure_brand: 'Megabass' }),
    ])
    const gearLabels = samples.map((s) => s.gear)
    expect(gearLabels).toEqual(['Black Minnow', 'Black Minnow', 'Megabass'])

    const res = computePersonalTendencies(samples, { species: 'bar' })
    const gear = res.tendencies.find((t) => t.factor === 'gear')!
    expect(gear.label).toBe('Black Minnow')
    expect(gear.count).toBe(2)
    expect(gear.sampleCount).toBe(3)
  })

  it('un seul leurre renseigné (< MIN_PER_FACTOR) → facteur gear non exposé', () => {
    const samples = toCatchSamples([
      bar({ gear_label: 'Fiiish Black Minnow' }),
      bar({ gear_label: null }),
      bar({ gear_label: null }),
    ])
    const res = computePersonalTendencies(samples, { species: 'bar' })
    expect(res.tendencies.find((t) => t.factor === 'gear')).toBeUndefined()
  })

  it('aucun matériel du tout → pas de facteur gear, mais les autres tendances tiennent', () => {
    const samples = toCatchSamples([bar(), bar(), bar()])
    const tendencies = computeTendencies(samples)
    const gear = tendencies.find((t) => t.factor === 'gear')!
    expect(gear.hasData).toBe(false)
    expect(gear.sampleCount).toBe(0)
    // ne réordonne/ne casse pas les facteurs existants
    expect(tendencies.map((t) => t.factor)).toEqual([
      'hour',
      'weekday',
      'season',
      'wind',
      'tide',
      'gear',
    ])
  })

  it('reste DESCRIPTIF : aucun champ de score 0-100 sur la tendance gear', () => {
    const samples = toCatchSamples([
      bar({ gear_label: 'Fiiish Black Minnow' }),
      bar({ gear_label: 'Fiiish Black Minnow' }),
    ])
    const res = computePersonalTendencies(samples, { species: 'bar' })
    // share est une part 0-1, jamais un score prédictif. count/sampleCount sont des comptes.
    const gear = res.tendencies.find((t) => t.factor === 'gear')
    if (gear) {
      expect(gear.share).toBeLessThanOrEqual(1)
      expect(Object.keys(gear)).not.toContain('score')
    }
  })
})
