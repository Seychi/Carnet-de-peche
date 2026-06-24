import { facadeOf, type Facade } from '@/lib/seo/programmatic'
import { isCoastalDepartment } from '@/lib/geo/departments'

// ─── Façade d'une prise ────────────────────────────────────────────────────────
// La réglementation (maille, quota, fermeture) dépend de la FAÇADE maritime.
// Une prise porte soit un spot (→ département → façade), soit une géoloc (lat/lng).
// Si on n'a NI l'un NI l'autre, la façade est INCONNUE (null) → on n'affiche aucun
// verdict réglementaire faux (cf brief sprint 24, garde-fou exactitude).

/**
 * Classe une position en façade par boîte géographique GROSSIÈRE mais honnête.
 * Préférer TOUJOURS le département quand il est connu (`getFacadeForCatch`) :
 * cette heuristique n'est qu'un repli quand on n'a que des coordonnées.
 *
 * Méditerranée FR = arc continental (Cerbère 42,45N/3,17E → Menton 43,79N/7,53E)
 * + Corse. Tout le reste (Atlantique, Manche, mer du Nord) = manche-atlantique.
 * Aucune côte Atlantique/Manche/mer du Nord n'atteint 3°E (Dunkerque culmine à
 * ~2,4°E) → `lng ≥ 3` est un discriminant méditerranéen sûr ; la borne de latitude
 * ≤ 44° écarte l'intérieur des terres de l'est sans rogner la côte d'Azur (~43,8N max).
 */
export function facadeFromLatLng(lat: number, lng: number): Facade {
  // Arc méditerranéen continental : longitude ≥ 3° ET latitude ≤ 44°.
  const continentalMed = lng >= 3.0 && lat <= 44.0
  // Corse : boîte englobante de l'île.
  const corsica = lat >= 41.3 && lat <= 43.1 && lng >= 8.4 && lng <= 9.7
  return continentalMed || corsica ? 'mediterranee' : 'manche-atlantique'
}

export type CatchFacadeInput = {
  /** Code département (depuis le spot rattaché à la prise), ex. '29', '2A'. */
  department?: string | null
  /** Coordonnées de la prise (geom visible) — repli si pas de département. */
  lat?: number | null
  lng?: number | null
}

/**
 * Résout la façade d'une prise. Priorité au département (exact) ; repli sur les
 * coordonnées (grossier) ; `null` si on n'a ni l'un ni l'autre → façade inconnue,
 * aucun verdict réglementaire à afficher.
 */
export function getFacadeForCatch({ department, lat, lng }: CatchFacadeInput): Facade | null {
  // Département prioritaire, MAIS seulement s'il est un vrai département côtier :
  // un code aberrant/intérieur ne doit pas produire un faux verdict « Manche/Atlantique »
  // (facadeOf défaute sur cette façade). On retombe alors sur la géoloc, puis inconnu.
  if (department && isCoastalDepartment(department)) return facadeOf(department)
  if (typeof lat === 'number' && typeof lng === 'number') return facadeFromLatLng(lat, lng)
  return null
}

export const FACADE_LABELS: Record<Facade, string> = {
  'manche-atlantique': 'Manche / Atlantique',
  mediterranee: 'Méditerranée',
}
