// Couche heatmap « où ça mord » (Carte v2 / C1, Bloc B).
// Source de données = RPC get_catch_heatmap (migration 040), agrégée + k-anonyme
// (K=3) côté Postgres. Le client ne reçoit JAMAIS de coordonnée précise : seulement
// des centroïdes de cellule de grille + un count. Aucun point brut n'est chargé.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExpressionSpecification } from 'maplibre-gl'

// ── Identifiants source / couches ───────────────────────────────────────────────
export const HEAT_SOURCE = 'catch-heat-src'
export const HEAT_LAYER = 'catch-heat'          // rendu heatmap (vue régionale)
export const HEAT_POINT_LAYER = 'catch-heat-pts' // rendu cercles (vue locale, zoom élevé)

// Couches spots internes à MapView : on insère la heatmap SOUS elles (beforeId)
// pour que les markers restent au-dessus. Best-effort (coupling documenté).
export const SPOT_LAYER_IDS = ['fuzzy-fill', 'clusters', 'unclustered-spots'] as const

// ── Rampe de couleur INFERNO ────────────────────────────────────────────────────
// Choisie pour 3 raisons (John est daltonien — l'info passe par la LUMINOSITÉ) :
//  1. luminance strictement monotone noir→jaune → lisible sous deutéran/protan/tritan ;
//  2. visuellement DISTINCTE de cividis (bleu→jaune) qui reste réservée au score spot
//     (QUALITY_MARKER_COLORS) → on ne confond pas la couche communautaire et le score ;
//  3. lecture « chaleur » intuitive pour une heatmap « où ça mord ».
// ⚠️ 1er stop OBLIGATOIREMENT transparent (heatmap-density couvre tout le fond).
export const HEAT_COLOR_EXPR: ExpressionSpecification = [
  'interpolate', ['linear'], ['heatmap-density'],
  0, 'rgba(0,0,0,0)',
  0.15, '#420a68',
  0.35, '#932667',
  0.55, '#dd513a',
  0.75, '#fca50a',
  1, '#fcffa4',
]

// Stops hex de la rampe (pour la légende DOM — même perception que la couche).
export const HEAT_LEGEND_STOPS = ['#420a68', '#932667', '#dd513a', '#fca50a', '#fcffa4'] as const

// Count borne haute pour normaliser le poids (au-delà → saturé). Calibré sur une
// densité réaliste de prises par maille ; à ré-évaluer si les volumes explosent.
export const HEAT_WEIGHT_MAX = 12

// ── Types ────────────────────────────────────────────────────────────────────────
export type HeatBBox = { minLng: number; minLat: number; maxLng: number; maxLat: number }
export type HeatFilters = { species?: string[] | null; techniques?: string[] | null; days: number }
export type HeatCell = { lng: number; lat: number; count: number; fishers: number }

type HeatRow = { lng: number; lat: number; catch_count: number; fishers_count: number }

// Convertit les cellules en FeatureCollection de POINTS (1 feature / cellule).
// heatmap-weight pondère par `count` : pas besoin de déplier en N points.
export function cellsToGeoJSON(
  cells: HeatCell[],
): GeoJSON.FeatureCollection<GeoJSON.Point, { count: number; fishers: number }> {
  return {
    type: 'FeatureCollection',
    features: cells.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
      properties: { count: c.count, fishers: c.fishers },
    })),
  }
}

export const EMPTY_FC: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [],
}

// Appelle la RPC k-anonyme. Renvoie [] sur erreur (heatmap juste vide, jamais bloquante).
export async function fetchCatchHeatmap(
  supabase: SupabaseClient,
  bbox: HeatBBox,
  zoom: number,
  filters: HeatFilters,
): Promise<HeatCell[]> {
  const { data, error } = await supabase.rpc('get_catch_heatmap', {
    min_lng: bbox.minLng,
    min_lat: bbox.minLat,
    max_lng: bbox.maxLng,
    max_lat: bbox.maxLat,
    p_zoom: Math.round(zoom),
    species_filter: filters.species?.length ? filters.species : null,
    technique_filter: filters.techniques?.length ? filters.techniques : null,
    p_days: filters.days,
  })
  if (error || !data) {
    if (error) console.warn('[heatmap] get_catch_heatmap error', error.message)
    return []
  }
  return (data as HeatRow[]).map((r) => ({
    lng: r.lng,
    lat: r.lat,
    count: r.catch_count,
    fishers: r.fishers_count,
  }))
}
