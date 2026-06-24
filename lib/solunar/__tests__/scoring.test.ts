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
  // NB sprint 24 : scoreTide lit l'heure LOCALE Paris des bornes. Les ISO ci-dessous
  // sont en UTC ; 05:00Z–07:00Z = 07h–09h Paris (CEST), alignées sur les tidePoints
  // (hour locale 7/8/9). Avant le fix, getUTCHours() lisait 7/9 par coïncidence ; le
  // décalage réel (1-2 h) faussait la sélection du créneau en prod.
  it('retourne 0.35 si pas de données (plafonné sous le neutre, recalibrage 10.6)', () => {
    expect(scoreTide('2026-05-20T05:00:00Z', '2026-05-20T07:00:00Z', [], [])).toBe(0.35)
  })

  it('marée montante = score élevé', () => {
    const points = [
      { hour: 7, height_m: 1.0 },
      { hour: 8, height_m: 1.5 },
      { hour: 9, height_m: 2.0 },
    ]
    const score = scoreTide('2026-05-20T05:00:00Z', '2026-05-20T07:00:00Z', points, [])
    expect(score).toBeGreaterThan(0.5)
  })

  it('montante seule = 0.8 ; le 1.0 exige un extremum (PM/BM) dans la fenêtre', () => {
    const points = [
      { hour: 7, height_m: 1.0 },
      { hour: 8, height_m: 1.5 },
      { hour: 9, height_m: 2.0 },
    ]
    const sansExtremum = scoreTide('2026-05-20T05:00:00Z', '2026-05-20T07:00:00Z', points, [])
    const avecExtremum = scoreTide('2026-05-20T05:00:00Z', '2026-05-20T07:00:00Z', points, [
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
    const risingScore = scoreTide('2026-05-20T05:00:00Z', '2026-05-20T07:00:00Z', rising, [])
    const fallingScore = scoreTide('2026-05-20T05:00:00Z', '2026-05-20T07:00:00Z', falling, [])
    expect(risingScore).toBeGreaterThan(fallingScore)
  })

  it('fenêtre enjambant minuit : garde la portion avant minuit (pas de NO_DATA à tort)', () => {
    // Fenêtre 22h–00h Paris (CEST) = 20:00Z–22:00Z → startHour=22, endHour=0 (wrap).
    // Avant le fix, le filtre h>=22 && h<=0 était vide → 0.35 (NO_DATA) à tort.
    const points = [
      { hour: 22, height_m: 1.0 },
      { hour: 23, height_m: 1.6 }, // montante
    ]
    const score = scoreTide('2026-05-20T20:00:00Z', '2026-05-20T22:00:00Z', points, [])
    expect(score).toBe(0.8) // montante détectée, pas 0.35
  })
})

// Courbe recalibrée sprint 19 : pic unique à 10 km/h, continue, plus de plateau plat.
describe('scoreWind (courbe continue sprint 19)', () => {
  it('10 km/h = 1.0 (pic idéal)', () => {
    expect(scoreWind(10)).toBe(1.0)
  })
  it('≤ 3 km/h = 0.85 (calme, léger retrait, pas de pénalité forte — D1)', () => {
    expect(scoreWind(3)).toBe(0.85)
    expect(scoreWind(0)).toBe(0.85)
    expect(scoreWind(-2)).toBe(0.85) // valeur aberrante clampée à 0
  })
  it('20 km/h ≈ 0.633 (décroissance 1.0 → 0.45 entre 10 et 25)', () => {
    expect(scoreWind(20)).toBeCloseTo(0.6333, 3)
  })
  it('25 km/h = 0.45 (borne basse de la bande acceptable)', () => {
    expect(scoreWind(25)).toBeCloseTo(0.45, 5)
  })
  it('30 km/h = 0.30 (décroissance 0.45 → 0 entre 25 et 40)', () => {
    expect(scoreWind(30)).toBeCloseTo(0.30, 5)
  })
  it('40 km/h et plus = 0 (plus de plancher)', () => {
    expect(scoreWind(40)).toBe(0)
    expect(scoreWind(50)).toBe(0)
  })
  it('null = 0.7 (neutre)', () => {
    expect(scoreWind(null)).toBe(0.7)
  })

  // ── Anti-saturation (le cœur du sprint 19) ──────────────────────────────────
  it('ANTI-SATURATION : 18 km/h ne sature PLUS (< 1.0 → contrib < 25/25)', () => {
    expect(scoreWind(18)).toBeLessThan(1.0)
    // contrib affichée = round(factor × 0.25 × 100) doit être strictement < 25
    expect(Math.round(scoreWind(18) * 0.25 * 100)).toBeLessThan(25)
  })
  it('13 km/h ne donne plus 25/25 (fin du plateau plat 5–15)', () => {
    expect(scoreWind(13)).toBeLessThan(1.0)
    expect(Math.round(scoreWind(13) * 0.25 * 100)).toBeLessThan(25)
  })
  it('le vent DISCRIMINE : 6, 10, 15, 20 km/h donnent 4 contribs distinctes', () => {
    const contribs = [6, 10, 15, 20].map((v) => Math.round(scoreWind(v) * 0.25 * 100))
    expect(new Set(contribs).size).toBe(4)
  })
  it('pic unique à 10 : décroît de part et d’autre', () => {
    expect(scoreWind(10)).toBeGreaterThan(scoreWind(6))
    expect(scoreWind(10)).toBeGreaterThan(scoreWind(16))
  })
  it('courbe monotone décroissante au-delà du pic (10 < 15 < 20 < 30)', () => {
    expect(scoreWind(10)).toBeGreaterThan(scoreWind(15))
    expect(scoreWind(15)).toBeGreaterThan(scoreWind(20))
    expect(scoreWind(20)).toBeGreaterThan(scoreWind(30))
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
    const { score, factors } = scoreWindow(event, '2026-05-20T05:00:00Z', '2026-05-20T07:00:00Z', [], [], 10)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
    expect(factors.reasons.length).toBeGreaterThan(0)
    expect(factors.reasons[0]).toBe('Lune au zénith')
  })
})

// ─── Correctif marées Méditerranée (sprint 24) ────────────────────────────────
// Le « 0/35 » en Med était un FAUX NÉGATIF (seuil d'étale 0.1 m pensé Atlantique).
// Sous le marnage neutre (~0,15 m en Med), la marée devient NON DISCRIMINANTE : on
// retire son poids et on le renormalise sur astro+vent, au lieu d'imposer tide=0.
describe('scoreWindow — marée non discriminante en faible marnage (Med honnête)', () => {
  const event = makeEvent('moonrise') // solunar = 0.7
  // Marnage ~0,12 m (Méditerranée) — montante mais physiquement plate.
  const MED_FLAT = [
    { hour: 7, height_m: 1.0 },
    { hour: 8, height_m: 1.07 },
    { hour: 9, height_m: 1.12 },
  ]
  // Marnage 3 m (Atlantique) — montante franche.
  const ATL_STRONG = [
    { hour: 7, height_m: 1.0 },
    { hour: 8, height_m: 2.5 },
    { hour: 9, height_m: 4.0 },
  ]

  it('Med plat : tide neutralisée (poids 0), renormalisé sur astro+vent, marnage exposé', () => {
    const { factors } = scoreWindow(event, '2026-05-20T05:00:00Z', '2026-05-20T07:00:00Z', MED_FLAT, [], 10)
    expect(factors.tideNonDiscriminating).toBe(true)
    expect(factors.weights.tide).toBe(0)
    expect(factors.marnageM).toBeCloseTo(0.12, 2)
    // poids réparti : astro + vent somment à 1, dans les bons ratios 0.40:0.25
    expect(factors.weights.solunar + factors.weights.wind).toBeCloseTo(1, 5)
    expect(factors.weights.solunar).toBeCloseTo(0.4 / 0.65, 4)
    expect(factors.reasons).toContain('Marée plate (peu déterminante)')
  })

  it('Med plat : le score n’est PLUS plombé par un 0/35 (≥ un seuil correct)', () => {
    // solunar 0.7 × (0.4/0.65) + vent(10)=1.0 × (0.25/0.65) ≈ 0.815 → ~82/100
    const { score } = scoreWindow(event, '2026-05-20T05:00:00Z', '2026-05-20T07:00:00Z', MED_FLAT, [], 10)
    expect(score).toBeGreaterThan(70)
  })

  it('Atlantique (marnage fort) : marée PLEINEMENT comptée (poids 0.35 inchangé)', () => {
    const { factors } = scoreWindow(event, '2026-05-20T05:00:00Z', '2026-05-20T07:00:00Z', ATL_STRONG, [], 10)
    expect(factors.tideNonDiscriminating).toBe(false)
    expect(factors.weights.tide).toBeCloseTo(0.35, 5)
    expect(factors.weights.solunar).toBeCloseTo(0.4, 5)
    expect(factors.tide).toBeGreaterThan(0.5) // montante
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
          '2026-05-20T05:00:00Z',
          '2026-05-20T07:00:00Z',
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
      '2026-05-20T05:00:00Z',
      '2026-05-20T07:00:00Z',
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
