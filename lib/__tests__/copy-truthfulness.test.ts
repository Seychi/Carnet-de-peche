import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SPECIES } from '@/lib/seo/programmatic'

// Garde-fou anti-régression (BUG-07/BUG-14), modelé sur no-dev-leaks.test.ts :
// on relit le source brut des pages marketing pour interdire les promesses
// mensongères / datées, et on verrouille le genre des articles d'espèces.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

const MARKETING_FILES = [
  'app/(marketing)/page.tsx',
  'app/(marketing)/tarifs/page.tsx',
  'app/(marketing)/tarifs/pricing-cards.tsx',
  'app/(marketing)/especes/[slug]/page.tsx',
  'app/(marketing)/peche/[...slug]/page.tsx',
]

describe('copy marketing — aucune promesse mensongère/datée (BUG-07)', () => {
  const blob = MARKETING_FILES.map(read).join('\n')

  it('aucune mention « Export GPX/JSON »', () => {
    expect(blob).not.toMatch(/Export GPX/i)
  })
  it('aucune date implicite (« prévu cette année », « Corse prévue »)', () => {
    expect(blob).not.toMatch(/prévu cette année/i)
    expect(blob).not.toMatch(/Corse (est )?prévue/i)
  })
  it('aucun chiffre de couverture faux (« 27 départements »)', () => {
    expect(blob).not.toMatch(/27 départements/i)
  })
  it('plus de « — bientôt » survendu', () => {
    expect(blob).not.toMatch(/— bientôt/)
  })
})

describe('articles d’espèces (BUG-14)', () => {
  it('dorade royale = féminin, orphie = élision', () => {
    expect(SPECIES['dorade-royale'].article).toBe('La ')
    expect(SPECIES['dorade-royale'].articleDe).toBe('de la ')
    expect(SPECIES.orphie.article).toBe("L'")
    expect(SPECIES.orphie.articleDe).toBe("de l'")
  })
  it('bar / lieu jaune / maquereau / sar = masculins inchangés', () => {
    for (const s of ['bar', 'lieu-jaune', 'maquereau', 'sar'] as const) {
      expect(SPECIES[s].article).toBe('Le ')
      expect(SPECIES[s].articleDe).toBe('du ')
    }
  })
  it('concaténation propre (élision sans espace parasite)', () => {
    expect(`${SPECIES['dorade-royale'].article}${SPECIES['dorade-royale'].labelLower}`).toBe(
      'La dorade royale',
    )
    expect(`${SPECIES.orphie.article}${SPECIES.orphie.labelLower}`).toBe("L'orphie")
    expect(`${SPECIES.bar.article}${SPECIES.bar.labelLower}`).toBe('Le bar')
  })
})
