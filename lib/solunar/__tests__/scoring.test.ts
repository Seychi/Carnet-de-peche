import { describe, it, expect } from 'vitest'
import { scoreSolunar, scoreTide, scoreWind, scoreWindow, qualityFromScore } from '../scoring'
import type { SolunarEvent } from '../types'

function makeEvent(type: SolunarEvent['type'], moonPhase?: number): SolunarEvent {
  return {
    type,
    timeISO: '2026-05-20T08:00:00.000Z',
    localTime: '10:00',
    moonPhase,
    moonIllumination: moonPhase !== undefined ? 0.5 : undefined,
  }
}

describe('scoreSolunar', () => {
  it('moon_apex = 1.0', () => {
    expect(scoreSolunar(makeEvent('moon_apex'))).toBe(1.0)
  })
  it('moon_nadir = 1.0', () => {
    expect(scoreSolunar(makeEvent('moon_nadir'))).toBe(1.0)
  })
  it('moonrise = 0.8', () => {
    expect(scoreSolunar(makeEvent('moonrise'))).toBe(0.8)
  })
  it('sunrise = 0.6', () => {
    expect(scoreSolunar(makeEvent('sunrise'))).toBe(0.6)
  })
  it('pleine lune applique le bonus (moonrise 0.8 × 1.2 = 0.96)', () => {
    const score = scoreSolunar(makeEvent('moonrise', 0.5))
    expect(score).toBeCloseTo(0.96, 5)
  })
  it('nouvelle lune applique le bonus', () => {
    const score = scoreSolunar(makeEvent('moonrise', 0.0))
    expect(score).toBeCloseTo(0.96, 5)
  })
  it('moon_apex + pleine lune = cap à 1.0 (1.0 × 1.2 → cap)', () => {
    const score = scoreSolunar(makeEvent('moon_apex', 0.5))
    expect(score).toBe(1.0)
  })
})

describe('scoreTide', () => {
  it('retourne 0.5 si pas de données', () => {
    expect(scoreTide('2026-05-20T07:00:00Z', '2026-05-20T09:00:00Z', [], [])).toBe(0.5)
  })

  it('marée montante = score élevé', () => {
    const points = [
      { hour: 7, height_m: 1.0 },
      { hour: 8, height_m: 1.5 },
      { hour: 9, height_m: 2.0 },
    ]
    const score = scoreTide('2026-05-20T07:00:00Z', '2026-05-20T09:00:00Z', points, [])
    expect(score).toBeGreaterThan(0.5)
  })

  it('marée descendante = score inférieur à montante', () => {
    const rising = [
      { hour: 7, height_m: 1.0 },
      { hour: 8, height_m: 1.5 },
      { hour: 9, height_m: 2.0 },
    ]
    const falling = [
      { hour: 7, height_m: 2.0 },
      { hour: 8, height_m: 1.5 },
      { hour: 9, height_m: 1.0 },
    ]
    const risingScore = scoreTide('2026-05-20T07:00:00Z', '2026-05-20T09:00:00Z', rising, [])
    const fallingScore = scoreTide('2026-05-20T07:00:00Z', '2026-05-20T09:00:00Z', falling, [])
    expect(risingScore).toBeGreaterThan(fallingScore)
  })
})

describe('scoreWind', () => {
  it('10 km/h = 1.0 (idéal)', () => {
    expect(scoreWind(10)).toBe(1.0)
  })
  it('< 5 km/h = 0.9', () => {
    expect(scoreWind(3)).toBe(0.9)
  })
  it('20 km/h = 0.75', () => {
    expect(scoreWind(20)).toBe(0.75)
  })
  it('30 km/h = 0.35', () => {
    expect(scoreWind(30)).toBe(0.35)
  })
  it('50 km/h = 0.1', () => {
    expect(scoreWind(50)).toBe(0.1)
  })
  it('null = 0.7 (neutre)', () => {
    expect(scoreWind(null)).toBe(0.7)
  })
})

describe('qualityFromScore', () => {
  it('< 40 → faible', () => expect(qualityFromScore(30)).toBe('faible'))
  it('40-59 → moyenne', () => expect(qualityFromScore(50)).toBe('moyenne'))
  it('60-74 → bonne', () => expect(qualityFromScore(65)).toBe('bonne'))
  it('75-89 → tres_bonne', () => expect(qualityFromScore(80)).toBe('tres_bonne'))
  it('>= 90 → exceptionnelle', () => expect(qualityFromScore(95)).toBe('exceptionnelle'))
})

describe('scoreWindow', () => {
  it('retourne un score 0-100 et des factors', () => {
    const event = makeEvent('moon_apex')
    const { score, factors } = scoreWindow(event, '2026-05-20T07:00:00Z', '2026-05-20T09:00:00Z', [], [], 10)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
    expect(factors.reasons.length).toBeGreaterThan(0)
    expect(factors.reasons[0]).toBe('Lune au zénith')
  })
})
