// lib/gating/wall.ts — LA règle unique « quel mur montrer à qui » (sprint 75, Bloc 1).
//
// Le bug corrigé : les surfaces de gating faisaient toutes
//   const isGated = userTier === 'anonymous' || userTier === 'discovery'
// et servaient donc le MÊME message (« passe en Local, 4,90 €/mois ») à un
// visiteur qui n'a même pas encore de compte. On vendait un abonnement à
// quelqu'un qui n'a pas encore de carnet gratuit.
//
// ⚠️ Ce module est 100 % PRÉSENTATION. Il ne décide RIEN sur les données
// servies : la limite de 3 spots par département, le floutage des coordonnées,
// le score et les filtres restent portés par les RPC + `current_tier`, inchangés.

import type { UserTier } from '@/lib/auth/tier'
import { safeInternalPath } from '@/lib/auth/redirect'

/**
 * Nature du mur à afficher sur une surface gatée.
 *  - `signup` : pas encore de compte. On propose le carnet GRATUIT. Jamais de prix.
 *  - `upsell` : inscrit gratuit. Le seul à qui on parle d'abonnement.
 *  - `none`   : abonné Local / Itinérant. Aucun mur.
 */
export type WallKind = 'signup' | 'upsell' | 'none'

/**
 * Fonction PURE, source unique de la règle : à dupliquer nulle part ailleurs.
 * Toute valeur inattendue retombe sur `signup` : on ne vend jamais par défaut.
 */
export function getWallKind(tier: UserTier | null | undefined): WallKind {
  switch (tier) {
    case 'local':
    case 'itinerant':
      return 'none'
    case 'discovery':
      return 'upsell'
    default:
      return 'signup'
  }
}

/**
 * Identifiants de surface pour les events `signup_wall_viewed` /
 * `signup_wall_clicked`. STABLES : les renommer casserait le suivi du funnel.
 */
export const SIGNUP_WALL_SURFACES = [
  'map_filters',
  'map_layers',
  'nearby',
  'score',
  'banner',
  'spot_popup',
  'spot_page',
  // Sprint 76, Bloc 9 : /spots (2e page la plus vue, 1re source de sortie) n'avait
  // AUCUNE surface de conversion. AJOUT seulement : renommer une entrée casserait
  // le suivi du funnel ouvert au sprint 75.
  'spots_list',
] as const

export type SignupWallSurface = (typeof SIGNUP_WALL_SURFACES)[number]

// ─── Copy du mur d'inscription ───────────────────────────────────────────────
// Tutoiement, zéro prix, zéro promesse fausse : uniquement ce que le compte
// gratuit donne RÉELLEMENT (cf CLAUDE.md §8 « Découverte »).

export const SIGNUP_WALL_TITLE = "Crée ton carnet, c'est gratuit"

export const SIGNUP_WALL_CTA = 'Créer mon carnet'

export const SIGNUP_WALL_BENEFITS: readonly string[] = [
  'Ton carnet de prises, illimité',
  'Marées et météo de tes spots',
  'Le fil de ton département en entier',
  '3 spots par département sur la carte',
]

/** Rassurance affichée sous le CTA : vraie (l'inscription ne demande pas de CB). */
export const SIGNUP_WALL_NOTE = 'Sans carte bancaire, en 30 secondes.'

// ─── Variante CONTEXTUALISÉE « fiche de spot » (sprint 76, Bloc 1) ───────────
// La copie générique ci-dessus liste des bénéfices de RÉTENTION à quelqu'un qui
// vient de lire la fiche d'UN spot et qui n'a encore rien à loguer. Mesuré sur la
// semaine du 6 au 12 août : 225 murs affichés, 3 clics (1,3 %). La variante parle
// du spot que le visiteur a sous les yeux.
//
// ⚠️ La générique reste la source des surfaces carte : ne pas la supprimer.

/** Titre contextualisé au spot lu. Aucune promesse de coordonnée précise. */
export const SIGNUP_WALL_TITLE_SPOT = (spotName: string): string =>
  `Suis ${spotName}, c'est gratuit`

/**
 * Bénéfices contextualisés : uniquement ce que le compte GRATUIT donne vraiment
 * sur cette fiche (les coordonnées précises restent abonnés, cf CLAUDE.md §8).
 */
export const SIGNUP_WALL_BENEFITS_SPOT: readonly string[] = [
  'Les marées et la météo de ce spot, tous les jours',
  'Les prises déclarées ici, en temps réel',
  'Ton carnet de prises, illimité',
]

/**
 * Titre du mur sur la LISTE de spots (sprint 76, Bloc 9), contextualisé à la
 * facette lue. Prend des libellés DÉJÀ formatés (« du Morbihan », « dorade
 * royale ») pour garder ce module sans dépendance de données.
 * Renvoie `undefined` hors facette → le mur reprend son titre générique.
 */
export function signupWallTitleForFacet(opts: {
  deptPhrase?: string | null
  speciesLabel?: string | null
}): string | undefined {
  const { deptPhrase, speciesLabel } = opts
  if (speciesLabel && deptPhrase) {
    return `Suis les spots à ${speciesLabel} ${deptPhrase}, c'est gratuit`
  }
  if (speciesLabel) return `Suis les spots à ${speciesLabel}, c'est gratuit`
  if (deptPhrase) return `Suis les spots ${deptPhrase}, c'est gratuit`
  return undefined
}

/**
 * Lien d'inscription qui ramène le visiteur EXACTEMENT où il était.
 * `/auth/register` normalise vers `/auth/login?tab=register&redirect=…`, et la
 * cible est revalidée côté serveur (anti open-redirect) avant usage.
 */
export function buildSignupHref(target?: string | null): string {
  const safe = target ? safeInternalPath(target, '') : ''
  return safe ? `/auth/register?redirect=${encodeURIComponent(safe)}` : '/auth/register'
}
