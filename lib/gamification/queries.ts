import { createClient } from '@/lib/supabase/server'
import { getMyCatchesBreakdown } from '@/lib/catches/queries'
import { getMyOutingStats, type OutingStats } from '@/lib/outings/queries'
import { buildPokedex, type Pokedex } from './pokedex'
import { computeChallengeProgress, type ChallengeProgress, type ChallengeCatch } from './challenges'
import { getMyStreak, type Streak } from './streaks'
import { recomputeMyBadges, type UserBadgeRow } from './badges'

// ─── Agrégat gamification (server-side, privé) ──────────────────────────────────
// Source unique pour le carnet/profil. Tout dérive du carnet (RLS own) → GRATUIT,
// jamais gaté. États vides honnêtes gérés par les composants.

export type Gamification = {
  pokedex: Pokedex
  streak: Streak
  badges: UserBadgeRow[]
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
    .select('species, released, size_cm, caught_at, department, lat, lng')
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
  const [breakdown, streak, badges, challengeCatches, outingStats] = await Promise.all([
    getMyCatchesBreakdown().catch(() => null),
    getMyStreak().catch(() => ({ activeDays: 0, activeWeeks: 0, longestWeekStreak: 0 })),
    recomputeMyBadges().catch(() => [] as UserBadgeRow[]),
    getMyCatchesForChallenges().catch(() => [] as ChallengeCatch[]),
    getMyOutingStats().catch(() => ({
      totalOutings: 0,
      blankOutings: 0,
      blankRate: 0,
      catchesPerOuting: 0,
    })),
  ])

  return {
    pokedex: buildPokedex(breakdown),
    streak,
    badges,
    challenges: computeChallengeProgress(challengeCatches),
    outingStats,
  }
}
