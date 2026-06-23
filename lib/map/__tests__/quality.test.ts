import { describe, it, expect } from 'vitest'
import {
  cellsToSquareGeoJSON,
  buildQualityPopupHTML,
  QUALITY_FR,
  QUALITY_LEGEND,
  type QualityCell,
  type QualityPopupVM,
} from '@/lib/map/quality'
import type { SuitabilityAssessment } from '@/lib/conditions/species-habitat'

const baseCell: QualityCell = {
  lng: -4.6, lat: 48.4, cellSize: 0.05,
  communityCount: 5, fishersCount: 3, persoCount: 0,
  communityNorm: 63, persoNorm: 0, score: 63, quality: 'tres_bonne',
}

describe('cellsToSquareGeoJSON — carrés de grille + props scalaires', () => {
  it('construit un Polygon carré centré sur la cellule (±demi-cellule)', () => {
    const fc = cellsToSquareGeoJSON([baseCell])
    expect(fc.features).toHaveLength(1)
    const f = fc.features[0]
    expect(f.geometry.type).toBe('Polygon')
    const ring = f.geometry.coordinates[0]
    expect(ring).toHaveLength(5) // anneau fermé
    expect(ring[0]).toEqual(ring[4]) // fermé
    // bornes ±0.025
    const lngs = ring.map((c) => c[0])
    const lats = ring.map((c) => c[1])
    expect(Math.min(...lngs)).toBeCloseTo(-4.625, 6)
    expect(Math.max(...lngs)).toBeCloseTo(-4.575, 6)
    expect(Math.min(...lats)).toBeCloseTo(48.375, 6)
    expect(Math.max(...lats)).toBeCloseTo(48.425, 6)
  })

  it('aplatit toutes les propriétés en SCALAIRES (pas d’objet imbriqué)', () => {
    const p = cellsToSquareGeoJSON([baseCell]).features[0].properties
    for (const v of Object.values(p)) {
      expect(['number', 'string']).toContain(typeof v)
    }
    expect(p.score).toBe(63)
    expect(p.quality).toBe('tres_bonne')
    expect(p.community_count).toBe(5)
    expect(p.cx).toBe(-4.6)
    expect(p.cs).toBe(0.05)
  })
})

describe('QUALITY_FR / QUALITY_LEGEND', () => {
  it('libellés FR pour les 5 niveaux', () => {
    expect(QUALITY_FR.faible).toBe('Faible')
    expect(QUALITY_FR.exceptionnelle).toBe('Exceptionnelle')
  })
  it('légende ordonnée du meilleur au moins bon, avec couleurs', () => {
    expect(QUALITY_LEGEND).toHaveLength(5)
    expect(QUALITY_LEGEND[0].quality).toBe('exceptionnelle')
    expect(QUALITY_LEGEND[4].quality).toBe('faible')
    QUALITY_LEGEND.forEach((l) => expect(l.color).toMatch(/^#[0-9A-Fa-f]{6}$/))
  })
})

function vm(over: Partial<QualityPopupVM>): QualityPopupVM {
  return {
    props: {
      score: 63, quality: 'tres_bonne', community_count: 5, fishers_count: 3,
      perso_count: 0, cx: -4.6, cy: 48.4, cs: 0.05,
    },
    species: 'dorade_royale',
    days: 30,
    tier: 'itinerant',
    fond: { kind: 'hidden' },
    spotLink: null,
    ...over,
  }
}

const favorable: SuitabilityAssessment = {
  verdict: 'favorable', label: 'Fond favorable',
  detail: 'Sable à ≈ 6,0 m — la dorade royale fouille le sable.', category: 'sand',
}

describe('buildQualityPopupHTML — décomposition honnête (garde-fou 7.5)', () => {
  it('montre la note ET les composantes (jamais juste une note)', () => {
    const html = buildQualityPopupHTML(vm({ tier: 'itinerant', fond: { kind: 'done', assessment: favorable } }))
    expect(html).toContain('Qualité : Très bonne')
    expect(html).toContain('63') // le score chiffré
    expect(html).toContain('Communauté')
    expect(html).toContain('Fond favorable')
    expect(html).toContain('fouille le sable')
  })

  it('communauté sous K=3 → mention honnête, pas de count fabriqué', () => {
    const html = buildQualityPopupHTML(vm({ props: { ...vm({}).props, community_count: 2 } }))
    expect(html).toContain('pas encore assez de prises partagées')
    expect(html).not.toMatch(/2 prises/)
  })

  it('communauté ≥ K=3 → affiche les counts', () => {
    const html = buildQualityPopupHTML(vm({ props: { ...vm({}).props, community_count: 5, fishers_count: 3 } }))
    expect(html).toContain('5')
    expect(html).toContain('pêcheurs')
  })

  it('perso affiché seulement si > 0 (omis sinon — honnête)', () => {
    const withPerso = buildQualityPopupHTML(vm({ tier: 'itinerant', props: { ...vm({}).props, perso_count: 2 } }))
    expect(withPerso).toContain('Ton carnet')
    const without = buildQualityPopupHTML(vm({ tier: 'itinerant', props: { ...vm({}).props, perso_count: 0 } }))
    expect(without).not.toContain('Ton carnet')
  })

  it('non-Itinérant → fond verrouillé + upsell, jamais le détail', () => {
    const html = buildQualityPopupHTML(vm({ tier: 'local', fond: { kind: 'hidden' } }))
    expect(html).toContain('Itinérant')
    expect(html).toContain('Débloque la qualité complète')
    expect(html).not.toContain('Ton carnet')
    expect(html).not.toContain('Fond favorable')
  })

  it('lien fiche spot si un spot curé est dans la cellule', () => {
    const html = buildQualityPopupHTML(vm({ spotLink: { slug: 'pointe-du-raz', name: 'Pointe du Raz' } }))
    expect(html).toContain('/spots/pointe-du-raz')
    expect(html).toContain('Pointe du Raz')
  })
})
