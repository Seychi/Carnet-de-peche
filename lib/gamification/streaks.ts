import { createClient } from '@/lib/supabase/server'

// ─── Régularité personnelle (streaks) ──────────────────────────────────────────
// Descriptif et PRIVÉ : jours actifs, semaines actives, plus longue série de semaines
// consécutives. Aucune pression (« pêche demain ! ») ni comparaison. La source de
// vérité est le RPC SECURITY DEFINER get_my_streak() (migration 056).

export type Streak = {
  activeDays: number
  activeWeeks: number
  longestWeekStreak: number
}

const EMPTY: Streak = { activeDays: 0, activeWeeks: 0, longestWeekStreak: 0 }

/**
 * Streak du pêcheur courant via RPC. Best-effort : renvoie des zéros si la RPC
 * n'existe pas encore (migration 056 non appliquée) ou en cas d'erreur.
 */
export async function getMyStreak(): Promise<Streak> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_streak')
  if (error || !data) return EMPTY
  return data as unknown as Streak
}
