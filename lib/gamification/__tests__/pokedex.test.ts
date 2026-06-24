import { describe, it, expect } from 'vitest'
import { buildPokedex } from '../pokedex'
import { SPECIES_SLUGS, SPECIES } from '@/lib/seo/programmatic'
import type { CatchBreakdown } from '@/lib/catches/queries'

describe('buildPokedex', () => {
  it('renvoie une carte par espèce du référentiel, toutes grisées quand le breakdown est vide', () => {
    const pk = buildPokedex(null)
    expect(pk.cards).toHaveLength(SPECIES_SLUGS.length)
    expect(pk.totalCount).toBe(SPECIES_SLUGS.length)
    expect(pk.capturedCount).toBe(0)
    expect(pk.cards.every((c) => c.captured === false)).toBe(true)
    expect(pk.cards.every((c) => c.count === 0)).toBe(true)
  })

  it('marque comme capturées les espèces présentes (pont dbKey → slug)', () => {
    const breakdown: CatchBreakdown = {
      bySpecies: [
        { species: 'bar', count: 3, avgSize: 42.4 },
        { species: 'dorade_royale', count: 1, avgSize: null },
      ],
      byTechnique: null,
      byMonth: null,
    }
    const pk = buildPokedex(breakdown)
    expect(pk.capturedCount).toBe(2)

    const bar = pk.cards.find((c) => c.slug === 'bar')!
    expect(bar.captured).toBe(true)
    expect(bar.count).toBe(3)
    expect(bar.biggest).toBe(42) // avgSize arrondi

    const dorade = pk.cards.find((c) => c.slug === 'dorade-royale')!
    expect(dorade.captured).toBe(true)
    expect(dorade.count).toBe(1)
    expect(dorade.biggest).toBeNull() // avgSize null

    // une espèce non présente reste grisée
    const sar = pk.cards.find((c) => c.slug === 'sar')!
    expect(sar.captured).toBe(false)
    expect(sar.count).toBe(0)
  })

  it('ignore une clé DB inconnue (pas de carte fantôme, total = taille du référentiel)', () => {
    const breakdown: CatchBreakdown = {
      bySpecies: [{ species: 'poisson_inconnu', count: 5, avgSize: 30 }],
      byTechnique: null,
      byMonth: null,
    }
    const pk = buildPokedex(breakdown)
    expect(pk.totalCount).toBe(SPECIES_SLUGS.length)
    expect(pk.capturedCount).toBe(0)
  })

  it('pokédex complet : toutes les espèces distinctes capturées → toutes les cartes capturées', () => {
    const breakdown: CatchBreakdown = {
      bySpecies: SPECIES_SLUGS.map((slug) => ({
        species: SPECIES[slug].dbKey,
        count: 1,
        avgSize: null,
      })),
      byTechnique: null,
      byMonth: null,
    }
    const pk = buildPokedex(breakdown)
    expect(pk.capturedCount).toBe(SPECIES_SLUGS.length)
    expect(pk.cards.every((c) => c.captured)).toBe(true)
  })
})
