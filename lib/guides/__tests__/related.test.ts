import { describe, it, expect } from 'vitest'
import { relatedGuidesFor } from '@/lib/guides/related'
import type { Guide } from '@/lib/guides/loader'

// Fixture minimale : seuls `slug` et `species` comptent pour cette règle.
function g(slug: string, species: string): Guide {
  return { slug, species, title: slug } as unknown as Guide
}

// Ordre d'entrée = celui de getAllGuides (du plus récent au plus ancien).
// Le piège reproduit ici est le vrai catalogue : 3 guides multi-espèces récents
// devant 2 guides dédiés au bar plus anciens.
const CATALOGUE: Guide[] = [
  g('bretagne', 'Multi-espèces'),
  g('recfishing', 'Multi-espèces'),
  g('courbe-maree', 'Multi-espèces'),
  g('bar-leurre', 'Bar'),
  g('bar-coefficients', 'Bar'),
  g('dorade-surfcasting', 'Dorade royale'),
]

describe('relatedGuidesFor', () => {
  it('LE BUG : les guides dédiés passent devant les multi-espèces plus récents', () => {
    const out = relatedGuidesFor(CATALOGUE, ['Bar']).map((x) => x.slug)
    expect(out.slice(0, 2)).toEqual(['bar-leurre', 'bar-coefficients'])
    // Avant le correctif, un simple filter().slice(0,3) rendait les 3 multi-espèces.
    expect(out).not.toEqual(['bretagne', 'recfishing', 'courbe-maree'])
  })

  it('complète avec des multi-espèces quand il n’y a pas assez de dédiés', () => {
    const out = relatedGuidesFor(CATALOGUE, ['Dorade royale']).map((x) => x.slug)
    expect(out[0]).toBe('dorade-surfcasting')
    expect(out).toHaveLength(3)
    expect(out.slice(1)).toEqual(['bretagne', 'recfishing'])
  })

  it('espèce sans guide dédié : uniquement des multi-espèces, jamais rien d’une autre espèce', () => {
    const out = relatedGuidesFor(CATALOGUE, ['Congre']).map((x) => x.slug)
    expect(out).toEqual(['bretagne', 'recfishing', 'courbe-maree'])
    expect(out).not.toContain('bar-leurre')
  })

  it('plusieurs espèces (fiche spot) : tous les dédiés d’abord', () => {
    const out = relatedGuidesFor(CATALOGUE, ['Bar', 'Dorade royale']).map((x) => x.slug)
    expect(out).toEqual(['bar-leurre', 'bar-coefficients', 'dorade-surfcasting'])
  })

  it('respecte la limite demandée', () => {
    expect(relatedGuidesFor(CATALOGUE, ['Bar'], 1).map((x) => x.slug)).toEqual(['bar-leurre'])
    // 2 dédiés bar + 3 multi-espèces = 5. Le guide dorade est exclu : il n'est ni
    // dédié à l'espèce demandée, ni générique.
    expect(relatedGuidesFor(CATALOGUE, ['Bar'], 10)).toHaveLength(5)
  })

  it('conserve l’ordre d’entrée à l’intérieur de chaque groupe (le plus récent d’abord)', () => {
    const out = relatedGuidesFor(CATALOGUE, ['Bar'], 6).map((x) => x.slug)
    expect(out).toEqual([
      'bar-leurre',
      'bar-coefficients',
      'bretagne',
      'recfishing',
      'courbe-maree',
      // dorade-surfcasting n'est ni dédié ni multi-espèces → exclu.
    ])
  })

  it('catalogue vide : renvoie une liste vide, l’appelant n’affiche pas le bloc', () => {
    expect(relatedGuidesFor([], ['Bar'])).toEqual([])
  })
})
