// Choix d'architecture : on utilise la RPC get_spots_for_map() (migration 009)
// plutôt que de parser le WKB retourné par spots_for_viewer.
// Raison : geom_public est un POLYGON geography (buffer 1 km) — ni ST_X ni
// maplibre-gl ne peuvent le consommer directement. La RPC extrait lng/lat via
// ST_Centroid côté Postgres et retourne des floats prêts à l'emploi.
// Avantage : zéro dépendance de parsing WKB côté client, logique de visibilité
// centralisée en SQL (SECURITY DEFINER).

import type { Database } from '@/lib/types'

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
}

type MapSpotRow = Database['public']['Functions']['get_spots_for_map']['Returns'][number]

// Approximation polygonale d'un cercle en WGS84 pour les spots floutés.
// Retourne un Feature GeoJSON Polygon centré sur le spot avec rayon en km.
export function createFuzzyCircle(
  spot: SpotMarker,
  radiusKm = 1,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon, { spotId: string }> {
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
    properties: { spotId: spot.id },
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
