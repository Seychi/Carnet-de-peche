import type { UserTier } from '@/lib/auth/tier'

// Tier de la couche « Fond marin » (profondeur + nature du fond). Centralisé ici pour ne
// plus coder 'itinerant' en dur (cf sprint Fond marin / WS A.4 ; auparavant dupliqué dans
// MapShell, MapLayerSelector et la route popup /api/seabed).
//
// Décision John 2026-06-26 : **LOCAL** — aligné sur /tarifs (« Couches avancées :
// bathymétrie ») et CLAUDE.md §8. La couche est donc accessible aux abonnés Local ET
// Itinérant (Itinérant = surensemble de Local). Le tier de RÉFÉRENCE reste exposé pour la
// copy d'upsell.
export const BATHY_TIER: UserTier = 'local'

const BATHY_TIERS: readonly UserTier[] = ['local', 'itinerant']

/** La couche « Fond marin » est-elle accessible à ce tier ? (Local ET Itinérant). */
export function hasBathyAccess(tier: UserTier): boolean {
  return BATHY_TIERS.includes(tier)
}
