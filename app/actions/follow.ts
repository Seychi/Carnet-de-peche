'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications/create'
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

  // Notif in-app (best-effort, non bloquant ; anti-auto-notif géré dans le helper).
  // Modèle social = abonnés (unilatéral) : on notifie la personne suivie, point.
  await createNotification({
    userId: targetUserId,
    type: 'new_follower',
    actorId: user.id,
    targetType: null,
    targetId: null,
  })

  revalidatePath('/follows')
  return ok({ following: true })
}

// ---------------------------------------------------------------------------
// getFollowSuggestions — pêcheurs suggérés, triés par activité récente.
// Stratégie :
//   1. Si home_department connu → profils du même département (priorité locale).
//   2. Fallback gracieux si pas de département → tous les profils récemment actifs.
// Dans les deux cas on exclut l'utilisateur courant et les déjà-suivis.
// Tri : updated_at DESC (proxy d'activité récente disponible sans sous-requête
// coûteuse sur feed_posts/catches — assez fidèle pour des suggestions).
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

  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
  const followedIds = new Set((following ?? []).map((f) => f.following_id))

  // Requête de base : profils onboardés sauf soi-même, triés par activité récente.
  let query = supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('onboarded', true)
    .neq('id', user.id)
    .not('username', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(30)

  // Affiner au département si disponible (suggestions locales plus pertinentes).
  if (me?.home_department) {
    query = query.eq('home_department', me.home_department)
  }

  const { data: candidates, error } = await query

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

// ---------------------------------------------------------------------------
// searchUsers — recherche de pêcheurs par pseudo (ILIKE, index trigram 037)
// Utilisable uniquement par un utilisateur connecté (RLS profiles_select_all).
// username est citext → pas besoin de toLowerCase, ILIKE est case-insensitive.
// ---------------------------------------------------------------------------
const SEARCH_TERM_RE = /[^\p{L}\p{N}_\-]/gu

export async function searchUsers(term: string): Promise<ActionResult<UserSummary[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  // Sanitisation : on retire tout sauf lettres, chiffres, underscore, tiret.
  const sanitized = term.replace(SEARCH_TERM_RE, '').trim()
  if (sanitized.length < 2) return ok([])

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .ilike('username', `%${sanitized}%`)
    .eq('onboarded', true)
    .order('username')
    .limit(10)

  if (error) {
    console.error('[searchUsers]', error.message)
    return fail('Impossible de rechercher des pêcheurs.')
  }

  return ok((data ?? []) as UserSummary[])
}
