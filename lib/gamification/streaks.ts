import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types'

// ─── Séries hebdomadaires (streaks) ─────────────────────────────────────────────
// Série ACTIVE mais tasteful (Sprint 62) : semaine active = ≥ 1 prise OU ≥ 1 sortie.
// Joker : 1 semaine manquée par mois ne casse pas la série (anti-culpabilisation).
// La source de vérité est le RPC SECURITY DEFINER get_my_streak() (calcul live, migration
// 099). Descriptif et sans pression agressive ; l'urgence reste douce.

export type Streak = {
  /** Jours actifs distincts (prise ou sortie). */
  activeDays: number
  /** Semaines actives distinctes. */
  activeWeeks: number
  /** Plus longue série de semaines consécutives de tout l'historique (ton record perso). */
  longestWeekStreak: number
  /** Série EN COURS, vivante au regard d'aujourd'hui (0 si cassée). */
  currentWeekStreak: number
  /** La semaine courante est-elle déjà validée (au moins 1 prise/sortie) ? */
  weekActiveNow: boolean
  /** Jours restants (aujourd'hui inclus) avant la fin de la semaine courante. */
  daysLeftThisWeek: number
  /** Le joker du mois courant est-il encore disponible ? */
  jokerAvailable: boolean
}

const EMPTY: Streak = {
  activeDays: 0,
  activeWeeks: 0,
  longestWeekStreak: 0,
  currentWeekStreak: 0,
  weekActiveNow: false,
  daysLeftThisWeek: 0,
  jokerAvailable: true,
}

/**
 * Streak du pêcheur courant via RPC (calcul live). Best-effort : renvoie des zéros si la
 * RPC n'existe pas encore (migration non appliquée) ou en cas d'erreur.
 */
export async function getMyStreak(): Promise<Streak> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_streak')
  if (error || !data) return EMPTY
  return { ...EMPTY, ...(data as unknown as Partial<Streak>) }
}

/**
 * Série EN COURS d'un pêcheur (entier), pour le flair « 🔥 X sem. » du profil public.
 * RPC definer get_user_streak (099) : n'expose qu'un agrégat (aucune prise/spot/coordonnée).
 * Best-effort : 0 en cas d'erreur.
 */
export async function getUserStreak(
  userId: string,
  client?: SupabaseClient<Database>,
): Promise<number> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase.rpc('get_user_streak', { p_user_id: userId })
  if (error || data == null) return 0
  return Number(data) || 0
}
