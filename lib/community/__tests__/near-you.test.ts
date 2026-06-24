import { describe, it, expect } from 'vitest'
import {
  departmentBBox,
  summarizeHeatRows,
  NEAR_YOU_LAT_SPAN,
  NEAR_YOU_LNG_SPAN,
} from '../near-you-core'
import { DEPARTMENT_SEA_COORDS } from '@/lib/geo/department-coords'

describe('departmentBBox', () => {
  it('centre la bbox sur le point côtier du département', () => {
    const c = DEPARTMENT_SEA_COORDS['29']
    const bbox = departmentBBox('29')!
    expect(bbox.minLng).toBeCloseTo(c.lng - NEAR_YOU_LNG_SPAN, 6)
    expect(bbox.maxLng).toBeCloseTo(c.lng + NEAR_YOU_LNG_SPAN, 6)
    expect(bbox.minLat).toBeCloseTo(c.lat - NEAR_YOU_LAT_SPAN, 6)
    expect(bbox.maxLat).toBeCloseTo(c.lat + NEAR_YOU_LAT_SPAN, 6)
    // min < max sur les deux axes (bbox valide).
    expect(bbox.minLng).toBeLessThan(bbox.maxLng)
    expect(bbox.minLat).toBeLessThan(bbox.maxLat)
  })

  it('renvoie null pour un département inconnu (jamais une bbox bidon)', () => {
    expect(departmentBBox('99')).toBeNull()
    expect(departmentBBox('')).toBeNull()
  })
})

describe('summarizeHeatRows', () => {
  it('somme les prises et compte les cellules k-anon', () => {
    const res = summarizeHeatRows([
      { catch_count: 4, fishers_count: 3 },
      { catch_count: 7, fishers_count: 5 },
    ])
    expect(res.catchCount).toBe(11)
    expect(res.cellCount).toBe(2)
  })

  it('ignore les cellules à 0 / null / négatif (pas de bruit)', () => {
    const res = summarizeHeatRows([
      { catch_count: 3, fishers_count: 3 },
      { catch_count: 0, fishers_count: 0 },
      { catch_count: null, fishers_count: null },
      { catch_count: -2, fishers_count: 1 },
    ])
    expect(res.catchCount).toBe(3)
    expect(res.cellCount).toBe(1)
  })

  it('renvoie un signal vide pour aucune cellule', () => {
    expect(summarizeHeatRows([])).toEqual({ catchCount: 0, cellCount: 0 })
  })
})
