import { describe, it, expect } from 'vitest'
import {
  parseSeasonKey,
  seasonLabelFromKey,
  shiftSeasonKey,
  seasonOptions,
} from '../season'

describe('parseSeasonKey', () => {
  it('parse une clé valide', () => {
    expect(parseSeasonKey('2026-Q3')).toEqual({ year: 2026, quarter: 3 })
  })
  it('trim les espaces', () => {
    expect(parseSeasonKey('  2025-Q1 ')).toEqual({ year: 2025, quarter: 1 })
  })
  it('rejette les clés mal formées', () => {
    expect(parseSeasonKey('2026-Q5')).toBeNull()
    expect(parseSeasonKey('2026-Q0')).toBeNull()
    expect(parseSeasonKey('26-Q3')).toBeNull()
    expect(parseSeasonKey('')).toBeNull()
    expect(parseSeasonKey(null)).toBeNull()
  })
})

describe('seasonLabelFromKey', () => {
  it('mappe le trimestre au nom de saison', () => {
    expect(seasonLabelFromKey('2026-Q1')).toBe('Hiver 2026')
    expect(seasonLabelFromKey('2026-Q2')).toBe('Printemps 2026')
    expect(seasonLabelFromKey('2026-Q3')).toBe('Été 2026')
    expect(seasonLabelFromKey('2026-Q4')).toBe('Automne 2026')
  })
  it('repli sur la clé si non parsable', () => {
    expect(seasonLabelFromKey('bidon')).toBe('bidon')
  })
})

describe('shiftSeasonKey', () => {
  it('décrémente en franchissant l’année', () => {
    expect(shiftSeasonKey('2026-Q1', -1)).toBe('2025-Q4')
    expect(shiftSeasonKey('2026-Q3', -1)).toBe('2026-Q2')
    expect(shiftSeasonKey('2026-Q3', -3)).toBe('2025-Q4')
  })
  it('incrémente en franchissant l’année', () => {
    expect(shiftSeasonKey('2026-Q4', 1)).toBe('2027-Q1')
  })
  it('offset 0 = identité', () => {
    expect(shiftSeasonKey('2026-Q2', 0)).toBe('2026-Q2')
  })
})

describe('seasonOptions', () => {
  it('renvoie la saison courante + N précédentes, offset 0 en tête', () => {
    const opts = seasonOptions('2026-Q3', 3)
    expect(opts).toEqual([
      { offset: 0, key: '2026-Q3', label: 'Été 2026' },
      { offset: -1, key: '2026-Q2', label: 'Printemps 2026' },
      { offset: -2, key: '2026-Q1', label: 'Hiver 2026' },
      { offset: -3, key: '2025-Q4', label: 'Automne 2025' },
    ])
  })
})
