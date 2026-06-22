// Choix d'architecture : on utilise la RPC get_spots_for_map() (migration 009)
// plutôt que de parser le WKB retourné par spots_for_viewer.
// Raison : geom_public est un POLYGON geography (buffer 1 km) — ni ST_X ni
// maplibre-gl ne peuvent le consommer directement. La RPC extrait lng/lat via
// ST_Centroid côté Postgres et retourne des floats prêts à l'emploi.
// Avantage : zéro dépendance de parsing WKB côté client, logique de visibilité
// centralisée en SQL (SECURITY DEFINER).

import type { Database } from '@/lib/types'
import type { QualityLevel } from '@/lib/solunar/types'

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
  // Qualité actuelle pré-calculée par le cron (spot_scores). undefined si pas
  // encore de score (cron pas passé / spot récent) → marker gris neutre.
  currentQuality?: QualityLevel
  // Score numérique 0-100 (spot_scores.current_score) associé à currentQuality.
  // Affiché dans le panneau spot ; undefined si pas encore scoré.
  currentScore?: number
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
    properties: { spotId: spot.id, quality: spot.currentQuality ?? '' },
    geometry: { type: 'Polygon', coordinates: [coords] },
  }
}

export const COASTAL_DEFAULT_CENTER: [number, number] = [-2.5, 47.0]
export const COASTAL_DEFAULT_ZOOM = 6

// Extrait [lng, lat] d'un objet GeoJSON Point (si Supabase est configuré pour retourner du GeoJSON).
// Retourne null si le format est inattendu — ne jamais faire confiance au type unknown.
export function parseGeoJSONPoint(geom: unknown): [number, number] | null {
  if (!geom || typeof geom !== 'object') return null
  const g = geom as { type?: string; coordinates?: unknown[] }
  if (g.type !== 'Point' || !Array.isArray(g.coordinates) || g.coordinates.length < 2) return null
  const [lng, lat] = g.coordinates as number[]
  if (typeof lng !== 'number' || typeof lat !== 'number') return null
  return [lng, lat]
}

// Extrait le centroïde approché d'un GeoJSON Polygon (moyenne des sommets de l'anneau extérieur).
// Utilisé pour geom_public des spots (buffer 1 km) si on passe via spots_for_viewer plutôt que la RPC.
export function parseGeoJSONPolygonCentroid(geom: unknown): [number, number] | null {
  if (!geom || typeof geom !== 'object') return null
  const g = geom as { type?: string; coordinates?: unknown[][] }
  if (g.type !== 'Polygon' || !Array.isArray(g.coordinates?.[0])) return null
  const ring = g.coordinates[0] as [number, number][]
  if (ring.length === 0) return null
  const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length
  return [lng, lat]
}

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
  }
}
