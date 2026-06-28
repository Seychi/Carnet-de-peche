import { describe, it, expect } from 'vitest'
import {
  COASTAL_DEPARTMENTS,
  DEPARTMENT_ADJACENCY,
  DEPARTMENT_LABELS,
  DEPARTMENT_OPTIONS,
  departmentArticle,
  isCoastalDepartment,
  neighborDepartments,
} from '@/lib/geo/departments'

// Ancrage anti-régression de la divergence des listes (BUG-05).
// Décision John 2026-06-21 : liste canonique = 24 dépts côtiers (métropole +
// Corse), EXCLURE la Somme (80). Onboarding + profil rendent depuis DEPARTMENT_OPTIONS.
const EXPECTED_ORDER = [
  '06', '11', '13', '14', '17', '22', '29', '30', '33', '34', '35', '40',
  '44', '50', '56', '59', '62', '64', '66', '76', '83', '85', '2A', '2B',
]

describe('lib/geo/departments — source canonique des 24 départements côtiers', () => {
  it('COASTAL_DEPARTMENTS contient exactement 24 codes', () => {
    expect(COASTAL_DEPARTMENTS).toHaveLength(24)
  })

  it('ne contient PAS la Somme (80)', () => {
    expect(COASTAL_DEPARTMENTS).not.toContain('80')
    expect(isCoastalDepartment('80')).toBe(false)
  })

  it('contient les 7 longtemps manquants côté profil (06,11,13,30,59,2A,2B)', () => {
    for (const code of ['06', '11', '13', '30', '59', '2A', '2B']) {
      expect(COASTAL_DEPARTMENTS, `manque ${code}`).toContain(code)
    }
    expect(isCoastalDepartment('29')).toBe(true)
  })

  it('DEPARTMENT_OPTIONS : 24 entrées, labels non vides, ordre numérique puis Corse', () => {
    expect(DEPARTMENT_OPTIONS).toHaveLength(24)
    expect(DEPARTMENT_OPTIONS.map((o) => o.code)).toEqual(EXPECTED_ORDER)
    for (const o of DEPARTMENT_OPTIONS) {
      expect(o.label).toMatch(/^.+ — .+/)
    }
  })

  it('cohérence labels ↔ codes (aucune clé orpheline)', () => {
    for (const code of COASTAL_DEPARTMENTS) {
      expect(DEPARTMENT_LABELS[code], `label manquant pour ${code}`).toBeTruthy()
    }
    expect(Object.keys(DEPARTMENT_LABELS).sort()).toEqual([...COASTAL_DEPARTMENTS].sort())
  })
})

describe('departmentArticle — article + préposition accordés (Bloc B sprint 31)', () => {
  it("prep 'de' : masculin, féminin, pluriel, élision, Corse", () => {
    expect(departmentArticle('29', 'de')).toBe('du Finistère') // masculin
    expect(departmentArticle('85', 'de')).toBe('de la Vendée') // féminin
    expect(departmentArticle('06', 'de')).toBe('des Alpes-Maritimes') // pluriel
    expect(departmentArticle('22', 'de')).toBe("des Côtes-d'Armor") // pluriel
    expect(departmentArticle('34', 'de')).toBe("de l'Hérault") // élision (h muet)
    expect(departmentArticle('11', 'de')).toBe("de l'Aude") // élision (voyelle)
    expect(departmentArticle('2A', 'de')).toBe('de la Corse-du-Sud') // Corse
    expect(departmentArticle('2B', 'de')).toBe('de la Haute-Corse') // Corse
  })

  it("prep 'dans' : masculin, féminin, pluriel, élision, Corse", () => {
    expect(departmentArticle('29', 'dans')).toBe('dans le Finistère')
    expect(departmentArticle('85', 'dans')).toBe('dans la Vendée')
    expect(departmentArticle('06', 'dans')).toBe('dans les Alpes-Maritimes')
    expect(departmentArticle('34', 'dans')).toBe("dans l'Hérault")
    expect(departmentArticle('2A', 'dans')).toBe('dans la Corse-du-Sud')
  })

  it('chaque département côtier a une grammaire définie (aucun « undefined »)', () => {
    for (const code of COASTAL_DEPARTMENTS) {
      const de = departmentArticle(code, 'de')
      const dans = departmentArticle(code, 'dans')
      expect(de, `de ${code}`).toContain(DEPARTMENT_LABELS[code])
      expect(de).not.toMatch(/undefined/)
      // Forme attendue : « du/de la/des/de l' » + nom (élision sans espace).
      expect(de).toMatch(/^(du |de la |des |de l')/)
      expect(dans).toMatch(/^(dans le |dans la |dans les |dans l')/)
    }
  })

  // Verrou EXHAUSTIF du genre/nombre/élision des 24 dépts (sinon un mauvais genre
  // — « de la Finistère » — passerait le test de forme générique ci-dessus).
  it('les 24 départements côtiers : forme « de » exacte (snapshot)', () => {
    const expected: Record<string, string> = {
      '14': 'du Calvados',
      '17': 'de la Charente-Maritime',
      '22': "des Côtes-d'Armor",
      '29': 'du Finistère',
      '33': 'de la Gironde',
      '35': "de l'Ille-et-Vilaine",
      '40': 'des Landes',
      '44': 'de la Loire-Atlantique',
      '50': 'de la Manche',
      '56': 'du Morbihan',
      '59': 'du Nord',
      '62': 'du Pas-de-Calais',
      '64': 'des Pyrénées-Atlantiques',
      '76': 'de la Seine-Maritime',
      '85': 'de la Vendée',
      '06': 'des Alpes-Maritimes',
      '11': "de l'Aude",
      '13': 'des Bouches-du-Rhône',
      '30': 'du Gard',
      '34': "de l'Hérault",
      '66': 'des Pyrénées-Orientales',
      '83': 'du Var',
      '2A': 'de la Corse-du-Sud',
      '2B': 'de la Haute-Corse',
    }
    expect(Object.keys(expected).sort()).toEqual([...COASTAL_DEPARTMENTS].sort())
    for (const [code, phrase] of Object.entries(expected)) {
      expect(departmentArticle(code, 'de'), `de ${code}`).toBe(phrase)
    }
  })

  it('code hors liste côtière : fallback lisible, jamais « undefined »', () => {
    expect(departmentArticle('99', 'de')).toBe('99') // inconnu → code brut
    expect(departmentArticle('', 'dans')).toBe('')
  })

  it('tolère les espaces parasites autour du code', () => {
    expect(departmentArticle(' 29 ', 'de')).toBe('du Finistère')
  })
})

describe('DEPARTMENT_ADJACENCY — adjacence des départements côtiers (sprint 50)', () => {
  it('toutes les clés sont des départements côtiers connus', () => {
    for (const code of Object.keys(DEPARTMENT_ADJACENCY)) {
      expect(isCoastalDepartment(code), `clé ${code} non côtière`).toBe(true)
    }
  })

  it('chaque département côtier a une entrée (même vide)', () => {
    for (const code of COASTAL_DEPARTMENTS) {
      expect(DEPARTMENT_ADJACENCY[code], `manque l'entrée ${code}`).toBeDefined()
    }
  })

  it('toutes les valeurs (voisins) sont des départements côtiers connus', () => {
    for (const [code, neighbors] of Object.entries(DEPARTMENT_ADJACENCY)) {
      for (const n of neighbors) {
        expect(isCoastalDepartment(n), `${code} → voisin ${n} non côtier`).toBe(true)
      }
    }
  })

  it('relation SYMÉTRIQUE : si A voisin de B alors B voisin de A', () => {
    for (const [code, neighbors] of Object.entries(DEPARTMENT_ADJACENCY)) {
      for (const n of neighbors) {
        expect(
          DEPARTMENT_ADJACENCY[n],
          `${n} doit lister ${code} (symétrie)`,
        ).toContain(code)
      }
    }
  })

  it('aucun département n’est son propre voisin et pas de doublon', () => {
    for (const [code, neighbors] of Object.entries(DEPARTMENT_ADJACENCY)) {
      expect(neighbors, `${code} se référence lui-même`).not.toContain(code)
      expect(new Set(neighbors).size, `doublon de voisin pour ${code}`).toBe(neighbors.length)
    }
  })

  it('quelques frontières terrestres réelles connues', () => {
    expect(neighborDepartments('29')).toEqual(expect.arrayContaining(['22', '56']))
    expect(neighborDepartments('56')).toEqual(expect.arrayContaining(['29', '44']))
    expect(neighborDepartments('44')).toEqual(expect.arrayContaining(['56', '85']))
    expect(neighborDepartments('85')).toEqual(expect.arrayContaining(['44', '17']))
    expect(neighborDepartments('17')).toEqual(expect.arrayContaining(['85', '33']))
    expect(neighborDepartments('33')).toEqual(expect.arrayContaining(['17', '40']))
    expect(neighborDepartments('40')).toEqual(expect.arrayContaining(['33', '64']))
    expect(neighborDepartments('50')).toEqual(expect.arrayContaining(['14', '35']))
    expect(neighborDepartments('2A')).toEqual(['2B'])
    expect(neighborDepartments('2B')).toEqual(['2A'])
  })

  it('un Finistère (29) n’est PAS frontalier de la Gironde (33)', () => {
    expect(neighborDepartments('29')).not.toContain('33')
  })

  it('code inconnu ou isolé → tableau vide, jamais undefined', () => {
    expect(neighborDepartments('99')).toEqual([])
    expect(neighborDepartments('')).toEqual([])
    expect(neighborDepartments('76')).toEqual([]) // Seine-Maritime isolée (voisins inland)
  })
})
