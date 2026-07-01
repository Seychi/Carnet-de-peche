import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types'

// ─── Progression XP (lecture) — Sprint 60 ───────────────────────────────────────
// L'XP totale est matérialisée dans user_progress (RLS own-only) et alimentée par le
// ledger xp_events via trigger AFTER INSERT ON catches. Le rang se calcule en TS
// (lib/gamification/levels.ts, source unique). Ici : LECTURE seule, jamais d'écriture.

/**
 * XP totale d'un pêcheur, via la RPC definer `get_user_xp`. Elle n'expose QUE `total_xp`
 * (agrégat opaque : aucune prise, aucun spot, aucune coordonnée) → utilisable pour le rang
 * PUBLIC sur un profil `/u/[username]`, alors que `user_progress` reste RLS own-only.
 * Fonctionne aussi pour l'utilisateur courant (home). Best-effort : 0 en cas d'erreur
 * (état vide honnête = rang de départ « Mousse »).
 */
export async function getUserXp(
  userId: string,
  client?: SupabaseClient<Database>,
): Promise<number> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase.rpc('get_user_xp', { p_user_id: userId })
  if (error || data == null) return 0
  return Number(data) || 0
}
