import { describe, it, expect } from 'vitest'
import { computeChallengeProgress, type ChallengeCatch } from '../challenges'

// Façade Manche/Atlantique via le département 29 (Finistère).
// Données réglementaires utilisées (lib/regulation/data.ts) :
//  · bar : maille MA = 42 cm.
//  · lieu jaune : fermeture MA façade-large (zone null) en janvier→avril (type 'closed')
//    → strictlyClosed = true. C'est le cas « fermeture dure » propre pour le test.

const MA_DEPT = '29'

function c(partial: Partial<ChallengeCatch>): ChallengeCatch {
  return {
    species: null,
    released: null,
    size_cm: null,
    caught_at: '2026-06-15T10:00:00.000Z',
    department: MA_DEPT,
    lat: null,
    lng: null,
    ...partial,
  }
}

function get(challenges: ReturnType<typeof computeChallengeProgress>, slug: string) {
  return challenges.find((x) => x.slug === slug)!
}

describe('computeChallengeProgress — relâche tes sous-tailles', () => {
  it('compte une sous-taille relâchée comme bien jouée', () => {
    const res = computeChallengeProgress([
      c({ species: 'bar', size_cm: 30, released: true }), // < 42 → undersize, relâché ✓
    ])
    const ch = get(res, 'release_undersize')
    expect(ch.total).toBe(1)
    expect(ch.done).toBe(1)
    expect(ch.complete).toBe(true)
  })

  it('compte une sous-taille prélevée comme manquée', () => {
    const res = computeChallengeProgress([
      c({ species: 'bar', size_cm: 30, released: false }), // undersize mais gardé
    ])
    const ch = get(res, 'release_undersize')
    expect(ch.total).toBe(1)
    expect(ch.done).toBe(0)
    expect(ch.complete).toBe(false)
  })

  it('ne compte pas une prise au-dessus de la maille', () => {
    const res = computeChallengeProgress([c({ species: 'bar', size_cm: 50, released: false })])
    expect(get(res, 'release_undersize').total).toBe(0)
  })

  it('ignore une prise à façade inconnue (ni département côtier ni géoloc)', () => {
    const res = computeChallengeProgress([
      c({ species: 'bar', size_cm: 30, released: false, department: null, lat: null, lng: null }),
    ])
    expect(get(res, 'release_undersize').total).toBe(0)
  })
})

describe('computeChallengeProgress — respecte les fermetures', () => {
  it('fermeture dure (lieu jaune, janvier, MA) : relâché = respecté', () => {
    const res = computeChallengeProgress([
      c({ species: 'lieu_jaune', caught_at: '2026-01-15T10:00:00.000Z', released: true }),
    ])
    const ch = get(res, 'respect_closures')
    expect(ch.total).toBe(1)
    expect(ch.done).toBe(1)
    expect(ch.complete).toBe(true)
  })

  it('fermeture dure : prélevé = manqué', () => {
    const res = computeChallengeProgress([
      c({ species: 'lieu_jaune', caught_at: '2026-01-15T10:00:00.000Z', released: false }),
    ])
    const ch = get(res, 'respect_closures')
    expect(ch.total).toBe(1)
    expect(ch.done).toBe(0)
    expect(ch.complete).toBe(false)
  })

  it('hors fenêtre de fermeture (juin) : non concerné', () => {
    const res = computeChallengeProgress([
      c({ species: 'lieu_jaune', caught_at: '2026-06-15T10:00:00.000Z', released: false }),
    ])
    expect(get(res, 'respect_closures').total).toBe(0)
  })
})

describe('computeChallengeProgress — déclare tes prises sensibles', () => {
  it('compte les prises déclarables (bar sur MA) comme rappel, done reste 0', () => {
    const res = computeChallengeProgress([
      c({ species: 'bar', size_cm: 50, released: false }), // bar = déclarable RecFishing sur MA
    ])
    const ch = get(res, 'declare_sensitive')
    expect(ch.total).toBe(1)
    expect(ch.done).toBe(0) // on ne déclare pas à la place du pêcheur
    expect(ch.complete).toBe(false)
  })
})

describe('computeChallengeProgress — liste vide', () => {
  it('renvoie 3 défis à 0 sans planter', () => {
    const res = computeChallengeProgress([])
    expect(res).toHaveLength(3)
    expect(res.every((x) => x.total === 0 && x.done === 0 && x.complete === false)).toBe(true)
  })
})
