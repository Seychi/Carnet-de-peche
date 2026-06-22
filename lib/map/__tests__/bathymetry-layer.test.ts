import { describe, it, expect } from 'vitest'
import { buildSeabedPopupHTML } from '@/lib/map/bathymetry-layer'
import type { SeabedInfo } from '@/lib/conditions/bathymetry'

const depth = (m: number): SeabedInfo['depth'] => ({
  depth_m: m,
  shallow_m: m - 1,
  deep_m: m + 1,
  source: 'EMODnet Bathymetry',
})
const subs = (label: string): SeabedInfo['substrate'] => ({
  label,
  raw: label,
  source: 'EMODnet Seabed Habitats (EUSeaMap)',
})

describe('buildSeabedPopupHTML — popup « Fond / Profondeur »', () => {
  it('affiche fond + profondeur quand les deux sont présents', () => {
    const html = buildSeabedPopupHTML({ depth: depth(5.5), substrate: subs('Vase') })
    expect(html).toContain('Vase')
    expect(html).toMatch(/5,5.{0,2}m/) // virgule décimale FR + unité (espace tolérant)
    expect(html).toContain('Fond')
    expect(html).toContain('Profondeur')
  })

  it('marque le fond « indisponible » si seule la profondeur est connue', () => {
    const html = buildSeabedPopupHTML({ depth: depth(12), substrate: null })
    expect(html).toMatch(/12,0.{0,2}m/)
    expect(html).toContain('indisponible ici')
  })

  it('marque la profondeur « indisponible » si seul le fond est connu', () => {
    const html = buildSeabedPopupHTML({ depth: null, substrate: subs('Sable') })
    expect(html).toContain('Sable')
    expect(html).toContain('indisponible ici')
  })

  it('message honnête hors couverture (rien des deux)', () => {
    const html = buildSeabedPopupHTML({ depth: null, substrate: null })
    expect(html).toContain('hors couverture')
    expect(html).not.toContain('Profondeur')
  })

  it('échappe le HTML du libellé substrat (anti-XSS)', () => {
    const html = buildSeabedPopupHTML({ depth: null, substrate: subs('<script>x</script>') })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
