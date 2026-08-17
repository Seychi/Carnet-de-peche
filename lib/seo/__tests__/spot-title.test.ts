import { describe, it, expect } from 'vitest'
import {
  buildSpotTitle,
  buildSpotTitleAB,
  buildSpotTitleTide,
  shortSpotName,
  slugCohortHash,
  spotTitleCohort,
  SPOT_TITLE_MAX,
} from '@/lib/seo/spot-title'
import {
  DEPARTMENT_FACADE,
  isCalibratedTideDepartment,
  isLowTidalRangeDepartment,
  referencePortForDepartment,
} from '@/lib/conditions/tide-departments'
import { SPECIES_LABELS } from '@/lib/labels'
import approvedSpots from './fixtures/approved-spots.json'

// Sprint 76, Bloc 5. La fixture est la donnée de PROD : les spots
// `moderation_status='approved'` et `visibility='public'`, avec leur nom, leur
// département et leurs espèces. Tester le gabarit sur 3 exemples choisis à la
// main ne prouve rien : un nom sur quatre contient un tiret cadratin, et c'est
// précisément ce qui faisait exploser la longueur.
//
// ⚠️ Sprint 83 : fixture REGÉNÉRÉE le 2026-08-17. Elle datait du 13/08 et
// s'arrêtait à 416 spots, alors que le lot 1 du sprint 78 (191 fiches
// méditerranéennes) est publié depuis le 15/08 : la prod en compte 607. Le
// champ `slug`, absent de l'ancienne fixture, a été ajouté — sans lui l'A/B du
// Bloc 1 n'est pas testable, la cohorte étant dérivée du hash du slug.

type Spot = { slug: string; name: string; department: string; species: string[] }
const SPOTS = approvedSpots as Spot[]

/** Les 15 départements à marée calibrée sur un port audité (cf tide-departments). */
const TIDAL_SPOTS = SPOTS.filter((s) => isCalibratedTideDepartment(s.department))

const labelsOf = (s: Spot) => s.species.map((k) => SPECIES_LABELS[k] ?? k)
const titleOf = (s: Spot) => buildSpotTitle(s.name, s.department, labelsOf(s))
const servedTitleOf = (s: Spot) =>
  buildSpotTitleAB({
    slug: s.slug,
    name: s.name,
    department: s.department,
    speciesLabels: labelsOf(s),
  })

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

  it('la quasi-totalité des spots garde au moins une espèce dans le titre', () => {
    // Contrepartie mesurée du choix « nom complet d'abord » (anti-doublon).
    const sansEspece = SPOTS.filter((s) => s.species.length > 0 && !titleOf(s).includes(' : '))
    // 7 sur 416 au sprint 76, 12 sur 607 après le lot S78-MED-01.
    expect(sansEspece.length).toBe(12)
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

describe('buildSpotTitle — sur les spots réels', () => {
  it('la fixture contient bien les 607 spots de prod', () => {
    expect(SPOTS.length).toBe(607)
    expect(SPOTS.filter((s) => s.name.includes('—')).length).toBeGreaterThan(100)
    // Chaque spot porte un slug non vide : c'est la clé de l'A/B du sprint 83.
    expect(SPOTS.filter((s) => !s.slug || s.slug.length === 0)).toEqual([])
    expect(new Set(SPOTS.map((s) => s.slug)).size).toBe(SPOTS.length)
  })

  it('aucun titre au-dessus de 60 caractères, hors 3 noms importés d’OSM', () => {
    const tooLong = SPOTS.map(titleOf)
      .filter((t) => t.length > SPOT_TITLE_MAX)
      .map((t) => `${t.length} : ${t}`)
    // ⚠️ DÉFAUT PRÉEXISTANT, découvert en régénérant la fixture au sprint 83 et
    // NON traité par le Bloc 1 (périmètre : les 15 départements à marée, ces 3
    // fiches sont méditerranéennes donc toujours en cohorte A).
    //
    // Cause : ces 3 noms viennent du lot OSM `S78-MED-01` et séparent au TRAIT
    // D'UNION espacé « - », pas au tiret cadratin « — ». `shortSpotName` ne coupe
    // qu'au cadratin, donc le socle court vaut le socle complet et la dégradation
    // n'a nulle part où aller. Correctif possible en une ligne (couper aussi sur
    // / — |^| - /), mais il change 3 <title> servis en prod : décision à prendre
    // hors de ce bloc, avec la lane curation (ces noms ne sont pas des noms de
    // spot de pêche : « Navette Portuaire - Visite Touristique »).
    expect(tooLong).toEqual([
      '68 : Pêche à Navette Portuaire - Visite Touristique de Port Camargue (30)',
      '61 : Pêche à Plage du Créneau Naturel - Poste de secours n° 4 (11)',
      '66 : Pêche à Plages des Terrasses du Soleil - Poste de secours n°3 (11)',
    ])
  })

  it('aucun titre au-dessus de 60 caractères dans le périmètre de l’A/B', () => {
    const tooLong = TIDAL_SPOTS.map(titleOf)
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

  it('aucun doublon exact de titre', () => {
    // Couper systématiquement au tiret cadratin, comme le demandait le brief du
    // sprint 76, faisait converger 12 spots vers 5 titres (4 rien qu'au
    // Grau-du-Roi) : les points d'une même commune ne se distinguent QUE par le
    // suffixe. D'où la règle « nom complet tant qu'il tient ». Ce test la verrouille.
    const counts = new Map<string, number>()
    for (const s of SPOTS) counts.set(titleOf(s), (counts.get(titleOf(s)) ?? 0) + 1)
    const dupes = [...counts.entries()].filter(([, n]) => n > 1)
    expect(dupes).toEqual([])
  })

  it('tous les titres portent la commune et le département', () => {
    for (const s of SPOTS) {
      const t = titleOf(s)
      expect(t.startsWith('Pêche à ')).toBe(true)
      expect(t).toContain(`(${s.department})`)
    }
  })
})

// ─── Sprint 83, Bloc 1 : A/B « la marée dans le titre » ───────────────────────

describe('périmètre du test — les 15 départements à marée calibrée', () => {
  // ⚠️ Le brief du sprint 83 parle d'une constante `TIDE_REFERENCE_PORTS` dans
  // `lib/conditions/tide-calibration.ts`. Elle n'existe pas : le mapping réel
  // s'appelle `DEPARTMENT_FACADE`. Ses clés correspondent en revanche EXACTEMENT
  // aux 15 départements listés par le brief, ce test le verrouille.
  const EXPECTED = ['14', '50', '76', '59', '62', '35', '22', '29', '56', '44', '85', '17', '33', '40', '64']

  it('la liste est exactement celle du brief, ni plus ni moins', () => {
    expect(Object.keys(DEPARTMENT_FACADE).sort()).toEqual([...EXPECTED].sort())
  })

  it('aucun département méditerranéen ni corse n’est calibré', () => {
    for (const dept of ['06', '11', '13', '30', '34', '66', '83', '2A', '2B']) {
      expect(isCalibratedTideDepartment(dept)).toBe(false)
      // Ils restent des côtiers « faible marnage », comportement inchangé.
      expect(isLowTidalRangeDepartment(dept)).toBe(true)
    }
  })

  it('l’extraction du module pur n’a pas changé le port de référence', () => {
    // Régression de l'extraction sprint 83 : `tide-calibration.ts` ré-exporte
    // désormais ces fonctions au lieu de les définir.
    expect(referencePortForDepartment('29')).toBe('Brest')
    expect(referencePortForDepartment('35')).toBe('Saint-Malo')
    expect(referencePortForDepartment('56')).toBe('Pornichet')
    expect(referencePortForDepartment('85')).toBe("Les Sables-d'Olonne")
    expect(referencePortForDepartment('64')).toBe('Arcachon (Eyrac)')
    expect(referencePortForDepartment('13')).toBeNull()
    expect(referencePortForDepartment('75')).toBeNull()
    // char(3) : la colonne `spots.department` arrive complétée par des espaces.
    expect(referencePortForDepartment('29 ')).toBe('Brest')
    expect(isCalibratedTideDepartment('29 ')).toBe(true)
    expect(isLowTidalRangeDepartment('13 ')).toBe(true)
  })
})

describe('slugCohortHash — pur, stable, bien dispersé', () => {
  it('deux appels sur le même slug donnent la même valeur', () => {
    for (const s of SPOTS.slice(0, 50)) {
      expect(slugCohortHash(s.slug)).toBe(slugCohortHash(s.slug))
    }
  })

  it('renvoie un entier non signé sur 32 bits', () => {
    for (const s of SPOTS) {
      const h = slugCohortHash(s.slug)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('ne réduit PAS la cohorte à une parité de caractères (rôle du finaliseur)', () => {
    // FNV-1a nu se termine par une multiplication par un nombre impair : son
    // bit 0 vaut la parité du XOR des bits de poids faible des caractères, or
    // c'est exactement le bit que `% 2` lit. Deux slugs qui ne diffèrent que par
    // un caractère de même parité tomberaient toujours dans la même cohorte.
    const fnvOnly = (slug: string) => {
      let h = 0x811c9dc5
      for (let i = 0; i < slug.length; i++) {
        h ^= slug.charCodeAt(i)
        h = Math.imul(h, 0x01000193) >>> 0
      }
      return h >>> 0
    }
    // « pointe-de-penvins » et « pointe-de-penvinf » : 's'(115) et 'f'(102) sont
    // de parités opposées, donc FNV nu les sépare ; ce qu'on veut vérifier c'est
    // l'inverse, deux slugs que FNV nu confond et que le hash mixé sépare.
    const collisions = SPOTS.filter(
      (s) => fnvOnly(s.slug) % 2 !== slugCohortHash(s.slug) % 2,
    )
    expect(collisions.length).toBeGreaterThan(50)
  })
})

describe('spotTitleCohort — affectation déterministe', () => {
  it('aucun spot hors des 15 départements ne reçoit la variante B', () => {
    const horsPerimetre = SPOTS.filter((s) => !isCalibratedTideDepartment(s.department))
    expect(horsPerimetre.length).toBe(271)
    for (const s of horsPerimetre) {
      expect(spotTitleCohort(s.slug, s.department)).toBe('A')
    }
  })

  it('aucun spot méditerranéen ou corse ne reçoit la variante B', () => {
    const med = SPOTS.filter((s) =>
      ['06', '11', '13', '30', '34', '66', '83', '2A', '2B'].includes(s.department),
    )
    expect(med.length).toBe(271)
    for (const s of med) {
      const { cohort, title } = servedTitleOf(s)
      expect(cohort).toBe('A')
      expect(title).not.toContain('marée')
    }
  })

  it('la répartition est à 50 % ± 5 points sur les 336 spots du périmètre', () => {
    expect(TIDAL_SPOTS.length).toBe(336)
    const b = TIDAL_SPOTS.filter((s) => spotTitleCohort(s.slug, s.department) === 'B')
    const pct = (100 * b.length) / TIDAL_SPOTS.length
    expect(pct).toBeGreaterThanOrEqual(45)
    expect(pct).toBeLessThanOrEqual(55)
    // Effectif figé au 2026-08-17, cf docs/sprint-83/AB-MAREE.md.
    expect(b.length).toBe(175)
  })

  it('l’affectation est stable entre deux appels (Google ne voit pas le titre danser)', () => {
    for (const s of TIDAL_SPOTS) {
      const first = spotTitleCohort(s.slug, s.department)
      expect(spotTitleCohort(s.slug, s.department)).toBe(first)
      expect(spotTitleCohort(s.slug, `${s.department} `)).toBe(first)
    }
  })

  it('deux spots du périmètre au moins tombent de chaque côté dans les gros départements', () => {
    // 29 et 56 portent 199 des 336 spots : les deux bras doivent y être peuplés,
    // sinon la comparaison à J+21 n'a aucune puissance.
    for (const dept of ['29', '56', '22']) {
      const inDept = TIDAL_SPOTS.filter((s) => s.department === dept)
      const b = inDept.filter((s) => spotTitleCohort(s.slug, s.department) === 'B').length
      expect(b).toBeGreaterThan(inDept.length * 0.3)
      expect(b).toBeLessThan(inDept.length * 0.7)
    }
  })
})

describe('buildSpotTitleTide — variante B', () => {
  it('produit le gabarit attendu quand tout tient', () => {
    expect(buildSpotTitleTide('Pointe de Penvins', '56')).toBe(
      'Pointe de Penvins (56) : marée du jour et spot de pêche',
    )
  })

  it('remplace le cadratin par une virgule (CLAUDE.md §6)', () => {
    expect(buildSpotTitleTide('Gravelines — Petit-Fort-Philippe', '59')).toBe(
      'Gravelines, Petit-Fort-Philippe (59) : marée du jour',
    )
  })

  it('dégrade la queue avant de raccourcir le nom', () => {
    // Le lieu cherché est souvent le suffixe : il doit survivre plus longtemps
    // que « et spot de pêche ». Ici « phare de Gatteville » est conservé au prix
    // de la queue, au lieu de servir « Pointe de Barfleur (50) : marée du jour
    // et spot de pêche » qui l'aurait effacé.
    expect(buildSpotTitleTide('Pointe de Barfleur — phare de Gatteville', '50')).toBe(
      'Pointe de Barfleur, phare de Gatteville (50) : marée du jour',
    )
    // Dernier palier : nom sans cadratin, donc le socle court ne peut pas aider.
    expect(buildSpotTitleTide('Grande jetée de Saint-Gilles-Croix-de-Vie', '85')).toBe(
      'Grande jetée de Saint-Gilles-Croix-de-Vie (85) : marée',
    )
  })

  it('seuls 7 spots réels sur 336 descendent jusqu’au palier « marée » nu', () => {
    const nus = TIDAL_SPOTS.map((s) => buildSpotTitleTide(s.name, s.department)).filter(
      (t) => t.endsWith(' : marée'),
    )
    expect(nus.length).toBe(7)
  })

  it('ne retombe sur le nom court que lorsqu’aucune queue ne tient', () => {
    expect(
      buildSpotTitleTide('La Teste-de-Buch — plage de la Corniche (dune du Pilat)', '33'),
    ).toBe('La Teste-de-Buch (33) : marée du jour et spot de pêche')
  })

  it('ne coupe jamais un mot en deux', () => {
    for (const s of TIDAL_SPOTS) {
      const t = buildSpotTitleTide(s.name, s.department)
      // Tout ce qui précède « ( » est un préfixe exact du nom normalisé.
      const nom = t.slice(0, t.lastIndexOf(` (${s.department})`))
      const normalise = s.name.split('—').map((p) => p.trim()).filter(Boolean).join(', ')
      expect(normalise.startsWith(nom)).toBe(true)
    }
  })
})

describe('variante B — sur les 336 spots réels du périmètre', () => {
  const TIDE_TITLES = TIDAL_SPOTS.map((s) => ({
    s,
    t: buildSpotTitleTide(s.name, s.department),
  }))

  it('aucun titre au-dessus de 60 caractères', () => {
    const tooLong = TIDE_TITLES.filter((x) => x.t.length > SPOT_TITLE_MAX).map(
      (x) => `${x.t.length} : ${x.t}`,
    )
    expect(tooLong).toEqual([])
  })

  it('tous portent le mot « marée », la commune et le département', () => {
    for (const { s, t } of TIDE_TITLES) {
      expect(t).toContain('marée')
      expect(t).toContain(`(${s.department})`)
      expect(t.startsWith(shortSpotName(s.name))).toBe(true)
    }
  })

  it('aucun tiret cadratin, aucun séparateur orphelin', () => {
    for (const { t } of TIDE_TITLES) {
      expect(t).not.toContain('—')
      expect(t).not.toMatch(/[:,]\s*$/)
    }
  })

  it('aucun doublon même si TOUS les spots du périmètre basculaient en B', () => {
    // La variante B n'a pas de liste d'espèces pour départager deux points d'une
    // même commune : c'est l'ordre de dégradation (nom complet d'abord) qui
    // évite les doublons. Testé sur l'ensemble du périmètre, pas seulement sur
    // la cohorte B, pour rester vrai si John généralise la variante à J+21.
    const counts = new Map<string, number>()
    for (const { t } of TIDE_TITLES) counts.set(t, (counts.get(t) ?? 0) + 1)
    expect([...counts.entries()].filter(([, n]) => n > 1)).toEqual([])
  })
})

describe('buildSpotTitleAB — ce qui est réellement servi', () => {
  it('la cohorte A sert exactement le titre d’avant le sprint 83 (aucune régression)', () => {
    for (const s of SPOTS) {
      const { title, cohort } = servedTitleOf(s)
      if (cohort === 'A') expect(title).toBe(titleOf(s))
    }
  })

  it('la cohorte B sert exactement la variante marée', () => {
    for (const s of SPOTS) {
      const { title, cohort } = servedTitleOf(s)
      if (cohort === 'B') expect(title).toBe(buildSpotTitleTide(s.name, s.department))
    }
  })

  it('aucun doublon de <title> sur l’ensemble du site, cohortes mélangées', () => {
    // Le vrai risque du sprint : un titre B qui percute un titre A. Par
    // construction c'est impossible (A commence toujours par « Pêche à », B
    // jamais), mais c'est exactement le genre d'invariant qui se casse en
    // silence lors d'une retouche de gabarit.
    const counts = new Map<string, number>()
    for (const s of SPOTS) {
      const t = servedTitleOf(s).title
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    expect([...counts.entries()].filter(([, n]) => n > 1)).toEqual([])
  })

  it('tous les titres servis du périmètre A/B tiennent en 60 caractères', () => {
    // Hors périmètre, 3 fiches du lot OSM S78-MED-01 dépassaient DÉJÀ avant ce
    // sprint (cf le test dédié plus haut) : le Bloc 1 n'y touche pas.
    const tooLong = TIDAL_SPOTS.map((s) => servedTitleOf(s).title)
      .filter((t) => t.length > SPOT_TITLE_MAX)
      .map((t) => `${t.length} : ${t}`)
    expect(tooLong).toEqual([])
  })

  it('le Bloc 1 n’allonge aucun titre au-delà de ce qu’il était', () => {
    // Anti-régression frontale : passer en cohorte B ne doit jamais faire
    // dépasser un titre qui tenait avant.
    const nouveaux = SPOTS.filter(
      (s) => servedTitleOf(s).title.length > SPOT_TITLE_MAX && titleOf(s).length <= SPOT_TITLE_MAX,
    )
    expect(nouveaux).toEqual([])
  })

  it('le département en char(3) ne change rien au titre servi', () => {
    const s = TIDAL_SPOTS[0]
    expect(
      buildSpotTitleAB({
        slug: s.slug,
        name: s.name,
        department: `${s.department} `,
        speciesLabels: labelsOf(s),
      }),
    ).toEqual(servedTitleOf(s))
  })
})
