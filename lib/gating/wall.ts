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
  // Sprint 77, Bloc 2 : trois coupures distinctes sur la fiche de spot. Les
  // séparer permet de savoir LAQUELLE convertit, ce que `spot_page` seul noyait.
  'spot_tides',
  'spot_score',
  'spot_catches',
  // Sprint 77, Bloc 7 : inscription différée. Le mur n'arrive plus AVANT le geste
  // mais APRÈS, au moment de sauvegarder ce que le visiteur vient de faire.
  'pending_favorite',
  'pending_catch',
] as const

export type SignupWallSurface = (typeof SIGNUP_WALL_SURFACES)[number]

// ─── Copy du mur d'inscription ───────────────────────────────────────────────
// Tutoiement, zéro prix, zéro promesse fausse : uniquement ce que le compte
// gratuit donne RÉELLEMENT (cf CLAUDE.md §8 « Découverte »).

export const SIGNUP_WALL_TITLE = "Crée ton carnet, c'est gratuit"

export const SIGNUP_WALL_CTA = 'Créer mon carnet'

// ⚠️ Sprint 77, Bloc 4 : cette liste ne contient QUE des capacités qu'un anonyme
// n'a pas. « 3 spots par département sur la carte » a été retiré : c'est ce qu'un
// visiteur non inscrit reçoit déjà, donc une promesse vide (mur mesuré à 1,3 % de
// clic). Depuis la migration 110, la carte entière est le vrai gain du compte.
// Toute ligne ajoutée ici doit être vérifiée contre la matrice du sprint 77.
export const SIGNUP_WALL_BENEFITS: readonly string[] = [
  'La carte entière, tous les spots de France',
  '7 jours de marées et de météo, pas seulement aujourd’hui',
  'Toutes les prises déclarées sur chaque spot',
  'Ton carnet, tes favoris et tes alertes',
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
 *
 * ⚠️ Sprint 77 : les deux premières lignes étaient FAUSSES avant ce sprint (un
 * anonyme voyait déjà les marées et toutes les prises). Elles ne sont vraies que
 * parce que les Blocs 1 à 3 créent réellement l'écart. Ne pas les modifier sans
 * revérifier la matrice.
 */
export const SIGNUP_WALL_BENEFITS_SPOT: readonly string[] = [
  'Les 7 prochains jours de marées et de météo ici',
  'Toutes les prises déclarées sur ce spot',
  'La carte entière, et ce spot dans tes favoris',
]

/**
 * Copie par COUPURE (sprint 77, Bloc 2 et Bloc 7). Chaque mur nomme précisément
 * ce qui est derrière lui plutôt que de servir un CTA générique : c'est la seule
 * façon d'arrêter de promettre à un visiteur ce qu'il vient déjà de recevoir.
 *
 * `title` prend le nom du spot quand il est connu ; `benefits` reste court (3
 * lignes maximum) parce que ces murs s'affichent en cours de lecture.
 */
export type WallCopy = { title: string; benefits: readonly string[] }

const SPOT_CUT_COPY: Record<
  'spot_tides' | 'spot_score' | 'spot_catches' | 'pending_favorite' | 'pending_catch',
  (spotName?: string | null) => WallCopy
> = {
  spot_tides: (s) => ({
    title: s ? `Vois les 7 prochains jours à ${s}` : 'Vois les 7 prochains jours',
    benefits: [
      'Marées, vent et houle jusqu’à dimanche',
      'Le même détail sur tous les spots de France',
      'C’est gratuit, sans carte bancaire',
    ],
  }),
  spot_score: (s) => ({
    title: s ? `Trouve le bon créneau à ${s}` : 'Trouve le bon créneau',
    benefits: [
      'La frise des 7 jours, pas seulement aujourd’hui',
      'Les meilleurs moments, heure par heure',
      'C’est gratuit, sans carte bancaire',
    ],
  }),
  spot_catches: (s) => ({
    title: s ? `Vois tout ce qui se prend à ${s}` : 'Vois tout ce qui se prend ici',
    benefits: [
      'Toutes les prises déclarées, pas les 2 dernières',
      'Les espèces qui sortent en ce moment',
      'C’est gratuit, sans carte bancaire',
    ],
  }),
  // Bloc 7 : copie de PERTE. Le visiteur a déjà agi, on ne promet plus rien,
  // on lui dit ce qu'il est sur le point de perdre. Jamais « enregistré ».
  pending_favorite: (s) => ({
    title: s ? `Garde ${s} dans ton carnet` : 'Garde tes spots dans ton carnet',
    benefits: [
      'Tes spots de côté, retrouvés sur tous tes écrans',
      'Une alerte quand les conditions y deviennent bonnes',
      'C’est gratuit, sans carte bancaire',
    ],
  }),
  pending_catch: (s) => ({
    title: s ? `Enregistre ta prise à ${s}` : 'Enregistre ta prise',
    benefits: [
      'Ton brouillon est prêt, il ne manque que le compte',
      'Ton carnet garde tes prises et apprend de tes sorties',
      'C’est gratuit, sans carte bancaire',
    ],
  }),
}

/**
 * Renvoie la copie d'une coupure, ou `undefined` pour les surfaces historiques
 * qui gardent leur copie générique. Volontairement total sur les 5 surfaces
 * ajoutées au sprint 77 : une surface sans copie propre retomberait en silence
 * sur le générique, ce qui est exactement le bug que ce sprint corrige.
 */
export function wallCopyForSurface(
  surface: SignupWallSurface,
  spotName?: string | null,
): WallCopy | undefined {
  const build = SPOT_CUT_COPY[surface as keyof typeof SPOT_CUT_COPY]
  return build ? build(spotName) : undefined
}

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
