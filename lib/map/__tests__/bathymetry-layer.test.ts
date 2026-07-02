import { describe, it, expect, vi } from 'vitest'
import type { Map as MapLibreMap, LayerSpecification, SourceSpecification } from 'maplibre-gl'
import {
  buildSeabedPopupHTML,
  addBathyLayer,
  setBathyOpacity,
  BATHY_DEPTH_LAYER,
  BATHY_SUBSTRATE_LAYER,
  BATHY_DEPTH_SOURCE,
  BATHY_MIN_ZOOM,
  BATHY_MAX_ZOOM,
  BATHY_DEPTH_SATURATION,
  BATHY_DEPTH_BRIGHTNESS_MAX,
  BATHY_SUBSTRATE_OPACITY_RATIO,
} from '@/lib/map/bathymetry-layer'
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

// ── Lisibilité de la couche (sprint 70 / Bloc D, audit 2026-07-02 §4.14) ─────────────
// Faux Map MapLibre minimal : capture les specs addSource/addLayer + mock setPaintProperty.
function fakeMap() {
  const sources = new Map<string, SourceSpecification>()
  const layers: LayerSpecification[] = []
  const setPaintProperty = vi.fn()
  const map = {
    getStyle: () => ({
      layers: [
        { id: 'water', type: 'fill' },
        { id: 'place-labels', type: 'symbol' },
      ],
    }),
    getSource: (id: string) => sources.get(id),
    getLayer: (id: string) => layers.find((l) => l.id === id),
    addSource: (id: string, spec: SourceSpecification) => {
      sources.set(id, spec)
    },
    addLayer: (spec: LayerSpecification) => {
      layers.push(spec)
    },
    setPaintProperty,
  } as unknown as MapLibreMap
  return { map, sources, layers, setPaintProperty }
}

describe('addBathyLayer — lisibilité zooms 10-14 (audit 2026-07-02 §4.14)', () => {
  it('pose saturation + brightness-max sur la couche profondeur, SANS contraste positif', () => {
    const { map, layers } = fakeMap()
    addBathyLayer(map, 0.7)
    const depth = layers.find((l) => l.id === BATHY_DEPTH_LAYER)
    expect(depth).toBeDefined()
    const paint = (depth as { paint: Record<string, unknown> }).paint
    expect(paint['raster-opacity']).toBe(0.7)
    expect(paint['raster-saturation']).toBe(BATHY_DEPTH_SATURATION)
    expect(paint['raster-brightness-max']).toBe(BATHY_DEPTH_BRIGHTNESS_MAX)
    // Un raster-contrast positif CRAMERAIT la rampe quasi blanche des hauts-fonds
    // (le contraste s'applique AVANT brightness dans le shader) → il ne doit pas exister.
    expect(paint['raster-contrast']).toBeUndefined()
    // Réglages dans les bornes MapLibre, et perceptibles.
    expect(BATHY_DEPTH_SATURATION).toBeGreaterThan(0)
    expect(BATHY_DEPTH_SATURATION).toBeLessThanOrEqual(1)
    expect(BATHY_DEPTH_BRIGHTNESS_MAX).toBeLessThan(0.9) // assez sombre pour être visible
    expect(BATHY_DEPTH_BRIGHTNESS_MAX).toBeGreaterThan(0.5) // sans écraser le fond de carte
  })

  it('substrat = couleurs catégorielles : opacité relative seule, PAS de contraste/saturation', () => {
    const { map, layers } = fakeMap()
    addBathyLayer(map, 0.7)
    const subsLayer = layers.find((l) => l.id === BATHY_SUBSTRATE_LAYER)
    expect(subsLayer).toBeDefined()
    const paint = (subsLayer as { paint: Record<string, unknown> }).paint
    expect(paint['raster-opacity']).toBeCloseTo(0.7 * BATHY_SUBSTRATE_OPACITY_RATIO, 5)
    expect(paint['raster-contrast']).toBeUndefined()
    expect(paint['raster-saturation']).toBeUndefined()
  })

  it('bornes de zoom inchangées : layer minzoom 9, source maxzoom 13 (overzoom)', () => {
    const { map, sources, layers } = fakeMap()
    addBathyLayer(map, 0.7)
    expect(BATHY_MIN_ZOOM).toBe(9) // couvre les zooms d'usage 10-14
    expect(BATHY_MAX_ZOOM).toBe(13)
    for (const id of [BATHY_DEPTH_LAYER, BATHY_SUBSTRATE_LAYER]) {
      expect(layers.find((l) => l.id === id)?.minzoom).toBe(BATHY_MIN_ZOOM)
    }
    const depthSrc = sources.get(BATHY_DEPTH_SOURCE) as { maxzoom?: number }
    expect(depthSrc.maxzoom).toBe(BATHY_MAX_ZOOM)
  })

  it('setBathyOpacity garde le ratio substrat (0.55) aligné sur l’ajout', () => {
    const { map, setPaintProperty } = fakeMap()
    addBathyLayer(map, 0.7)
    setBathyOpacity(map, 0.5)
    expect(setPaintProperty).toHaveBeenCalledWith(BATHY_DEPTH_LAYER, 'raster-opacity', 0.5)
    expect(setPaintProperty).toHaveBeenCalledWith(
      BATHY_SUBSTRATE_LAYER,
      'raster-opacity',
      0.5 * BATHY_SUBSTRATE_OPACITY_RATIO,
    )
  })
})
