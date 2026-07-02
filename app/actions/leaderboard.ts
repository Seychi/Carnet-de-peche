'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  LeaderboardParams,
  LeaderboardRow,
  LeaderboardScope,
  LeaderboardMetric,
  LeaderboardPeriod,
} from '@/lib/gamification/leaderboard'

// ─── Lecture des classements (Sprint 66) — RPC get_leaderboard spot-safe ────────
// Connectés uniquement (la RPC est grantée `authenticated`, pas `anon`). Aucune donnée de
// localisation ne transite : la RPC ne renvoie que {rank, user_id, username, avatar_url,
// metric_value}. On valide les paramètres contre des listes blanches (défense en profondeur)
// avant de les passer à la RPC.

type LeaderboardResult =
  | { ok: true; rows: LeaderboardRow[] }
  | { ok: false; error: string }

const SCOPES: readonly LeaderboardScope[] = ['national', 'department', 'follows']
const METRICS: readonly LeaderboardMetric[] = ['xp', 'catches', 'biggest', 'diversity']
const PERIODS: readonly LeaderboardPeriod[] = ['season', 'all_time']

type RpcRow = {
  rank: number | string
  user_id: string
  username: string | null
  avatar_url: string | null
  metric_value: number | string
  // Sprint 69 : la ligne du caller sort toujours ; eligible_count = agrégat du scope.
  is_self: boolean | null
  eligible_count: number | string | null
}

export async function getLeaderboard(params: LeaderboardParams): Promise<LeaderboardResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Connecte-toi pour voir les classements.' }

  // Listes blanches : on ne fait jamais confiance au client. Un scope/metric/period inconnu
  // retombe sur des valeurs sûres (national / xp / season).
  const scope: LeaderboardScope = SCOPES.includes(params.scope as LeaderboardScope)
    ? (params.scope as LeaderboardScope)
    : 'national'
  const metric: LeaderboardMetric = METRICS.includes(params.metric as LeaderboardMetric)
    ? (params.metric as LeaderboardMetric)
    : 'xp'
  const period: LeaderboardPeriod = PERIODS.includes(params.period as LeaderboardPeriod)
    ? (params.period as LeaderboardPeriod)
    : 'season'
  // dept/species : bornés en longueur, jamais concaténés (la RPC les traite en paramètres liés).
  const dept = typeof params.dept === 'string' && params.dept.length <= 3 ? params.dept : null
  const species =
    typeof params.species === 'string' && params.species.length <= 40 ? params.species : null
  // Décalage de saison (Sprint 67) : borné à [-40, 0] (10 ans de trimestres passés max).
  // Positif interdit (on ne consulte pas le futur). Ignoré côté RPC quand period='all_time'.
  const rawOffset = Number.isFinite(params.seasonOffset) ? Math.trunc(params.seasonOffset as number) : 0
  const seasonOffset = Math.min(0, Math.max(-40, rawOffset))

  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_scope: scope,
    p_dept: dept,
    p_species: species,
    p_period: period,
    p_metric: metric,
    p_season_offset: seasonOffset,
  })

  if (error) {
    console.error('[getLeaderboard]', error.message)
    return { ok: false, error: 'Impossible de charger le classement. Réessaie.' }
  }

  const rows: LeaderboardRow[] = ((data ?? []) as RpcRow[]).map((r) => ({
    rank: Number(r.rank),
    userId: r.user_id,
    username: r.username,
    avatarUrl: r.avatar_url,
    metricValue: Number(r.metric_value) || 0,
    isSelf: r.is_self === true,
    eligibleCount: Number(r.eligible_count) || 0,
  }))

  return { ok: true, rows }
}
