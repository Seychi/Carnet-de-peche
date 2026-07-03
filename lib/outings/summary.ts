import type { Json } from '@/lib/types'

// ─── Résumé d'une sortie solo pour un « post de sortie » (Sprint 73) ──────────
// Type partagé serveur/client du jsonb renvoyé par la RPC get_outing_summary.
// La RPC est PER-VIEWER et GEOM-FREE : catch_count reflète ce que le viewer a le
// droit de voir (une prise private d'autrui reste masquée), biggest n'est que la
// plus grosse prise PHOTO-VÉRIFIÉE, conditions ne contient AUCUNE coordonnée, et
// la zone se limite au département (jamais de spot_id ni de geom).

export type OutingSpeciesCount = {
  species: string
  count: number
}

export type OutingBiggest = {
  species: string
  size_cm: number | null
  weight_g: number | null
  verified: true
}

export type OutingSummary = {
  outing_id: string
  started_at: string
  ended_at: string | null
  // Durée en minutes (null si la sortie n'a pas de fin renseignée).
  duration_min: number | null
  department: string | null
  // Nombre de prises VISIBLES du viewer (les prises private d'autrui sont exclues).
  catch_count: number
  blank: boolean
  // Espèces capturées, comptées, ordre décroissant.
  species: OutingSpeciesCount[]
  // Plus grosse prise photo-vérifiée de la sortie (null si aucune vérifiée).
  biggest: OutingBiggest | null
  // Snapshot météo/marée (aucune coordonnée), ou null.
  conditions: Record<string, unknown> | null
}

/**
 * Convertit le Json brut de la RPC get_outing_summary en OutingSummary typé.
 * Défensif : renvoie null si la forme est inattendue (outing supprimée, RPC vide).
 * La RPC est de confiance (SECURITY DEFINER côté DB) : on ne re-valide pas chaque
 * champ, on garantit juste qu'on a bien un objet avec un outing_id.
 */
export function parseOutingSummary(raw: Json | null | undefined): OutingSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (typeof o.outing_id !== 'string') return null
  return o as unknown as OutingSummary
}
