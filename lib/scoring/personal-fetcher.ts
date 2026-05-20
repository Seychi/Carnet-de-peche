import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { computePersonalProfile } from './insights'
import { PERSONAL_SCORING_CONFIG } from './personal-config'
import type { DbCatch } from './catch-analysis'
import type { PersonalProfile } from './types'

// ─── Fetch des catches brutes ─────────────────────────────────────────────────

async function fetchUserCatches(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<DbCatch[]> {
  const { data, error } = await supabase
    .from('catches')
    .select('id, caught_at, size_cm, wind_speed_kmh, wind_direction_deg, tide_state, spot_id')
    .eq('user_id', userId)
    .order('caught_at', { ascending: false })

  if (error) {
    console.error('[personal-fetcher] fetchUserCatches error:', error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row): DbCatch => ({
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

// ─── Calcul du profil personnel ───────────────────────────────────────────────

async function fetchAndComputePersonalProfile(userId: string): Promise<PersonalProfile> {
  const supabase = await createClient()
  const catches = await fetchUserCatches(userId, supabase)
  return computePersonalProfile(userId, catches)
}

// ─── Cache 24h ────────────────────────────────────────────────────────────────
// Tag : `personal-profile-${userId}` → invalider via revalidateTag à chaque nouvelle catch

export const getCachedPersonalProfile = (userId: string): Promise<PersonalProfile> =>
  unstable_cache(
    () => fetchAndComputePersonalProfile(userId),
    [`personal-profile-${userId}`],
    {
      revalidate: PERSONAL_SCORING_CONFIG.CACHE_TTL_HOURS * 3600,
      tags: [`personal-profile-${userId}`],
    }
  )()
