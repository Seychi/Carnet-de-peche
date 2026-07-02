import { createClient } from '@/lib/supabase/server'
import { getMyCatchesBreakdown } from '@/lib/catches/queries'
import { getMyOutingStats, type OutingStats } from '@/lib/outings/queries'
import { buildPokedex, type Pokedex } from './pokedex'
import { computeChallengeProgress, type ChallengeProgress, type ChallengeCatch } from './challenges'
import { getMyStreak, type Streak } from './streaks'
import {
  recomputeMyBadges,
  computeBadgeMetrics,
  type UserBadgeRow,
  type BadgeMetrics,
} from './badges'
import { getBadgeRarity, type BadgeRarity } from './badge-rarity'

// ─── Agrégat gamification (server-side, privé) ──────────────────────────────────
// Source unique pour le carnet/profil. Tout dérive du carnet (RLS own) → GRATUIT,
// jamais gaté. États vides honnêtes gérés par les composants.

export type Gamification = {
  pokedex: Pokedex
  streak: Streak
  badges: UserBadgeRow[]
  /** Métriques du carnet qui pilotent les barres de progression des badges (live). */
  badgeMetrics: BadgeMetrics
  /** Rareté par slug de badge (Sprint 67) — « X % des pêcheurs l'ont ». Agrégat opaque. */
  badgeRarity: Record<string, BadgeRarity>
  challenges: ChallengeProgress[]
  outingStats: OutingStats
}

/**
 * Récupère toutes les prises du pêcheur courant pour le calcul des défis (façade +
 * réglementation en TS). On lit la vue `catches_for_viewer` (jamais la table) en se
 * limitant à SES prises, avec seulement les champs nécessaires. Pas de pagination
 * (un carnet perso reste de taille raisonnable ; cap de sécurité à 2000).
 */
async function getMyCatchesForChallenges(): Promise<ChallengeCatch[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('catches_for_viewer')
    .select('species, released, size_cm, caught_at, department, lat, lng, photo_verified_at')
    .eq('user_id', user.id)
    .limit(2000)

  if (error || !data) return []
  return data as ChallengeCatch[]
}

/**
 * Agrège la gamification (Pokédex, streak, badges, défis, stats sorties). Recalcule
 * et persiste les badges au passage (idempotent). Best-effort sur chaque source :
 * une source en échec ne casse pas la page (états vides honnêtes côté UI).
 */
export async function getMyGamification(): Promise<Gamification> {
  const [breakdown, streak, badges, challengeCatches, outingStats, badgeRarity] = await Promise.all([
    getMyCatchesBreakdown().catch(() => null),
    getMyStreak().catch(() => ({
      activeDays: 0,
      activeWeeks: 0,
      longestWeekStreak: 0,
      currentWeekStreak: 0,
      weekActiveNow: false,
      daysLeftThisWeek: 0,
      jokerAvailable: true,
    })),
    recomputeMyBadges().catch(() => [] as UserBadgeRow[]),
    getMyCatchesForChallenges().catch(() => [] as ChallengeCatch[]),
    getMyOutingStats().catch(() => ({
      totalOutings: 0,
      blankOutings: 0,
      blankRate: 0,
      catchesPerOuting: 0,
    })),
    getBadgeRarity().catch(() => ({}) as Record<string, BadgeRarity>),
  ])

  return {
    pokedex: buildPokedex(breakdown),
    streak,
    badges,
    badgeMetrics: computeBadgeMetrics(challengeCatches),
    badgeRarity,
    challenges: computeChallengeProgress(challengeCatches),
    outingStats,
  }
}
