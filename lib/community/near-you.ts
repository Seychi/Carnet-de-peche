import { createClient } from '@/lib/supabase/server'
import {
  departmentBBox,
  summarizeHeatRows,
  type HeatRowLike,
  type NearYouSignal,
} from './near-you-core'

// ─── Signal communautaire « près de toi » (cockpit /home, sprint 30) ────────────
//
// 🔒 GARDE-FOU GPS (invariant n°1) : on ne lit JAMAIS de coordonnée précise. La
// seule source est la RPC `get_catch_heatmap` (migration 040) qui agrège
// `geom_public` (jamais `geom`), applique un k-anonymat K=3 STRICT (une cellule
// n'est renvoyée que si ≥ 3 prises de ≥ 3 pêcheurs distincts) et ne renvoie que des
// centroïdes de grille (plancher ~1,1 km) + des counts. On SOMME ces counts pour un
// total honnête « X prises partagées près de toi » — aucun point, aucune table directe.
//
// Conséquence assumée du k-anon : une zone à 1-2 prises (ou 3 prises d'un même
// pêcheur) n'est pas comptée → on SOUS-estime plutôt que de fuiter. C'est voulu.

export type { NearYouSignal } from './near-you-core'
export { departmentBBox, summarizeHeatRows } from './near-you-core'

/**
 * Signal communautaire honnête pour le département sur les `days` derniers jours
 * (défaut : 7 = « cette semaine »). Best-effort : renvoie un signal vide (jamais une
 * erreur) si dépt inconnu, RPC en échec, ou aucune cellule k-anon → l'UI affiche
 * alors l'état froid « Sois le premier à loguer ».
 */
export async function getNearbyCatchSignal(dept: string, days = 7): Promise<NearYouSignal> {
  const bbox = departmentBBox(dept)
  if (!bbox) return { catchCount: 0, cellCount: 0 }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_catch_heatmap', {
    min_lng: bbox.minLng,
    min_lat: bbox.minLat,
    max_lng: bbox.maxLng,
    max_lat: bbox.maxLat,
    // p_zoom 8 → cellules ~0,10° (~11 km) : agrège assez large pour un compte « côte »
    // sans jamais descendre sous le plancher de flou (~1,1 km) imposé par la RPC.
    p_zoom: 8,
    species_filter: null,
    technique_filter: null,
    p_days: days,
  })

  if (error || !data) {
    if (error) console.warn('[near-you] get_catch_heatmap error', error.message)
    return { catchCount: 0, cellCount: 0 }
  }

  return summarizeHeatRows(data as HeatRowLike[])
}
