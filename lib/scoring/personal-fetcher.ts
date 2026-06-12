import { createClient } from '@/lib/supabase/server'
import { computePersonalProfile } from './insights'
import type { DbCatch } from './catch-analysis'
import type { PersonalProfile } from './types'

// ─── Fetch des catches brutes ─────────────────────────────────────────────────

async function fetchUserCatches(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<DbCatch[]> {
  const { data, error } = await supabase
    .from('catches')
    .select('id, caught_at, size_cm, wind_speed_kmh, wind_direction_deg, tide_state, spot_id, conditions')
    .eq('user_id', userId)
    .order('caught_at', { ascending: false })

  if (error) {
    console.error('[personal-fetcher] fetchUserCatches error:', error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[])
    // Prises hors France métropolitaine : conditions non calculées, exclues du scoring
    .filter((row) => !(row.conditions as { out_of_coverage?: boolean } | null)?.out_of_coverage)
    .map((row): DbCatch => ({
    id: String(row.id),
    user_id: userId,
    caught_at: String(row.caught_at),
    size_cm: (row.size_cm as number | null) ?? null,
    wind_speed_kmh: (row.wind_speed_kmh as number | null) ?? null,
    wind_direction_deg: (row.wind_direction_deg as number | null) ?? null,
    tide_state: (row.tide_state as 'rising' | 'falling' | 'slack' | null) ?? null,
    spot_id: (row.spot_id as string | null) ?? null,
  }))
}

// ─── Profil personnel ───────────────────────────────────────────────────────
// NOTE : pas de `unstable_cache` ici. Le fetch utilise `createClient()` qui lit
// les cookies de la requête — or Next.js interdit l'accès aux cookies dans un
// scope `unstable_cache` (lève une exception). Le calcul est de toute façon
// trivial (< 5 ms pour ~100 catches) et la requête est indexée sur `user_id`,
// donc on calcule à la volée : toujours à jour, jamais de cache obsolète.

export async function getCachedPersonalProfile(userId: string): Promise<PersonalProfile> {
  const supabase = await createClient()
  const catches = await fetchUserCatches(userId, supabase)
  return computePersonalProfile(userId, catches)
}
