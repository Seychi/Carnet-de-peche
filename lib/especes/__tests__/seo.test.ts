import { describe, it, expect } from 'vitest'
import { SPECIES, type SpeciesSlug } from '@/lib/seo/programmatic'
import { ESPECES_CONTENT } from '@/lib/especes/content'
import {
  buildSpeciesTitle,
  buildSpeciesDescription,
  formatMailleShort,
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
} from '@/lib/especes/seo'

// Sprint 75 Bloc 4. Ces titles/descriptions sont servis à ~5 700 impressions par
// trimestre : une régression y est invisible en QA (rien ne casse à l'écran) mais
// coûte directement des clics. D'où des tests sur les 26 espèces RÉELLES, pas sur
// des fixtures : c'est la donnée de production qui doit tenir dans les budgets.

const SLUGS = Object.keys(SPECIES) as SpeciesSlug[]

function inputFor(slug: SpeciesSlug) {
  return {
    meta: SPECIES[slug],
    content: ESPECES_CONTENT[slug],
    // Date figée : la description dépend de la saison en cours, le test ne doit
    // pas changer de résultat selon le jour où il tourne.
    now: new Date('2026-07-15T10:00:00Z'),
  }
}

describe('buildSpeciesTitle — les 26 espèces réelles', () => {
  it('couvre bien 26 espèces (garde-fou : le référentiel ne doit pas rétrécir en silence)', () => {
    expect(SLUGS.length).toBe(26)
  })

  it.each(SLUGS)('%s : title sous la limite SERP', (slug) => {
    expect(buildSpeciesTitle(inputFor(slug)).length).toBeLessThanOrEqual(TITLE_MAX_LENGTH)
  })

  it('porte l’intention pêche et la donnée actionnable, jamais une définition', () => {
    const title = buildSpeciesTitle(inputFor('maigre'))
    // La requête réellement observée est « maille du maigre 2026 ».
    expect(title).toContain('maille')
    expect(title).toMatch(/\d+/)
    expect(title).toContain('2026')
  })

  it('respecte l’override seoTitle (sprint 77 Bloc 9, fiches à intention identification)', () => {
    // mulet / tassergal / congre portent un `seoTitle` manuel : la formule générique
    // (maille + saisons/spots) ne doit JAMAIS reprendre le dessus tant qu'il est présent.
    for (const slug of ['mulet', 'tassergal', 'congre'] as const) {
      const content = ESPECES_CONTENT[slug]
      expect(content.seoTitle).toBeTruthy()
      expect(buildSpeciesTitle(inputFor(slug))).toBe(content.seoTitle)
    }
  })

  it('dégrade proprement quand l’espèce n’a aucune maille (aucune valeur inventée)', () => {
    const sansMaille = {
      meta: SPECIES.bar,
      content: {
        ...ESPECES_CONTENT.bar,
        regulation: {
          ...ESPECES_CONTENT.bar.regulation,
          minSizeCm: { 'manche-atlantique': null, mediterranee: null },
        },
      },
      now: new Date('2026-07-15T10:00:00Z'),
    }
    const title = buildSpeciesTitle(sansMaille)
    expect(title).not.toMatch(/maille/i)
    expect(title).toContain('pêche du bord')
    expect(title.length).toBeLessThanOrEqual(TITLE_MAX_LENGTH)
  })
})

describe('buildSpeciesDescription — les 26 espèces réelles', () => {
  it.each(SLUGS)('%s : description sous la limite SERP', (slug) => {
    expect(buildSpeciesDescription(inputFor(slug)).length).toBeLessThanOrEqual(
      DESCRIPTION_MAX_LENGTH,
    )
  })

  it('promet la réponse concrète plutôt que de décrire le site', () => {
    const d = buildSpeciesDescription(inputFor('maigre'))
    expect(d).toContain('Maille')
    expect(d).toContain('50 cm')
    expect(d).toContain('45 cm')
    // L'ancienne description générique parlait de « la fiche complète ».
    expect(d).not.toMatch(/fiche complète/i)
  })
})

describe('invariants de sortie (les 26 espèces, title + description)', () => {
  it.each(SLUGS)('%s : ni undefined, ni null, ni NaN dans la copie servie', (slug) => {
    const out = buildSpeciesTitle(inputFor(slug)) + buildSpeciesDescription(inputFor(slug))
    expect(out).not.toMatch(/undefined|null|NaN/)
  })

  it.each(SLUGS)('%s : zéro tiret cadratin (CLAUDE.md §6)', (slug) => {
    const out = buildSpeciesTitle(inputFor(slug)) + buildSpeciesDescription(inputFor(slug))
    expect(out).not.toContain('—')
  })

  it('chaque fiche a un title DISTINCT (pas de duplicate content SERP)', () => {
    const titles = SLUGS.map((s) => buildSpeciesTitle(inputFor(s)))
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('chaque fiche a une description DISTINCTE', () => {
    const descriptions = SLUGS.map((s) => buildSpeciesDescription(inputFor(s)))
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })
})

describe('formatMailleShort', () => {
  it('une seule valeur quand les deux façades s’accordent', () => {
    expect(formatMailleShort({ 'manche-atlantique': 30, mediterranee: 30 })).toBe('30 cm')
  })

  it('une fourchette quand elles diffèrent', () => {
    expect(formatMailleShort({ 'manche-atlantique': 42, mediterranee: 30 })).toBe('30 à 42 cm')
  })

  it('une seule façade renseignée', () => {
    expect(formatMailleShort({ 'manche-atlantique': 25, mediterranee: null })).toBe('25 cm')
  })

  it('null quand la donnée n’existe pas (l’appelant n’affiche alors rien)', () => {
    expect(formatMailleShort({ 'manche-atlantique': null, mediterranee: null })).toBeNull()
  })
})
