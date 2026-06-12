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
  // Recalibrage 10.6 : aucun événement seul ne vaut 1.0 — la composante max
  // exige un événement lunaire majeur EN nouvelle/pleine lune.
  it('moon_apex = 0.85 (sans bonus de phase)', () => {
    expect(scoreSolunar(makeEvent('moon_apex'))).toBe(0.85)
  })
  it('moon_nadir = 0.85', () => {
    expect(scoreSolunar(makeEvent('moon_nadir'))).toBe(0.85)
  })
  it('moonrise = 0.7', () => {
    expect(scoreSolunar(makeEvent('moonrise'))).toBe(0.7)
  })
  it('sunrise = 0.55', () => {
    expect(scoreSolunar(makeEvent('sunrise'))).toBe(0.55)
  })
  it('pleine lune applique le bonus (moonrise 0.7 × 1.2 = 0.84)', () => {
    const score = scoreSolunar(makeEvent('moonrise', 0.5))
    expect(score).toBeCloseTo(0.84, 5)
  })
  it('nouvelle lune applique le bonus', () => {
    const score = scoreSolunar(makeEvent('moonrise', 0.0))
    expect(score).toBeCloseTo(0.84, 5)
  })
  it('moon_apex + pleine lune = cap à 1.0 (0.85 × 1.2 → cap)', () => {
    const score = scoreSolunar(makeEvent('moon_apex', 0.5))
    expect(score).toBe(1.0)
  })
})

describe('scoreTide', () => {
  it('retourne 0.35 si pas de données (plafonné sous le neutre, recalibrage 10.6)', () => {
    expect(scoreTide('2026-05-20T07:00:00Z', '2026-05-20T09:00:00Z', [], [])).toBe(0.35)
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

  it('montante seule = 0.8 ; le 1.0 exige un extremum (PM/BM) dans la fenêtre', () => {
    const points = [
      { hour: 7, height_m: 1.0 },
      { hour: 8, height_m: 1.5 },
      { hour: 9, height_m: 2.0 },
    ]
    const sansExtremum = scoreTide('2026-05-20T07:00:00Z', '2026-05-20T09:00:00Z', points, [])
    const avecExtremum = scoreTide('2026-05-20T07:00:00Z', '2026-05-20T09:00:00Z', points, [
      { type: 'high', hour: 8, height_m: 2.0 },
    ])
    expect(sansExtremum).toBe(0.8)
    expect(avecExtremum).toBe(1.0)
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
  it('30 km/h ≈ 0.33 (décroissance 0.5 → 0 entre 25 et 40)', () => {
    expect(scoreWind(30)).toBeCloseTo(1 / 3, 5)
  })
  it('40 km/h et plus = 0 (plus de plancher, recalibrage 10.6)', () => {
    expect(scoreWind(40)).toBe(0)
    expect(scoreWind(50)).toBe(0)
  })
  it('null = 0.7 (neutre)', () => {
    expect(scoreWind(null)).toBe(0.7)
  })
})

describe('qualityFromScore', () => {
  it('< 40 → faible', () => expect(qualityFromScore(30)).toBe('faible'))
  it('40-59 → moyenne', () => expect(qualityFromScore(50)).toBe('moyenne'))
  it('60-79 → bonne', () => {
    expect(qualityFromScore(65)).toBe('bonne')
    expect(qualityFromScore(79)).toBe('bonne')
  })
  it('80-94 → tres_bonne', () => {
    expect(qualityFromScore(80)).toBe('tres_bonne')
    expect(qualityFromScore(94)).toBe('tres_bonne')
  })
  it('>= 95 → exceptionnelle', () => {
    expect(qualityFromScore(95)).toBe('exceptionnelle')
    expect(qualityFromScore(100)).toBe('exceptionnelle')
  })
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

// ─── Distribution anti-saturation (garde-fou recalibrage 10.6) ────────────────
// L'audit du 2026-06-11 a vu 6 jours sur 7 notés « 100 · Exceptionnelle ».
// Sur un échantillon synthétique déterministe de 7 jours × 24 créneaux balayant
// vent 0-40 km/h, marée montante/descendante/absente (± extremum) et tous les
// types d'événements solunaires : « exceptionnelle » doit rester rare et le bas
// de l'échelle doit exister. Si ce test casse, le scoring re-sature.

describe('distribution des qualités (échantillon synthétique 7 j × 24 créneaux)', () => {
  const EVENT_TYPES: SolunarEvent['type'][] = [
    'moon_apex',
    'moon_nadir',
    'moonrise',
    'moonset',
    'sunrise',
    'sunset',
  ]

  function buildSample() {
    const qualities: string[] = []
    for (let day = 0; day < 7; day++) {
      for (let slot = 0; slot < 24; slot++) {
        const i = day * 24 + slot
        const eventType = EVENT_TYPES[i % EVENT_TYPES.length]
        // Phase lunaire déterministe 0 → 0.95 : inclut nouvelle (0) et pleine (0.5) lune
        const moonPhase = (i % 20) / 20
        // Vent déterministe 0 → 40 km/h
        const wind = (i * 7) % 41

        // Marée : 1/3 absente, 1/3 montante, 1/3 descendante ; extremum 1 fois sur 4
        const tideKind = i % 3
        const points =
          tideKind === 0
            ? []
            : tideKind === 1
              ? [
                  { hour: 7, height_m: 1.0 },
                  { hour: 8, height_m: 1.5 },
                  { hour: 9, height_m: 2.0 },
                ]
              : [
                  { hour: 7, height_m: 2.0 },
                  { hour: 8, height_m: 1.5 },
                  { hour: 9, height_m: 1.0 },
                ]
        const extrema =
          tideKind !== 0 && i % 4 === 0
            ? [{ type: 'high' as const, hour: 8, height_m: 2.0 }]
            : []

        const { score } = scoreWindow(
          makeEvent(eventType, moonPhase),
          '2026-05-20T07:00:00Z',
          '2026-05-20T09:00:00Z',
          points,
          extrema,
          wind
        )
        qualities.push(qualityFromScore(score))
      }
    }
    return qualities
  }

  it('« exceptionnelle » ≤ 10 % des créneaux', () => {
    const qualities = buildSample()
    const ratio = qualities.filter((q) => q === 'exceptionnelle').length / qualities.length
    expect(ratio).toBeLessThanOrEqual(0.10)
  })

  it('au moins 20 % des créneaux sous « bonne » (faible ou moyenne)', () => {
    const qualities = buildSample()
    const ratio =
      qualities.filter((q) => q === 'faible' || q === 'moyenne').length / qualities.length
    expect(ratio).toBeGreaterThanOrEqual(0.20)
  })

  it('« exceptionnelle » reste atteignable quand TOUS les facteurs sont réunis', () => {
    // Zénith lunaire en pleine lune + marée montante avec PM dans la fenêtre + vent idéal
    const { score } = scoreWindow(
      makeEvent('moon_apex', 0.5),
      '2026-05-20T07:00:00Z',
      '2026-05-20T09:00:00Z',
      [
        { hour: 7, height_m: 1.0 },
        { hour: 8, height_m: 1.5 },
        { hour: 9, height_m: 2.0 },
      ],
      [{ type: 'high', hour: 8, height_m: 2.0 }],
      10
    )
    expect(qualityFromScore(score)).toBe('exceptionnelle')
  })
})
