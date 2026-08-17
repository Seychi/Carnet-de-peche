import { describe, it, expect } from 'vitest'
import {
  getAllProgrammaticPages,
  programmaticTitle,
  programmaticUrl,
  SERP_TITLE_MAX,
  SPECIES,
  TECHNIQUES,
  type ProgrammaticPage,
} from '@/lib/seo/programmatic'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// Sprint 76, Bloc 6 — « Pêche du dorade royale », une faute sur 125 pages.
//
// `programmaticTitle()` construisait l'article en dur (`Pêche du ${species}`) alors
// que le référentiel SPECIES porte déjà `articleDe` correctement renseigné. La faute
// partait dans le <title> Google ET dans le H1 (app/(marketing)/peche/[...slug]).
// Ces tests verrouillent la correction : ils échouent si un article est réintroduit
// en dur, et ils bornent la longueur (l'article féminin coûte 3 caractères de plus).

const PAGES = getAllProgrammaticPages()

describe('programmaticTitle — accord de l’article (Bloc 6)', () => {
  it('génère les 455 pages attendues', () => {
    // Garde-fou anti-pages-creuses : une espèce n'a de pages que si elle a un
    // SpeciesContent rédigé. 6 espèces au sprint 57, 12 depuis le sprint 83
    // Bloc 4 (+118 pages méditerranéennes adossées à l'inventaire mesuré ;
    // détail et comptages dans programmatic-mediterranee.test.ts).
    expect(PAGES.length).toBe(455)
    const species = new Set(PAGES.map((p) => p.species))
    expect(species.size).toBe(12)
  })

  it('accorde l’article à l’espèce sur les 455 pages, jamais « du » par défaut', () => {
    const wrong: string[] = []
    for (const p of PAGES) {
      const meta = SPECIES[p.species]
      const title = programmaticTitle(p)
      // Formes 1 et 2 : « Pêche {articleDe}{espèce} … ». Forme 3 (dégradation
      // extrême, 4 pages) : « {Espèce} … », sans le mot « Pêche » donc sans article.
      const ok = title.startsWith('Pêche ')
        ? title.startsWith(`Pêche ${meta.articleDe}${meta.labelLower}`)
        : title.startsWith(`${meta.label} `)
      if (!ok) wrong.push(`${programmaticUrl(p)} → ${title}`)
    }
    expect(wrong).toEqual([])
  })

  it('n’ouvre jamais sur un article faux (« Pêche du dorade royale »)', () => {
    for (const p of PAGES) {
      const title = programmaticTitle(p)
      if (!title.startsWith('Pêche ')) continue
      expect(title).toMatch(/^Pêche (du |de la |de l')/)
      // Le cœur du Bloc 6 : jamais « du » devant une espèce féminine.
      if (SPECIES[p.species].gender === 'f') expect(title).not.toMatch(/^Pêche du /)
    }
  })

  it('corrige les deux espèces féminines citées par l’audit', () => {
    const find = (species: string, technique: string, deptCode: string | null): ProgrammaticPage => {
      const page = PAGES.find(
        (p) => p.species === species && p.technique === technique && p.deptCode === deptCode,
      )
      if (!page) throw new Error(`page introuvable : ${species}/${technique}/${deptCode}`)
      return page
    }
    expect(programmaticTitle(find('dorade-royale', 'surfcasting', '50'))).toBe(
      'Pêche de la dorade royale au surfcasting dans la Manche',
    )
    expect(programmaticTitle(find('orphie', 'flottante', '2A'))).toBe(
      "Pêche de l'orphie à la flottante en Corse-du-Sud",
    )
  })

  it('laisse les espèces masculines strictement inchangées (non-régression)', () => {
    // Valeurs figées AVANT la correction : elles ne doivent pas avoir bougé d'un octet.
    const find = (species: string, technique: string, deptCode: string | null): ProgrammaticPage => {
      const page = PAGES.find(
        (p) => p.species === species && p.technique === technique && p.deptCode === deptCode,
      )
      if (!page) throw new Error(`page introuvable : ${species}/${technique}/${deptCode}`)
      return page
    }
    expect(programmaticTitle(find('bar', 'leurres', '29'))).toBe(
      'Pêche du bar aux leurres dans le Finistère',
    )
    expect(programmaticTitle(find('bar', 'leurres', null))).toBe(
      'Pêche du bar aux leurres en France',
    )
    expect(programmaticTitle(find('maquereau', 'flottante', '13'))).toBe(
      'Pêche du maquereau à la flottante dans les Bouches-du-Rhône',
    )
    expect(programmaticTitle(find('lieu-jaune', 'vif', '22'))).toBe(
      "Pêche du lieu jaune au vif dans les Côtes-d'Armor",
    )
    expect(programmaticTitle(find('sar', 'surfcasting', '34'))).toBe(
      "Pêche du sar au surfcasting dans l'Hérault",
    )
  })
})

describe('programmaticTitle — longueur SERP', () => {
  it('aucun titre au-dessus de 60 caractères sur les 455 pages', () => {
    const tooLong = PAGES.map((p) => ({ url: programmaticUrl(p), title: programmaticTitle(p) }))
      .filter((t) => t.title.length > SERP_TITLE_MAX)
      .map((t) => `${t.title.length} : ${t.title}`)
    expect(tooLong).toEqual([])
  })

  it('aucun titre vide et aucun tiret cadratin (CLAUDE.md §6)', () => {
    for (const p of PAGES) {
      const title = programmaticTitle(p)
      expect(title.length).toBeGreaterThan(10)
      expect(title).not.toContain('—')
    }
  })

  it('les titres restent UNIQUES malgré la dégradation (pas de doublon de <title>)', () => {
    // La dégradation ne doit jamais fusionner deux pages : espèce + technique +
    // département restent présents dans les 3 formes. Un doublon de <title>
    // coûterait plus cher que la troncature qu'on évite.
    const titles = PAGES.map((p) => programmaticTitle(p))
    expect(new Set(titles).size).toBe(PAGES.length)
  })

  it('ne tronque jamais au milieu d’un mot', () => {
    for (const p of PAGES) {
      const title = programmaticTitle(p)
      expect(title).not.toMatch(/…|\.\.\.$/)
      expect(title.trim()).toBe(title)
    }
  })

  it('la dégradation garde espèce, technique et département', () => {
    for (const p of PAGES) {
      if (!p.deptCode) continue
      const title = programmaticTitle(p)
      const dept = DEPARTMENT_LABELS[p.deptCode] ?? p.deptCode
      expect(title).toContain(dept)
      expect(title).toContain(TECHNIQUES[p.technique].withArticle)
      expect(title.toLowerCase()).toContain(SPECIES[p.species].labelLower)
    }
  })

  it('n’applique la dégradation QUE là où la forme naturelle dépasse', () => {
    // Non-régression : une page courte garde sa préposition naturelle.
    const short = PAGES.filter((p) => p.deptCode && programmaticTitle(p).length <= 55)
    expect(short.length).toBeGreaterThan(200)
    for (const p of short.slice(0, 50)) {
      expect(programmaticTitle(p)).not.toContain(' : ')
    }
  })
})
