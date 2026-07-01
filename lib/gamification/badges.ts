import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types'

// ─── Badges à paliers (Sprint 62) ───────────────────────────────────────────────
// Badges SQL-dérivables non-trichables (count prises / espèces / relâchées / semaines
// actives / saisons), persistés avec earned_at par recompute_my_badges() (099). Ils
// deviennent PUBLICS (affichés sur le profil via get_public_badges) et à PALIERS
// (bronze/argent/or). Les critères déclaratifs (relâché) sont signalés honnêtement :
// aucune vérification automatique. Aucun classement inter-pêcheurs ici (Phase E).

export type UserBadgeRow = Database['public']['Tables']['user_badges']['Row']

export type BadgeTier = 1 | 2 | 3
export const TIER_LABEL: Record<BadgeTier, string> = { 1: 'Bronze', 2: 'Argent', 3: 'Or' }

export type BadgeIcon =
  | 'sparkle'
  | 'list'
  | 'layers'
  | 'leaf'
  | 'calendar'
  | 'ruler'
  | 'sun'

/** Métrique du carnet qui pilote la progression d'une famille. */
export type BadgeMetricKey = 'total' | 'species' | 'released' | 'activeWeeks' | 'seasons' | 'measured'

export type BadgeTierDef = {
  /** Slug persistant en base (ex. 'volume_50'). */
  slug: string
  tier: BadgeTier
  /** Seuil de la métrique pour débloquer ce palier. */
  target: number
  /** Libellé court du palier (ex. '50 prises'). */
  label: string
}

export type BadgeFamily = {
  key: string
  title: string
  /** Quelle métrique du carnet fait progresser cette famille. */
  metric: BadgeMetricKey
  icon: BadgeIcon
  /** true si le critère repose sur une donnée déclarée (relâché) → note honnête. */
  declarative?: boolean
  /** Paliers, triés par seuil croissant. Une famille « unique » n'a qu'un palier. */
  tiers: BadgeTierDef[]
}

/**
 * Les familles de badges, dans l'ordre d'affichage. Doit rester ALIGNÉ avec les slugs
 * attribués par `recompute_my_badges()` (migration 099). Ne pas renommer un slug sans
 * migration (earned_at est indexé dessus).
 */
export const BADGE_FAMILIES: BadgeFamily[] = [
  {
    key: 'first_catch',
    title: 'Première prise',
    metric: 'total',
    icon: 'sparkle',
    tiers: [{ slug: 'first_catch', tier: 1, target: 1, label: 'Première prise' }],
  },
  {
    key: 'volume',
    title: 'Volume de prises',
    metric: 'total',
    icon: 'list',
    tiers: [
      { slug: 'volume_10', tier: 1, target: 10, label: '10 prises' },
      { slug: 'volume_50', tier: 2, target: 50, label: '50 prises' },
      { slug: 'volume_200', tier: 3, target: 200, label: '200 prises' },
    ],
  },
  {
    key: 'species',
    title: 'Espèces au carnet',
    metric: 'species',
    icon: 'layers',
    tiers: [
      { slug: 'species_5', tier: 1, target: 5, label: '5 espèces' },
      { slug: 'species_10', tier: 2, target: 10, label: '10 espèces' },
      { slug: 'species_26', tier: 3, target: 26, label: '26 espèces' },
    ],
  },
  {
    key: 'release',
    title: 'No-kill',
    metric: 'released',
    icon: 'leaf',
    declarative: true,
    tiers: [
      { slug: 'release_10', tier: 1, target: 10, label: '10 relâchées' },
      { slug: 'release_50', tier: 2, target: 50, label: '50 relâchées' },
    ],
  },
  {
    key: 'regularity',
    title: 'Régularité',
    metric: 'activeWeeks',
    icon: 'calendar',
    tiers: [
      { slug: 'regularity_4', tier: 1, target: 4, label: '4 semaines' },
      { slug: 'regularity_12', tier: 2, target: 12, label: '12 semaines' },
      { slug: 'regularity_52', tier: 3, target: 52, label: '52 semaines' },
    ],
  },
  {
    key: 'seasons',
    title: 'Les 4 saisons',
    metric: 'seasons',
    icon: 'sun',
    tiers: [{ slug: 'seasons_all', tier: 1, target: 4, label: 'Les 4 saisons' }],
  },
  {
    key: 'prise_mesuree',
    title: 'Prise mesurée',
    metric: 'measured',
    icon: 'ruler',
    tiers: [{ slug: 'prise_mesuree', tier: 1, target: 1, label: 'Prise mesurée' }],
  },
]

/** Toutes les définitions de palier, indexées par slug. */
export const TIER_BY_SLUG: Record<string, { family: BadgeFamily; tier: BadgeTierDef }> =
  Object.fromEntries(
    BADGE_FAMILIES.flatMap((f) => f.tiers.map((t) => [t.slug, { family: f, tier: t }])),
  )

/** Nombre total de paliers (badges) possibles, pour l'affichage « X/N ». */
export const TOTAL_BADGES = BADGE_FAMILIES.reduce((n, f) => n + f.tiers.length, 0)

/** Libellé court d'un badge par son slug (pour la célébration / le partage). */
export function badgeTierLabel(slug: string): string {
  return TIER_BY_SLUG[slug]?.tier.label ?? slug
}

// ─── Métriques du carnet qui pilotent les badges ────────────────────────────────

export type BadgeMetrics = {
  total: number
  species: number
  released: number
  activeWeeks: number
  seasons: number
  measured: number
}

export const EMPTY_METRICS: BadgeMetrics = {
  total: 0,
  species: 0,
  released: 0,
  activeWeeks: 0,
  seasons: 0,
  measured: 0,
}

type MetricCatch = {
  species: string | null
  released: boolean | null
  caught_at: string | null
  photo_verified_at?: string | null
}

/**
 * Calcule les métriques de badge depuis les prises du carnet (déjà chargées). Tout est
 * dérivé des MÊMES prises que le SQL 099 (recompute_my_badges lit `catches`), en UTC pour
 * matcher `date_trunc`/`extract` côté Postgres :
 *  - `activeWeeks` = semaines ISO (lundi) distinctes de `caught_at` — MÊME définition que
 *    le badge régularité (catches uniquement ; la « série » du hub, elle, compte aussi les
 *    sorties, c'est une autre métrique). La barre de progression du badge colle ainsi au seuil.
 *  - `seasons` = bucket (mois % 12) / 3 → 0 DJF, 1 MAM, 2 JJA, 3 SON.
 */
export function computeBadgeMetrics(catches: MetricCatch[]): BadgeMetrics {
  const species = new Set<string>()
  const seasons = new Set<number>()
  const weeks = new Set<number>()
  let released = 0
  let measured = 0
  for (const c of catches) {
    if (c.species) species.add(c.species)
    if (c.released === true) released++
    if (c.photo_verified_at) measured++
    if (c.caught_at) {
      const d = new Date(c.caught_at)
      if (!Number.isNaN(d.getTime())) {
        seasons.add(Math.floor(((d.getUTCMonth() + 1) % 12) / 3))
        // Début de semaine ISO (lundi) en UTC → clé de semaine distincte.
        const dow = (d.getUTCDay() + 6) % 7 // lun=0 … dim=6
        weeks.add(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow))
      }
    }
  }
  return {
    total: catches.length,
    species: species.size,
    released,
    activeWeeks: weeks.size,
    seasons: seasons.size,
    measured,
  }
}

// ─── État d'affichage d'une famille (paliers gagnés / prochain / progression) ────

export type BadgeFamilyState = {
  family: BadgeFamily
  /** Palier le plus haut obtenu (0 = aucun). */
  highestTier: number
  /** Valeur courante de la métrique de la famille. */
  current: number
  /** Prochain palier à débloquer, ou null si tous obtenus. */
  next: BadgeTierDef | null
  /** Fraction 0..1 vers le prochain palier (1 si complet). */
  progress: number
  /** Tous les paliers obtenus ? */
  complete: boolean
  /** Date d'obtention du palier le plus haut (ISO), si obtenu. */
  earnedAt: string | null
  /** Paliers obtenus (slugs). */
  earnedSlugs: Set<string>
}

/**
 * Croise une famille avec les badges gagnés (rows) et les métriques courantes pour
 * produire l'état d'affichage : médaille atteinte, prochain palier, barre de progression.
 * La progression est calculée LIVE depuis la métrique (plus juste que la valeur figée
 * en base) : « 73 / 200 ».
 */
export function familyState(
  family: BadgeFamily,
  earnedBySlug: Map<string, UserBadgeRow>,
  metrics: BadgeMetrics,
): BadgeFamilyState {
  const current = metrics[family.metric] ?? 0
  const earnedSlugs = new Set<string>()
  let highestTier = 0
  let earnedAt: string | null = null
  for (const t of family.tiers) {
    const row = earnedBySlug.get(t.slug)
    if (row) {
      earnedSlugs.add(t.slug)
      if (t.tier > highestTier) {
        highestTier = t.tier
        earnedAt = row.earned_at
      }
    }
  }
  const next = family.tiers.find((t) => !earnedSlugs.has(t.slug)) ?? null
  const complete = next == null
  // Progression vers le prochain palier : borne basse = palier précédent atteint.
  const prevTarget = next
    ? [0, ...family.tiers.filter((t) => t.tier < next.tier).map((t) => t.target)].pop() ?? 0
    : 0
  const progress = complete
    ? 1
    : Math.max(0, Math.min(1, (current - prevTarget) / Math.max(1, next!.target - prevTarget)))

  return { family, highestTier, current, next, progress, complete, earnedAt, earnedSlugs }
}

export type BadgeSlug = string

/**
 * Recalcule et persiste les badges du pêcheur courant (idempotent côté RPC), puis
 * renvoie ses badges gagnés (avec tier/target/progress). Best-effort : [] si erreur.
 */
export async function recomputeMyBadges(): Promise<UserBadgeRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('recompute_my_badges')
  if (error || !data) return []
  return data as UserBadgeRow[]
}
