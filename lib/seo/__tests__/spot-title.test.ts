import { describe, it, expect } from 'vitest'
import { buildSpotTitle, shortSpotName, SPOT_TITLE_MAX } from '@/lib/seo/spot-title'
import { SPECIES_LABELS } from '@/lib/labels'
import approvedSpots from './fixtures/approved-spots.json'

// Sprint 76, Bloc 5. La fixture est la donnée de PROD relevée le 2026-08-13 :
// les 416 spots `moderation_status='approved'` et `visibility='public'`, avec
// leur nom, leur département et leurs espèces. Tester le gabarit sur 3 exemples
// choisis à la main ne prouve rien : 113 de ces 416 noms contiennent un tiret
// cadratin, et c'est précisément ce qui faisait exploser la longueur.

type Spot = { name: string; department: string; species: string[] }
const SPOTS = approvedSpots as Spot[]

const titleOf = (s: Spot) =>
  buildSpotTitle(
    s.name,
    s.department,
    s.species.map((k) => SPECIES_LABELS[k] ?? k),
  )

describe('shortSpotName — troncature au premier tiret cadratin', () => {
  it('coupe au tiret cadratin et retrime', () => {
    expect(shortSpotName('Sausset-les-Pins — digues du port')).toBe('Sausset-les-Pins')
    expect(shortSpotName('Gravelines — Petit-Fort-Philippe')).toBe('Gravelines')
  })

  it('laisse intact un nom sans tiret cadratin', () => {
    expect(shortSpotName('Pointe de Penvins')).toBe('Pointe de Penvins')
  })

  it('conserve les traits d’union ordinaires (ce ne sont pas des cadratins)', () => {
    expect(shortSpotName('Saint-Jean-de-Luz')).toBe('Saint-Jean-de-Luz')
    expect(shortSpotName('Cap d’Antibes')).toBe('Cap d’Antibes')
  })

  it('ne renvoie jamais une chaîne vide', () => {
    expect(shortSpotName('— digue seule')).toBe('— digue seule')
    for (const s of SPOTS) expect(shortSpotName(s.name).length).toBeGreaterThan(0)
  })
})

describe('buildSpotTitle — gabarit et dégradation', () => {
  it('produit le gabarit attendu quand tout tient', () => {
    expect(buildSpotTitle('Pointe de Penvins', '56', ['Bar', 'Dorade royale', 'Sar'])).toBe(
      'Pêche à Pointe de Penvins (56) : Bar, Dorade royale',
    )
  })

  it('ne laisse jamais de tiret cadratin dans le nom (CLAUDE.md §6)', () => {
    // Le cadratin du nom devient une virgule tant que le nom complet tient,
    // sinon on retombe sur la commune seule. Jamais de double tiret.
    const t = buildSpotTitle('Sausset-les-Pins — digues du port', '13', [
      'Dorade royale',
      'Sar',
      'Bar',
    ])
    expect(t).not.toContain('—')
    expect(t.length).toBeLessThanOrEqual(SPOT_TITLE_MAX)
    expect(t).toContain('Sausset-les-Pins')
    expect(t).toContain('(13)')
  })

  it('garde le nom complet quand il tient (anti-doublon de <title>)', () => {
    // 4 spots du Grau-du-Roi convergeaient vers le même titre si l'on coupait
    // systématiquement au cadratin.
    expect(buildSpotTitle("Le Grau-du-Roi — plage de l'Espiguette", '30', ['Bar'])).toBe(
      "Pêche à Le Grau-du-Roi, plage de l'Espiguette (30) : Bar",
    )
  })

  it('retombe sur la commune seule quand même le nom complet nu ne tient pas', () => {
    expect(
      buildSpotTitle(
        'Sausset-les-Pins — digues du port, la jetée nord et le môle ouest',
        '13',
        ['Dorade royale', 'Sar'],
      ),
    ).toBe('Pêche à Sausset-les-Pins (13) : Dorade royale, Sar')
  })

  it('la quasi-totalité des 416 spots garde au moins une espèce dans le titre', () => {
    // Contrepartie mesurée du choix « nom complet d'abord » (anti-doublon).
    const sansEspece = SPOTS.filter((s) => s.species.length > 0 && !titleOf(s).includes(' : '))
    expect(sansEspece.length).toBe(7)
  })

  it('dégrade à 1 espèce puis à 0 plutôt que de dépasser', () => {
    const long = buildSpotTitle('Saint-Jean-de-Monts', '85', [
      'Dorade royale',
      'Dorade grise',
      'Bar',
    ])
    expect(long.length).toBeLessThanOrEqual(SPOT_TITLE_MAX)
    // Nom très long : il ne reste que le socle, jamais un mot coupé.
    const veryLong = buildSpotTitle('Saint-Laurent-de-la-Salanque-Plage', '66', [
      'Dorade royale',
    ])
    expect(veryLong).toBe('Pêche à Saint-Laurent-de-la-Salanque-Plage (66)')
  })

  it('sans espèce : le socle seul', () => {
    expect(buildSpotTitle('Pointe de Penvins', '56', [])).toBe(
      'Pêche à Pointe de Penvins (56)',
    )
  })
})

describe('buildSpotTitle — sur les 416 spots réels', () => {
  it('la fixture contient bien les 416 spots de prod', () => {
    expect(SPOTS.length).toBe(416)
    expect(SPOTS.filter((s) => s.name.includes('—')).length).toBeGreaterThan(100)
  })

  it('aucun titre au-dessus de 60 caractères', () => {
    const tooLong = SPOTS.map(titleOf)
      .filter((t) => t.length > SPOT_TITLE_MAX)
      .map((t) => `${t.length} : ${t}`)
    expect(tooLong).toEqual([])
  })

  it('aucun titre vide', () => {
    for (const s of SPOTS) expect(titleOf(s).length).toBeGreaterThan(10)
  })

  it('aucun tiret cadratin dans un titre', () => {
    for (const s of SPOTS) expect(titleOf(s)).not.toContain('—')
  })

  it('aucun titre ne se termine par un séparateur orphelin', () => {
    for (const s of SPOTS) {
      expect(titleOf(s)).not.toMatch(/[:,]\s*$/)
    }
  })

  it('aucun doublon exact de titre sur les 416 spots', () => {
    // Couper systématiquement au tiret cadratin, comme le demandait le brief,
    // faisait converger 12 spots vers 5 titres (4 rien qu'au Grau-du-Roi) :
    // les points d'une même commune ne se distinguent QUE par le suffixe. D'où
    // la règle « nom complet tant qu'il tient ». Ce test la verrouille.
    const counts = new Map<string, number>()
    for (const s of SPOTS) counts.set(titleOf(s), (counts.get(titleOf(s)) ?? 0) + 1)
    const dupes = [...counts.entries()].filter(([, n]) => n > 1)
    const duped = dupes.reduce((sum, [, n]) => sum + n, 0)
    expect(dupes).toEqual([])
    expect(duped).toBe(0)
  })

  it('tous les titres portent la commune et le département', () => {
    for (const s of SPOTS) {
      const t = titleOf(s)
      expect(t.startsWith('Pêche à ')).toBe(true)
      expect(t).toContain(`(${s.department})`)
    }
  })
})
