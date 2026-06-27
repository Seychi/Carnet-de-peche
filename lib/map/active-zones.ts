// Couche « Zones actives » (Sprint 41 / WS A) — où ça PRODUIT en ce moment.
// Source de données = RPC get_active_zones (migration 069) : agrégat k-anonyme
// (K=3) des prises publiques RÉCENTES (~90 j), par cellule de grille snappée à
// geom_public (JAMAIS geom). La RPC ne renvoie que des centroïdes de cellule +
// des counts + un rang de densité (+ espèce dominante seulement si elle aussi
// passe le K-anon, sinon null). Aucune coordonnée précise n'est exposée.
//
// 🎨 DISTINCTION VISUELLE (John est daltonien — l'info ne passe JAMAIS par la
// seule teinte) : la couche se distingue de la heatmap « zones de prises »
// (inferno, blobs sans contour) ET de la couche « Qualité » (carrés à contour
// PLEIN navy + chiffre de score) par TROIS canaux non chromatiques :
//   1. FORME : carrés à CONTOUR EN POINTILLÉS (line-dasharray) — unique à cette
//      couche (la qualité a un contour plein, la heatmap n'en a pas).
//   2. CHIFFRE : le label est le nombre de prises suivi de « p » (ex. « 7p »),
//      distinct du score /100 de la qualité.
//   3. TEINTE (canal secondaire seulement) : un seul accent corail monochrome
//      dont l'OPACITÉ monte avec le rang de densité (lisible en niveaux de gris).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExpressionSpecification } from 'maplibre-gl'
import { SPECIES_LABELS } from '@/lib/labels'

// ── Identifiants source / couches ───────────────────────────────────────────────
export const ZONES_SOURCE = 'active-zones-src'
export const ZONES_FILL_LAYER = 'active-zones-fill'     // carré plein (opacité ∝ densité)
export const ZONES_LINE_LAYER = 'active-zones-line'     // contour POINTILLÉS (forme signature)
export const ZONES_LABEL_LAYER = 'active-zones-label'   // « Np » (chiffre = 2e canal daltonien)

// Couches spots de MapView : on insère la grille SOUS elles (beforeId) pour que les
// markers restent cliquables au-dessus (mêmes ids que les autres couches data).
export const ZONES_SPOT_LAYER_IDS = ['fuzzy-fill', 'clusters', 'unclustered-spots', 'cluster-count'] as const

// La grille n'a de sens qu'à partir d'un zoom régional : en deçà, la heatmap couvre
// la vue large. Borne posée sur les LAYERS (perf).
export const ZONES_MIN_ZOOM = 7
// Le label « Np » devient lisible un cran plus près (évite l'encombrement vue large).
export const ZONES_LABEL_MIN_ZOOM = 9

// ── Couleur / opacité data-driven (corail monochrome, opacité ∝ rang) ────────────
// Accent CORAIL (coral-500 #E5604F) DISTINCT de l'inferno de la heatmap et du
// cividis de la qualité. L'info de densité passe par l'OPACITÉ (monotone, lisible
// en niveaux de gris) + le chiffre du label, jamais par la teinte seule.
// `rank` ∈ ]0..1] (densité relative renvoyée par la RPC).
export const ZONES_FILL_COLOR = '#E5604F' // coral-500
export const ZONES_FILL_OPACITY_EXPR: ExpressionSpecification = [
  'interpolate', ['linear'], ['get', 'rank'],
  0, 0.14,
  0.5, 0.26,
  1, 0.42,
]
export const ZONES_LINE_COLOR = '#B23A2C' // coral foncé — contour pointillé
// Contour en POINTILLÉS : canal de FORME signature de la couche (vs contour plein
// de la qualité, vs aucun contour de la heatmap).
export const ZONES_LINE_DASHARRAY: [number, number] = [2, 1.5]

// ── Types ────────────────────────────────────────────────────────────────────────
export type ZonesBBox = { minLng: number; minLat: number; maxLng: number; maxLat: number }
export type ZonesFilters = { species?: string[] | null; techniques?: string[] | null; days: number }

export type ActiveZone = {
  lng: number
  lat: number
  cellSize: number // taille de cellule (deg) — pour bâtir le carré
  catchCount: number
  fishersCount: number
  rank: number // densité relative ]0..1] pour l'opacité
  dominantSpecies: string | null // null si l'espèce dominante n'est pas elle-même k-anon
}

// Propriétés SCALAIRES portées par chaque feature (MapLibre stringifie les objets
// imbriqués → on aplatit tout en scalaires). Le label de densité « Np » dérive de catch_count.
export type ActiveZoneProps = {
  catch_count: number
  fishers_count: number
  rank: number
  dominant_species: string // '' si null (MapLibre n'aime pas null en props)
  cx: number // centre cellule (ancre popup)
  cy: number
}

type ActiveZoneRow = {
  lng: number
  lat: number
  catch_count: number
  fishers_count: number
  rank: number
  dominant_species: string | null
}

// Taille de cellule selon le zoom — DOIT rester identique au snap SQL (plancher
// 0.01°). On la rejoue côté client pour bâtir le carré (la RPC ne renvoie que le
// centre). Aligné sur get_active_zones / get_catch_heatmap (040:54-62).
export function cellSizeForZoom(zoom: number): number {
  const z = Math.round(zoom)
  if (z <= 6) return 0.2
  if (z <= 8) return 0.1
  if (z <= 10) return 0.05
  if (z <= 12) return 0.02
  return 0.01
}

// Construit un carré (Polygon) par cellule : centre (= nœud de grille) ± demi-cellule.
export function zonesToSquareGeoJSON(
  zones: ActiveZone[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon, ActiveZoneProps> {
  return {
    type: 'FeatureCollection',
    features: zones.map((z) => {
      const h = z.cellSize / 2
      const ring: [number, number][] = [
        [z.lng - h, z.lat - h],
        [z.lng + h, z.lat - h],
        [z.lng + h, z.lat + h],
        [z.lng - h, z.lat + h],
        [z.lng - h, z.lat - h],
      ]
      return {
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
        properties: {
          catch_count: z.catchCount,
          fishers_count: z.fishersCount,
          rank: z.rank,
          dominant_species: z.dominantSpecies ?? '',
          cx: z.lng,
          cy: z.lat,
        },
      }
    }),
  }
}

export const EMPTY_FC: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
  type: 'FeatureCollection',
  features: [],
}

// Appelle la RPC k-anonyme. Renvoie [] sur erreur (couche juste vide, jamais bloquante).
export async function fetchActiveZones(
  supabase: SupabaseClient,
  bbox: ZonesBBox,
  zoom: number,
  filters: ZonesFilters,
): Promise<ActiveZone[]> {
  const cellSize = cellSizeForZoom(zoom)
  const { data, error } = await supabase.rpc('get_active_zones', {
    min_lng: bbox.minLng,
    min_lat: bbox.minLat,
    max_lng: bbox.maxLng,
    max_lat: bbox.maxLat,
    p_zoom: Math.round(zoom),
    species_filter: filters.species?.length ? filters.species : undefined,
    technique_filter: filters.techniques?.length ? filters.techniques : undefined,
    p_days: filters.days,
  })
  if (error || !data) {
    if (error) console.warn('[active-zones] get_active_zones error', error.message)
    return []
  }
  return (data as ActiveZoneRow[]).map((r) => ({
    lng: r.lng,
    lat: r.lat,
    cellSize,
    catchCount: r.catch_count,
    fishersCount: r.fishers_count,
    rank: r.rank,
    dominantSpecies: r.dominant_species ?? null,
  }))
}

// ── Popup (clic optionnel) ───────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function speciesLabel(species: string | null | undefined): string | null {
  if (!species) return null
  return SPECIES_LABELS[species] ?? species
}

/**
 * HTML du popup « Zone active » (pur → testable). On montre l'agrégat k-anon :
 * N prises récentes, M pêcheurs distincts, et l'espèce dominante si elle est
 * elle-même k-anon (sinon on n'invente rien). Aucune coordonnée précise.
 */
export function buildActiveZonePopupHTML(p: ActiveZoneProps, days: number): string {
  const num = (n: number) =>
    `<strong style="font-family:ui-monospace,'JetBrains Mono',monospace">${n}</strong>`
  const dom = speciesLabel(p.dominant_species || null)
  const domRow = dom
    ? `<div style="margin-top:4px;font-size:11px;color:#64748b">Surtout du <strong style="color:#475569">${escapeHtml(dom)}</strong></div>`
    : ''
  return (
    `<div style="font:13px/1.45 system-ui,sans-serif;color:#0E1A22;min-width:180px;max-width:240px">` +
    `<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">` +
    `<span style="width:11px;height:11px;border-radius:3px;background:rgba(229,96,79,.3);border:1.5px dashed ${ZONES_LINE_COLOR};flex-shrink:0"></span>` +
    `<span style="font-weight:600;color:#0E1A22">Zone active</span></div>` +
    `<div>${num(p.catch_count)} prises récentes · ${num(p.fishers_count)} pêcheurs <span style="color:#94a3b8">(${days} j)</span></div>` +
    domRow +
    `<div style="margin-top:7px;font-size:10px;color:#b8c0c7">Agrégat anonyme. Aucune position précise.</div>` +
    `</div>`
  )
}
