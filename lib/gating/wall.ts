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
export const SIGNUP_WALL_NOTE = 'Sans carte bancaire.'

/**
 * Lien d'inscription qui ramène le visiteur EXACTEMENT où il était.
 * `/auth/register` normalise vers `/auth/login?tab=register&redirect=…`, et la
 * cible est revalidée côté serveur (anti open-redirect) avant usage.
 */
export function buildSignupHref(target?: string | null): string {
  const safe = target ? safeInternalPath(target, '') : ''
  return safe ? `/auth/register?redirect=${encodeURIComponent(safe)}` : '/auth/register'
}
