import { describe, it, expect } from 'vitest'
import {
  COASTAL_DEPARTMENTS,
  DEPARTMENT_LABELS,
  DEPARTMENT_OPTIONS,
  isCoastalDepartment,
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
