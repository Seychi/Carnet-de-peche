'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Résultat uniformisé (aligné sur app/actions/feed.ts).
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const AUTH_MSG = 'Connecte-toi pour voir tes notifications.'

export type AppNotification = {
  id: string
  type: string
  actor_id: string | null
  actor_username: string | null
  target_type: string | null
  target_id: string | null
  preview_text: string | null
  read_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// getUnreadCount — compteur non lues (badge SSR). Lecture via RLS
// notifications_select_own : ne renvoie que les notifs du viewer.
// ---------------------------------------------------------------------------
export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)
  return count ?? 0
}

// ---------------------------------------------------------------------------
// getNotifications — flux paginé (les 50 plus récentes). RLS garantit que
// seules les notifs du viewer remontent (pas d'accès aux notifs d'autrui).
// ---------------------------------------------------------------------------
export async function getNotifications(limit = 50): Promise<ActionResult<AppNotification[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, type, actor_id, actor_username, target_type, target_id, preview_text, read_at, created_at',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error('[getNotifications]', error.message)
    return fail('Impossible de charger tes notifications.')
  }
  return ok((data ?? []) as AppNotification[])
}

// ---------------------------------------------------------------------------
// markAllRead — marque toutes les notifs non lues du viewer comme lues.
// L'UPDATE passe par la policy notifications_update_own (user_id = auth.uid()).
// On ne touche que SES propres lignes (eq user_id) → aucun accès cross-user.
// ---------------------------------------------------------------------------
export async function markAllRead(): Promise<ActionResult<{ updated: number }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
    .select('id')

  if (error) {
    console.error('[markAllRead]', error.message)
    return fail('Impossible de marquer tes notifications comme lues.')
  }

  revalidatePath('/notifications')
  return ok({ updated: data?.length ?? 0 })
}
