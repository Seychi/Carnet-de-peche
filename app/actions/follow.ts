'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const AUTH_MSG = 'Connecte-toi pour suivre des pêcheurs.'

export type UserSummary = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  home_department: string | null
}

const PROFILE_COLS = 'id, username, display_name, avatar_url, home_department'

// ---------------------------------------------------------------------------
// toggleFollow — suivre / ne plus suivre (gratuit, pas de check tier)
// ---------------------------------------------------------------------------
export async function toggleFollow(
  targetUserId: string,
): Promise<ActionResult<{ following: boolean }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  if (!z.string().uuid().safeParse(targetUserId).success) return fail('Utilisateur invalide.')
  if (targetUserId === user.id) return fail('Tu ne peux pas te suivre toi-même.')

  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
    if (error) {
      console.error('[toggleFollow:delete]', error.message)
      return fail('Impossible de te désabonner. Réessaie.')
    }
    revalidatePath('/follows')
    return ok({ following: false })
  }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetUserId })
  if (error) {
    console.error('[toggleFollow:insert]', error.message)
    return fail('Impossible de suivre ce pêcheur. Réessaie.')
  }
  revalidatePath('/follows')
  return ok({ following: true })
}

// ---------------------------------------------------------------------------
// getFollowSuggestions — 5 pêcheurs du même département, pas encore suivis
// ---------------------------------------------------------------------------
export async function getFollowSuggestions(): Promise<ActionResult<UserSummary[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const { data: me } = await supabase
    .from('profiles')
    .select('home_department')
    .eq('id', user.id)
    .maybeSingle()
  if (!me?.home_department) return ok([])

  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
  const followedIds = new Set((following ?? []).map((f) => f.following_id))

  const { data: candidates, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('home_department', me.home_department)
    .neq('id', user.id)
    .not('username', 'is', null)
    .limit(20)

  if (error) {
    console.error('[getFollowSuggestions]', error.message)
    return fail('Impossible de charger les suggestions.')
  }

  const suggestions = (candidates ?? [])
    .filter((c) => !followedIds.has(c.id))
    .slice(0, 5)
  return ok(suggestions as UserSummary[])
}

// ---------------------------------------------------------------------------
// listFollowers / listFollowing — graphe social (2 étapes : ids puis profils,
// car follows référence auth.users, pas profiles → pas d'embed PostgREST direct)
// ---------------------------------------------------------------------------
async function listProfilesByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<ActionResult<UserSummary[]>> {
  if (ids.length === 0) return ok([])
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).in('id', ids)
  if (error) {
    // BUG-04 : ne plus avaler l'erreur (elle donnait silencieusement « Tu suis (0) »).
    console.error('[listProfilesByIds]', error.message)
    return fail('Impossible de charger les profils.')
  }
  // PostgREST .in() ne garantit pas l'ordre → on réordonne selon `ids`.
  const byId = new Map((data ?? []).map((p) => [p.id, p as UserSummary]))
  return ok(ids.map((id) => byId.get(id)).filter((p): p is UserSummary => Boolean(p)))
}

export async function listFollowing(userId: string): Promise<ActionResult<UserSummary[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)
  if (!z.string().uuid().safeParse(userId).success) return fail('Utilisateur invalide.')

  const { data: rows, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
  if (error) {
    console.error('[listFollowing]', error.message)
    return fail('Impossible de charger les abonnements.')
  }

  return listProfilesByIds(supabase, (rows ?? []).map((r) => r.following_id))
}

export async function listFollowers(userId: string): Promise<ActionResult<UserSummary[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)
  if (!z.string().uuid().safeParse(userId).success) return fail('Utilisateur invalide.')

  const { data: rows, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
  if (error) {
    console.error('[listFollowers]', error.message)
    return fail('Impossible de charger les abonnés.')
  }

  return listProfilesByIds(supabase, (rows ?? []).map((r) => r.follower_id))
}
