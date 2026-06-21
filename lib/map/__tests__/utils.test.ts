import { describe, it, expect } from 'vitest'
import { limitSpotsPerDept } from '@/lib/map/utils'
import type { SpotMarker } from '@/lib/map/utils'

function mk(id: string, department: string): SpotMarker {
  return {
    id, slug: id, name: id, lng: 0, lat: 0, isPrecise: false,
    department, region: 'bretagne', species: [], techniques: [],
    difficulty: 3, structure: null, verified: false,
  }
}

describe('limitSpotsPerDept (gating gratuit, double sécurité du cap SQL 029)', () => {
  it('plafonne à 3 spots par département pour anon/discovery', () => {
    const spots = [
      mk('a', '29'), mk('b', '29'), mk('c', '29'), mk('d', '29'), mk('e', '29'),
      mk('f', '56'), mk('g', '56'),
    ]
    const out = limitSpotsPerDept(spots, 3)
    expect(out.filter((s) => s.department === '29')).toHaveLength(3)
    expect(out.filter((s) => s.department === '56')).toHaveLength(2)
  })

  it('conserve l\'ordre d\'entrée (tri stable) et garde les 3 premiers du dépt', () => {
    const spots = [mk('a', '29'), mk('b', '29'), mk('c', '29'), mk('d', '29')]
    const out = limitSpotsPerDept(spots, 3)
    expect(out.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('ne supprime rien si chaque dépt a moins que le plafond', () => {
    const spots = [mk('a', '29'), mk('b', '56')]
    expect(limitSpotsPerDept(spots, 3)).toHaveLength(2)
  })
})
