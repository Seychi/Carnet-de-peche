import type { DailyForecast } from '@/lib/solunar/types'

/**
 * Contrat du « delta connecté » d'une fiche spot (sprint 84, Bloc 3).
 *
 * La fiche `/spots/[slug]` est rendue en STATIQUE dans sa variante ANONYME : c'est
 * elle qui part au CDN, c'est elle que voient Googlebot et 100 % du trafic SEO, et
 * c'est la seule qui puisse être mise en cache sans risque (aucune coordonnée
 * précise, aucune donnée de compte). Tout ce qu'un visiteur connecté voit EN PLUS
 * est demandé après hydratation via `GET /api/spots/[slug]/viewer`, avec sa session.
 *
 * 🔒 Invariant : ce payload n'est JAMAIS mis en cache (route `force-dynamic`,
 * `Cache-Control: private, no-store`). Le gating reste en base — les coordonnées
 * précises viennent de `get_spot_by_slug` appelée avec la session, donc c'est
 * Postgres qui décide, pas cette route.
 */

/** Prise publique affichée dans « Prises récentes ». Aucune coordonnée. */
export type ViewerCatch = {
  id: string
  species: string
  size_cm: number | null
  weight_g: number | null
  caught_at: string
  username: string | null
  display_name: string | null
}

/** Ligne d'activité 7 jours (RPC k-anon `get_spot_activity`). Aucune coordonnée. */
export type ViewerActivityCatch = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  species: string | null
  size_cm: number | null
  weight_g: number | null
  caught_at: string | null
}

export type ViewerWeek = {
  weekly: DailyForecast[]
  weatherCodes: Record<string, number>
  tidesByDate: Record<string, { high?: string; low?: string }>
  marnageDays: { date: string; marnage: number | null }[]
  /** Prévisions brutes 7 jours : alimente la bande « force des marées ». */
}

/**
 * Tendances perso, sérialisées telles quelles depuis `lib/scoring/personal`.
 * Typé large ici pour ne pas faire dépendre le client du module serveur ; le
 * composant `PersonalTendencies` re-type à la lecture.
 */
export type ViewerTendencies = unknown

export type SpotViewerPayload = {
  /** Session valide côté serveur. Faux = tout le reste est neutre. */
  authed: boolean
  /** Palier réel (RPC `current_tier`). 'anonymous' si non connecté. */
  tier: 'anonymous' | 'discovery' | 'local' | 'itinerant'
  /** Le spot est-il dans les favoris du viewer ? */
  favorite: boolean
  /** Le viewer a-t-il confirmé la position de ce spot ? */
  confirmed: boolean
  /**
   * Coordonnée PRÉCISE, uniquement si `get_spot_by_slug` appelée AVEC la session a
   * renvoyé `is_precise = true`. `null` dans tous les autres cas (y compris un
   * abonné hors de son département : c'est la base qui tranche).
   */
  precise: { lat: number; lng: number } | null
  /** Frise 7 jours + tables d'affichage. `null` pour un anonyme. */
  week: ViewerWeek | null
  /** Liste complète des prises publiques du spot (le statique n'en sert que 2). */
  catches: ViewerCatch[]
  /** Activité 7 jours complète (le statique n'en sert que 2 lignes). */
  activity: ViewerActivityCatch[]
  /** Tendances perso « à ce spot ». `null` si pas assez de données. */
  tendencies: ViewerTendencies | null
}

/** État servi tant que rien n'a été résolu : strictement celui du HTML statique. */
export const ANONYMOUS_VIEWER: SpotViewerPayload = {
  authed: false,
  tier: 'anonymous',
  favorite: false,
  confirmed: false,
  precise: null,
  week: null,
  catches: [],
  activity: [],
  tendencies: null,
}

/**
 * Nombre de prises servies dans le HTML STATIQUE (palier anonyme, sprint 77 Bloc 2).
 * Le delta connecté rend les suivantes après hydratation.
 */
export const ANON_CATCHES = 2
/** Idem pour les lignes d'« Activité récente ». */
export const ANON_ACTIVITY_ROWS = 2
/** Ce qu'un connecté voit dans « Activité récente ». */
export const AUTHED_ACTIVITY_ROWS = 3

/**
 * Arrondi des coordonnées ÉMISES dans le HTML mis en cache.
 *
 * ★ C'est ce qui rend l'invariant de non-fuite MÉCANIQUEMENT vérifiable : le HTML
 * statique ne contient aucun nombre à plus de 3 décimales. 3 décimales ≈ 110 m,
 * très en dessous du flou de 500-900 m déjà appliqué par `geom_public` : on ne perd
 * donc rigoureusement aucune information utile, on retire juste une précision
 * décorative qui rendait l'invariant invérifiable (un lien d'itinéraire sortait
 * `48.35634512`, impossible à distinguer d'une vraie coordonnée à l'œil ou au test).
 *
 * La coordonnée précise d'un abonné, elle, n'est jamais arrondie : elle n'entre
 * jamais dans le HTML, elle arrive par `/api/spots/[slug]/viewer`.
 */
export const CACHED_COORD_DECIMALS = 3

export function roundCachedCoord(value: number): number {
  return Number(value.toFixed(CACHED_COORD_DECIMALS))
}
