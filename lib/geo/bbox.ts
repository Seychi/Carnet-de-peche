// Bbox côtières par département (sprint 23, WS-B) — pour borner le calcul du score
// régional par espèce de la fiche /especes au DÉPARTEMENT de l'utilisateur (garde-fou
// perf : pas « toutes côtes »). Rectangles approximatifs sur la bande côtière de chaque
// département, avec marge vers le large. Indicatif : sert d'enveloppe d'agrégation des
// prises communautaires, pas d'une frontière administrative exacte.

export type Bbox = { minLng: number; minLat: number; maxLng: number; maxLat: number }

// Enveloppe nationale (France métropolitaine + bande côtière) — repli pour anonyme /
// utilisateur sans département. Alignée sur FRANCE_METRO_BBOX (lib/catches/schema).
export const NATIONAL_BBOX: Bbox = { minLng: -5.8, minLat: 41.0, maxLng: 9.9, maxLat: 51.5 }

export const DEPARTMENT_BBOX: Record<string, Bbox> = {
  // ── Manche / Atlantique ──
  '14': { minLng: -1.3, minLat: 49.15, maxLng: 0.6, maxLat: 49.7 }, // Calvados
  '17': { minLng: -1.7, minLat: 45.0, maxLng: -0.6, maxLat: 46.4 }, // Charente-Maritime
  '22': { minLng: -3.7, minLat: 48.45, maxLng: -2.0, maxLat: 49.1 }, // Côtes-d'Armor
  '29': { minLng: -5.25, minLat: 47.7, maxLng: -3.8, maxLat: 48.8 }, // Finistère
  '33': { minLng: -1.6, minLat: 44.5, maxLng: -0.9, maxLat: 45.6 }, // Gironde
  '35': { minLng: -2.1, minLat: 48.5, maxLng: -1.3, maxLat: 48.85 }, // Ille-et-Vilaine
  '40': { minLng: -1.7, minLat: 43.5, maxLng: -1.0, maxLat: 44.55 }, // Landes
  '44': { minLng: -2.65, minLat: 46.8, maxLng: -1.7, maxLat: 47.5 }, // Loire-Atlantique
  '50': { minLng: -2.0, minLat: 48.5, maxLng: -1.0, maxLat: 49.8 }, // Manche
  '56': { minLng: -3.5, minLat: 47.25, maxLng: -2.3, maxLat: 47.95 }, // Morbihan
  '59': { minLng: 2.0, minLat: 50.85, maxLng: 2.95, maxLat: 51.15 }, // Nord
  '62': { minLng: 1.25, minLat: 50.0, maxLng: 2.15, maxLat: 51.05 }, // Pas-de-Calais
  '64': { minLng: -1.85, minLat: 43.3, maxLng: -1.3, maxLat: 43.6 }, // Pyrénées-Atlantiques
  '76': { minLng: 0.0, minLat: 49.4, maxLng: 1.5, maxLat: 50.1 }, // Seine-Maritime
  '85': { minLng: -2.5, minLat: 46.2, maxLng: -1.2, maxLat: 47.1 }, // Vendée
  // ── Méditerranée ──
  '06': { minLng: 6.85, minLat: 43.4, maxLng: 7.6, maxLat: 43.85 }, // Alpes-Maritimes
  '11': { minLng: 2.85, minLat: 42.85, maxLng: 3.35, maxLat: 43.3 }, // Aude
  '13': { minLng: 4.2, minLat: 43.0, maxLng: 5.6, maxLat: 43.55 }, // Bouches-du-Rhône
  '30': { minLng: 3.85, minLat: 43.35, maxLng: 4.55, maxLat: 43.75 }, // Gard
  '34': { minLng: 3.0, minLat: 43.2, maxLng: 4.25, maxLat: 43.6 }, // Hérault
  '66': { minLng: 2.85, minLat: 42.35, maxLng: 3.25, maxLat: 42.95 }, // Pyrénées-Orientales
  '83': { minLng: 5.6, minLat: 42.9, maxLng: 6.95, maxLat: 43.55 }, // Var
  '2A': { minLng: 8.45, minLat: 41.3, maxLng: 9.45, maxLat: 42.25 }, // Corse-du-Sud
  '2B': { minLng: 9.0, minLat: 42.2, maxLng: 9.6, maxLat: 43.1 }, // Haute-Corse
}

export type ScoreRegion = {
  bbox: Bbox
  /** Zoom passé à get_quality_cells (détermine la taille de cellule). */
  zoom: number
  /** Libellé honnête du périmètre (« sur tes côtes (Finistère) », « en France »). */
  label: string
  /** true = périmètre national (anon / pas de département) — pas « tes côtes ». */
  national: boolean
}

/**
 * Périmètre de calcul du score régional par espèce. Département de l'utilisateur si
 * connu (borné, perf ok), sinon repli national (anonyme / département non renseigné).
 */
export function scoreRegion(homeDept: string | null | undefined, deptLabel?: string): ScoreRegion {
  const dept = homeDept?.trim()
  if (dept && DEPARTMENT_BBOX[dept]) {
    return {
      bbox: DEPARTMENT_BBOX[dept],
      zoom: 9, // ~0.05° → cellules fines, peu nombreuses sur un département (perf)
      label: deptLabel ? `sur tes côtes (${deptLabel})` : 'sur tes côtes',
      national: false,
    }
  }
  return { bbox: NATIONAL_BBOX, zoom: 6, label: 'en France', national: true }
}
