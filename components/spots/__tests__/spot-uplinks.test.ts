import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { buildSpotUpLinks, type UpLinkGuide } from '@/components/spots/SpotUpLinks'
import { SPECIES, SPECIES_BY_DB_KEY } from '@/lib/seo/programmatic'
import { COASTAL_DEPARTMENTS } from '@/lib/geo/departments'
import shapes from './fixtures/approved-spot-shapes.json'

// ─── Sprint 83, Bloc 2 — liens remontants de fiche de spot ───────────────────
//
// Le critère d'acceptation qui compte est « aucun lien mort ». On ne le prouve
// pas sur trois exemples choisis à la main : on le prouve sur les 607 fiches
// réellement publiées, contre les référentiels qui décident si la cible existe.
//
// La fixture `approved-spot-shapes.json` est la donnée de PROD relevée le
// 2026-08-17 : les 332 combinaisons distinctes (département × espèces ×
// techniques) des spots `moderation_status='approved'` et `visibility='public'`,
// avec le nombre de fiches que chaque combinaison représente. 332 lignes pèsent
// 50 Ko là où les 607 fiches en pèseraient trois fois plus, pour exactement la
// même couverture : les liens remontants ne dépendent QUE de ces trois champs.

type Shape = {
  department: string
  species: string[]
  techniques: string[]
  count: number
}
const SHAPES = shapes as Shape[]
const TOTAL_SPOTS = SHAPES.reduce((n, s) => n + s.count, 0)

// ── Le vrai catalogue de guides, lu sur le disque ─────────────────────────────
// `getAllGuides()` importe `server-only` : il n'est pas chargeable ici. On relit
// donc les mêmes fichiers avec le même parseur. C'est ce qui rend le test
// probant : un `/guides/<slug>` généré contre un fichier absent échoue ici.
const GUIDES_DIR = path.join(process.cwd(), 'content', 'guides')
const REAL_GUIDES: UpLinkGuide[] = fs
  .readdirSync(GUIDES_DIR)
  .filter((f) => f.endsWith('.mdx') && !f.startsWith('_'))
  .map((f) => {
    const { data } = matter(fs.readFileSync(path.join(GUIDES_DIR, f), 'utf-8'))
    return {
      slug: String(data.slug),
      species: String(data.species ?? 'Multi-espèces'),
      technique: data.technique ? String(data.technique) : undefined,
      category: String(data.category ?? 'Technique'),
      draft: Boolean(data.draft),
    }
  })
  .filter((g) => !g.draft)

const GUIDE_SLUGS = new Set(REAL_GUIDES.map((g) => g.slug))
const SPECIES_SLUG_SET = new Set(Object.keys(SPECIES))
const COASTAL = new Set<string>(COASTAL_DEPARTMENTS)

const linksFor = (s: Pick<Shape, 'department' | 'species' | 'techniques'>) =>
  buildSpotUpLinks({ ...s, guides: REAL_GUIDES })

describe('buildSpotUpLinks — les ancres', () => {
  it('nomme la destination du département, jamais « en savoir plus »', () => {
    const [dept] = linksFor({ department: '29', species: ['bar'], techniques: [] })
    expect(dept).toEqual({
      kind: 'department',
      href: '/spots?dept=29',
      label: 'Tous les spots du Finistère',
    })
  })

  it('accorde l’article du département (élision, féminin, pluriel)', () => {
    const label = (d: string) =>
      linksFor({ department: d, species: ['bar'], techniques: [] })[0].label
    expect(label('34')).toBe("Tous les spots de l'Hérault")
    expect(label('56')).toBe('Tous les spots du Morbihan')
    expect(label('50')).toBe('Tous les spots de la Manche')
    expect(label('40')).toBe('Tous les spots des Landes')
  })

  it('LE PIÈGE char(3) : le département arrive complété par des espaces', () => {
    // `spots.department` est un char(3). Sans trim(), DEPARTMENT_LABELS['29 ']
    // est undefined et le lien disparaît en silence (bugs des sprints 52 et 67).
    const padded = linksFor({ department: '29 ', species: ['bar'], techniques: [] })
    const trimmed = linksFor({ department: '29', species: ['bar'], techniques: [] })
    expect(padded).toEqual(trimmed)
    expect(padded[0].href).toBe('/spots?dept=29')
  })

  it('accorde l’article de l’espèce principale, élision comprise', () => {
    const label = (key: string) =>
      linksFor({ department: '29', species: [key], techniques: [] })[1].label
    expect(label('bar')).toBe('Pêcher le bar du bord')
    expect(label('dorade_royale')).toBe('Pêcher la dorade royale du bord')
    expect(label('orphie')).toBe("Pêcher l'orphie du bord")
  })

  it('prend la PREMIÈRE espèce du spot comme espèce principale', () => {
    const links = linksFor({
      department: '56',
      species: ['lieu_jaune', 'bar'],
      techniques: [],
    })
    expect(links[1].href).toBe('/especes/lieu-jaune')
  })
})

describe('buildSpotUpLinks — le guide de technique', () => {
  it('lie le guide quand l’espèce ET la technique du spot correspondent', () => {
    const links = linksFor({ department: '29', species: ['bar'], techniques: ['leurres'] })
    const guide = links.find((l) => l.kind === 'guide')
    expect(guide).toEqual({
      kind: 'guide',
      href: '/guides/peche-au-bar-au-leurre',
      label: 'Pêcher le bar au leurre',
    })
  })

  it('préfère le guide de catégorie Technique aux deux candidats bar/leurres', () => {
    // `les-meilleurs-coefficients-pour-pecher-le-bar` porte aussi technique:leurres,
    // mais il parle de coefficients : l'ancre « Pêcher le bar au leurre » ne le
    // décrirait pas honnêtement.
    const guide = linksFor({
      department: '29',
      species: ['bar'],
      techniques: ['leurres'],
    }).find((l) => l.kind === 'guide')
    expect(guide?.href).toBe('/guides/peche-au-bar-au-leurre')
  })

  it('ne lie AUCUN guide quand la technique n’en a pas', () => {
    // Aucun guide `flottante` ni `vif` dans content/guides : un lien mort coûte
    // plus cher que l'absence de lien.
    for (const t of ['flottante', 'vif']) {
      const links = linksFor({ department: '29', species: ['bar'], techniques: [t] })
      expect(links.some((l) => l.kind === 'guide')).toBe(false)
    }
  })

  it('ne promet pas une espèce dont le guide ne parle pas', () => {
    // Spot méditerranéen à l'oblade au surfcasting : le seul guide surfcasting
    // parle de la dorade royale. Aucun lien plutôt qu'une ancre fabriquée.
    const links = linksFor({
      department: '83',
      species: ['oblade', 'sar'],
      techniques: ['surfcasting'],
    })
    expect(links.some((l) => l.kind === 'guide')).toBe(false)
  })

  it('lie bien la dorade royale au surfcasting quand le spot la porte', () => {
    const guide = linksFor({
      department: '17',
      species: ['dorade_royale'],
      techniques: ['surfcasting'],
    }).find((l) => l.kind === 'guide')
    expect(guide).toEqual({
      kind: 'guide',
      href: '/guides/peche-a-la-dorade-royale-au-surfcasting',
      label: 'Pêcher la dorade royale au surfcasting',
    })
  })
})

describe('buildSpotUpLinks — dégradation, jamais d’invention', () => {
  it('ignore un département inconnu plutôt que d’afficher un code brut', () => {
    const links = linksFor({ department: '99', species: ['bar'], techniques: [] })
    expect(links.some((l) => l.kind === 'department')).toBe(false)
    expect(links[0].kind).toBe('species')
  })

  it('ignore une espèce hors référentiel (spots.species est du texte libre)', () => {
    const links = linksFor({ department: '29', species: ['poisson_chat'], techniques: [] })
    expect(links.some((l) => l.kind === 'species')).toBe(false)
  })

  it('ne rend rien du tout quand il n’y a ni département ni espèce connus', () => {
    expect(linksFor({ department: '', species: [], techniques: [] })).toEqual([])
  })

  it('est déterministe : deux appels donnent exactement le même HTML', () => {
    const a = linksFor({ department: '56', species: ['bar'], techniques: ['leurres'] })
    const b = linksFor({ department: '56', species: ['bar'], techniques: ['leurres'] })
    expect(a).toEqual(b)
  })
})

describe('buildSpotUpLinks — sur les 607 fiches publiées', () => {
  it('couvre la totalité de la fixture de prod', () => {
    expect(SHAPES.length).toBe(332)
    expect(TOTAL_SPOTS).toBe(607)
  })

  it('CRITÈRE : 100 % des fiches reçoivent le lien département ET le lien espèce', () => {
    let withDept = 0
    let withSpecies = 0
    for (const shape of SHAPES) {
      const links = linksFor(shape)
      if (links.some((l) => l.kind === 'department')) withDept += shape.count
      if (links.some((l) => l.kind === 'species')) withSpecies += shape.count
    }
    expect(withDept).toBe(TOTAL_SPOTS)
    expect(withSpecies).toBe(TOTAL_SPOTS)
  })

  it('CRITÈRE : aucun lien mort, chaque href pointe une cible qui existe', () => {
    for (const shape of SHAPES) {
      for (const link of linksFor(shape)) {
        if (link.kind === 'department') {
          const code = link.href.replace('/spots?dept=', '')
          // /spots?dept=<code> est déjà déclaré au sitemap avec son canonical.
          expect(COASTAL.has(code), `département inconnu : ${code}`).toBe(true)
        } else if (link.kind === 'species') {
          const slug = link.href.replace('/especes/', '')
          // /especes/[slug] est `dynamicParams = false` + generateStaticParams
          // sur Object.keys(SPECIES) : hors de cette liste, c'est un 404.
          expect(SPECIES_SLUG_SET.has(slug), `espèce sans page : ${slug}`).toBe(true)
        } else {
          const slug = link.href.replace('/guides/', '')
          expect(GUIDE_SLUGS.has(slug), `guide sans fichier : ${slug}`).toBe(true)
        }
      }
    }
  })

  it('les ancres sont descriptives et sans tiret cadratin', () => {
    const banni = /(en savoir plus|cliquez? ici|voir plus|lire la suite|ici)/i
    for (const shape of SHAPES) {
      for (const link of linksFor(shape)) {
        expect(link.label.length).toBeGreaterThan(10)
        expect(banni.test(link.label), `ancre creuse : ${link.label}`).toBe(false)
        // CLAUDE.md §6 : jamais de tiret cadratin dans une chaîne visible.
        expect(link.label).not.toContain('—')
        // Aucune coordonnée ne doit pouvoir apparaître dans une ancre.
        expect(link.label).not.toMatch(/\d+\.\d{3,}/)
      }
    }
  })

  it('la couverture du guide de technique est documentée, pas subie', () => {
    let withGuide = 0
    for (const shape of SHAPES) {
      if (linksFor(shape).some((l) => l.kind === 'guide')) withGuide += shape.count
    }
    // 508/607 au 2026-08-17 (bar × leurres, dorade royale × surfcasting). Les 99
    // restants n'ont pas de guide correspondant : ils n'en reçoivent pas.
    expect(withGuide).toBe(508)
  })

  it('chaque espèce du référentiel présente en base a bien une page', () => {
    const keys = new Set(SHAPES.flatMap((s) => s.species))
    for (const key of keys) {
      const slug = SPECIES_BY_DB_KEY[key]
      expect(slug, `clé DB sans slug : ${key}`).toBeDefined()
      expect(SPECIES_SLUG_SET.has(slug)).toBe(true)
    }
  })
})
