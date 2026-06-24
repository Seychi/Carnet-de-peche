import { DEPARTMENT_SEA_COORDS } from '@/lib/geo/department-coords'

// ─── Cœur CLIENT-SAFE du signal « près de toi » (pas de next/headers) ───────────
// Logique pure (bbox + agrégation) isolée ici pour être testable sans tirer le
// client Supabase serveur. La partie I/O (RPC) vit dans near-you.ts.
//
// 🔒 NOTE GPS : la RPC get_catch_heatmap renvoie AUSSI des centroïdes de grille
// (lng/lat ~1,1 km), volontairement NON déclarés dans HeatRowLike et JAMAIS
// propagés — summarizeHeatRows ne lit que catch_count/fishers_count. Ne pas ajouter
// lng/lat au type ni les faire remonter vers le client : ce serait lever le garde-fou.

export type NearYouSignal = {
  /** Nombre de prises publiques agrégées dans des cellules k-anon (≥ 3 prises / ≥ 3 pêcheurs). */
  catchCount: number
  /** Nombre de cellules de grille distinctes ayant passé le seuil k-anon. */
  cellCount: number
}

export type HeatRowLike = { catch_count: number | null; fishers_count: number | null }

export type BBox = { minLng: number; minLat: number; maxLng: number; maxLat: number }

// Demi-spans de la bbox autour du point côtier de référence du département
// (~±0,6° lat ≈ 67 km ; ~±0,85° lng). Volontairement généreux : on n'affiche qu'un
// COMPTE agrégé k-anon, jamais un point — la précision spatiale n'a aucune importance
// ici, on veut juste « ce qui bouge sur ta côte ».
export const NEAR_YOU_LAT_SPAN = 0.6
export const NEAR_YOU_LNG_SPAN = 0.85

/** BBox du département (autour de son point côtier de référence), ou null si inconnu. Pur. */
export function departmentBBox(dept: string): BBox | null {
  const coords = DEPARTMENT_SEA_COORDS[dept]
  if (!coords) return null
  return {
    minLng: coords.lng - NEAR_YOU_LNG_SPAN,
    minLat: coords.lat - NEAR_YOU_LAT_SPAN,
    maxLng: coords.lng + NEAR_YOU_LNG_SPAN,
    maxLat: coords.lat + NEAR_YOU_LAT_SPAN,
  }
}

/** Somme les counts des cellules k-anon renvoyées par la heatmap. Pur, testable. */
export function summarizeHeatRows(rows: HeatRowLike[]): NearYouSignal {
  let catchCount = 0
  let cellCount = 0
  for (const r of rows) {
    const c = r.catch_count ?? 0
    if (c <= 0) continue
    catchCount += c
    cellCount += 1
  }
  return { catchCount, cellCount }
}
