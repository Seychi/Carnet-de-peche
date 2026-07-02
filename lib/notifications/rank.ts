// Émetteur des notifs de RANG (Sprint 67, Bloc 1) : « X t'a dépassé ».
//
// Au log d'une prise/sortie qui fait gagner de l'XP, on regarde si l'auteur vient de DÉPASSER
// un de ses followers (opt-in des DEUX côtés) dans le classement de saison en XP. Si oui, on
// notifie le follower DÉPASSÉ (acteur humain = l'auteur qui dépasse). SPOT-SAFE : la RPC
// get_overtaken_followers ne renvoie que {user_id, username}, jamais une coordonnée.
//
// Garde-fous (brief) : uniquement pour les comptes opt-in classement (garanti par la RPC) ;
// pas de spam sur micro-changements (un dépassement N'EST détecté qu'au FRANCHISSEMENT réel,
// + dédup 24h anti ping-pong) ; opt-out PUSH via la pref 'ranking'. Best-effort STRICT :
// ne throw JAMAIS (le log a déjà réussi à l'appel). In-app toujours créée ; push gaté.
//
// Pas d'`import 'server-only'` au top (casserait vitest) : l'isolation serveur passe par
// l'import dynamique de admin.ts (cf lib/notifications/create.ts).

import { createNotification, getNotificationPrefs } from './create'
import { isNotificationPrefEnabled } from './prefs-meta'
import { sendPushToUser } from '@/lib/push/send'

const DEDUP_HOURS = 24

/**
 * Émet les notifs « X t'a dépassé » déclenchées par un gain d'XP de l'auteur. `xpBefore`/
 * `xpAfter` sont l'XP TOTALE avant/après (mêmes valeurs que la détection de niveau) : le
 * DELTA est identique à l'XP de saison gagnée (award_xp incrémente total ET insère le ledger
 * daté du jour). On passe ce delta à la RPC, qui compare en XP de SAISON. Best-effort.
 */
export async function emitRankChangeNotifications(opts: {
  actorId: string
  actorUsername?: string | null
  xpBefore: number | null
  xpAfter: number | null
}): Promise<void> {
  const { actorId, xpBefore, xpAfter } = opts
  // Delta non détectable (lecture XP en échec) ou nul → rien à annoncer.
  if (!actorId || xpBefore == null || xpAfter == null) return
  const delta = xpAfter - xpBefore
  if (delta <= 0) return

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // Followers opt-in que l'auteur vient de dépasser en XP de saison (spot-safe).
    const { data, error } = await admin.rpc('get_overtaken_followers', {
      p_actor: actorId,
      p_delta: delta,
    })
    if (error) {
      console.error('[rank] get_overtaken_followers (non bloquant) :', error.message)
      return
    }
    const overtaken = (data ?? []) as { user_id: string; username: string | null }[]
    if (overtaken.length === 0) return

    // Pseudo de l'auteur (dénormalisé une fois pour la notif).
    let actorUsername = opts.actorUsername ?? null
    if (actorUsername == null) {
      const { data: p } = await admin
        .from('profiles')
        .select('username')
        .eq('id', actorId)
        .maybeSingle()
      actorUsername = p?.username ?? null
    }

    // Dédup 24h anti ping-pong : si A a déjà notifié F d'un dépassement récemment, on saute
    // (évite le spam si les deux se rattrapent en boucle). Une requête pour tous les F.
    const sinceIso = new Date(Date.now() - DEDUP_HOURS * 3_600_000).toISOString()
    const { data: recent } = await admin
      .from('notifications')
      .select('user_id')
      .eq('type', 'rank_overtake')
      .eq('actor_id', actorId)
      .in(
        'user_id',
        overtaken.map((o) => o.user_id),
      )
      .gte('created_at', sinceIso)
    const recentlyNotified = new Set((recent ?? []).map((r) => r.user_id))

    const targets = overtaken.filter((o) => !recentlyNotified.has(o.user_id))
    if (targets.length === 0) return

    // Préférences PUSH des destinataires (une lecture par F ; N minuscule en pratique).
    const body = `${actorUsername ?? 'Un pêcheur'} t'a dépassé dans ton classement 🎣`

    for (const t of targets) {
      // In-app : acteur humain = l'auteur (createNotification résout le pseudo + tronque).
      await createNotification({
        userId: t.user_id,
        type: 'rank_overtake',
        actorId,
        actorUsername,
      })
      // Push gaté par la pref 'ranking' (in-app reste toujours créée ci-dessus).
      try {
        const prefs = await getNotificationPrefs(admin, t.user_id)
        if (!isNotificationPrefEnabled(prefs, 'ranking')) continue
        await sendPushToUser(admin, t.user_id, {
          title: 'Carnet de Pêche',
          body,
          url: '/classements',
        })
      } catch (e) {
        console.error('[rank] push best-effort (non bloquant) :', e)
      }
    }
  } catch (e) {
    console.error('[rank] indisponible (non bloquant) :', e)
  }
}
