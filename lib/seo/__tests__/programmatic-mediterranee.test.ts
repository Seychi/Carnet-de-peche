import { describe, it, expect } from 'vitest'
import {
  getAllProgrammaticPages,
  resolveProgrammaticSlug,
  programmaticTitle,
  programmaticUrl,
  deptPreposition,
  facadeOf,
  SPECIES,
  SPECIES_SLUGS,
  TECHNIQUES,
  DEPARTMENT_SLUGS,
  type SpeciesSlug,
  type TechniqueSlug,
} from '@/lib/seo/programmatic'
import { SPECIES_CONTENT } from '@/lib/seo/content'
import { ESPECES_CONTENT } from '@/lib/especes/content'
import { buildSpeciesTitle } from '@/lib/especes/seo'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 83, BLOC 4 — ouverture de /peche aux espèces méditerranéennes.
//
// Le format /peche/<espèce>/<technique>[/<dépt>] tient 5 à 7 % de CTR, cinq fois
// /especes, et ne couvrait que 6 espèces sur 26, toutes atlantiques, alors que
// l'inventaire est passé à 44,6 % de Méditerranée après le lot 1 du sprint 78.
//
// CE QUI DÉCIDE QU'UNE PAGE EXISTE : le comptage en base, pas une intuition.
// Relevé du 2026-08-17, spots `moderation_status = 'approved'` ET
// `visibility = 'public'` (607 spots au total), ventilés par espèce et par
// département avec `trim()` des deux côtés (`spots.department` est un char(3)
// complété par des espaces : bug rencontré aux sprints 52 et 67).
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Le relevé SQL, figé. Il sert de SOURCE au test : on vérifie que les pages
 * générées sont exactement celles que l'inventaire justifie. Si la curation fait
 * bouger ces chiffres, on rejoue la requête et on met à jour les DEUX endroits
 * (ici et SPECIES_DEPARTMENTS_WITH_INVENTORY).
 */
const INVENTORY_2026_08_17: Record<string, Record<string, number>> = {
  seiche: {
    '56': 45, '29': 40, '44': 12, '85': 12, '13': 9, '22': 9, '2A': 9, '2B': 9,
    '50': 8, '17': 7, '34': 6, '76': 6, '83': 6, '06': 5, '33': 5, '35': 5,
    '62': 5, '64': 5, '14': 4, '30': 4, '40': 4, '66': 4, '11': 3, '59': 3,
  },
  oblade: {
    '2A': 34, '2B': 32, '83': 30, '13': 29, '06': 28, '66': 24, '34': 22,
    '11': 19, '30': 9,
  },
  marbre: {
    '2B': 22, '34': 18, '11': 17, '06': 15, '83': 10, '30': 9, '66': 9,
    '2A': 8, '13': 4,
  },
  pageot: {
    '13': 26, '2A': 21, '83': 20, '66': 12, '06': 8, '2B': 6, '11': 3,
    // Sous le seuil, donc AUCUNE page : 34 (2), 64 (2), 30 (1).
    '34': 2, '64': 2, '30': 1,
  },
  rouget: {
    '33': 5, '85': 4, '34': 3, '40': 3, '44': 3,
    // Sous le seuil : 18 départements à 1 ou 2 spots.
    '13': 2, '14': 2, '29': 2, '2B': 2, '56': 2, '59': 2, '76': 2,
    '06': 1, '11': 1, '17': 1, '22': 1, '30': 1, '35': 1, '50': 1, '62': 1,
    '64': 1, '66': 1, '83': 1,
  },
  liche: {
    '2A': 3, '83': 3,
    // Sous le seuil : 06 (2), 11 (2), 66 (2), 13 (1), 30 (1), 34 (1).
    '06': 2, '11': 2, '66': 2, '13': 1, '30': 1, '34': 1,
  },
}

/** Seuil du bloc : une page doit s'appuyer sur au moins 3 spots réels. */
const MIN_SPOTS = 3

/** Les 6 espèces ouvertes au sprint 83. Les 6 historiques ne doivent PAS bouger. */
const NEW_SPECIES: SpeciesSlug[] = ['seiche', 'oblade', 'marbre', 'pageot', 'rouget', 'liche']
const LEGACY_SPECIES: SpeciesSlug[] = [
  'bar',
  'dorade-royale',
  'lieu-jaune',
  'maquereau',
  'sar',
  'orphie',
]

const PAGES = getAllProgrammaticPages()
const NEW_PAGES = PAGES.filter((p) => NEW_SPECIES.includes(p.species))
const LEGACY_PAGES = PAGES.filter((p) => LEGACY_SPECIES.includes(p.species))

// ── Volume : le plafond de crawl est une contrainte, pas une intention ─────────

describe('volume de pages créées (plafond de découverte Google)', () => {
  it('crée exactement 118 pages, et les 337 historiques sont intactes', () => {
    expect(LEGACY_PAGES.length).toBe(337)
    expect(NEW_PAGES.length).toBe(118)
    expect(PAGES.length).toBe(455)
  })

  it('reste sous le plafond dur de 150 pages du brief', () => {
    // ~10 URLs/jour de débit de découverte : au-delà de 150, on remplit une file
    // d'attente au lieu de gagner des impressions.
    expect(NEW_PAGES.length).toBeLessThanOrEqual(150)
  })

  it('ventile les nouvelles pages comme l’inventaire le justifie', () => {
    const perSpecies = Object.fromEntries(
      NEW_SPECIES.map((s) => [s, NEW_PAGES.filter((p) => p.species === s).length]),
    )
    expect(perSpecies).toEqual({
      seiche: 50, // 2 techniques × (1 nationale + 24 départements)
      oblade: 20, // 2 × (1 + 9)
      marbre: 20, // 2 × (1 + 9)
      pageot: 16, // 2 × (1 + 7)
      rouget: 6, //  1 × (1 + 5)
      liche: 6, //   2 × (1 + 2)
    })
  })

  it('le sitemap augmente EXACTEMENT du nombre de pages créées', () => {
    // app/sitemap.ts mappe getAllProgrammaticPages() 1 pour 1, sans filtre : le
    // delta de pages est donc le delta d'URLs déclarées à Google.
    const urls = PAGES.map(programmaticUrl)
    expect(new Set(urls).size).toBe(PAGES.length) // aucune URL en double
    expect(urls.length - 337).toBe(118)
  })
})

// ── Le garde-fou central : pas de page sans spots réels derrière ───────────────

describe('chaque page départementale s’appuie sur ≥ 3 spots réels', () => {
  it('aucune page ne sort sur un département sous le seuil', () => {
    const faibles: string[] = []
    for (const p of NEW_PAGES) {
      if (!p.deptCode) continue
      const n = INVENTORY_2026_08_17[SPECIES[p.species].dbKey]?.[p.deptCode] ?? 0
      if (n < MIN_SPOTS) faibles.push(`${programmaticUrl(p)} → ${n} spot(s)`)
    }
    expect(faibles).toEqual([])
  })

  it('réciproquement, tout département au-dessus du seuil A ses pages', () => {
    const manquantes: string[] = []
    for (const species of NEW_SPECIES) {
      const dbKey = SPECIES[species].dbKey
      for (const [dept, n] of Object.entries(INVENTORY_2026_08_17[dbKey])) {
        if (n < MIN_SPOTS) continue
        const has = NEW_PAGES.some((p) => p.species === species && p.deptCode === dept)
        if (!has) manquantes.push(`${species}/${dept} (${n} spots)`)
      }
    }
    expect(manquantes).toEqual([])
  })

  it('les couples SANS inventaire suffisant renvoient 404, pas une page creuse', () => {
    // Les cas réels du relevé : pageot dans l'Hérault (2 spots), dans le Gard (1),
    // dans les Pyrénées-Atlantiques (2) ; liche dans les Alpes-Maritimes (2) ;
    // rouget dans le Finistère (2) et le Morbihan (2).
    const attendus404: [SpeciesSlug, TechniqueSlug, string][] = [
      ['pageot', 'surfcasting', '34'],
      ['pageot', 'flottante', '30'],
      ['pageot', 'surfcasting', '64'],
      ['liche', 'leurres', '06'],
      ['liche', 'vif', '13'],
      ['rouget', 'surfcasting', '29'],
      ['rouget', 'surfcasting', '56'],
    ]
    for (const [species, technique, dept] of attendus404) {
      const slug = [species, technique, DEPARTMENT_SLUGS[dept]]
      expect(resolveProgrammaticSlug(slug), `${slug.join('/')} devrait être 404`).toBeNull()
    }
  })

  it('une technique NON documentée sur la fiche profonde n’a pas de page', () => {
    // Le rouget ne se pêche du bord qu'au surfcasting (lib/especes/content/rouget.ts) :
    // on n'invente pas de page « rouget aux leurres » pour gonfler le volume.
    expect(resolveProgrammaticSlug(['rouget', 'leurres'])).toBeNull()
    expect(resolveProgrammaticSlug(['rouget', 'flottante'])).toBeNull()
    expect(resolveProgrammaticSlug(['rouget', 'vif'])).toBeNull()
    // L'oblade n'est pas un poisson à leurre ni à vif.
    expect(resolveProgrammaticSlug(['oblade', 'leurres'])).toBeNull()
    expect(resolveProgrammaticSlug(['oblade', 'vif'])).toBeNull()
    // Le marbré et le pageot ne se pêchent pas au vif ni aux leurres du bord.
    for (const s of ['marbre', 'pageot'] as const) {
      expect(resolveProgrammaticSlug([s, 'vif'])).toBeNull()
      expect(resolveProgrammaticSlug([s, 'leurres'])).toBeNull()
    }
  })

  it('les 4 espèces méditerranéennes n’ouvrent AUCUN département atlantique', () => {
    for (const species of ['oblade', 'marbre', 'pageot', 'liche'] as SpeciesSlug[]) {
      const depts = NEW_PAGES.filter((p) => p.species === species && p.deptCode).map(
        (p) => p.deptCode as string,
      )
      expect(depts.length).toBeGreaterThan(0)
      for (const d of depts) {
        expect(facadeOf(d), `${species} ne doit pas ouvrir ${d}`).toBe('mediterranee')
      }
    }
  })

  it('la seiche et le rouget servent bien les DEUX façades', () => {
    for (const species of ['seiche', 'rouget'] as SpeciesSlug[]) {
      const facades = new Set(
        NEW_PAGES.filter((p) => p.species === species && p.deptCode).map((p) =>
          facadeOf(p.deptCode as string),
        ),
      )
      expect([...facades].sort()).toEqual(['manche-atlantique', 'mediterranee'])
    }
  })
})

// ── Cohérence des trois référentiels (l'invariant anti-404 du sitemap) ─────────

describe('cohérence hasProgrammatic ↔ matrice ↔ contenu rédigé', () => {
  it('toute espèce qui génère des pages a un SpeciesContent (sinon 404 au sitemap)', () => {
    // C'est LE piège du 05/08 : déclarer à Google des URLs que la page refuse de
    // servir. app/(marketing)/peche/[...slug]/page.tsx fait `if (!content) notFound()`.
    const sansContenu = [...new Set(PAGES.map((p) => p.species))].filter(
      (s) => !SPECIES_CONTENT[s],
    )
    expect(sansContenu).toEqual([])
  })

  it('hasProgrammatic dit la vérité sur les 26 espèces, dans les deux sens', () => {
    for (const slug of SPECIES_SLUGS) {
      const genere = PAGES.some((p) => p.species === slug)
      expect(SPECIES[slug].hasProgrammatic, `${slug} : hasProgrammatic ≠ réalité`).toBe(genere)
      expect(Boolean(SPECIES_CONTENT[slug]), `${slug} : contenu ≠ hasProgrammatic`).toBe(genere)
    }
  })

  it('exactement 12 espèces ouvertes, dont les 6 historiques inchangées', () => {
    const ouvertes = new Set(PAGES.map((p) => p.species))
    expect(ouvertes.size).toBe(12)
    for (const s of LEGACY_SPECIES) expect(ouvertes.has(s)).toBe(true)
    for (const s of NEW_SPECIES) expect(ouvertes.has(s)).toBe(true)
  })

  it('chaque couple espèce × technique généré a un bloc technique rédigé', () => {
    // Sans ça, la page se rend sans sa section « comment t'y prendre » : le
    // gabarit tourne à vide et la page devient exactement le thin content que la
    // matrice existe pour empêcher.
    const vides: string[] = []
    for (const p of PAGES) {
      const bloc = SPECIES_CONTENT[p.species]?.techniques[p.technique]
      if (!bloc) vides.push(`${p.species}/${p.technique}`)
      else if (bloc.paragraphs.length < 2 || bloc.bullets.length < 4 || !bloc.seasonNote) {
        vides.push(`${p.species}/${p.technique} (bloc trop maigre)`)
      }
    }
    expect([...new Set(vides)]).toEqual([])
  })

  it('les techniques ouvertes sont celles documentées sur la fiche profonde', () => {
    // Aucune technique inventée pour le SEO : la matrice recopie le tableau
    // `techniques` de lib/especes/content/<slug>.ts.
    for (const species of NEW_SPECIES) {
      const surFiche = new Set<string>(ESPECES_CONTENT[species].techniques.map((t) => t.slug))
      const surPages = new Set(
        NEW_PAGES.filter((p) => p.species === species).map((p) => p.technique as string),
      )
      for (const t of surPages) {
        expect(surFiche.has(t), `${species} : « ${t} » absente de la fiche profonde`).toBe(true)
      }
    }
  })
})

// ── Unicité des <title> ────────────────────────────────────────────────────────

describe('aucun doublon de <title>', () => {
  // Le <title> réellement servi par app/(marketing)/peche/[...slug]/page.tsx.
  const servedPecheTitle = (t: string) => `${t} · Carnet de Pêche`

  it('les 455 titres /peche sont uniques', () => {
    const titles = PAGES.map((p) => servedPecheTitle(programmaticTitle(p)))
    expect(new Set(titles).size).toBe(PAGES.length)
  })

  it('aucun titre /peche ne collide avec une fiche /especes', () => {
    const especeTitles = new Set(
      SPECIES_SLUGS.map((slug) =>
        buildSpeciesTitle({ meta: SPECIES[slug], content: ESPECES_CONTENT[slug] }),
      ),
    )
    const collisions = PAGES.map((p) => servedPecheTitle(programmaticTitle(p))).filter((t) =>
      especeTitles.has(t),
    )
    expect(collisions).toEqual([])
  })

  it('aucun titre des nouvelles pages ne dépasse la coupe SERP', () => {
    const trop = NEW_PAGES.map((p) => programmaticTitle(p)).filter((t) => t.length > 60)
    expect(trop).toEqual([])
  })
})

// ── Lisibilité du français produit (méthode du sprint 78) ─────────────────────
// Les tests du sprint 78 cherchaient des mensonges et rataient les phrases mal
// fichues (« se prête à au sar »). Ici on balaie TOUTES les chaînes visibles des
// nouveaux gabarits, plus les titres et les en-têtes assemblés par le template.

/** Toutes les chaînes de copie visibles d'un SpeciesContent. */
function visibleStrings(species: SpeciesSlug): string[] {
  const c = SPECIES_CONTENT[species]
  if (!c) return []
  const out = [...c.intro, c.conditions, ...Object.values(c.facades)]
  for (const bloc of Object.values(c.techniques)) {
    if (!bloc) continue
    out.push(...bloc.paragraphs, ...bloc.bullets, bloc.seasonNote)
  }
  return out
}

/** Les phrases que le template assemble lui-même (page.tsx) : H1, H2, description. */
function templateStrings(species: SpeciesSlug): string[] {
  const meta = SPECIES[species]
  const out: string[] = []
  for (const p of NEW_PAGES.filter((x) => x.species === species)) {
    const technique = TECHNIQUES[p.technique]
    out.push(programmaticTitle(p))
    out.push(`${meta.article}${meta.labelLower} ${technique.withArticle} : comment t'y prendre`)
    const where = p.deptCode
      ? `${deptPreposition(p.deptCode)}${DEPARTMENT_LABELS[p.deptCode]}`
      : 'en France'
    out.push(
      `Où et comment pêcher ${meta.article.toLowerCase()}${meta.labelLower} ${technique.withArticle} ${where} : spots, saisons, marées favorables et conseils de pêcheurs du bord.`,
    )
    if (p.deptCode) {
      out.push(
        `Pêcher ${meta.article.toLowerCase()}${meta.labelLower} ${deptPreposition(p.deptCode)}${DEPARTMENT_LABELS[p.deptCode]}`,
      )
      out.push(`Ta prochaine prise ${meta.articleDe}${meta.labelLower}`)
    }
  }
  return out
}

describe('lisibilité du français produit sur les nouveaux gabarits', () => {
  const prose = NEW_SPECIES.flatMap((s) => visibleStrings(s))
  const assemble = NEW_SPECIES.flatMap((s) => templateStrings(s))
  const all = [...prose, ...assemble]

  it('produit bien de la copie à contrôler', () => {
    expect(prose.length).toBeGreaterThan(80)
    expect(assemble.length).toBeGreaterThan(300)
  })

  it('aucune préposition doublée dans la prose (« à au », « de de », « du du »)', () => {
    // Liste volontairement restreinte aux collisions TOUJOURS fautives. « de le »
    // et « à le » sont exclus ici : dans de la prose, ce sont des pronoms
    // parfaitement corrects (« au lieu DE LE laisser posé »). Ils sont testés
    // juste en dessous, sur les chaînes assemblées par le template, où aucun
    // pronom ne peut apparaître et où ils ne peuvent donc être qu'un bug.
    for (const t of prose) {
      expect(t, t).not.toMatch(/\b(à à|à au|à aux|de de|du du|des des|de des|à la la|de la la)\b/)
    }
  })

  it('aucune préposition doublée dans les chaînes ASSEMBLÉES (le bug « se prête à au sar »)', () => {
    // C'est ici que vit le défaut du sprint 78 : une préposition du gabarit collée
    // à l'article du référentiel. Sur ces chaînes, le contrôle peut être strict.
    for (const t of assemble) {
      expect(t, t).not.toMatch(
        /\b(à à|à au|à aux|de de|du du|de le|de les|à le|à les|le le|la la|du le|de du)\b/,
      )
    }
  })

  it('aucun article fautif collé à l’espèce (« le seiche », « la marbré »…)', () => {
    for (const t of all) {
      expect(t, t).not.toMatch(/\b[Ll]e (seiche|oblade|liche)\b/)
      expect(t, t).not.toMatch(/\b[Ll]a (marbré|pageot|rouget)\b/)
      expect(t, t).not.toMatch(/\b[Dd]u (seiche|oblade|liche)\b/)
      expect(t, t).not.toMatch(/\bde la (marbré|pageot|rouget)\b/)
    }
  })

  it('aucune élision manquée devant « oblade » (« le oblade », « de oblade »)', () => {
    for (const t of all) {
      expect(t, t).not.toMatch(/\b(le|la|de|que) oblade\b/i)
    }
  })

  it('aucun double espace ni espace avant une ponctuation simple', () => {
    for (const t of all) {
      expect(t, t).not.toMatch(/ {2}/)
      expect(t, t).not.toMatch(/\s[,.](\s|$)/)
    }
  })

  it('aucun tiret cadratin dans une chaîne visible (CLAUDE.md §6)', () => {
    for (const t of all) expect(t, t).not.toContain('—')
  })

  it('tutoiement partout, jamais de vouvoiement', () => {
    // Le lookbehind exclut « rendez-vous », qui est un nom commun : `\b` seul
    // coupe sur le trait d'union et le prenait pour du vouvoiement.
    for (const t of all) {
      expect(t, t).not.toMatch(/(?<![\w-])(vous|votre|vos)\b/i)
    }
  })

  it('aucun reste de gabarit ni de valeur non substituée', () => {
    for (const t of all) {
      expect(t, t).not.toMatch(/undefined|NaN|\{\{|\$\{|\[object/)
      expect(t.trim(), t).toBe(t)
      expect(t.length).toBeGreaterThan(0)
    }
  })

  it('les nouveaux textes ne sont PAS des gabarits interchangeables', () => {
    // Deux espèces différentes ne partagent aucune phrase de copie.
    const seen = new Map<string, SpeciesSlug>()
    const doublons: string[] = []
    for (const species of NEW_SPECIES) {
      for (const t of visibleStrings(species)) {
        const prev = seen.get(t)
        if (prev && prev !== species) doublons.push(`${prev} = ${species} : « ${t.slice(0, 60)} »`)
        seen.set(t, species)
      }
    }
    expect(doublons).toEqual([])
  })

  it('chaque nouvelle espèce est nommée dans sa propre intro', () => {
    for (const species of NEW_SPECIES) {
      const intro = (SPECIES_CONTENT[species]?.intro ?? []).join(' ').toLowerCase()
      expect(intro, species).toContain(SPECIES[species].labelLower)
    }
  })
})

// ── Les phrases exactes servies : on les LIT, on ne les devine pas ────────────

describe('rendu réel des accords, phrase par phrase', () => {
  it('les H1 des pages nationales sont corrects', () => {
    const h1 = (species: SpeciesSlug, technique: TechniqueSlug) => {
      const p = PAGES.find(
        (x) => x.species === species && x.technique === technique && x.deptCode === null,
      )
      if (!p) throw new Error(`page nationale introuvable : ${species}/${technique}`)
      return programmaticTitle(p)
    }
    expect(h1('seiche', 'leurres')).toBe('Pêche de la seiche aux leurres en France')
    expect(h1('oblade', 'flottante')).toBe("Pêche de l'oblade à la flottante en France")
    expect(h1('marbre', 'surfcasting')).toBe('Pêche du marbré au surfcasting en France')
    expect(h1('pageot', 'surfcasting')).toBe('Pêche du pageot au surfcasting en France')
    expect(h1('rouget', 'surfcasting')).toBe('Pêche du rouget au surfcasting en France')
    expect(h1('liche', 'vif')).toBe('Pêche de la liche au vif en France')
  })

  it('les H1 départementaux collent la bonne préposition au bon article', () => {
    const h1 = (species: SpeciesSlug, technique: TechniqueSlug, dept: string) => {
      const p = PAGES.find(
        (x) => x.species === species && x.technique === technique && x.deptCode === dept,
      )
      if (!p) throw new Error(`page introuvable : ${species}/${technique}/${dept}`)
      return programmaticTitle(p)
    }
    expect(h1('seiche', 'leurres', '56')).toBe('Pêche de la seiche aux leurres dans le Morbihan')
    expect(h1('oblade', 'flottante', '83')).toBe("Pêche de l'oblade à la flottante dans le Var")
    expect(h1('marbre', 'surfcasting', '2B')).toBe('Pêche du marbré au surfcasting en Haute-Corse')
    expect(h1('pageot', 'flottante', '11')).toBe("Pêche du pageot à la flottante dans l'Aude")
    expect(h1('rouget', 'surfcasting', '33')).toBe('Pêche du rouget au surfcasting en Gironde')
    expect(h1('liche', 'leurres', '2A')).toBe('Pêche de la liche aux leurres en Corse-du-Sud')
  })

  it('le H2 « comment t’y prendre » s’accorde (c’est là que « le seiche » sortirait)', () => {
    const h2 = (species: SpeciesSlug, technique: TechniqueSlug) =>
      `${SPECIES[species].article}${SPECIES[species].labelLower} ${TECHNIQUES[technique].withArticle} : comment t'y prendre`
    expect(h2('seiche', 'leurres')).toBe("La seiche aux leurres : comment t'y prendre")
    expect(h2('oblade', 'surfcasting')).toBe("L'oblade au surfcasting : comment t'y prendre")
    expect(h2('marbre', 'flottante')).toBe("Le marbré à la flottante : comment t'y prendre")
    expect(h2('liche', 'vif')).toBe("La liche au vif : comment t'y prendre")
  })

  it('le H2 « Pêcher … » des pages départementales s’accorde aussi', () => {
    const h2 = (species: SpeciesSlug, dept: string) =>
      `Pêcher ${SPECIES[species].article.toLowerCase()}${SPECIES[species].labelLower} ${deptPreposition(dept)}${DEPARTMENT_LABELS[dept]}`
    expect(h2('oblade', '06')).toBe("Pêcher l'oblade dans les Alpes-Maritimes")
    expect(h2('seiche', '35')).toBe("Pêcher la seiche en Ille-et-Vilaine")
    expect(h2('marbre', '34')).toBe("Pêcher le marbré dans l'Hérault")
    expect(h2('pageot', '13')).toBe('Pêcher le pageot dans les Bouches-du-Rhône')
    expect(h2('rouget', '40')).toBe('Pêcher le rouget dans les Landes')
    expect(h2('liche', '83')).toBe('Pêcher la liche dans le Var')
  })

  it('l’étiquette « … AUTREMENT » du bloc maillage porte le bon article', () => {
    // Défaut trouvé au sprint 83 Bloc 4 : l'article était codé en dur au masculin
    // dans app/(marketing)/peche/[...slug]/page.tsx, ce qui servait déjà
    // « LE ORPHIE AUTREMENT » et « LE DORADE ROYALE AUTREMENT » en production.
    // Ouvrir 3 espèces féminines de plus (seiche, oblade, liche) aurait multiplié
    // la faute au lieu de la révéler.
    const label = (species: SpeciesSlug) =>
      `${SPECIES[species].article.toUpperCase()}${SPECIES[species].label.toUpperCase()} AUTREMENT`
    expect(label('seiche')).toBe('LA SEICHE AUTREMENT')
    expect(label('oblade')).toBe("L'OBLADE AUTREMENT")
    expect(label('liche')).toBe('LA LICHE AUTREMENT')
    expect(label('marbre')).toBe('LE MARBRÉ AUTREMENT')
    expect(label('pageot')).toBe('LE PAGEOT AUTREMENT')
    // Non-régression sur les espèces historiques, y compris celles qui étaient fautives.
    expect(label('bar')).toBe('LE BAR AUTREMENT')
    expect(label('orphie')).toBe("L'ORPHIE AUTREMENT")
    expect(label('dorade-royale')).toBe('LA DORADE ROYALE AUTREMENT')
  })

  it('le paragraphe de façade servi est bien celui de la façade du département', () => {
    // Les 4 espèces méditerranéennes portent un texte 'manche-atlantique' que le
    // type exige mais qu'aucune page ne peut servir : on le prouve.
    for (const species of ['oblade', 'marbre', 'pageot', 'liche'] as SpeciesSlug[]) {
      const servis = new Set(
        NEW_PAGES.filter((p) => p.species === species && p.deptCode).map(
          (p) => SPECIES_CONTENT[species]?.facades[facadeOf(p.deptCode as string)],
        ),
      )
      expect(servis.size).toBe(1)
      expect([...servis][0]).toBe(SPECIES_CONTENT[species]?.facades.mediterranee)
    }
    // La seiche, elle, sert réellement ses deux textes.
    const seicheServis = new Set(
      NEW_PAGES.filter((p) => p.species === 'seiche' && p.deptCode).map(
        (p) => SPECIES_CONTENT.seiche?.facades[facadeOf(p.deptCode as string)],
      ),
    )
    expect(seicheServis.size).toBe(2)
  })
})
