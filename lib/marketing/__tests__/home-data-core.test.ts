import { describe, it, expect } from 'vitest'
import { rankByDayScore, HOME_TIERS } from '@/lib/marketing/home-data-core'

describe('rankByDayScore (sprint 34, WS-2) — choix déterministe du hero', () => {
  it('classe par day_score décroissant, spot sans score en dernier', () => {
    const spots = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const scores: Record<string, number | null> = { a: 40, b: 95, c: null }
    const ranked = rankByDayScore(spots, (id) => scores[id] ?? null)
    expect(ranked.map((s) => s.id)).toEqual(['b', 'a', 'c'])
  })

  it('déterministe : même entrée → même ordre', () => {
    const f = (id: string) => (({ a: 10, b: 20 }) as Record<string, number>)[id] ?? null
    const a = rankByDayScore([{ id: 'a' }, { id: 'b' }], f).map((s) => s.id)
    const b = rankByDayScore([{ id: 'a' }, { id: 'b' }], f).map((s) => s.id)
    expect(a).toEqual(['b', 'a'])
    expect(b).toEqual(a)
  })

  it('ne mute pas le tableau source', () => {
    const src = [{ id: 'x' }, { id: 'y' }]
    rankByDayScore(src, () => null)
    expect(src.map((s) => s.id)).toEqual(['x', 'y'])
  })
})

describe('HOME_TIERS — tarifs réels (source de vérité = lib/stripe/pricing)', () => {
  const byId = Object.fromEntries(HOME_TIERS.map((t) => [t.id, t]))

  it('3 formules dans l’ordre : Découverte (gratuit) + Local + Itinérant', () => {
    expect(HOME_TIERS.map((t) => t.id)).toEqual(['discovery', 'local', 'itinerant'])
    expect(HOME_TIERS.map((t) => t.name)).toEqual(['Découverte', 'Local', 'Itinérant'])
  })

  it('montants mensuels/annuels exacts', () => {
    expect(byId.discovery.monthly).toBe('0 €')
    expect(byId.discovery.annual).toBeNull()
    expect(byId.local.monthly).toBe('4,90 €')
    expect(byId.local.annual).toBe('49 €')
    expect(byId.itinerant.monthly).toBe('9,90 €')
    expect(byId.itinerant.annual).toBe('99 €')
  })

  it('un seul plan mis en avant (Local)', () => {
    expect(HOME_TIERS.filter((t) => t.highlight).map((t) => t.id)).toEqual(['local'])
  })
})
