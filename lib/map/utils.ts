// Choix d'architecture : on utilise la RPC get_spots_for_map() (migration 009)
// plutôt que de parser le WKB retourné par spots_for_viewer.
// Raison : geom_public est un POLYGON geography (buffer 1 km) — ni ST_X ni
// maplibre-gl ne peuvent le consommer directement. La RPC extrait lng/lat via
// ST_Centroid côté Postgres et retourne des floats prêts à l'emploi.
// Avantage : zéro dépendance de parsing WKB côté client, logique de visibilité
// centralisée en SQL (SECURITY DEFINER).

import type { Database } from '@/lib/types'
import type { QualityLevel } from '@/lib/solunar/types'

export type SpotSource = 'curated' | 'community' | 'imported'

export type SpotMarker = {
  id: string
  slug: string
  name: string
  lng: number
  lat: number
  isPrecise: boolean
  department: string
  region: string
  species: string[]
  techniques: string[]
  difficulty: number
  structure?: string | null
  verified: boolean
  // Provenance (migration 041) : curated (socle vérifié), community (proposé),
  // imported (OSM/ODbL). Le badge « Vérifié » de la carte = source==='curated'.
  // Optionnel : les mini-cartes (CatchMiniMap/SpotMiniMap) bâtissent un
  // SpotMarker sans provenance (pas de badge dans ces contextes mono-spot).
  source?: SpotSource
  // Qualité du MEILLEUR moment du jour (dérivée de spot_scores.day_score, pas de
  // current_score qui est ~toujours 0 — cf fetchFreshScores). Couleur du marker.
  // undefined si pas encore de score (cron pas passé / spot récent) → gris neutre.
  dayQuality?: QualityLevel
  // Score numérique 0-100 du meilleur moment du jour (spot_scores.day_score),
  // affiché dans le panneau spot. undefined si pas encore scoré.
  dayScore?: number
}

// Couleur de marker par qualité (markers carte + légende + cercles flous).
// Rampe CIVIDIS — colormap optimisée POUR le daltonisme (la luminosité monotone
// est préservée sous deutéran/protan/tritan, pas seulement « CVD-friendly »
// comme viridis). Vérifié (Machado sRGB) : ΔL* adjacent ~15-19 uniforme sous
// tous les types, aucune paire faible. L'info passe par la luminosité, pas la teinte.
export const QUALITY_MARKER_COLORS: Record<QualityLevel, string> = {
  faible:         '#00224E', // cividis 0.00 — bleu nuit
  moyenne:        '#414D6B', // cividis 0.25 — bleu-gris
  bonne:          '#7D7C78', // cividis 0.50 — gris
  tres_bonne:     '#BCAF6F', // cividis 0.75 — olive
  exceptionnelle: '#FEE838', // cividis 1.00 — jaune vif
}

export const QUALITY_NEUTRAL_COLOR = '#B7C2C9' // ink-300 (pas encore de score)

export function markerColorForQuality(q?: QualityLevel | null): string {
  return q ? QUALITY_MARKER_COLORS[q] : QUALITY_NEUTRAL_COLOR
}

type MapSpotRow = Database['public']['Functions']['get_spots_for_map']['Returns'][number]

// Approximation polygonale d'un cercle en WGS84 pour les spots floutés.
// Retourne un Feature GeoJSON Polygon centré sur le spot avec rayon en km.
export function createFuzzyCircle(
  spot: SpotMarker,
  radiusKm = 1,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon, { spotId: string; quality: string }> {
  const coords: [number, number][] = []
  const lngScale = 1 / Math.cos((spot.lat * Math.PI) / 180)
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    coords.push([
      spot.lng + (radiusKm / 111.32) * lngScale * Math.cos(angle),
      spot.lat + (radiusKm / 111.32) * Math.sin(angle),
    ])
  }
  return {
    type: 'Feature',
    properties: { spotId: spot.id, quality: spot.dayQuality ?? '' },
    geometry: { type: 'Polygon', coordinates: [coords] },
  }
}

export const COASTAL_DEFAULT_CENTER: [number, number] = [-2.5, 47.0]
export const COASTAL_DEFAULT_ZOOM = 6

/**
 * Cadre par défaut de `/carte` : les DEUX façades dans le même écran.
 *
 * ⚠️ SPRINT 80, Bloc 3. `COASTAL_DEFAULT_CENTER` vaut `[-2.5, 47.0]`, au large de
 * la Vendée. En portrait 390 × 664 au zoom 6, le cadre visible est haut et
 * étroit : il montre Brest, Nantes et La Rochelle, et laisse la Méditerranée
 * (longitudes 3 à 9, latitudes 41 à 43,5) **hors champ**. Le sprint 78 a fait
 * passer la Méditerranée de 19 % à 44,6 % de l'inventaire publié : à l'écran,
 * ces 191 fiches n'existaient pas. Un pêcheur varois ouvrait un site breton.
 *
 * On donne des BORNES plutôt qu'un centre et un zoom, précisément parce que le
 * zoom qui cadre bien en portrait ne cadre pas en paysage : `fitBounds` dérive
 * le zoom du ratio réel du conteneur, ce qu'une valeur en dur ne peut pas faire.
 *
 * Sud-ouest → nord-est, Corse comprise (elle porte 311 spots éligibles).
 */
export const COASTAL_DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [-5.2, 41.3],
  [9.6, 51.1],
]

// Limite le tableau de spots à `max` par département (tri stable, conserve l'ordre d'entrée).
export function limitSpotsPerDept(spots: SpotMarker[], max: number): SpotMarker[] {
  const counts: Record<string, number> = {}
  return spots.filter((s) => {
    counts[s.department] = (counts[s.department] ?? 0) + 1
    return counts[s.department] <= max
  })
}

export function toSpotMarker(row: MapSpotRow): SpotMarker {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    lng: row.lng,
    lat: row.lat,
    isPrecise: row.is_precise,
    department: row.department.trim(),
    region: row.region,
    species: row.species ?? [],
    techniques: row.techniques ?? [],
    difficulty: row.difficulty ?? 3,
    structure: row.structure,
    verified: row.verified ?? false,
    source: (row.source as SpotSource) ?? 'curated',
  }
}
