import { describe, it, expect } from 'vitest'
import { buildJustification, buildAlertMessage } from '../message'
import type { MatchedTendency } from '../types'

// ─── Garde-fous transverses (appliqués à TOUTE copie produite) ──────────────────
// - jamais de tiret cadratin ni demi-cadratin (CLAUDE.md §6) ;
// - jamais de pourcentage (aucun « 86 % » inventé) ;
// - jamais de coordonnée (pas de décimale GPS, pas de degré) ;
// - jamais de formulation prédictive (héritage contrainte 7.5).
function expectCleanCopy(text: string) {
  expect(text).not.toMatch(/[—–]/)
  expect(text).not.toContain('%')
  expect(text).not.toMatch(/\d+\.\d{3,}/) // décimale GPS-like
  expect(text).not.toContain('°')
  expect(/tu prendras|pêches mieux|prédit|garanti|réussite/i.test(text)).toBe(false)
}

const tideMatched: MatchedTendency = {
  factor: 'tide',
  label: 'en marée descendante',
  count: 6,
  sampleCount: 7,
  share: 6 / 7,
}

const hourMatchedFull: MatchedTendency = {
  factor: 'hour',
  label: 'le matin',
  count: 4,
  sampleCount: 4,
  share: 1,
}

describe('buildJustification — mode perso (aucun chiffre inventé)', () => {
  it('cite les faits mesurés et les VRAIS comptes de la tendance la plus forte', () => {
    const j = buildJustification({
      kind: 'perso',
      facts: {
        tideDirection: 'falling',
        windSpeedKmh: 12.3,
        windDirectionLabel: 'NO',
        tideRangeM: 5.42,
      },
      matched: [tideMatched],
    })
    expect(j).toBe(
      'Marnage 5,4 m, marée descendante, vent NO 12 km/h : 6 de tes 7 prises renseignées tombent en marée descendante.',
    )
    expectCleanCopy(j)
  })

  it('choisit la tendance à la part la plus forte', () => {
    const j = buildJustification({
      kind: 'perso',
      matched: [tideMatched, hourMatchedFull], // hour : 4/4 (share 1) > tide : 6/7
    })
    expect(j).toContain('le matin')
    expect(j).not.toContain('6 de tes 7')
    expectCleanCopy(j)
  })

  it('formule « tes N prises » quand toutes les prises renseignées coïncident', () => {
    const j = buildJustification({ kind: 'perso', matched: [hourMatchedFull] })
    expect(j).toBe('Tes 4 prises renseignées tombent le matin.')
    expectCleanCopy(j)
  })

  it('ne cite un coefficient QUE s’il est fourni (vrai coef, jamais fabriqué)', () => {
    const sans = buildJustification({
      kind: 'perso',
      facts: { tideDirection: 'falling', tideRangeM: 5.4 },
      matched: [tideMatched],
    })
    expect(sans).not.toContain('coef')

    const avec = buildJustification({
      kind: 'perso',
      facts: { tideCoefficient: 92, tideDirection: 'falling' },
      matched: [tideMatched],
    })
    expect(avec).toMatch(/coef 92/i)
    // Le coef prime sur le marnage : pas les deux à la fois.
    expect(avec).not.toContain('marnage')
    expectCleanCopy(avec)
  })

  it('ne cite pas le vent si sa vitesse est inconnue', () => {
    const j = buildJustification({
      kind: 'perso',
      facts: { tideDirection: 'rising', windSpeedKmh: null, windDirectionLabel: 'NO' },
      matched: [hourMatchedFull],
    })
    expect(j).not.toContain('vent')
    expect(j).not.toContain('NO')
    expectCleanCopy(j)
  })

  it('reste honnête sans aucune tendance matchée (garde-fou : aucun compte fabriqué)', () => {
    const j = buildJustification({ kind: 'perso', matched: [] })
    expect(j).not.toMatch(/\d+ de tes/)
    expect(j).not.toMatch(/tes \d+ prises/)
    expectCleanCopy(j)
  })
})

describe('buildJustification — mode générique (label explicite, zéro invention)', () => {
  it('marnage mesuré : label générique + invite à loguer', () => {
    const j = buildJustification({ kind: 'generique', facts: { tideRangeM: 5.42 } })
    expect(j).toBe(
      'Alerte générique grande marée (marnage 5,4 m). Logue tes prises pour la personnaliser.',
    )
    expectCleanCopy(j)
  })

  it('vrai coefficient fourni : « (coef 95) »', () => {
    const j = buildJustification({ kind: 'generique', facts: { tideCoefficient: 95 } })
    expect(j).toContain('Alerte générique grande marée (coef 95).')
    expectCleanCopy(j)
  })

  it('sans chiffre disponible : aucun chiffre affiché', () => {
    const j = buildJustification({ kind: 'generique' })
    expect(j).toBe('Alerte générique grande marée. Logue tes prises pour la personnaliser.')
    expect(j).not.toMatch(/\d/)
    expectCleanCopy(j)
  })
})

describe('buildAlertMessage — title / body / emailSubject', () => {
  const persoPayload = {
    spotName: 'Cale du Passage',
    windowLabel: 'demain 06:10',
    kind: 'perso' as const,
    justification:
      'Marée descendante, vent NO 12 km/h : 6 de tes 7 prises renseignées tombent en marée descendante.',
  }

  it('objet email perso VERROUILLÉ : « Demain 06:10 à [spot] : tes conditions »', () => {
    const m = buildAlertMessage(persoPayload)
    expect(m.emailSubject).toBe('Demain 06:10 à Cale du Passage : tes conditions')
  })

  it('perso : title et body citent le spot par son NOM (jamais de coordonnée)', () => {
    const m = buildAlertMessage(persoPayload)
    expect(m.title).toBe('Tes conditions arrivent à Cale du Passage')
    expect(m.body).toBe(
      'Demain 06:10 à Cale du Passage. Marée descendante, vent NO 12 km/h : 6 de tes 7 prises renseignées tombent en marée descendante.',
    )
    for (const t of [m.title, m.body, m.emailSubject]) expectCleanCopy(t)
  })

  it('générique : ne dit JAMAIS « tes conditions », assume le label grande marée', () => {
    const m = buildAlertMessage({
      spotName: 'Cale du Passage',
      windowLabel: 'demain 06:10',
      kind: 'generique',
      justification:
        'Alerte générique grande marée (marnage 5,4 m). Logue tes prises pour la personnaliser.',
    })
    expect(m.emailSubject).toBe('Demain 06:10 à Cale du Passage : grande marée')
    expect(m.emailSubject).not.toContain('tes conditions')
    expect(m.title).toBe('Grande marée demain à Cale du Passage')
    expect(m.body).toContain('générique')
    for (const t of [m.title, m.body, m.emailSubject]) expectCleanCopy(t)
  })

  it('le body tronqué à 140 (preview_text in-app) reste utilisable', () => {
    const m = buildAlertMessage(persoPayload)
    const preview = m.body.slice(0, 140)
    expect(preview.length).toBeLessThanOrEqual(140)
    expect(preview).toContain('Cale du Passage')
  })
})
